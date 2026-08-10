/**
 * Payin settlement — "whose money is this?" and "credit it exactly once".
 *
 * Shared by the Anchor webhook receiver (routes/anchor.js) and the rider's own
 * payment-status poll (routes/wallet.js).
 *
 * WHY THIS IS A SERVICE AND NOT WEBHOOK-ONLY (3 Aug 2026): a rider transferred
 * ₦1,300 to their funding account, Anchor recorded the payment, and NO webhook
 * delivery ever reached us — anchor_events held not one inbound row, not even
 * an invalid-signature one, so the request genuinely never arrived. The wallet
 * stayed at ₦0 and the ride could not be booked. Webhook delivery is
 * best-effort infrastructure we do not control, so crediting must never depend
 * on it: reconcileUserPayins() asks Anchor directly and settles through the
 * SAME money gate, and the rider's existing 4-second poll drives it.
 *
 * settlePayment() is the single gate. It claims the payment id in
 * anchor_events, credits through exactly one path, marks the claim processed on
 * success and RELEASES it on failure so a later delivery (or the next poll) can
 * retry. Every caller — signed webhook, unsigned pull-back, reconciliation —
 * goes through it, so the same payment arriving three ways still credits once.
 */
const { query } = require('../db')
const anchor = require('./anchor')
const { creditTransaction, creditPendingForUser, directCredit } = require('./walletLedger')

// Anchor describes one arriving payment two ways: an InboundNIPTransfer
// (/inbound-transfers — carries status, sessionId and the sending account) and
// a Payment (/payments — same id, no status). Flatten both to one shape so
// every settlement path reads the same fields.
//
// `status` is absent on the Payment view. Treat absent as settled: that view
// only ever lists money Anchor has accepted, and refusing to credit it would
// strand a rider's transfer over a missing field.
const SETTLED_STATUSES = new Set(['COMPLETED', 'SUCCESSFUL', 'SUCCESS', 'SETTLED'])

function normalizeInbound(r) {
  const a = r?.attributes || {}
  const rel = r?.relationships || {}
  const status = (a.status || '').toUpperCase()
  return {
    paymentId: r?.id || null,
    amountKobo: Number(a.amount),
    currency: a.currency || 'NGN',
    // Anchor's own reference on the NUBAN rail; ours only on Pay-with-Transfer.
    // Harmless either way — an unmatched reference just falls through.
    ourRef: a.paymentReference || a.reference || null,
    nubanId: rel.accountNumber?.data?.id || rel.virtualNuban?.data?.id || null,
    nubanNumber: a.virtualNuban?.accountNumber || null,
    customerId: rel.customer?.data?.id || a.customer?.customerId || null,
    settled: !status || SETTLED_STATUSES.has(status),
    status: status || null,
    // Kept on the settlement row so the Back Office can trace a disputed
    // transfer back to the sending bank without a trip to Anchor's dashboard.
    detail: [a.sessionId && `session ${a.sessionId}`, a.sourceAccountName, a.sourceBank?.name]
      .filter(Boolean).join(' · ') || null,
  }
}

// Whose top-up is this Pay-with-Transfer payin? Anchor quotes only its own
// session reference on a payin, so this is the one link back to a rider.
async function userByPayinRef(payinRef) {
  if (!payinRef) return null
  const r = await query(
    'SELECT user_id FROM wallet_transactions WHERE anchor_payin_ref = $1 ORDER BY created_at DESC LIMIT 1',
    [payinRef]
  )
  return r.rows[0]?.user_id || null
}

async function userByCustomerId(customerId) {
  if (!customerId) return null
  const r = await query('SELECT id FROM users WHERE anchor_customer_id = $1', [customerId])
  return r.rows[0]?.id || null
}

// Matches the CURRENT account and every account this user has previously held.
// A BVN-KYC upgrade issues a new, rider-named account number; riders keep the
// old one saved in their banking app and transfers to it must still credit
// them (see legacy_nuban_ids in db/migrate.js).
async function userByNuban(nubanId, nubanNumber) {
  if (nubanId) {
    const r = await query(
      `SELECT id FROM users WHERE anchor_reserved_account_id = $1 OR $1 = ANY(legacy_nuban_ids)`, [nubanId])
    if (r.rows[0]) return r.rows[0].id
  }
  if (nubanNumber) {
    const r = await query(
      `SELECT id FROM users WHERE reserved_account_number = $1 OR $1 = ANY(legacy_nuban_numbers)`, [nubanNumber])
    if (r.rows[0]) return r.rows[0].id
  }
  return null
}

// Returns true when settled (now or previously), false when the recipient
// can't be resolved yet — callers treat false as "do not acknowledge".
async function settlePayment({ paymentId, amountKobo, currency, ourRef, userId, signatureValid, source, detail }) {
  if (!amountKobo || amountKobo <= 0 || (currency && currency !== 'NGN')) return false
  if (!paymentId) {
    // No stable payment id (very old/odd payloads) — reference crediting only,
    // which is itself idempotent via the pending-row status flip.
    return ourRef
      ? creditTransaction(ourRef, { paidKobo: amountKobo, currency, gateway: 'anchor', paymentMethod: 'bank_transfer' })
      : false
  }
  const claim = await query(
    `INSERT INTO anchor_events (event_id, event_type, resource_id, signature_valid, payload)
     VALUES ($1, 'payment.processed', $2, $3, $4) ON CONFLICT (event_id) DO NOTHING RETURNING id`,
    [`pay-${paymentId}`, paymentId, !!signatureValid,
     JSON.stringify({ source, userId: userId || null, amountKobo, detail: detail || null })]
  )
  if (!claim.rows[0]) return true // already settled via another delivery path
  try {
    let ok = false
    if (ourRef) {
      ok = await creditTransaction(ourRef, { paidKobo: amountKobo, currency, gateway: 'anchor', paymentMethod: 'bank_transfer' })
    }
    if (!ok && userId) {
      ok = await creditPendingForUser(userId, amountKobo, currency, paymentId)
      if (!ok) ok = await directCredit(userId, amountKobo, `anchor-payin-${paymentId}`, 'Wallet top-up — bank transfer')
    }
    if (ok) {
      await query('UPDATE anchor_events SET processed = true WHERE id = $1', [claim.rows[0].id])
    } else {
      // Recipient unresolved — release the claim so a retry can settle it
      await query('DELETE FROM anchor_events WHERE id = $1', [claim.rows[0].id])
    }
    return ok
  } catch (err) {
    await query('DELETE FROM anchor_events WHERE id = $1', [claim.rows[0].id]).catch(() => {})
    throw err
  }
}

// ── Reconciliation: settle straight from Anchor, no webhook required ─────────
// Called from the rider's payment-status poll. Throttled per user because that
// poll runs every 4 seconds and each pass costs one Anchor API call; the money
// only needs to be found once, and 15s is invisible next to a bank transfer.
const RECONCILE_EVERY_MS = 15_000
const lastReconcile = new Map()

function throttled(userId) {
  const now = Date.now()
  const last = lastReconcile.get(userId) || 0
  if (now - last < RECONCILE_EVERY_MS) return true
  // The map only ever holds users mid-payment; clear it wholesale rather than
  // let a long-lived process accumulate an entry per rider forever.
  if (lastReconcile.size > 500) lastReconcile.clear()
  lastReconcile.set(userId, now)
  return false
}

// ── Pay-with-Transfer sweep ──────────────────────────────────────────────────
// The reserved-account sweep below cannot see this rail at all: a PWT payin is
// its own resource and is absent from /inbound-transfers. Every live ride
// payment and top-up uses PWT, so without this the "webhook is not the only
// path" guarantee covered only the rail riders don't use (9 Aug 2026 — ₦1,300
// arrived, no webhook was ever sent, and nothing on our side could find it).
//
// Money that Anchor received but has NOT applied to the session (status
// NOT_STARTED, which is what an unconfigured payout account produces) is never
// credited — the funds are not ours to spend until Anchor settles them. It is
// recorded instead, so the Back Office shows a payment stuck at Anchor rather
// than showing nothing at all.
async function reconcilePayWithTransfer(userId) {
  // Only ask Anchor when this rider actually has a PWT session outstanding.
  const pending = await query(
    `SELECT anchor_payin_ref FROM wallet_transactions
      WHERE user_id = $1 AND status = 'pending' AND anchor_payin_ref IS NOT NULL`,
    [userId]
  )
  if (!pending.rows.length) return false
  const wanted = new Set(pending.rows.map(r => r.anchor_payin_ref))

  const payins = await anchor.listPayins()
  let credited = false
  for (const raw of payins) {
    const p = normalizeInbound(raw)
    if (!wanted.has(p.ourRef)) continue
    if (!p.settled) {
      await query(
        `INSERT INTO anchor_events (event_id, event_type, resource_id, signature_valid, processed, payload)
         VALUES ($1, 'payin.unapplied', $2, false, false, $3) ON CONFLICT (event_id) DO NOTHING`,
        [`payin-unapplied-${p.paymentId}`, p.paymentId, JSON.stringify({
          source: 'reconcile-poll',
          userId,
          amountKobo: p.amountKobo,
          detail: `₦${Math.round(Number(p.amountKobo) / 100).toLocaleString()} reached Anchor but is `
            + `unapplied (status ${p.status}) — not credited${p.detail ? ` · ${p.detail}` : ''}`,
        })]
      ).catch(() => {})
      continue
    }
    const settled = await settlePayment({ ...p, userId, signatureValid: false, source: 'pwt-reconcile' })
    credited = credited || settled
  }
  return credited
}

// Settles every payment Anchor has recorded against this rider's funding
// account. Already-settled payments are no-ops (the anchor_events claim), so
// this is safe to call repeatedly. Returns true if anything credited now.
async function reconcileUserPayins(userId, { force = false } = {}) {
  if (!anchor.configured()) return false
  if (!force && throttled(userId)) return false

  // Both rails are swept — a rider can have a PWT session open AND money
  // arriving on their permanent account. One rail failing must not stop the
  // other from settling.
  let credited = false
  try {
    credited = await reconcilePayWithTransfer(userId)
  } catch (err) {
    console.error('Pay-with-Transfer reconciliation failed:', err.message)
  }

  const u = await query(
    'SELECT anchor_reserved_account_id, legacy_nuban_ids FROM users WHERE id = $1', [userId])
  // Sweep the current account AND any the rider held before a KYC upgrade —
  // money can still arrive on an old number they have saved as a beneficiary.
  const nubanIds = [u.rows[0]?.anchor_reserved_account_id, ...(u.rows[0]?.legacy_nuban_ids || [])]
    .filter(Boolean)
  if (!nubanIds.length) return credited

  const transfers = (await Promise.all(nubanIds.map(id => anchor.listInboundTransfersForNuban(id)))).flat()
  for (const t of transfers) {
    const p = normalizeInbound(t)
    // Only money Anchor has actually settled. A PENDING or REVERSED transfer
    // must never credit a wallet — the rider could otherwise spend a balance
    // that the bank later takes back.
    if (!p.settled) continue
    const settled = await settlePayment({
      ...p,
      userId,
      signatureValid: false,
      source: 'reconcile-poll',
    })
    credited = credited || settled
  }
  return credited
}

// ── Sweep for payins that settle LATE ────────────────────────────────────────
// A Pay-with-Transfer payin is NOT settled when the money arrives. Anchor
// applies it to the session later, and "later" can be the next day: on 9 Aug
// 2026 a rider's ₦1,300 landed at 19:50 and Anchor's own paidAt was 14:53 the
// FOLLOWING afternoon — 19 hours. reconcilePayWithTransfer did exactly the
// right thing at the time (unapplied money is not ours to credit), recorded
// 'payin.unapplied' and moved on.
//
// The gap was that nothing ever looked again. Re-checking only happened inside
// the rider's payment poll, which dies the moment they close the app — so a
// payin that settles after they leave stayed stranded, with the money sitting
// in our Anchor account and the rider's wallet showing ₦0.
//
// This settles every outstanding session in ONE Anchor call, for all riders at
// once, whether or not anybody is watching. Request-triggered and throttled,
// never a timer — same rule as services/onlineStatus.js: a 24/7 interval would
// keep Neon awake permanently and burn the whole compute allowance.
const SWEEP_EVERY_MS = 5 * 60 * 1000
let lastSweep = 0

async function sweepSettledPayins() {
  if (!anchor.configured()) return 0
  // Cheap guard first: no outstanding session means no Anchor call at all, so
  // a quiet app costs nothing beyond one indexed query.
  const pending = await query(
    `SELECT anchor_payin_ref, user_id FROM wallet_transactions
      WHERE status = 'pending' AND anchor_payin_ref IS NOT NULL
        AND created_at > NOW() - INTERVAL '14 days'`
  )
  if (!pending.rows.length) return 0
  const ownerOf = new Map(pending.rows.map(r => [r.anchor_payin_ref, r.user_id]))

  const payins = await anchor.listPayins()
  let credited = 0
  for (const raw of payins) {
    const p = normalizeInbound(raw)
    const userId = ownerOf.get(p.ourRef)
    // Still unapplied is normal, not an error — it just means Anchor has not
    // released it yet. The next sweep looks again.
    if (!userId || !p.settled) continue
    const ok = await settlePayment({ ...p, userId, signatureValid: false, source: 'payin-sweep' })
    if (!ok) continue
    credited++
    // An earlier pass may have filed this as stuck-at-Anchor. It no longer is,
    // so close that note rather than leave the Back Office showing a false alarm.
    await query(
      `UPDATE anchor_events SET processed = true WHERE event_id = $1`,
      [`payin-unapplied-${p.paymentId}`]
    ).catch(() => {})
  }
  if (credited) console.log(`Payin sweep: credited ${credited} late-settling payment(s).`)
  return credited
}

// Fire-and-forget, at most once per SWEEP_EVERY_MS — called from request
// middleware, so it piggybacks on activity that already woke the database.
function maybeSweepPayins() {
  const now = Date.now()
  if (now - lastSweep < SWEEP_EVERY_MS) return
  lastSweep = now
  sweepSettledPayins().catch(err => console.error('Payin sweep failed:', err.message))
}

module.exports = {
  userByCustomerId, userByNuban, userByPayinRef,
  settlePayment, reconcileUserPayins, normalizeInbound,
  sweepSettledPayins, maybeSweepPayins,
}
