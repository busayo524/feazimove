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

// Settles every payment Anchor has recorded against this rider's funding
// account. Already-settled payments are no-ops (the anchor_events claim), so
// this is safe to call repeatedly. Returns true if anything credited now.
async function reconcileUserPayins(userId, { force = false } = {}) {
  if (!anchor.configured()) return false
  if (!force && throttled(userId)) return false
  const u = await query(
    'SELECT anchor_reserved_account_id, legacy_nuban_ids FROM users WHERE id = $1', [userId])
  // Sweep the current account AND any the rider held before a KYC upgrade —
  // money can still arrive on an old number they have saved as a beneficiary.
  const nubanIds = [u.rows[0]?.anchor_reserved_account_id, ...(u.rows[0]?.legacy_nuban_ids || [])]
    .filter(Boolean)
  if (!nubanIds.length) return false

  const transfers = (await Promise.all(nubanIds.map(id => anchor.listInboundTransfersForNuban(id)))).flat()
  let credited = false
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

module.exports = { userByCustomerId, userByNuban, settlePayment, reconcileUserPayins, normalizeInbound }
