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

async function userByCustomerId(customerId) {
  if (!customerId) return null
  const r = await query('SELECT id FROM users WHERE anchor_customer_id = $1', [customerId])
  return r.rows[0]?.id || null
}

async function userByNuban(nubanId, nubanNumber) {
  if (nubanId) {
    const r = await query('SELECT id FROM users WHERE anchor_reserved_account_id = $1', [nubanId])
    if (r.rows[0]) return r.rows[0].id
  }
  if (nubanNumber) {
    const r = await query('SELECT id FROM users WHERE reserved_account_number = $1', [nubanNumber])
    if (r.rows[0]) return r.rows[0].id
  }
  return null
}

// Returns true when settled (now or previously), false when the recipient
// can't be resolved yet — callers treat false as "do not acknowledge".
async function settlePayment({ paymentId, amountKobo, currency, ourRef, userId, signatureValid, source }) {
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
    [`pay-${paymentId}`, paymentId, !!signatureValid, JSON.stringify({ source, userId: userId || null, amountKobo })]
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
  const u = await query('SELECT anchor_reserved_account_id FROM users WHERE id = $1', [userId])
  const nubanId = u.rows[0]?.anchor_reserved_account_id
  if (!nubanId) return false

  const payments = await anchor.listPaymentsForNuban(nubanId)
  let credited = false
  for (const p of payments) {
    const settled = await settlePayment({
      paymentId: p.id,
      amountKobo: Number(p.attributes?.amount),
      currency: p.attributes?.currency || 'NGN',
      // Anchor stamps its OWN reference on virtual-NUBAN payins, never ours, so
      // there is nothing to match by reference — settle by user + amount.
      ourRef: null,
      userId,
      signatureValid: false,
      source: 'reconcile-poll',
    })
    credited = credited || settled
  }
  return credited
}

module.exports = { userByCustomerId, userByNuban, settlePayment, reconcileUserPayins }
