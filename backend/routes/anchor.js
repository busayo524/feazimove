/**
 * Anchor webhook receiver — POST /api/anchor/webhook
 *
 * Anchor pushes events here (payments received, transfers settled, reserved
 * accounts created, KYC decisions — docs.getanchor.co/docs/event-types-1).
 * Every request is verified against the x-anchor-signature header
 * (Base64(hex(HMAC-SHA1(rawBody, webhookToken))) — docs.getanchor.co/docs/verify-webhooks),
 * stored in anchor_events (the back-office audit trail), and processed
 * idempotently: a redelivered event id is acknowledged but not re-applied.
 *
 * NO auth middleware here — Anchor is not a logged-in user. The signature IS
 * the authentication.
 */
const express = require('express')
const { query } = require('../db')
const anchor = require('../services/anchor')
const { creditTransaction, directCredit } = require('../services/walletLedger')

const router = express.Router()

// Webhook payloads are JSON:API — the event is `data`, and with "Included"
// delivery mode the full related resources ride along in `included`.
const included = (payload, type) =>
  (payload?.included || []).find(r => r?.type === type || r?.type?.toUpperCase?.() === type?.toUpperCase?.())
const relId = (resource, name) => resource?.relationships?.[name]?.data?.id || null

async function userByCustomerId(customerId) {
  if (!customerId) return null
  const r = await query('SELECT id FROM users WHERE anchor_customer_id = $1', [customerId])
  return r.rows[0]?.id || null
}

// ── Money arrived (payin.received / payment.received) ────────────────────────
async function handlePayin(payload) {
  const event = payload.data
  const payin = included(payload, 'PayIn') || included(payload, 'Payment')
  const payinId = payin?.id || relId(event, 'payIn') || relId(event, 'payment')
  // With "Included" delivery the amount/reference are embedded; fall back to
  // fetching the PayIn if a basic-mode payload arrives.
  let attrs = payin?.attributes
  let rels = payin?.relationships
  if (!attrs && payinId && anchor.configured()) {
    try { const full = await anchor.getPayin(payinId); attrs = full?.attributes; rels = full?.relationships } catch { /* fall through */ }
  }
  if (!attrs) return false

  const amountKobo = Number(attrs.amount)
  const currency = attrs.currency || 'NGN'
  if (!amountKobo || amountKobo <= 0) return false
  // Our own reference (set when creating a Pay-with-Transfer) comes back on
  // the payin — that's the pending wallet_transactions row to credit.
  const ourRef = attrs.reference || attrs.paymentReference || null
  if (ourRef) {
    const credited = await creditTransaction(ourRef, { paidKobo: amountKobo, currency, gateway: 'anchor', paymentMethod: 'bank_transfer' })
    if (credited) return true
  }
  // No pending row matched → this is a transfer straight into a rider's
  // permanent reserved account. Identify the customer and credit directly
  // (idempotent per payin id).
  const customerId = relId({ relationships: rels }, 'customer') || relId(event, 'customer')
  const userId = await userByCustomerId(customerId)
  if (userId && currency === 'NGN') {
    return directCredit(userId, amountKobo, `anchor-payin-${payinId}`, 'Wallet top-up — bank transfer')
  }
  return false
}

// ── Reserved account lifecycle ───────────────────────────────────────────────
async function handleReservedAccount(payload, ok) {
  const event = payload.data
  const acct = included(payload, 'ReservedAccount')
  const customerId = relId(acct || event, 'customer') || relId(event, 'customer')
  const userId = await userByCustomerId(customerId)
  if (!userId) return false
  if (!ok) {
    await query("UPDATE users SET anchor_kyc_status = 'reserved_account_failed' WHERE id = $1", [userId])
    return true
  }
  const a = acct?.attributes || {}
  const accountNumber = a.accountNumber || a.accountDetails?.accountNumber
  const bankName = a.bankName || a.bank?.name || a.accountDetails?.bankName
  const accountName = a.accountName || a.accountDetails?.accountName
  await query(
    `UPDATE users SET anchor_reserved_account_id = $1,
        reserved_account_number = COALESCE($2, reserved_account_number),
        reserved_account_bank   = COALESCE($3, reserved_account_bank),
        reserved_account_name   = COALESCE($4, reserved_account_name)
      WHERE id = $5`,
    [acct?.id || null, accountNumber || null, bankName || null, accountName || null, userId]
  )
  return true
}

// ── Payout transfer lifecycle (nip.transfer.*) ───────────────────────────────
async function handleTransfer(payload, outcome) {
  const event = payload.data
  const transfer = included(payload, 'NIP_TRANSFER') || included(payload, 'NIPTransfer')
  const transferId = transfer?.id || relId(event, 'transfer') || relId(event, 'nipTransfer')
  const reference = transfer?.attributes?.reference || null
  if (!transferId && !reference) return false

  if (outcome === 'successful') {
    await query(
      `UPDATE payout_requests SET status = 'completed', processed_at = COALESCE(processed_at, NOW())
        WHERE (anchor_transfer_id = $1 OR anchor_reference = $2) AND status IN ('approved', 'processing')`,
      [transferId || null, reference || null]
    )
    return true
  }
  // failed | reversed → mark failed and return the escrowed money to the
  // driver's wallet exactly once (guarded by the status filter + refund ref).
  const failed = await query(
    `UPDATE payout_requests SET status = 'failed', processed_at = NOW(), failure_reason = $3
      WHERE (anchor_transfer_id = $1 OR anchor_reference = $2) AND status IN ('approved', 'processing', 'completed')
      RETURNING id, driver_id, amount_kobo, anchor_reference`,
    [transferId || null, reference || null, `NIP transfer ${outcome}`]
  )
  const row = failed.rows[0]
  if (!row) return false
  const refunded = await query(
    `INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status)
     VALUES ($1, 'credit', $2, 'Payout failed — funds returned', $3, 'completed')
     ON CONFLICT (reference) DO NOTHING RETURNING id`,
    [row.driver_id, row.amount_kobo, `refund-${row.anchor_reference || row.id}`]
  )
  if (refunded.rows[0]) {
    await query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [row.amount_kobo, row.driver_id])
  }
  return true
}

// ── KYC decisions (customer.identification.*) ────────────────────────────────
async function handleKyc(payload, status) {
  const event = payload.data
  const customerId = relId(event, 'customer')
    || included(payload, 'IndividualCustomer')?.id || null
  const userId = await userByCustomerId(customerId)
  if (!userId) return false
  await query('UPDATE users SET anchor_kyc_status = $1 WHERE id = $2', [status, userId])
  return true
}

router.post('/webhook', async (req, res) => {
  // 1. Authenticate the sender — signature over the RAW body (captured in
  //    server.js) with our shared webhook token.
  const signature = req.headers['x-anchor-signature']
  const valid = anchor.verifyWebhookSignature(req.rawBody, signature)
  if (!valid) {
    // Log invalid attempts too — they're part of the monitoring story.
    query(
      `INSERT INTO anchor_events (event_type, signature_valid, processed, payload)
       VALUES ('invalid.signature', false, false, $1) `,
      [JSON.stringify({ headers: { 'x-anchor-signature': signature || null } })]
    ).catch(() => {})
    return res.status(401).json({ message: 'Invalid webhook signature.' })
  }

  const payload = req.body || {}
  const event = payload.data || {}
  const eventId = event.id || null
  const eventType = event.type || 'unknown'

  try {
    // 2. Record the event — the UNIQUE event_id makes redelivery a no-op.
    if (eventId) {
      const stored = await query(
        `INSERT INTO anchor_events (event_id, event_type, resource_id, payload)
         VALUES ($1, $2, $3, $4) ON CONFLICT (event_id) DO NOTHING RETURNING id`,
        [eventId, eventType, relId(event, 'payIn') || relId(event, 'transfer') || relId(event, 'customer'), JSON.stringify(payload)]
      )
      if (!stored.rows[0]) return res.sendStatus(200) // duplicate delivery
    }

    // 3. Apply it.
    let processed = false
    if (eventType === 'payin.received' || eventType === 'payment.received') processed = await handlePayin(payload)
    else if (eventType === 'reservedAccount.created') processed = await handleReservedAccount(payload, true)
    else if (eventType === 'reservedAccount.failed') processed = await handleReservedAccount(payload, false)
    else if (eventType.startsWith('nip.transfer.')) processed = await handleTransfer(payload, eventType.split('.').pop())
    else if (eventType.startsWith('customer.identification.')) processed = await handleKyc(payload, eventType.split('.').pop())
    else processed = true // informational events (customer.created, settled, …) — logged is enough

    if (eventId && processed) {
      await query('UPDATE anchor_events SET processed = true WHERE event_id = $1', [eventId])
    }
    // Always 200 — Anchor retries non-2xx, and we never want a processing
    // hiccup to grow into a redelivery storm (the event row is our replay).
    res.sendStatus(200)
  } catch (err) {
    console.error('Anchor webhook error:', err.message)
    res.sendStatus(200)
  }
})

module.exports = router
