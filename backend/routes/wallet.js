/**
 * Wallet routes — balance, funding (via Anchor bank transfers), withdrawals.
 *
 * Funding model (Anchor, docs.getanchor.co):
 *   • Top-up / ride payment → a temporary Pay-with-Transfer NUBAN for the
 *     exact amount (no BVN needed). Rider transfers to it; Anchor fires
 *     payin.received at /api/anchor/webhook which credits the wallet.
 *   • Optional permanent reserved account (rider's own NUBAN, requires BVN):
 *     any transfer to it auto-credits the wallet, forever.
 * The old Paystack card flow is fully removed.
 */
const express  = require('express')
const { body, param } = require('express-validator')
const crypto   = require('crypto')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')
const { validate }    = require('../middleware/validate')
const { consumeChallenge } = require('../services/actionChallenges')
const analytics = require('../services/analytics')
const anchor = require('../services/anchor')
const kycVault = require('../services/kycVault')
const { requireTestAccount } = require('../services/paymentsGate')
const { reconcileUserPayins } = require('../services/payinSettlement')
const { tryProvisionReservedAccount, resubmitStalledVerification } = require('../services/reservedAccounts')
const { runAmlChecksOnPayout, escrowWithdrawal } = require('../services/walletLedger')

const router = express.Router()
router.use(requireAuth)

// Every user who moves money gets an Anchor Individual Customer record
// (docs.getanchor.co/docs/create-individual-customer-1) — created lazily the
// first time it's needed and remembered on users.anchor_customer_id.
async function ensureAnchorCustomer(userId) {
  const u = await query(
    'SELECT name, email, phone, city, area, residential_address, anchor_customer_id FROM users WHERE id = $1',
    [userId]
  )
  const user = u.rows[0]
  if (!user) { const e = new Error('User not found.'); e.status = 404; throw e }
  if (user.anchor_customer_id) return { customerId: user.anchor_customer_id, user }
  if (!user.email) { const e = new Error('Please add an email to your profile first.'); e.status = 422; throw e }
  const parts = (user.name || '').trim().split(/\s+/)
  let customer
  try {
    customer = await anchor.createIndividualCustomer({
      firstName: parts[0] || 'FeaziMove',
      lastName: parts.slice(1).join(' ') || 'User',
      email: user.email,
      phoneNumber: user.phone,
      // The address the user gave at wallet setup is the real one; area/city
      // are coarse ride-matching fields and only stand in when it is absent.
      address: {
        line1: user.residential_address || user.area || 'Lagos',
        city: user.city || 'Lagos',
        state: 'Lagos',
      },
    })
  } catch (err) {
    // The email is already registered at Anchor (e.g. a deleted-and-recreated
    // FeaziMove account) — adopt the existing customer instead of failing.
    if (!/already exist/i.test(err.message || '')) throw err
    customer = await anchor.findCustomerByEmail(user.email)
    if (!customer) throw err
  }
  await query('UPDATE users SET anchor_customer_id = $1 WHERE id = $2', [customer.id, userId])
  return { customerId: customer.id, user }
}

// Back-office trail for the steps FeaziMove ITSELF initiates against Anchor.
// anchor_events was previously written only by the inbound webhook receiver, so
// a rider completing BVN wallet setup left no trace anywhere in the Back Office
// — the Transaction Monitor showed nothing because nothing inbound had happened
// yet. These rows carry payload.source = 'feazimove-api' so the monitor can tell
// them apart from Anchor's own deliveries (their signature_valid means nothing).
// Fire-and-forget: an audit write must never fail the user's wallet setup.
function logWalletEvent(userId, { eventId, eventType, action, detail }) {
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

// Anchor's /pay products (amount-locked temporary accounts, reserved accounts)
// only exist in PRODUCTION for approved payment programs. In sandbox — and as
// a graceful fallback — each user gets ONE permanent Virtual NUBAN pointing at
// our master deposit account; payments to it are matched to the user by the
// NUBAN id stored here (see routes/anchor.js handlePayin).
async function ensureFundingNuban(userId) {
  const u = await query(
    'SELECT reserved_account_number, reserved_account_bank, reserved_account_name FROM users WHERE id = $1', [userId]
  )
  if (u.rows[0]?.reserved_account_number) {
    return {
      bankName: u.rows[0].reserved_account_bank,
      accountNumber: u.rows[0].reserved_account_number,
      accountName: u.rows[0].reserved_account_name,
    }
  }
  const nuban = await anchor.createVirtualNuban()
  const a = nuban?.attributes || {}
  const details = {
    // Last-resort label only — but it MUST name the bank the account actually
    // sits at, because the rider picks that institution in their banking app.
    // 9PSB is the only provider Anchor issues to us, so it is the safe default.
    bankName: a.bank?.name || a.bankName || '9 Payment Service Bank',
    accountNumber: a.accountNumber,
    accountName: a.accountName,
  }
  // Guarded write: if a concurrent request already saved a NUBAN for this
  // user, keep THAT one (overwriting would orphan payments sent to the number
  // the other request displayed). The extra Anchor-side NUBAN is never shown
  // to anyone, so it's harmless.
  const saved = await query(
    `UPDATE users SET anchor_reserved_account_id = $1, reserved_account_number = $2,
        reserved_account_bank = $3, reserved_account_name = $4
      WHERE id = $5 AND reserved_account_number IS NULL RETURNING id`,
    [nuban.id, details.accountNumber, details.bankName, details.accountName, userId]
  )
  if (!saved.rows[0]) {
    const winner = await query(
      'SELECT reserved_account_number, reserved_account_bank, reserved_account_name FROM users WHERE id = $1', [userId]
    )
    return {
      bankName: winner.rows[0].reserved_account_bank,
      accountNumber: winner.rows[0].reserved_account_number,
      accountName: winner.rows[0].reserved_account_name,
    }
  }
  return details
}

// ── Get wallet balance ────────────────────────────────────────────────────────
// A rider who gave up waiting and closed the app stops polling /fund/status,
// so that route's reconciliation never runs for them. Catch it here instead:
// if they have a top-up that never completed, check Anchor once before
// answering. Guarded on that row existing so the ordinary balance read — which
// every screen makes — never costs an Anchor call.
router.get('/balance', async (req, res, next) => {
  try {
    const unsettled = await query(
      `SELECT 1 FROM wallet_transactions
        WHERE user_id = $1 AND type = 'credit' AND gateway = 'anchor'
          AND status IN ('pending', 'failed') AND created_at >= NOW() - INTERVAL '7 days' LIMIT 1`,
      [req.user.id]
    )
    if (unsettled.rows[0]) {
      try { await reconcileUserPayins(req.user.id) }
      catch (err) { console.error('Payin reconciliation failed:', err.message) }
    }
    const result = await query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id])
    res.json({
      balance: Math.round(result.rows[0].wallet_balance / 100), // kobo → naira (legacy display value)
      balanceKobo: Number(result.rows[0].wallet_balance),       // exact — use for money math
    })
  } catch (err) { next(err) }
})

// ── Transaction history ───────────────────────────────────────────────────────
router.get('/transactions', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, type, amount_kobo, description, status, created_at
        FROM wallet_transactions WHERE user_id = $1 AND status != 'pending'
        ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    res.json({
      transactions: result.rows.map(t => ({
        id:          t.id,
        type:        t.type,
        amount:      Math.round(t.amount_kobo / 100),
        description: t.description,
        status:      t.status,
        createdAt:   t.created_at, // raw ISO — clients compute periods from this
        date:        new Date(t.created_at).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }),
      })),
    })
  } catch (err) { next(err) }
})

// ── Initiate a top-up: temporary bank account for the exact amount ───────────
// (docs.getanchor.co/docs/pay-with-transfer) Response tells the rider where to
// transfer. context:'ride' keeps the ride-payment distinction for analytics
// and history labels; the frontend polls /fund/status/:reference as before.
const FUND_EXPIRY_SECONDS = 30 * 60

// Whose name the ONE-TIME payment account is opened in.
//
// It used to be the rider's own, which made a throwaway collection slip look
// exactly like a bank account they owned — while riders who had done no KYC at
// all saw their name on it. The rider's name belongs on ONE account only: the
// permanent one they earn by passing the BVN check. Everything else is
// FeaziMove collecting a payment, and should say so.
//
// Verified against Anchor (5 Aug 2026): they open the account under whatever
// name we send, so the beneficiary shown in the rider's banking app matches
// this screen. A mismatch there would look like fraud and stop the transfer.
const COLLECTION_ACCOUNT_NAME = process.env.ANCHOR_COLLECTION_NAME || 'FeaziMove Technologies Ltd'

router.post('/fund',
  requireTestAccount, // no-op unless sandbox rails + an allowlist are configured
  [
    body('amount').isInt({ min: 100, max: 500000 }),
    body('context').optional().isIn(['wallet', 'ride']),
  ],
  validate,
  async (req, res, next) => {
    try {
      if (!anchor.configured()) {
        return res.status(503).json({ message: 'Payment system not configured. Please contact support.' })
      }
      const { amount } = req.body
      const isRidePayment = req.body.context === 'ride'

      // Wallet setup gates money coming IN, not just going out — but only for
      // topping up a balance. Paying for a specific ride is exempt: demanding a
      // BVN at the moment someone is trying to take their first trip is the
      // worst possible time to ask, and that payment is a one-off temporary
      // account, not an account they hold.
      //
      // What is NEVER allowed without a BVN is a PERMANENT funding account.
      // The fallback below used to mint one silently, and a rider reached a
      // live 9PSB account number with bvn_submitted = false and no CBN KYC
      // behind it. Drivers are exempt throughout: they are KYC'd through admin
      // approval and their wallet fills from earnings, not transfers.
      const setup = await query(
        'SELECT can_drive, bvn_submitted FROM users WHERE id = $1', [req.user.id]
      )
      const walletSetUp = !!(setup.rows[0]?.can_drive || setup.rows[0]?.bvn_submitted)
      if (!walletSetUp && !isRidePayment) {
        return res.status(403).json({
          message: 'Set up your wallet with your BVN before adding money. It only takes a minute.',
          needsWalletSetup: true,
        })
      }
      // Anchor references: unique, lowercase alphanumeric, ≤100 chars
      const reference = `fm${crypto.randomUUID().replace(/-/g, '')}`

      const { user } = await ensureAnchorCustomer(req.user.id)

      // House-keeping: abandoned top-ups past their window expire NOW so they
      // can never be matched by mistake and don't clutter the ledger.
      await query(
        `UPDATE wallet_transactions SET status = 'failed', description = description || ' (expired unpaid)'
          WHERE user_id = $1 AND gateway = 'anchor' AND type = 'credit' AND status = 'pending'
            AND created_at < NOW() - INTERVAL '45 minutes'`,
        [req.user.id]
      )

      let transfer
      try {
        const pwt = await anchor.createPayWithTransfer({
          reference,
          // The rider is still identified by `reference` and the metadata
          // below — the settlement path never reads this name.
          fullName: COLLECTION_ACCOUNT_NAME,
          email: user.email,
          amountKobo: amount * 100,
          expirySeconds: FUND_EXPIRY_SECONDS,
          metadata: { feazimoveUserId: req.user.id, context: isRidePayment ? 'ride' : 'wallet' },
        })
        const a = pwt?.attributes || {}
        const details = a.accountDetails || a.virtualAccountDetails || a
        transfer = {
          bankName: details.bankName || details.bank?.name || '9 Payment Service Bank',
          accountNumber: details.accountNumber,
          accountName: details.accountName || COLLECTION_ACCOUNT_NAME,
        }
      } catch (err) {
        // Sandbox (or /pay not yet enabled): fall back to the user's permanent
        // Virtual NUBAN — the webhook matches the incoming amount to this
        // pending top-up by user instead of by reference.
        if (!anchor.isUnavailable(err)) throw err
        // But never mint that permanent account for someone we have not
        // identified. Failing the payment is the correct outcome: a live NUBAN
        // with no CBN KYC behind it is a compliance problem that outlasts the
        // ride it was created for.
        if (!walletSetUp) {
          return res.status(503).json({
            message: 'We could not set up a payment just now. Please set up your wallet with your BVN, or try again shortly.',
            needsWalletSetup: true,
          })
        }
        transfer = await ensureFundingNuban(req.user.id)
      }

      // Record as pending only AFTER the payment account exists — flipped to
      // 'completed' by the webhook (routes/anchor.js) once the transfer lands.
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status, gateway) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user.id, 'credit', amount * 100, isRidePayment ? 'Ride payment' : 'Wallet top-up', reference, 'pending', 'anchor']
      )

      res.json({
        reference,
        transfer: {
          ...transfer,
          amount, // naira — must be transferred EXACTLY
          expiresInSeconds: FUND_EXPIRY_SECONDS,
        },
      })
    } catch (err) {
      if (err.status) return res.status(err.status).json({ message: err.message })
      next(err)
    }
  }
)

// ── Poll payment status — frontend calls this while showing the transfer UI ──
// Credit normally happens in the Anchor webhook. But webhook delivery is not
// something we control, and on 3 Aug 2026 a rider's ₦1,300 landed at Anchor
// with no delivery EVER reaching us — the wallet stayed empty and the ride
// could not be booked, with no way for the rider or the system to recover.
//
// So while a payment is still pending, this asks Anchor directly whether the
// money has arrived and settles it through the same idempotent money gate the
// webhook uses (services/payinSettlement.js). The webhook is now the fast
// path, not the only path. Reconciliation is throttled per rider and can never
// double-credit — the payment id is claimed exactly once either way.
router.get('/fund/status/:reference',
  [param('reference').trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const read = async () => (await query(
        'SELECT status, amount_kobo FROM wallet_transactions WHERE reference = $1 AND user_id = $2',
        [req.params.reference, req.user.id]
      )).rows[0]

      let t = await read()
      if (!t) return res.status(404).json({ message: 'Transaction not found.' })

      if (t.status === 'pending') {
        // Never let a reconciliation problem break the poll itself — the rider
        // keeps polling and the webhook may still land.
        try {
          if (await reconcileUserPayins(req.user.id)) t = (await read()) || t
        } catch (err) {
          console.error('Payin reconciliation failed:', err.message)
        }
      }
      res.json({ status: t.status, amount: Math.round(t.amount_kobo / 100) })
    } catch (err) { next(err) }
  }
)

// ── Permanent reserved account (optional — requires BVN) ─────────────────────
// (docs.getanchor.co/docs/reserved-accounts) The BVN is passed straight
// through to Anchor for CBN-mandated KYC and is NEVER stored by FeaziMove.
router.post('/reserved-account',
  requireTestAccount, // a sandbox NUBAN is not a real bank account
  [
    body('bvn').trim().isLength({ min: 11, max: 11 }).isNumeric().withMessage('BVN must be 11 digits.'),
    body('dateOfBirth').isISO8601().withMessage('Date of birth is required (YYYY-MM-DD).'),
    body('gender').isIn(['male', 'female']).withMessage('Select a gender.'),
    body('address').trim().isLength({ min: 5, max: 200 })
      .withMessage('Enter your residential address.'),
  ],
  validate,
  async (req, res, next) => {
    // One id ties this attempt's submitted → completed/failed rows together, so
    // the Back Office shows a readable trail even when Anchor rejects the BVN.
    const attempt = crypto.randomUUID().slice(0, 12)
    try {
      if (!anchor.configured()) {
        return res.status(503).json({ message: 'Payment system not configured. Please contact support.' })
      }
      const existing = await query(
        `SELECT reserved_account_number, reserved_account_bank, reserved_account_name,
                anchor_reserved_account_id, bvn_submitted, anchor_kyc_status
           FROM users WHERE id = $1`,
        [req.user.id]
      )
      // Only a rider who already holds an account in their OWN name is finished.
      // This used to also turn away anyone who had submitted a BVN and been
      // given an org-named Virtual NUBAN — which was every rider, and it is
      // precisely what made the upgrade to a named account unreachable.
      if (existing.rows[0]?.anchor_kyc_status === 'account_named') {
        return res.status(409).json({ message: 'You already have a personal funding account.' })
      }
      // KYC evidence, recorded BEFORE the Anchor call so it survives whichever
      // branch below runs (and any Anchor failure). The last 4 digits are kept
      // in clear for everyday admin confirmation; the full BVN is stored only
      // AES-256-GCM encrypted, because Anchor can demand complete KYC on any
      // user and we must be able to produce it. Reading it back needs an
      // authenticator code (see /admin/users/:id/kyc/reveal).
      //
      // Date of birth and gender are kept too: Anchor needs them for Tier 2
      // verification, and storing them means a retry after a rejection doesn't
      // have to ask the rider for everything again. They were previously
      // validated and then thrown away.
      await query(
        `UPDATE users SET bvn_last4 = $1, residential_address = $2, bvn_encrypted = $3,
            date_of_birth = COALESCE($4::date, date_of_birth),
            gender        = COALESCE($5, gender)
          WHERE id = $6`,
        [req.body.bvn.slice(-4), req.body.address, kycVault.encrypt(req.body.bvn),
         String(req.body.dateOfBirth).slice(0, 10), req.body.gender, req.user.id]
      )
      // Logged BEFORE the Anchor call so an attempt that Anchor rejects is still
      // visible in the Back Office — a silent failure was the whole problem.
      logWalletEvent(req.user.id, {
        eventId: `wsetup-${attempt}-submitted`,
        eventType: 'wallet.setup.submitted',
        action: 'Wallet Setup — BVN Submitted',
        detail: 'BVN, date of birth, gender and residential address sent to Anchor for CBN KYC',
      })

      // Anchor's required order (confirmed with them, Aug 2026):
      //   customer exists → Tier 2 KYC verification → reserved account.
      // Creating the account first is what produced org-named NUBANs for
      // everyone: an unverified customer cannot hold an account in their name.
      const { customerId, user: anchorUser } = await ensureAnchorCustomer(req.user.id)

      // Anchor checks the BVN against the name on the CUSTOMER record — not
      // against anything sent in the check itself. Femi Odunuga's record said
      // "Femi Odunuga" while his BVN and his FeaziMove account both said
      // "Olorunfemi Odunuga", so four attempts were each rejected on FULL_NAME,
      // ₦50 apiece, while the one thing that could have changed the outcome was
      // never touched. Reconcile it before spending anything.
      let nameCorrected = false
      try {
        const current = await anchor.getCustomer(customerId)
        const onFile = [current?.attributes?.fullName?.firstName,
                        current?.attributes?.fullName?.lastName].filter(Boolean).join(' ').trim()
        const parts = String(anchorUser?.name || '').trim().split(/\s+/).filter(Boolean)
        const ours = [parts[0], parts.length > 1 ? parts[parts.length - 1] : ''].filter(Boolean).join(' ')
        if (ours && onFile && onFile.toUpperCase() !== ours.toUpperCase()) {
          await anchor.updateIndividualCustomerName(customerId, {
            firstName: parts[0],
            lastName: parts.length > 1 ? parts[parts.length - 1] : parts[0],
          })
          nameCorrected = true
          logWalletEvent(req.user.id, {
            eventId: `wsetup-${attempt}-namefix`,
            eventType: 'wallet.setup.namecorrected',
            action: 'Anchor Customer Name Corrected',
            detail: `Anchor held "${onFile}" — updated to "${ours}" to match the registered name before re-checking the BVN`,
          })
        }
      } catch (err) {
        // Not fatal: the check below may still pass, and if it fails its reason
        // describes the mismatch more precisely than a guess here could.
        console.error('Anchor customer name sync failed:', err.message)
      }

      // A rejection Anchor has already issued, re-asked with identical details,
      // returns the identical answer and bills ₦50 for it. Only pay when
      // something has actually changed.
      if (existing.rows[0]?.anchor_kyc_status === 'rejected' && !nameCorrected) {
        const p = (await query(
          'SELECT bvn_encrypted, date_of_birth, gender, anchor_kyc_reason FROM users WHERE id = $1',
          [req.user.id]
        )).rows[0] || {}
        const sameBvn = kycVault.decrypt(p.bvn_encrypted) === req.body.bvn
        const sameDob = p.date_of_birth
          && new Date(p.date_of_birth).toISOString().slice(0, 10) === String(req.body.dateOfBirth).slice(0, 10)
        const sameGender = (p.gender || '') === req.body.gender
        if (sameBvn && sameDob && sameGender) {
          return res.status(409).json({
            message: p.anchor_kyc_reason
              ? `We already checked these exact details with our banking partner and ${p.anchor_kyc_reason}. Please correct that before trying again.`
              : 'These exact details were already checked and could not be matched. Please correct them before trying again.',
            unchanged: true,
          })
        }
      }

      let verificationSent = false
      try {
        await anchor.verifyIndividualCustomer(customerId, {
          bvn: req.body.bvn,
          dateOfBirth: req.body.dateOfBirth,
          gender: req.body.gender,
        })
        verificationSent = true
      } catch (err) {
        // A 422 is Anchor judging the rider's details — usually the name or
        // phone number not matching their BVN record. That is actionable, so
        // it goes back to them verbatim.
        if (err.status === 422) {
          logWalletEvent(req.user.id, {
            eventId: `wsetup-${attempt}-rejected`,
            eventType: 'wallet.setup.rejected',
            action: 'Wallet Setup Rejected',
            detail: (err.message || '').slice(0, 280),
          })
          await query(
            "UPDATE users SET anchor_kyc_status = 'rejected', anchor_kyc_reason = $1 WHERE id = $2",
            [(err.message || '').slice(0, 500), req.user.id]
          )
          return res.status(422).json({ message: err.message })
        }
        // ANY other failure means Anchor never ran the check. This was
        // swallowed into a console.error, after which the rider was recorded as
        // 'submitted' and told "your details are with Anchor" — while Anchor
        // held nothing at all. On 4 Aug 2026 every rider's KYC was failing with
        // HTTP 400 "Insufficient balance" (Anchor bills per BVN lookup) and
        // nothing anywhere said so: riders sat on company-named accounts, the
        // Back Office showed a clean setup, and the real cause was invisible
        // until the endpoint was called by hand. A verification we could not
        // send is now recorded as exactly that, loudly.
        console.error('Anchor KYC verification failed:', err.message)
        logWalletEvent(req.user.id, {
          eventId: `wsetup-${attempt}-unsent`,
          eventType: 'wallet.setup.error',
          action: 'Wallet Setup — Anchor Did Not Accept The Check',
          detail: `Anchor refused the Tier 2 verification: ${(err.message || 'unknown error').slice(0, 200)}`,
        })
      }

      // bvn_submitted records what the RIDER did — they handed over their BVN —
      // so it stays true either way and their funding keeps working. What the
      // status must never claim is that Anchor is deciding when Anchor was
      // never asked. The rider-facing reason stays plain: the fault is ours,
      // and telling them their details failed would be a lie in the other
      // direction. The technical cause is in the event above.
      // anchor_kyc_last_attempt is stamped here too, so the hourly auto-retry
      // cannot buy a second lookup moments after the rider paid for one.
      await query(
        `UPDATE users SET bvn_submitted = true, anchor_kyc_status = $1,
            anchor_kyc_reason = $2, anchor_kyc_last_attempt = NOW() WHERE id = $3`,
        [verificationSent ? 'submitted' : 'verification_unsent',
         verificationSent ? null : 'We could not complete the check with our banking partner. Nothing is wrong with your details — please try again shortly.',
         req.user.id]
      )
      analytics.track(req.user.id, 'reserved_account_requested', {})

      // The rider must still be able to fund while verification runs, so make
      // sure they hold SOME account now — the org-named one is fine meanwhile.
      let details = existing.rows[0]?.reserved_account_number
        ? {
            bankName: existing.rows[0].reserved_account_bank,
            accountNumber: existing.rows[0].reserved_account_number,
            accountName: existing.rows[0].reserved_account_name,
          }
        : await ensureFundingNuban(req.user.id).catch(e => {
            console.error('Funding NUBAN creation failed:', e.message); return null
          })

      // Tier 2 validation is normally immediate, so attempt the upgrade right
      // away. If Anchor is still deciding, the customer.identification.approved
      // webhook or the rider's next funding-account poll finishes the job.
      const upgrade = await tryProvisionReservedAccount(req.user.id)
      if (upgrade.provisioned) details = upgrade.account

      logWalletEvent(req.user.id, {
        eventId: `wsetup-${attempt}-completed`,
        eventType: 'wallet.setup.completed',
        action: 'Wallet Setup Completed',
        detail: upgrade.provisioned
          ? `Reserved account ${upgrade.account.accountNumber} issued in the rider's own name`
          : verificationSent
            ? `BVN sent to Anchor for Tier 2 verification — awaiting decision (${upgrade.reason})`
            : 'Anchor never accepted the verification — the rider is on a company-named account and no decision is coming',
      })
      res.status(202).json({
        // Three genuinely different outcomes, and the middle one used to speak
        // for all of them. Promising a rider that a decision is coming, when we
        // know no check was ever sent, is the failure this whole route existed
        // to stop.
        message: upgrade.provisioned
          ? 'Your personal funding account is ready.'
          : verificationSent
            ? 'Your details are with Anchor for verification. You can keep funding your wallet — your account moves into your own name as soon as they approve it.'
            : 'We could not complete your identity check just now — this is on our side, not your details. Your wallet works normally; please try again shortly.',
        account: details,
        verificationPending: !upgrade.provisioned && verificationSent,
      })
    } catch (err) {
      // A rejected BVN or an Anchor outage now leaves a row too — previously
      // the rider saw an error and the Back Office showed nothing at all.
      logWalletEvent(req.user.id, {
        eventId: `wsetup-${attempt}-failed`,
        eventType: 'wallet.setup.failed',
        action: 'Wallet Setup Failed',
        detail: (err.message || 'Unknown error').slice(0, 280),
      })
      if (err.status) return res.status(err.status).json({ message: err.message })
      next(err)
    }
  }
)

// The rider's permanent funding account — presented as "set up" only after
// they've completed the BVN step, even if an account number technically
// exists behind their payments already (the setup funnel matters).
router.get('/funding-account', async (req, res, next) => {
  try {
    // Finish a pending upgrade if Anchor has approved the rider since we last
    // looked. Anchor's verdict arrives by webhook, and a webhook that never
    // lands is exactly how a rider's ₦1,300 went missing — so the rider's own
    // poll is a second, independent way to complete the job. No-op unless they
    // are verified and still on an org-named account.
    const COLS = `reserved_account_number, reserved_account_bank, reserved_account_name,
                  anchor_reserved_account_id, bvn_submitted, anchor_kyc_status, anchor_kyc_reason`
    let r = await query(`SELECT ${COLS} FROM users WHERE id = $1`, [req.user.id])
    if (r.rows[0]?.bvn_submitted && r.rows[0]?.anchor_kyc_status !== 'account_named') {
      // A check Anchor refused outright (billing, outage) is sent again from
      // the vaulted BVN — at most hourly. Without this the rider would have to
      // re-type their BVN to recover from a fault that was never theirs.
      if (await resubmitStalledVerification(req.user.id)) {
        r = await query(`SELECT ${COLS} FROM users WHERE id = $1`, [req.user.id])
      }
      const upgrade = await tryProvisionReservedAccount(req.user.id)
      if (upgrade.provisioned) {
        r = await query(`SELECT ${COLS} FROM users WHERE id = $1`, [req.user.id])
      }
    }
    const u = r.rows[0]
    const setUp = !!u?.bvn_submitted
    const kycStatus = u?.anchor_kyc_status || null
    const named = kycStatus === 'account_named'
    // Anchor is still deciding — the rider should wait, not resubmit.
    const inFlight = ['submitted', 'pending', 'manualreview', 'awaitingdocument']
      .includes(String(kycStatus || '').toLowerCase())
    res.json({
      bvnSetUp: setUp,
      account: setUp && u?.reserved_account_number ? {
        bankName: u.reserved_account_bank,
        accountNumber: u.reserved_account_number,
        accountName: u.reserved_account_name,
      } : null,
      pending: setUp && !!(u?.anchor_reserved_account_id && !u?.reserved_account_number),
      // Verification state, so the rider is never stuck staring at an account
      // in the company's name with no idea why or what to do about it.
      kycStatus,
      kycReason: u?.anchor_kyc_reason || null,
      accountIsNamed: named,
      verificationPending: setUp && !named && inFlight,
      // People mistype BVNs and register under names their bank doesn't hold,
      // so re-running verification stays open until the account is actually in
      // their name. The only thing that closes it is success.
      canReverify: setUp && !named,
    })
  } catch (err) { next(err) }
})

// ── Request a payout — escrows the balance until admin approves ──────────────
// Drivers withdraw free. Riders may withdraw once they've completed the BVN
// wallet-setup step (funds are never locked up), with a 5% processing fee
// deducted from the amount. All payouts are first-party only — enforced at
// admin approval by matching the bank account name to the registered name.
router.post('/withdraw',
  requireTestAccount, // a sandbox NIP payout debits the wallet but sends nothing
  [
    body('amount').isInt({ min: 100 }),
    body('challengeId').notEmpty().withMessage('Verification required.'),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const amountKobo = req.body.amount * 100

      const u = await query('SELECT can_drive, bvn_submitted FROM users WHERE id = $1', [req.user.id])
      const isDriver = !!u.rows[0]?.can_drive
      if (!isDriver && !u.rows[0]?.bvn_submitted) {
        return res.status(403).json({ message: 'Complete your wallet setup with your BVN to enable withdrawals.' })
      }
      // Drivers bear the bank charges on their payout: ₦50 transfer charge,
      // plus ₦50 stamp duty above ₦10,000. Riders pay the 5% processing fee.
      const feeKobo = isDriver
        ? 50_00 + (amountKobo > 10_000_00 ? 50_00 : 0)
        : Math.round(amountKobo * 0.05)
      const netKobo = amountKobo - feeKobo
      const feeLabel = isDriver ? 'less bank charges' : 'incl. 5% processing fee'

      // Step-up 2FA — money leaving the wallet requires an emailed code, so a
      // stolen access token alone can't drain funds.
      try { await consumeChallenge(req.user.id, 'wallet_withdraw', req.body.challengeId, req.body.code) }
      catch (e) { return res.status(e.status || 400).json({ message: e.message }) }

      // Atomic escrow: conditional decrement (overdraw impossible even under
      // concurrent requests) + payout row + reconciliation-linked ledger row,
      // all in one transaction (services/walletLedger.js).
      const escrow = await escrowWithdrawal(req.user.id, amountKobo, feeKobo, feeLabel)
      if (!escrow) return res.status(402).json({ message: 'Insufficient wallet balance.' })

      // AML: fast in-out (fund → immediate withdrawal) gets flagged for the
      // back office; the payout itself still goes through admin review.
      runAmlChecksOnPayout(req.user.id, amountKobo).catch(() => {})

      res.status(201).json({
        message: isDriver
          ? `Withdrawal requested — you'll receive ₦${(netKobo / 100).toLocaleString()} after bank charges, pending admin approval.`
          : `Withdrawal requested — you'll receive ₦${(netKobo / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} after the 5% processing fee, pending admin approval.`,
        payoutId: escrow.payoutId,
        feeKobo,
        netKobo,
      })
    } catch (err) { next(err) }
  }
)

// ── My payout request history ─────────────────────────────────────────────────
router.get('/payouts', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, amount_kobo, status, requested_at, processed_at, failure_reason
       FROM payout_requests WHERE driver_id = $1 ORDER BY requested_at DESC LIMIT 20`,
      [req.user.id]
    )
    res.json({
      payouts: result.rows.map(p => ({
        id: p.id, amount: Math.round(p.amount_kobo / 100), status: p.status,
        requestedAt: p.requested_at, processedAt: p.processed_at, failureReason: p.failure_reason || null,
      })),
    })
  } catch (err) { next(err) }
})

module.exports = router
