/**
 * Anchor webhook receiver — POST /api/anchor/webhook
 *
 * Anchor pushes events here (payments received, transfers settled, reserved
 * accounts created, KYC decisions — docs.getanchor.co/docs/event-types-1).
 * Every request is verified against the x-anchor-signature header; events are
 * stored in anchor_events (the back-office audit trail) and processed exactly
 * once.
 *
 * KNOWN PROVIDER QUIRK (Jul 24 2026): Anchor's ORGANIC deliveries are signed
 * with a key that does not match the webhook's stored token; their dashboard
 * RESEND path signs correctly. Unsigned deliveries are therefore never
 * trusted directly — instead, the claimed resource id (payment, transfer,
 * customer, reserved account) is re-fetched from Anchor's API with our key and
 * the AUTHENTICATED response is processed. A claimed type with no pull-back
 * branch here is rejected 401, so new event types must be added deliberately.
 *
 * Money idempotency is keyed on the PAYMENT id and lives in
 * services/payinSettlement.js, shared by the signed path, the pull path AND
 * the rider's reconciliation poll — so the same payment arriving three ways
 * can only ever credit once.
 *
 * A MONEY EVENT IS NEVER ACKNOWLEDGED UNLESS IT SETTLED. 200 tells Anchor
 * "delivered" and ends AtLeastOnce redelivery forever; an unsettled payin
 * answers 5xx so it comes back. (Returning 200 on a failed settle is how a
 * rider's ₦1,300 could have been acknowledged and then silently dropped.)
 *
 * NO auth middleware here — Anchor is not a logged-in user. The signature
 * (or the authenticated API pull) IS the authentication.
 */
const express = require('express')
const rateLimit = require('express-rate-limit')
const { query } = require('../db')
const anchor = require('../services/anchor')
const { userByCustomerId, userByNuban, settlePayment } = require('../services/payinSettlement')
const { refundPayout } = require('../services/walletLedger')

const router = express.Router()

// Unauthenticated + DB-touching + can trigger outbound Anchor calls → keep a
// per-route budget well below the global limiter. Anchor's real delivery
// volume (events + AtLeastOnce retries) sits far under this.
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests.' },
})

// Webhook payloads are JSON:API — the event is `data`, and with "Included"
// delivery mode the full related resources ride along in `included`.
const included = (payload, type) =>
  (payload?.included || []).find(r => r?.type === type || r?.type?.toUpperCase?.() === type?.toUpperCase?.())
const relId = (resource, name) => resource?.relationships?.[name]?.data?.id || null

// Every event type that means "money landed on one of our accounts". Anchor
// enables all of these on our webhook and uses different ones per rail, so
// matching only 'payment.received' left the others to be rejected as
// unrecognised — with the money already in the account.
const PAYIN_EVENT_TYPES = new Set([
  'payin.received', 'payment.received', 'payment.settled',
  'nip.inbound.received', 'nip.inbound.completed', 'nip.inbound.settled',
  'nip.incomingTransfer.received', 'virtual.account.transaction.settlement',
  'realTimePayment.inbound.received', 'realTimePayment.inbound.completed',
  'realTimePayment.inbound.settled',
])

// ── Money arrived (payin.received / payment.received), signed path ───────────
// Two payload dialects exist: REAL deliveries (observed Jul 24, 2026) inline
// the payment under event.attributes.payment; the docs describe a JSON:API
// relationships/included shape. Parse both, inline first.
async function handlePayin(payload) {
  const event = payload.data
  let paymentId, amountKobo, currency, ourRef, nubanId, nubanNumber, customerId

  const inline = event?.attributes?.payment
  if (inline) {
    paymentId = inline.paymentId || event.id
    amountKobo = Number(inline.amount)
    currency = inline.currency || 'NGN'
    ourRef = inline.paymentReference || null // Anchor's own UUID for simulated transfers; ours for /pay flows
    nubanId = inline.virtualNuban?.accountId || null
    nubanNumber = inline.virtualNuban?.accountNumber || null
    customerId = inline.customer?.customerId || inline.customer?.id || null
  } else {
    const payin = included(payload, 'PayIn') || included(payload, 'Payment')
    paymentId = payin?.id || relId(event, 'payIn') || relId(event, 'payment')
    let attrs = payin?.attributes
    let rels = payin?.relationships
    if (!attrs && paymentId && anchor.configured()) {
      try { const full = await anchor.getPayin(paymentId); attrs = full?.attributes; rels = full?.relationships } catch { /* fall through */ }
    }
    if (!attrs) return false
    amountKobo = Number(attrs.amount)
    currency = attrs.currency || 'NGN'
    ourRef = attrs.reference || attrs.paymentReference || null
    nubanId = relId({ relationships: rels }, 'virtualNuban') || relId(event, 'virtualNuban')
    customerId = relId({ relationships: rels }, 'customer') || relId(event, 'customer')
  }

  let userId = await userByNuban(nubanId, nubanNumber)
  if (!userId) userId = await userByCustomerId(customerId)
  return settlePayment({ paymentId, amountKobo, currency, ourRef, userId, signatureValid: true, source: 'signed-webhook' })
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

// ── Payout transfer lifecycle — shared by signed events and API pulls ────────
async function applyTransferOutcome(transferId, reference, outcome) {
  if (!transferId && !reference) return false

  if (outcome === 'successful') {
    const done = await query(
      `UPDATE payout_requests SET status = 'completed', processed_at = COALESCE(processed_at, NOW())
        WHERE (anchor_transfer_id = $1 OR anchor_reference = $2) AND status IN ('approved', 'processing')
        RETURNING id, amount_kobo`,
      [transferId || null, reference || null]
    )
    for (const p of done.rows) {
      // Settle the driver-facing ledger wording + drop a feed-visible marker
      // at the ACTUAL money-out moment for reconciliation.
      await query(
        `UPDATE wallet_transactions SET description = 'Withdrawal — paid out to bank' WHERE reference = $1`,
        [`payout-${p.id}`]
      ).catch(() => {})
      await query(
        `INSERT INTO activity_log (actor_id, action, category, detail)
         VALUES (NULL, 'Payout Completed', 'payment', $1)`,
        [`₦${Math.round(Number(p.amount_kobo) / 100).toLocaleString()} NIP transfer settled`]
      ).catch(() => {})
    }
    return true
  }
  // failed | reversed → mark failed and return the escrowed money to the
  // driver's wallet exactly once (status filter + refund reference guard).
  const failed = await query(
    `UPDATE payout_requests SET status = 'failed', processed_at = NOW(), failure_reason = $3
      WHERE (anchor_transfer_id = $1 OR anchor_reference = $2) AND status IN ('approved', 'processing', 'completed')
      RETURNING id, driver_id, amount_kobo, anchor_reference`,
    [transferId || null, reference || null, `NIP transfer ${outcome}`]
  )
  const row = failed.rows[0]
  if (!row) return false
  await refundPayout(row.driver_id, Number(row.amount_kobo), `refund-${row.anchor_reference || row.id}`)
  return true
}

function handleTransfer(payload, outcome) {
  const event = payload.data
  const transfer = included(payload, 'NIP_TRANSFER') || included(payload, 'NIPTransfer')
  const inline = event?.attributes?.transfer
  const transferId = transfer?.id || inline?.transferId || inline?.id
    || relId(event, 'transfer') || relId(event, 'nipTransfer')
  const reference = transfer?.attributes?.reference || inline?.reference || null
  return applyTransferOutcome(transferId, reference, outcome)
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

// The payment id is the only thing we take from an unsigned body, and Anchor
// puts it in a different place per event type. Try the documented spots, then
// fall back to scanning for an inbound-payment resource id anywhere in the
// body. A wrong guess is harmless: the id is verified by an authenticated pull
// and an unknown one simply throws.
const PAYMENT_ID_RE = /\b\d{6,}-anc_(?:inb_trsf|payin|pay)\b/
function claimedPaymentId(parsed) {
  const d = parsed?.data || {}
  const direct = d.attributes?.payment?.paymentId
    || d.attributes?.paymentId
    || d.relationships?.payment?.data?.id
    || d.relationships?.payIn?.data?.id
  if (typeof direct === 'string' && direct.length <= 80) return direct
  let text = ''
  try { text = JSON.stringify(parsed) } catch { return null }
  return PAYMENT_ID_RE.exec(text)?.[0] || null
}

// ── Unsigned deliveries: verify-by-pullback ──────────────────────────────────
// The unsigned body is treated ONLY as a hint naming a resource id; the data
// we act on comes from Anchor's API, authenticated with our key. Dedup runs
// BEFORE any outbound call so crafted garbage can't burn our Anchor quota.
// Returns 'ok' (acknowledge), 'retry' (real money we could not settle — must
// come back), or false (not recognised → 401).
async function handleUnsigned(rawBody) {
  let parsed = null
  try { parsed = JSON.parse(rawBody.toString('utf8')) } catch { return false }
  const claimedType = parsed?.data?.type || ''
  if (!anchor.configured()) return false

  if (PAYIN_EVENT_TYPES.has(claimedType)) {
    const claimedPayId = claimedPaymentId(parsed)
    if (!claimedPayId) return false
    const already = await query(
      "SELECT 1 FROM anchor_events WHERE event_id = $1 AND processed = true", [`pay-${claimedPayId}`]
    )
    if (already.rows[0]) return 'ok' // settled — no Anchor call needed
    // Virtual-NUBAN payins live under /payments, Pay-with-Transfer ones under
    // /payin; which product fired the event isn't knowable from the type alone.
    let pulled
    try { pulled = await anchor.getPayment(claimedPayId) }
    catch (err) { pulled = await anchor.getPayin(claimedPayId).catch(() => { throw err }) }
    let userId = await userByNuban(
      pulled?.relationships?.virtualNuban?.data?.id || null,
      pulled?.attributes?.virtualNuban?.accountNumber || null
    )
    // Same customer fallback the signed path has always had — without it a
    // payin whose NUBAN we can't match is dropped even when Anchor told us
    // exactly which customer paid.
    if (!userId) {
      userId = await userByCustomerId(
        pulled?.relationships?.customer?.data?.id || pulled?.attributes?.customer?.customerId || null
      )
    }
    const settled = await settlePayment({
      paymentId: claimedPayId,
      amountKobo: Number(pulled?.attributes?.amount),
      currency: pulled?.attributes?.currency || 'NGN',
      ourRef: pulled?.attributes?.paymentReference || null,
      userId,
      signatureValid: false,
      source: 'api-pull',
    })
    // Real money that did not credit must NOT be acknowledged — settlePayment
    // released its claim, so a redelivery settles it once the gap is closed.
    return settled ? 'ok' : 'retry'
  }

  if (claimedType.startsWith('nip.transfer.')) {
    const inline = parsed?.data?.attributes?.transfer
    const claimedId = inline?.transferId || inline?.id || parsed?.data?.relationships?.transfer?.data?.id
    if (!claimedId || typeof claimedId !== 'string' || claimedId.length > 80) return false
    const pulled = await anchor.verifyTransfer(claimedId) // authenticated truth
    const status = (pulled?.attributes?.status || '').toUpperCase()
    const outcome = status === 'COMPLETED' ? 'successful'
      : status === 'FAILED' ? 'failed'
      : status === 'REVERSED' ? 'reversed'
      : null
    if (!outcome) return true // PENDING etc. — acknowledged, a later event settles it
    // Log once per (transfer, outcome); applyTransferOutcome is idempotent anyway
    await query(
      `INSERT INTO anchor_events (event_id, event_type, resource_id, signature_valid, processed, payload)
       VALUES ($1, $2, $3, false, true, $4) ON CONFLICT (event_id) DO NOTHING`,
      [`trsf-${claimedId}-${outcome}`, `nip.transfer.${outcome}`, claimedId, JSON.stringify({ verifiedByApiPull: true })]
    )
    await applyTransferOutcome(claimedId, pulled?.attributes?.reference || null, outcome)
    return true
  }

  // KYC decisions. Without this branch these deliveries were rejected 401 and
  // logged only as 'invalid.signature', so anchor_kyc_status never moved off
  // the placeholder we set at BVN submission — the Customers tab showed a
  // permanently pending rider even after Anchor had approved them.
  if (claimedType.startsWith('customer.identification.')) {
    const claimedId = parsed?.data?.relationships?.customer?.data?.id
      || parsed?.data?.attributes?.customer?.customerId
    if (!claimedId || typeof claimedId !== 'string' || claimedId.length > 80) return false
    const userId = await userByCustomerId(claimedId)
    if (!userId) return false // not one of ours — let it 401
    const pulled = await anchor.getCustomer(claimedId) // authenticated truth
    const status = (pulled?.attributes?.verification?.status || '').toLowerCase()
    if (!status) return false
    await query('UPDATE users SET anchor_kyc_status = $1 WHERE id = $2', [status.slice(0, 30), userId])
    await query(
      `INSERT INTO anchor_events (event_id, event_type, resource_id, signature_valid, processed, payload)
       VALUES ($1, $2, $3, false, true, $4) ON CONFLICT (event_id) DO NOTHING`,
      [`kyc-${claimedId}-${status}`, `customer.identification.${status}`, claimedId,
       JSON.stringify({ verifiedByApiPull: true, detail: `KYC ${status}` })]
    )
    return true
  }

  // Reserved account ready. Account details come ONLY from the authenticated
  // pull — trusting an unsigned body here would let a planted account number
  // redirect riders' transfers to an attacker.
  if (claimedType.startsWith('reservedAccount.')) {
    const claimedId = parsed?.data?.relationships?.reservedAccount?.data?.id
      || parsed?.data?.attributes?.reservedAccount?.accountId
      || parsed?.data?.relationships?.account?.data?.id
    if (!claimedId || typeof claimedId !== 'string' || claimedId.length > 80) return false
    const pulled = await anchor.getReservedAccount(claimedId)
    const customerId = pulled?.relationships?.customer?.data?.id
    const userId = await userByCustomerId(customerId)
    if (!userId) return false
    const a = pulled?.attributes || {}
    const d = a.accountDetails || a
    await query(
      `UPDATE users SET anchor_reserved_account_id = $1,
          reserved_account_number = COALESCE($2, reserved_account_number),
          reserved_account_bank   = COALESCE($3, reserved_account_bank),
          reserved_account_name   = COALESCE($4, reserved_account_name)
        WHERE id = $5`,
      [claimedId, d.accountNumber || null, d.bankName || d.bank?.name || null, d.accountName || null, userId]
    )
    await query(
      `INSERT INTO anchor_events (event_id, event_type, resource_id, signature_valid, processed, payload)
       VALUES ($1, 'reservedAccount.created', $2, false, true, $3) ON CONFLICT (event_id) DO NOTHING`,
      [`racct-${claimedId}`, claimedId,
       JSON.stringify({ verifiedByApiPull: true, detail: `Funding account ${d.accountNumber || 'assigned'}` })]
    )
    return true
  }

  return false
}

router.post('/webhook', webhookLimiter, async (req, res) => {
  const signature = req.headers['x-anchor-signature']
  const valid = anchor.verifyWebhookSignature(req.rawBody, signature)

  if (!valid) {
    try {
      const outcome = await handleUnsigned(req.rawBody)
      // 503 (not 200, not 401) keeps Anchor's AtLeastOnce redelivery alive for
      // money we verified but could not credit.
      if (outcome === 'retry') return res.sendStatus(503)
      if (outcome) return res.sendStatus(200)
    } catch { /* pull failed / unknown resource — fall through to rejection */ }
    // Log invalid attempts too — they're part of the monitoring story. Body
    // kept (capped) for offline diagnosis; old junk pruned opportunistically
    // so unauthenticated garbage can't grow the table forever.
    query(
      `INSERT INTO anchor_events (event_type, signature_valid, processed, payload)
       VALUES ('invalid.signature', false, false, $1)`,
      [JSON.stringify({
        headers: { 'x-anchor-signature': signature || null },
        rawBody: req.rawBody ? req.rawBody.toString('utf8').slice(0, 2000) : null,
      })]
    ).catch(() => {})
    query(
      `DELETE FROM anchor_events WHERE event_type = 'invalid.signature' AND created_at < NOW() - INTERVAL '14 days'`
    ).catch(() => {})
    return res.status(401).json({ message: 'Invalid webhook signature.' })
  }

  const payload = req.body || {}
  const event = payload.data || {}
  const eventId = event.id || null
  const eventType = event.type || 'unknown'

  let eventRowId = null
  try {
    // Record the event — the UNIQUE event_id makes redelivery a no-op.
    if (eventId) {
      const stored = await query(
        `INSERT INTO anchor_events (event_id, event_type, resource_id, payload)
         VALUES ($1, $2, $3, $4) ON CONFLICT (event_id) DO NOTHING RETURNING id`,
        [eventId, eventType, relId(event, 'payIn') || relId(event, 'transfer') || relId(event, 'customer'), JSON.stringify(payload)]
      )
      if (!stored.rows[0]) return res.sendStatus(200) // duplicate delivery
      eventRowId = stored.rows[0].id
    }

    let processed = false
    const isMoneyIn = PAYIN_EVENT_TYPES.has(eventType)
    if (isMoneyIn) processed = await handlePayin(payload)
    else if (eventType === 'reservedAccount.created') processed = await handleReservedAccount(payload, true)
    else if (eventType === 'reservedAccount.failed') processed = await handleReservedAccount(payload, false)
    else if (eventType.startsWith('nip.transfer.')) processed = await handleTransfer(payload, eventType.split('.').pop())
    else if (eventType.startsWith('customer.identification.')) processed = await handleKyc(payload, eventType.split('.').pop())
    else processed = true // informational events (customer.created, settled, …) — logged is enough

    if (eventId && processed) {
      await query('UPDATE anchor_events SET processed = true WHERE event_id = $1', [eventId])
    }
    // An unsettled payin must come back. Drop the stored event row first, or
    // the UNIQUE event_id would make the redelivery look like a duplicate and
    // swallow it before it ever reaches handlePayin again.
    if (isMoneyIn && !processed) {
      if (eventRowId) await query('DELETE FROM anchor_events WHERE id = $1', [eventRowId]).catch(() => {})
      return res.sendStatus(503)
    }
    res.sendStatus(200)
  } catch (err) {
    // Processing genuinely failed — release the event row and answer 5xx so
    // Anchor's AtLeastOnce redelivery retries the whole thing (money claims
    // released their own locks in settlePayment's catch).
    console.error('Anchor webhook error:', err.message)
    if (eventRowId) await query('DELETE FROM anchor_events WHERE id = $1', [eventRowId]).catch(() => {})
    res.sendStatus(500)
  }
})

module.exports = router
