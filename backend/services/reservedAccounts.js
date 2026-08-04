/**
 * Reserved accounts — upgrading a rider from an org-named funding account to a
 * real NUBAN in their OWN name.
 *
 * Anchor's required order (confirmed with them, Aug 2026):
 *   1. Create the IndividualCustomer (Tier 0 — name, email, phone, address).
 *   2. Verify them to Tier 2 with BVN + date of birth + gender
 *      (POST /customers/{id}/verification/individual). ASYNCHRONOUS — the
 *      verdict arrives as customer.identification.approved / .rejected / .error.
 *   3. Only then create the reserved account, passing the BVN again.
 *
 * Step 3 therefore cannot run in the same request as step 2. It is driven by
 * whichever of these happens first:
 *   • the customer.identification.approved webhook (routes/anchor.js), or
 *   • the rider's own funding-account poll (routes/wallet.js).
 * The second exists because webhook delivery is not something we control — the
 * same lesson as services/payinSettlement.js, where a payin webhook that never
 * arrived stranded a rider's ₦1,300.
 *
 * The BVN is never held in memory between requests: it is read back from the
 * AES-256-GCM vault (services/kycVault.js) at the moment it is needed.
 */
const { query } = require('../db')
const anchor = require('./anchor')
const kycVault = require('./kycVault')

const APPROVED = new Set(['approved', 'verified', 'success', 'successful'])

function isApproved(status) {
  return APPROVED.has(String(status || '').toLowerCase())
}

// Fire-and-forget audit trail, mirroring routes/wallet.js logWalletEvent.
function logEvent(userId, { eventId, eventType, action, detail }) {
  query(
    `INSERT INTO anchor_events (event_id, event_type, resource_id, signature_valid, processed, payload)
     VALUES ($1, $2, $3, true, true, $4) ON CONFLICT (event_id) DO NOTHING`,
    [eventId, eventType, userId, JSON.stringify({ source: 'feazimove-api', userId, detail: detail || null })]
  ).catch(err => console.error('anchor_events write failed:', err.message))
  query(
    "INSERT INTO activity_log (actor_id, action, category, detail) VALUES ($1, $2, 'payment', $3)",
    [userId, action, detail || null]
  ).catch(err => console.error('activity_log write failed:', err.message))
}

/**
 * Issue the rider-named reserved account, if Anchor has approved their KYC.
 *
 * Idempotent and safe to call on every poll: it exits early unless the rider
 * has a customer id, a stored BVN, and no named account yet, and it confirms
 * approval against Anchor's API rather than trusting our own cached status.
 *
 * Returns { provisioned: true, account } on success, or { provisioned: false,
 * reason } — never throws for the ordinary "not ready yet" cases, because it
 * runs inside routes that must still answer the rider.
 */
async function provisionReservedAccount(userId) {
  if (!anchor.configured()) return { provisioned: false, reason: 'anchor-not-configured' }

  const r = await query(
    `SELECT anchor_customer_id, bvn_encrypted, bvn_submitted, anchor_kyc_status,
            reserved_account_number, reserved_account_name, anchor_reserved_account_id
       FROM users WHERE id = $1`, [userId]
  )
  const u = r.rows[0]
  if (!u) return { provisioned: false, reason: 'no-user' }
  if (!u.bvn_submitted || !u.anchor_customer_id) return { provisioned: false, reason: 'kyc-not-started' }

  // Already upgraded? A named account is one whose name is NOT the org's. We
  // can't compare against a constant (the org name could change), so the
  // marker is anchor_kyc_status — set to 'account_named' once provisioned.
  if (u.anchor_kyc_status === 'account_named') return { provisioned: false, reason: 'already-named' }

  // Trust Anchor, not our cached status: a rejected or still-pending customer
  // must never reach the account call.
  const customer = await anchor.getCustomer(u.anchor_customer_id)
  const status = customer?.attributes?.verification?.status || ''
  if (!isApproved(status)) {
    // Keep our mirror honest so the Back Office shows the real state.
    if (status) {
      await query('UPDATE users SET anchor_kyc_status = $1 WHERE id = $2', [String(status).slice(0, 30), userId])
        .catch(() => {})
    }
    return { provisioned: false, reason: `kyc-${status || 'unknown'}` }
  }

  const bvn = kycVault.decrypt(u.bvn_encrypted)
  if (!bvn) {
    // The vault key is missing or the value was tampered with. Loud, because
    // the rider is verified and blocked purely by our own storage.
    console.error(`Reserved account blocked for ${userId}: BVN could not be decrypted`)
    return { provisioned: false, reason: 'bvn-unreadable' }
  }

  const acct = await anchor.createReservedAccount({ customerId: u.anchor_customer_id, bvn })
  const a = acct?.attributes || {}
  const d = a.accountDetails || a

  // Retire the old org-named account BEFORE pointing at the new one, so a
  // transfer to the number the rider still has saved keeps mapping to them.
  await query(
    `UPDATE users SET
        legacy_nuban_ids = CASE
          WHEN anchor_reserved_account_id IS NOT NULL AND NOT (anchor_reserved_account_id = ANY(legacy_nuban_ids))
          THEN array_append(legacy_nuban_ids, anchor_reserved_account_id) ELSE legacy_nuban_ids END,
        legacy_nuban_numbers = CASE
          WHEN reserved_account_number IS NOT NULL AND NOT (reserved_account_number = ANY(legacy_nuban_numbers))
          THEN array_append(legacy_nuban_numbers, reserved_account_number) ELSE legacy_nuban_numbers END
      WHERE id = $1`, [userId]
  )
  await query(
    `UPDATE users SET anchor_reserved_account_id = COALESCE($1, anchor_reserved_account_id),
        reserved_account_number = COALESCE($2, reserved_account_number),
        reserved_account_bank   = COALESCE($3, reserved_account_bank),
        reserved_account_name   = COALESCE($4, reserved_account_name),
        anchor_kyc_status = 'account_named'
      WHERE id = $5`,
    [acct?.id || null, d.accountNumber || null,
     d.bankName || d.bank?.name || null, d.accountName || null, userId]
  )
  logEvent(userId, {
    eventId: `racct-named-${acct?.id || userId}`,
    eventType: 'reservedAccount.named',
    action: 'Funding Account Upgraded',
    detail: d.accountNumber
      ? `Reserved account ${d.accountNumber} issued in the rider's own name (${d.accountName || 'name pending'})`
      : 'Reserved account requested — awaiting reservedAccount.created webhook',
  })
  return {
    provisioned: true,
    account: {
      bankName: d.bankName || d.bank?.name || null,
      accountNumber: d.accountNumber || null,
      accountName: d.accountName || null,
    },
  }
}

// Same thing, but never throws — for callers on a request path where an Anchor
// outage must not break the response.
async function tryProvisionReservedAccount(userId) {
  try { return await provisionReservedAccount(userId) }
  catch (err) {
    console.error('Reserved account provisioning failed:', err.message)
    return { provisioned: false, reason: 'error' }
  }
}

module.exports = { provisionReservedAccount, tryProvisionReservedAccount, isApproved }
