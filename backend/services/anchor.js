/**
 * Anchor (getanchor.co) API client — FeaziMove's banking rails.
 *
 * Anchor is a Banking-as-a-Service platform: customers, real NUBAN account
 * numbers, transfer-based collections, and NIP payouts. All calls follow the
 * JSON:API spec (docs.getanchor.co/reference/overview) and authenticate with
 * the `x-anchor-key` header (docs.getanchor.co/docs/authentication).
 *
 * Environments (docs.getanchor.co/docs/developer-onboarding-to-anchor-api):
 *   sandbox  https://api.sandbox.getanchor.co   (fake money — default)
 *   live     https://api.getanchor.co
 *
 * Env vars: ANCHOR_BASE_URL, ANCHOR_API_KEY, ANCHOR_WEBHOOK_TOKEN,
 *           ANCHOR_PROVIDER (ninepsb), ANCHOR_MASTER_ACCOUNT_ID
 */
const axios = require('axios')
const crypto = require('crypto')

const BASE_URL = (process.env.ANCHOR_BASE_URL || 'https://api.sandbox.getanchor.co').replace(/\/+$/, '')
// 9 Payment Service Bank is the ONLY provider Anchor issues to FeaziMove
// (confirmed with them, Aug 2026). Anything else is rejected on every account
// call, so this is not a preference to tune — it is the single valid value,
// and the env var exists only so Anchor can move us without a code change.
const PROVIDER = process.env.ANCHOR_PROVIDER || 'ninepsb'

const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})
// Read the key per-request (not at module load) so a key added to the env
// after boot — or rotated — is picked up without a restart.
http.interceptors.request.use(config => {
  config.headers['x-anchor-key'] = process.env.ANCHOR_API_KEY || ''
  return config
})

const configured = () => !!process.env.ANCHOR_API_KEY

// Normalize Anchor/axios errors into one shape the routes can surface safely.
function anchorError(err, fallback) {
  const detail = err.response?.data?.errors?.[0]?.detail
    || err.response?.data?.errors?.[0]?.title
    || err.response?.data?.message
  const e = new Error(detail || fallback)
  e.status = err.response?.status === 422 ? 422 : 502
  e.anchor = err.response?.data
  return e
}

// Anchor validates phoneNumber as Nigerian LOCAL format (07062545108) and
// rejects the international form our users register with (+2347062545108).
function toLocalPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.startsWith('234') && digits.length === 13) return '0' + digits.slice(3)
  if (digits.length === 10 && !digits.startsWith('0')) return '0' + digits
  return digits
}

// ── Customers (docs.getanchor.co/docs/create-individual-customer-1) ──────────
// Minimum: fullName, address, email, phoneNumber. BVN (identificationLevel2)
// is only needed for reserved accounts / deposit-account KYC.
async function createIndividualCustomer({ firstName, lastName, email, phoneNumber, address, level2 }) {
  const attributes = {
    fullName: { firstName, lastName },
    email,
    phoneNumber: toLocalPhone(phoneNumber),
    address: {
      addressLine_1: address?.line1 || 'Lagos',
      city: address?.city || 'Lagos',
      state: address?.state || 'Lagos',
      postalCode: address?.postalCode || '100001',
      country: 'NG',
    },
  }
  if (level2?.bvn) {
    attributes.identificationLevel2 = {
      dateOfBirth: level2.dateOfBirth,
      gender: level2.gender,
      bvn: level2.bvn,
    }
  }
  try {
    const res = await http.post('/api/v1/customers', { data: { type: 'IndividualCustomer', attributes } })
    return res.data.data // { id: '…-anc_ind_cst', type, attributes }
  } catch (err) { throw anchorError(err, 'Could not create customer on Anchor.') }
}

// ── Pay with Transfer (docs.getanchor.co/docs/pay-with-transfer) ─────────────
// Temporary single-use NUBAN for an exact amount — our card-checkout
// replacement. Expires after payment or expirySeconds, whichever first.
// Anchor fires `payin.received` on payment.
async function createPayWithTransfer({ reference, fullName, email, amountKobo, expirySeconds = 1800, metadata }) {
  try {
    const res = await http.post('/pay/pay-with-transfer', {
      data: {
        type: 'PayWithTransfer',
        attributes: {
          reference,
          customer: { fullName, email },
          expiryTime: expirySeconds,
          provider: PROVIDER,
          amount: amountKobo,
          ...(metadata ? { metadata } : {}),
        },
      },
    })
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not create a payment account.') }
}

// ── Update a customer's registered name (docs.getanchor.co/docs/manage-individual)
//
// Anchor matches the BVN against the name on the CUSTOMER record — not against
// anything sent in the KYC call. So a customer created under a shortened name
// ("Femi Odunuga") can never pass a BVN that reads "Olorunfemi Odunuga", and
// every retry re-asks the same question for another ₦50. Correcting the record
// is the only thing that changes the answer.
//
// Anchor refuses this once KYC has COMPLETED, which is why it only ever runs
// before verification succeeds.
async function updateIndividualCustomerName(customerId, { firstName, lastName }) {
  try {
    const res = await http.put(
      `/api/v1/customers/update/${encodeURIComponent(customerId)}`,
      { data: { type: 'IndividualCustomer', attributes: { fullName: { firstName, lastName } } } }
    )
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not update your name with our banking partner.') }
}

// ── Individual customer KYC (docs.getanchor.co/reference/kyc-validation) ─────
// Upgrades a Tier 0 customer (name/email/phone/address only) to Tier 2 by
// submitting BVN + date of birth + gender. REQUIRED before Anchor will issue a
// reserved account in the rider's own name — without it every account falls
// back to one in the organization's name (confirmed with Anchor, Aug 2026).
//
// The result is ASYNCHRONOUS: this returns "KYC initiated", and the verdict
// arrives as customer.identification.approved / .rejected / .error.
//
// Anchor requires the name and phone number on the BVN to MATCH the ones given
// at customer creation, so a rider whose profile name differs from their bank
// records is rejected — the reason is surfaced rather than swallowed.
async function verifyIndividualCustomer(customerId, { bvn, dateOfBirth, gender }) {
  // Anchor expects 'Male'/'Female'/'Others'; we collect lowercase.
  const g = String(gender || '').trim()
  const normalizedGender = g ? g[0].toUpperCase() + g.slice(1).toLowerCase() : undefined
  try {
    const res = await http.post(
      `/api/v1/customers/${encodeURIComponent(customerId)}/verification/individual`,
      {
        data: {
          type: 'Verification',
          attributes: {
            level: 'TIER_2',
            level2: {
              bvn,
              dateOfBirth: String(dateOfBirth || '').slice(0, 10), // YYYY-MM-DD
              gender: normalizedGender,
            },
          },
        },
      }
    )
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not submit your details for verification.') }
}

// ── Reserved Accounts (docs.getanchor.co/docs/reserved-accounts) ─────────────
// Permanent NUBAN in the customer's own name — requires BVN (CBN KYC).
// Result arrives via `reservedAccount.created` / `reservedAccount.failed`.
//
// The BVN is passed even when the customer already exists: Anchor asks for it
// on this call in addition to the customer's completed KYC verification.
// Anchor composes the name a payer sees as "Merchant Name / Customer Name",
// and it takes the customer half from THIS block — not from the linked customer
// record. Sending only the relationship (which is what the customerId branch
// used to do) produced Femi Odunuga's account, labelled literally
// "FeaziMove Technologies Ltd / " with nothing after the slash. The identity is
// therefore always sent; the relationship is kept as well, so the account stays
// tied to the customer whose KYC was actually approved.
async function createReservedAccount({ customerId, firstName, lastName, email, bvn }) {
  const body = {
    data: {
      type: 'ReservedAccount',
      attributes: {
        provider: PROVIDER,
        customer: { individualCustomer: { fullName: { firstName, lastName }, email, bvn } },
      },
      ...(customerId
        ? { relationships: { customer: { data: { id: customerId, type: 'IndividualCustomer' } } } }
        : {}),
    },
  }
  try {
    const res = await http.post('/pay/reserved-account', body)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not create a reserved account.') }
}

async function getPayin(payinId) {
  try {
    const res = await http.get(`/pay/payin/${encodeURIComponent(payinId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch payment details.') }
}

// Every Pay-with-Transfer payin Anchor holds for us, newest first. This is the
// ONLY place a PWT payment is visible: it never appears under
// /inbound-transfers (that is the NUBAN rail — asking there returns 412), so
// without this there is no way to answer "did the money arrive?" when a webhook
// does not turn up. Anchor only lists a payin once money has actually landed
// against the session, so the list stays short.
//
// Best-effort by design: reconciliation calls this on a rider's poll and must
// degrade to "not found yet" rather than break the poll.
async function listPayins({ maxPages = 5 } = {}) {
  try {
    const out = []
    for (let page = 0; page < maxPages; page++) {
      const res = await http.get(`/pay/payin?page=${page}&size=50`)
      const batch = res.data?.data || []
      out.push(...batch)
      const pages = res.data?.meta?.pagination?.totalPages ?? 1
      if (batch.length === 0 || page >= pages - 1) break
    }
    return out
  } catch (err) { throw anchorError(err, 'Could not list payments.') }
}

// Find an existing customer by email — used when creation is refused with
// "Customer with Email already exist" (e.g. a FeaziMove account was deleted
// and re-registered; the Anchor-side record outlives ours and gets adopted).
async function findCustomerByEmail(email) {
  try {
    const res = await http.get(`/api/v1/customers?query=${encodeURIComponent(email)}`)
    const hit = (res.data.data || []).find(
      c => (c.attributes?.email || '').toLowerCase() === (email || '').toLowerCase()
    )
    return hit || null
  } catch (err) { throw anchorError(err, 'Could not look up the customer.') }
}

// Authenticated pull of a customer — the trusted source of a KYC decision when
// a customer.identification.* delivery can't be signature-checked. The verdict
// lives at attributes.verification.status.
async function getCustomer(customerId) {
  try {
    const res = await http.get(`/api/v1/customers/${encodeURIComponent(customerId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch the customer.') }
}

// Authenticated pull of a reserved account — same role for reservedAccount.*
// deliveries. Account details from an UNSIGNED body are never trusted: a
// planted account number would redirect a rider's transfer to an attacker.
async function getReservedAccount(accountId) {
  try {
    const res = await http.get(`/pay/reserved-account/${encodeURIComponent(accountId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch the reserved account.') }
}

// Authenticated pull of a virtual-NUBAN payment — the trusted source for the
// verify-by-pullback path when a webhook delivery's signature can't be checked.
async function getPayment(paymentId) {
  try {
    const res = await http.get(`/api/v1/payments/${encodeURIComponent(paymentId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch the payment.') }
}

// ── Inbound transfers — money arriving on our account numbers ────────────────
// The same ledger the Anchor dashboard shows under Money Movement → Inbound
// Transfers, and the fallback source of truth when a payin webhook never
// arrives (see services/payinSettlement.js).
//
// Preferred over /api/v1/payments, which returns the SAME records (identical
// '-anc_inb_trsf' ids) but omits `status` entirely — so it cannot distinguish
// settled money from a transfer that is still pending or was reversed. These
// records also carry the NIP `sessionId`, the bank-grade identifier needed to
// trace a disputed transfer with the sending bank.
//
// `accountNumberId` is the ONLY filter Anchor honours here: `virtualNubanId`,
// `accountNumber` and `status` are silently ignored and return the whole
// organization's transfers. The result is re-filtered locally regardless, so a
// param rename on Anchor's side can never credit one rider with another's
// money.
async function listInboundTransfersForNuban(nubanId) {
  if (!nubanId) return []
  try {
    const res = await http.get(`/api/v1/inbound-transfers?accountNumberId=${encodeURIComponent(nubanId)}`)
    return (res.data.data || []).filter(t => t?.relationships?.accountNumber?.data?.id === nubanId)
  } catch (err) { throw anchorError(err, 'Could not list inbound transfers for that account.') }
}

// Every inbound transfer the organization has received, newest first — the
// whole NUBAN rail in one call rather than one call per rider. Money can land
// on a rider's permanent funding account with no top-up session open (they just
// transfer, unprompted), so there is no per-user hint to sweep from; the only
// way to find it without asking about every rider individually is to ask for
// the lot and match each one back locally.
//
// Callers MUST resolve each transfer to a user themselves: this list also
// contains InboundPay settlements of our own payouts, which belong to nobody.
async function listInboundTransfers({ maxPages = 5 } = {}) {
  try {
    const out = []
    for (let page = 0; page < maxPages; page++) {
      const res = await http.get(`/api/v1/inbound-transfers?page=${page}&size=50`)
      const batch = res.data?.data || []
      out.push(...batch)
      const pages = res.data?.meta?.pagination?.totalPages ?? 1
      if (batch.length === 0 || page >= pages - 1) break
    }
    return out
  } catch (err) { throw anchorError(err, 'Could not list inbound transfers.') }
}

// Authenticated pull of one inbound transfer — the trusted source for a payin
// webhook whose signature can't be checked.
async function getInboundTransfer(transferId) {
  try {
    const res = await http.get(`/api/v1/inbound-transfers/${encodeURIComponent(transferId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch the inbound transfer.') }
}

// The /pay/* product (Pay-with-Transfer, Reserved Accounts) only exists for
// organizations approved for the payment program IN PRODUCTION — sandbox
// returns "Endpoint not found". Callers use this to fall back to Virtual
// NUBANs, which behave equivalently and exist in both environments.
function isUnavailable(err) {
  const e = err?.anchor?.errors?.[0]
  if (!e) return false
  // 404 — the endpoint does not exist in this environment (sandbox).
  if (e.status === '404') return true
  // 412 "Invalid Organization" — LIVE, but the /pay product is not enabled for
  // our organization yet. Practically identical to 404: the feature is not
  // available to us, so use the Virtual NUBAN path instead. Without this a
  // rider simply cannot fund — the error was rethrown as a 502.
  const text = `${e.title || ''} ${e.detail || ''}`
  if (e.status === '412' && /invalid organization|not (support|enable)|unavailable/i.test(text)) return true
  return false
}

// ── Virtual NUBANs (docs.getanchor.co/docs/virtual-nubans) ───────────────────
// "A pointer to a bank account" — a real account number that settles into one
// of our deposit accounts. Payments to it fire `payment.received` with a
// virtualNuban relationship. Live accounts are issued by 9PSB.
async function createVirtualNuban({ settlementAccountId, provider } = {}) {
  const accountId = settlementAccountId || await getMasterAccountId()
  const attempt = async prov => {
    const res = await http.post('/api/v1/virtual-nubans', {
      data: {
        type: 'VirtualNuban',
        attributes: { provider: prov },
        relationships: { settlementAccount: { data: { id: accountId, type: 'DepositAccount' } } },
      },
    })
    return res.data.data // attributes: { accountNumber, accountName, bank: { name }, permanent, status }
  }
  // 9PSB is the ONLY provider Anchor issues to FeaziMove. There used to be a
  // retry against a second provider here, from a period when it was unclear
  // which one was enabled — it is gone: with one provider the retry could only
  // ever be a doomed second call that slowed every failure down and buried the
  // real error behind a second one.
  try {
    return await attempt(provider || PROVIDER)
  } catch (err) {
    throw anchorError(err, 'Could not create an account number.')
  }
}

// ── Payout rails (docs.getanchor.co/docs/bank-transfer) ──────────────────────
async function listBanks() {
  try {
    const res = await http.get('/api/v1/banks')
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch the bank list.') }
}

async function verifyAccount(bankCode, accountNumber) {
  try {
    const res = await http.get(`/api/v1/payments/verify-account/${encodeURIComponent(bankCode)}/${encodeURIComponent(accountNumber)}`)
    return res.data.data // includes accountName
  } catch (err) { throw anchorError(err, 'Could not verify that bank account.') }
}

// Fetch a saved beneficiary — used to re-check the account holder's name on
// every payout approval (first-party enforcement), including when the
// counterparty was created long ago.
async function getCounterparty(counterpartyId) {
  try {
    const res = await http.get(`/api/v1/counterparties/${encodeURIComponent(counterpartyId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not fetch the beneficiary.') }
}

// "A counterparty is simply the person or entity you want to transfer money
// to — a saved beneficiary." Re-creating an existing one returns the original.
async function createCounterparty({ bankCode, accountName, accountNumber }) {
  try {
    const res = await http.post('/api/v1/counterparties', {
      data: {
        type: 'CounterParty',
        attributes: { bankCode, accountName, accountNumber, verifyName: true },
      },
    })
    return res.data.data // { id: '…-anc_cp', … }
  } catch (err) { throw anchorError(err, 'Could not create the transfer beneficiary.') }
}

// NIP transfer from our master deposit account to a counterparty.
// reference: unique, lowercase alphanumeric, ≤100 chars (our payout id).
async function initiateNipTransfer({ amountKobo, reason, reference, accountId, counterpartyId }) {
  try {
    const res = await http.post('/api/v1/transfers', {
      data: {
        type: 'NIPTransfer',
        attributes: { amount: amountKobo, currency: 'NGN', reason: (reason || '').slice(0, 100), reference },
        relationships: {
          account: { data: { id: accountId, type: 'DepositAccount' } },
          counterParty: { data: { id: counterpartyId, type: 'CounterParty' } },
        },
      },
    })
    return res.data.data // { id: '…-anc_trsf', attributes: { status: 'PENDING', … } }
  } catch (err) { throw anchorError(err, 'Could not initiate the transfer.') }
}

async function verifyTransfer(transferId) {
  try {
    const res = await http.get(`/api/v1/transfers/verify/${encodeURIComponent(transferId)}`)
    return res.data.data
  } catch (err) { throw anchorError(err, 'Could not verify the transfer.') }
}

// Reconciliation lookup: did a transfer with OUR reference actually get
// created at Anchor? Used when transfer initiation errors ambiguously (e.g.
// timeout) — reverting a payout to retryable is only safe if Anchor has no
// record of it, otherwise a retry would double-pay the driver.
async function findTransferByReference(reference) {
  try {
    const res = await http.get('/api/v1/transfers')
    return (res.data.data || []).find(t => t.attributes?.reference === reference) || null
  } catch (err) { throw anchorError(err, 'Could not list transfers.') }
}

// The account driver payouts are debited from. This MUST be the same account
// the Anchor dashboard settles Pay-with-Transfer collections into (Settings →
// Payment Settings → Payout), or money accumulates in one pot while withdrawals
// drain another.
//
// Configure explicitly via ANCHOR_MASTER_ACCOUNT_ID. Falling back to accounts[0]
// picked whichever account Anchor happened to list first — for an org with both
// a BUSINESS and a MASTER account that is an arbitrary choice that can change
// under us, so the account Anchor itself types as MASTER is preferred first.
let cachedMasterAccountId = null
async function getMasterAccountId() {
  if (process.env.ANCHOR_MASTER_ACCOUNT_ID) return process.env.ANCHOR_MASTER_ACCOUNT_ID
  if (cachedMasterAccountId) return cachedMasterAccountId
  try {
    const res = await http.get('/api/v1/accounts')
    const accounts = res.data.data || []
    const root = accounts.find(a => (a.attributes?.type || '').toUpperCase() === 'MASTER')
      || accounts.find(a => (a.attributes?.accountName || '').toUpperCase().includes('ROOT'))
      || accounts[0]
    if (!root) throw new Error('No deposit account found on the Anchor organization.')
    cachedMasterAccountId = root.id
    return root.id
  } catch (err) { throw anchorError(err, 'Could not find the master account.') }
}

// ── Webhook signature (docs.getanchor.co/docs/verify-webhooks) ───────────────
// Documented: x-anchor-signature = Base64( hex( HMAC_SHA1(rawBody, token) ) )
// In practice implementations differ on two axes — token treated as text vs
// hex-decoded bytes, and digest base64'd raw vs as a hex string — so accept
// any variant of the same scheme and report which one matched. Returns the
// variant name (truthy) or false.
function verifyWebhookSignature(rawBody, signature) {
  const token = process.env.ANCHOR_WEBHOOK_TOKEN
  if (!token || !signature || !rawBody) return false
  const keys = [['text', token]]
  if (/^[0-9a-fA-F]+$/.test(token) && token.length % 2 === 0) {
    keys.push(['hexkey', Buffer.from(token, 'hex')])
  }
  const candidates = []
  for (const [keyName, key] of keys) {
    const mac = k => crypto.createHmac('sha1', k).update(rawBody)
    candidates.push([`${keyName}+hex64`, Buffer.from(mac(key).digest('hex')).toString('base64')])
    candidates.push([`${keyName}+raw64`, mac(key).digest('base64')])
  }
  for (const [name, expected] of candidates) {
    try {
      if (signature.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return name
    } catch { /* length mismatch — try next */ }
  }
  return false
}

module.exports = {
  configured,
  createIndividualCustomer,
  updateIndividualCustomerName,
  verifyIndividualCustomer,
  createPayWithTransfer,
  createReservedAccount,
  createVirtualNuban,
  isUnavailable,
  getPayin,
  listPayins,
  getPayment,
  listInboundTransfersForNuban,
  listInboundTransfers,
  getInboundTransfer,
  getCustomer,
  getReservedAccount,
  findCustomerByEmail,
  listBanks,
  verifyAccount,
  createCounterparty,
  getCounterparty,
  initiateNipTransfer,
  verifyTransfer,
  findTransferByReference,
  getMasterAccountId,
  verifyWebhookSignature,
}
