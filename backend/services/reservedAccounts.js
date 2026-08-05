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

// Statuses meaning "Anchor never took the check" — as opposed to took it and
// is deciding ('submitted'), or took it and said no ('rejected'). Only these
// are worth sending again: resubmitting the same BVN after a real rejection
// costs money and cannot change the answer.
//   verification_unsent — we saw the refusal (routes/wallet.js)
//   unverified          — Anchor's own word for a customer with no check on file
// Anchor names the exact fields that failed. "BVN: rejected" — all we used to
// keep — tells a rider nothing they can act on, while the payload underneath
// says plainly which of name, phone or date of birth disagreed with their bank
// record. Each rejection costs ₦50, so the reason has to be worth the money.
const ITEM_LABELS = {
  FULL_NAME: 'the full name',
  PHONE_NUMBER: 'the phone number',
  DATE_OF_BIRTH: 'the date of birth',
  GENDER: 'the gender',
}

function explainVerification(customer) {
  const details = customer?.attributes?.verification?.details
  if (!Array.isArray(details)) return null
  const parts = []
  for (const d of details) {
    if (!d?.status || String(d.status).toLowerCase() === 'approved') continue
    const failed = (d.validatedItems || [])
      .filter(i => String(i?.status || '').toUpperCase() !== 'APPROVED')
      .map(i => ITEM_LABELS[i.item] || String(i.item || '').toLowerCase().replace(/_/g, ' '))
    parts.push(failed.length
      ? `${failed.join(' and ')} on the BVN does not match this account`
      : `${d.type || 'check'}: ${d.comment || d.status}`)
  }
  return parts.join('; ') || null
}

const RESUBMIT_WHEN = new Set(['verification_unsent', 'unverified'])
const RESUBMIT_COOLDOWN_MINUTES = 60

/**
 * Re-send a Tier 2 check that never reached Anchor.
 *
 * On 4 Aug 2026 every rider's KYC was being refused with HTTP 400 "Insufficient
 * balance" — Anchor bills per BVN lookup and the wallet was empty. Nothing
 * retried, because the rest of this file only ever ASKS Anchor for a verdict;
 * it never re-asks the question. So funding the Anchor wallet would have fixed
 * nothing on its own: every affected rider would have had to be told, one by
 * one, to type their BVN in again.
 *
 * The BVN is already in the vault, so the rider need not be involved at all.
 * Throttled to one attempt an hour per rider, and the timestamp is claimed
 * atomically BEFORE the call — two concurrent wallet polls must not buy two
 * lookups.
 *
 * Returns true if a check was sent. Never throws.
 */
async function resubmitStalledVerification(userId) {
  try {
    if (!anchor.configured()) return false
    const r = await query(
      `SELECT anchor_customer_id, bvn_encrypted, bvn_submitted, anchor_kyc_status,
              date_of_birth, gender
         FROM users WHERE id = $1`, [userId]
    )
    const u = r.rows[0]
    if (!u?.bvn_submitted || !u.anchor_customer_id || !u.bvn_encrypted) return false
    if (!RESUBMIT_WHEN.has(String(u.anchor_kyc_status || '').toLowerCase())) return false
    if (!u.date_of_birth || !u.gender) return false // Anchor requires both

    // Atomic claim: whoever sets the timestamp owns this hour's attempt.
    const claimed = await query(
      `UPDATE users SET anchor_kyc_last_attempt = NOW()
        WHERE id = $1
          AND (anchor_kyc_last_attempt IS NULL
               OR anchor_kyc_last_attempt < NOW() - INTERVAL '${RESUBMIT_COOLDOWN_MINUTES} minutes')
        RETURNING id`, [userId]
    )
    if (!claimed.rows[0]) return false

    const bvn = kycVault.decrypt(u.bvn_encrypted)
    if (!bvn) {
      console.error(`KYC resubmission blocked for ${userId}: BVN could not be decrypted`)
      return false
    }

    try {
      await anchor.verifyIndividualCustomer(u.anchor_customer_id, {
        bvn,
        dateOfBirth: new Date(u.date_of_birth).toISOString().slice(0, 10),
        gender: u.gender,
      })
      await query(
        "UPDATE users SET anchor_kyc_status = 'submitted', anchor_kyc_reason = NULL WHERE id = $1",
        [userId]
      )
      logEvent(userId, {
        eventId: `kyc-resent-${userId}-${Date.now()}`,
        eventType: 'wallet.setup.resent',
        action: 'KYC Re-sent To Anchor',
        detail: 'A verification that Anchor had refused was automatically sent again',
      })
      return true
    } catch (err) {
      const rejected = err.status === 422
      await query(
        'UPDATE users SET anchor_kyc_status = $1, anchor_kyc_reason = $2 WHERE id = $3',
        [rejected ? 'rejected' : 'verification_unsent',
         rejected
           ? (err.message || '').slice(0, 500)
           : 'We could not complete the check with our banking partner. Nothing is wrong with your details — we will keep trying.',
         userId]
      )
      logEvent(userId, {
        eventId: `kyc-resend-failed-${userId}-${Date.now()}`,
        eventType: rejected ? 'wallet.setup.rejected' : 'wallet.setup.error',
        action: rejected ? 'KYC Rejected On Retry' : 'KYC Retry Refused By Anchor',
        detail: (err.message || 'unknown error').slice(0, 280),
      })
      return false
    }
  } catch (err) {
    console.error('KYC resubmission failed:', err.message)
    return false
  }
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
async function provisionReservedAccount(userId, { force = false } = {}) {
  if (!anchor.configured()) return { provisioned: false, reason: 'anchor-not-configured' }

  const r = await query(
    `SELECT name, email, anchor_customer_id, bvn_encrypted, bvn_submitted, anchor_kyc_status,
            reserved_account_number, reserved_account_name, anchor_reserved_account_id
       FROM users WHERE id = $1`, [userId]
  )
  const u = r.rows[0]
  if (!u) return { provisioned: false, reason: 'no-user' }
  if (!u.bvn_submitted || !u.anchor_customer_id) return { provisioned: false, reason: 'kyc-not-started' }

  // Already upgraded? A named account is one whose name is NOT the org's. We
  // can't compare against a constant (the org name could change), so the
  // marker is anchor_kyc_status — set to 'account_named' once provisioned.
  // `force` exists for accounts Anchor issued under a wrong or blank label —
  // they are "named" as far as this flag knows, but not with the rider's name,
  // and only a fresh account can carry a corrected one.
  if (u.anchor_kyc_status === 'account_named' && !force) return { provisioned: false, reason: 'already-named' }

  // Trust Anchor, not our cached status: a rejected or still-pending customer
  // must never reach the account call.
  const customer = await anchor.getCustomer(u.anchor_customer_id)
  const status = customer?.attributes?.verification?.status || ''
  if (!isApproved(status)) {
    // Keep our mirror honest so the Back Office shows the real state, and carry
    // Anchor's own wording across so a rejected rider is told what to correct.
    if (status) {
      const why = explainVerification(customer)
      await query(
        'UPDATE users SET anchor_kyc_status = $1, anchor_kyc_reason = COALESCE($2, anchor_kyc_reason) WHERE id = $3',
        [String(status).slice(0, 30), why || null, userId]
      ).catch(() => {})
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

  // The name here is what a payer will read after the slash, so it comes from
  // the registered name — the same one Anchor matched against the BVN.
  const parts = String(u.name || '').trim().split(/\s+/).filter(Boolean)
  const acct = await anchor.createReservedAccount({
    customerId: u.anchor_customer_id,
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : (parts[0] || ''),
    email: u.email,
    bvn,
  })
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
        anchor_kyc_status = 'account_named',
        anchor_kyc_reason = NULL
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
async function tryProvisionReservedAccount(userId, opts) {
  try { return await provisionReservedAccount(userId, opts) }
  catch (err) {
    console.error('Reserved account provisioning failed:', err.message)
    return { provisioned: false, reason: 'error' }
  }
}

module.exports = {
  provisionReservedAccount, tryProvisionReservedAccount, isApproved,
  resubmitStalledVerification,
}
