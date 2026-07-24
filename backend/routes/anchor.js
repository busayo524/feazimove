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
 * trusted directly — instead, the claimed payment/transfer id is re-fetched
 * from Anchor's API with our key and the AUTHENTICATED response is processed.
 *
 * Money idempotency is keyed on the PAYMENT id ('pay-<paymentId>' rows in
 * anchor_events), shared by the signed path and the pull path — so the same
 * payment arriving once organically and once as a signed resend can only
 * ever credit once. A failed credit releases its claim so a later delivery
 * can retry; a processed claim is permanent.
 *
 * NO auth middleware here — Anchor is not a logged-in user. The signature
 * (or the authenticated API pull) IS the authentication.
 */
const express = require('express')
const rateLimit = require('express-rate-limit')
const { query } = require('../db')
const anchor = require('../services/anchor')
const { creditTransaction, creditPendingForUser, directCredit, refundPayout } = require('../services/walletLedger')

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

// ── The single money gate for incoming payments ──────────────────────────────
// Claims the payment id, credits through exactly one path, marks the claim
// processed on success, releases it on failure (so a later delivery retries
// once e.g. a NUBAN→user mapping exists). Returns true when settled (now or
// previously), false when the recipient can't be resolved yet.
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
  if (!claim.rows[0]) return true // already settled via the other delivery path
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
      // Recipient unresolved — release the claim so redelivery can retry
      await query('DELETE FROM anchor_events WHERE id = $1', [claim.rows[0].id])
    }
    return ok
  } catch (err) {
    await query('DELETE FROM anchor_events WHERE id = $1', [claim.rows[0].id]).catch(() => {})
    throw err
  }
}

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

// ── Unsigned deliveries: verify-by-pullback ──────────────────────────────────
// The unsigned body is treated ONLY as a hint naming a resource id; the data
// we act on comes from Anchor's API, authenticated with our key. Dedup runs
// BEFORE any outbound call so crafted garbage can't burn our Anchor quota.
async function handleUnsigned(rawBody) {
  let parsed = null
  try { parsed = JSON.parse(rawBody.toString('utf8')) } catch { return false }
  const claimedType = parsed?.data?.type || ''
  if (!anchor.configured()) return false

  if (claimedType === 'payment.received') {
    const claimedPayId = parsed?.data?.attributes?.payment?.paymentId
    if (!claimedPayId || typeof claimedPayId !== 'string' || claimedPayId.length > 80) return false
    const already = await query(
      "SELECT 1 FROM anchor_events WHERE event_id = $1 AND processed = true", [`pay-${claimedPayId}`]
    )
    if (already.rows[0]) return true // settled — no Anchor call needed
    const pulled = await anchor.getPayment(claimedPayId) // throws on unknown id
    const userId = await userByNuban(
      pulled?.relationships?.virtualNuban?.data?.id || null,
      pulled?.attributes?.virtualNuban?.accountNumber || null
    )
    await settlePayment({
      paymentId: claimedPayId,
      amountKobo: Number(pulled?.attributes?.amount),
      currency: pulled?.attributes?.currency || 'NGN',
      ourRef: pulled?.attributes?.paymentReference || null,
      userId,
      signatureValid: false,
      source: 'api-pull',
    })
    return true // hint led to a real payment — acknowledged regardless of settle outcome (retries release-claim path)
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

  return false
}

router.post('/webhook', webhookLimiter, async (req, res) => {
  const signature = req.headers['x-anchor-signature']
  const valid = anchor.verifyWebhookSignature(req.rawBody, signature)

  if (!valid) {
    try {
      if (await handleUnsigned(req.rawBody)) return res.sendStatus(200)
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
    if (eventType === 'payin.received' || eventType === 'payment.received') processed = await handlePayin(payload)
    else if (eventType === 'reservedAccount.created') processed = await handleReservedAccount(payload, true)
    else if (eventType === 'reservedAccount.failed') processed = await handleReservedAccount(payload, false)
    else if (eventType.startsWith('nip.transfer.')) processed = await handleTransfer(payload, eventType.split('.').pop())
    else if (eventType.startsWith('customer.identification.')) processed = await handleKyc(payload, eventType.split('.').pop())
    else processed = true // informational events (customer.created, settled, …) — logged is enough

    if (eventId && processed) {
      await query('UPDATE anchor_events SET processed = true WHERE event_id = $1', [eventId])
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
