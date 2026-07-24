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
const { runAmlChecksOnPayout } = require('../services/walletLedger')

const router = express.Router()
router.use(requireAuth)

// Every user who moves money gets an Anchor Individual Customer record
// (docs.getanchor.co/docs/create-individual-customer-1) — created lazily the
// first time it's needed and remembered on users.anchor_customer_id.
async function ensureAnchorCustomer(userId) {
  const u = await query(
    'SELECT name, email, phone, city, area, anchor_customer_id FROM users WHERE id = $1', [userId]
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
      address: { line1: user.area || 'Lagos', city: user.city || 'Lagos', state: 'Lagos' },
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
    bankName: a.bank?.name || a.bankName || 'PROVIDUS BANK',
    accountNumber: a.accountNumber,
    accountName: a.accountName,
  }
  await query(
    `UPDATE users SET anchor_reserved_account_id = $1, reserved_account_number = $2,
        reserved_account_bank = $3, reserved_account_name = $4 WHERE id = $5`,
    [nuban.id, details.accountNumber, details.bankName, details.accountName, userId]
  )
  return details
}

// ── Get wallet balance ────────────────────────────────────────────────────────
router.get('/balance', async (req, res, next) => {
  try {
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

router.post('/fund',
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
      // Anchor references: unique, lowercase alphanumeric, ≤100 chars
      const reference = `fm${crypto.randomUUID().replace(/-/g, '')}`

      const { user } = await ensureAnchorCustomer(req.user.id)

      // Record as pending — flipped to 'completed' by the payin.received
      // webhook (routes/anchor.js) once the transfer lands.
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status, gateway) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user.id, 'credit', amount * 100, isRidePayment ? 'Ride payment' : 'Wallet top-up', reference, 'pending', 'anchor']
      )

      let transfer
      try {
        const pwt = await anchor.createPayWithTransfer({
          reference,
          fullName: user.name,
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
          accountName: details.accountName || `FeaziMove / ${user.name}`,
        }
      } catch (err) {
        // Sandbox (or /pay not yet enabled): fall back to the user's permanent
        // Virtual NUBAN — the webhook matches the incoming amount to this
        // pending top-up by user instead of by reference.
        if (!anchor.isUnavailable(err)) throw err
        transfer = await ensureFundingNuban(req.user.id)
      }

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
// Credit happens in the webhook; this simply reports the row's state.
router.get('/fund/status/:reference',
  [param('reference').trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        'SELECT status, amount_kobo FROM wallet_transactions WHERE reference = $1 AND user_id = $2',
        [req.params.reference, req.user.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'Transaction not found.' })
      const t = result.rows[0]
      res.json({ status: t.status, amount: Math.round(t.amount_kobo / 100) })
    } catch (err) { next(err) }
  }
)

// ── Permanent reserved account (optional — requires BVN) ─────────────────────
// (docs.getanchor.co/docs/reserved-accounts) The BVN is passed straight
// through to Anchor for CBN-mandated KYC and is NEVER stored by FeaziMove.
router.post('/reserved-account',
  [
    body('bvn').trim().isLength({ min: 11, max: 11 }).isNumeric().withMessage('BVN must be 11 digits.'),
    body('dateOfBirth').isISO8601().withMessage('Date of birth is required (YYYY-MM-DD).'),
    body('gender').isIn(['male', 'female']).withMessage('Select a gender.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      if (!anchor.configured()) {
        return res.status(503).json({ message: 'Payment system not configured. Please contact support.' })
      }
      const existing = await query(
        'SELECT reserved_account_number, reserved_account_bank, reserved_account_name, anchor_reserved_account_id, bvn_submitted FROM users WHERE id = $1',
        [req.user.id]
      )
      if (existing.rows[0]?.reserved_account_number && existing.rows[0]?.bvn_submitted) {
        return res.status(409).json({ message: 'You already have a personal funding account.' })
      }
      // An account number may already exist WITHOUT setup (auto-created behind
      // a pay-by-transfer) — completing setup just claims it: record the BVN
      // step and present the account as theirs. When Anchor enables production
      // reserved accounts, this upgrades to a real named account.
      if (existing.rows[0]?.reserved_account_number) {
        await query('UPDATE users SET bvn_submitted = true WHERE id = $1', [req.user.id])
        analytics.track(req.user.id, 'reserved_account_requested', {})
        return res.status(202).json({
          message: 'Your personal funding account is ready.',
          account: {
            bankName: existing.rows[0].reserved_account_bank,
            accountNumber: existing.rows[0].reserved_account_number,
            accountName: existing.rows[0].reserved_account_name,
          },
        })
      }

      const u = await query('SELECT name, email, anchor_customer_id FROM users WHERE id = $1', [req.user.id])
      const user = u.rows[0]
      if (!user.email) return res.status(422).json({ message: 'Please add an email to your profile first.' })
      const parts = (user.name || '').trim().split(/\s+/)

      let acct
      try {
        if (user.anchor_customer_id) {
          acct = await anchor.createReservedAccount({ customerId: user.anchor_customer_id })
        } else {
          // Single-request path: Anchor creates customer + account together
          acct = await anchor.createReservedAccount({
            firstName: parts[0] || 'FeaziMove',
            lastName: parts.slice(1).join(' ') || 'User',
            email: user.email,
            bvn: req.body.bvn,
          })
          const customerId = acct?.relationships?.customer?.data?.id
          if (customerId) await query('UPDATE users SET anchor_customer_id = $1 WHERE id = $2', [customerId, req.user.id])
        }
      } catch (err) {
        // Reserved accounts are production-only — in sandbox the permanent
        // Virtual NUBAN plays the same role (account in our org's name).
        if (!anchor.isUnavailable(err)) throw err
        const details = await ensureFundingNuban(req.user.id)
        await query('UPDATE users SET bvn_submitted = true WHERE id = $1', [req.user.id])
        return res.status(202).json({
          message: 'Your personal funding account is ready.',
          account: details,
        })
      }

      // Some responses carry the account details synchronously; otherwise the
      // reservedAccount.created webhook fills them in moments later.
      const a = acct?.attributes || {}
      const details = a.accountDetails || a
      await query(
        `UPDATE users SET anchor_reserved_account_id = COALESCE($1, anchor_reserved_account_id),
            reserved_account_number = COALESCE($2, reserved_account_number),
            reserved_account_bank   = COALESCE($3, reserved_account_bank),
            reserved_account_name   = COALESCE($4, reserved_account_name)
          WHERE id = $5`,
        [acct?.id || null, details.accountNumber || null,
         details.bankName || details.bank?.name || null, details.accountName || null, req.user.id]
      )
      analytics.track(req.user.id, 'reserved_account_requested', {})
      res.status(202).json({
        message: details.accountNumber
          ? 'Your personal funding account is ready.'
          : 'Your personal funding account is being created — it will appear here shortly.',
        account: details.accountNumber ? {
          bankName: details.bankName || details.bank?.name,
          accountNumber: details.accountNumber,
          accountName: details.accountName,
        } : null,
      })
    } catch (err) {
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
    const r = await query(
      'SELECT reserved_account_number, reserved_account_bank, reserved_account_name, anchor_reserved_account_id, bvn_submitted FROM users WHERE id = $1',
      [req.user.id]
    )
    const u = r.rows[0]
    const setUp = !!u?.bvn_submitted
    res.json({
      bvnSetUp: setUp,
      account: setUp && u?.reserved_account_number ? {
        bankName: u.reserved_account_bank,
        accountNumber: u.reserved_account_number,
        accountName: u.reserved_account_name,
      } : null,
      pending: setUp && !!(u?.anchor_reserved_account_id && !u?.reserved_account_number),
    })
  } catch (err) { next(err) }
})

// ── Request a payout (driver) — escrows the balance until admin approves ─────
router.post('/withdraw',
  [
    body('amount').isInt({ min: 100 }),
    body('challengeId').notEmpty().withMessage('Verification required.'),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const amountKobo = req.body.amount * 100

      // Step-up 2FA — money leaving the wallet requires an emailed code, so a
      // stolen access token alone can't drain funds.
      try { await consumeChallenge(req.user.id, 'wallet_withdraw', req.body.challengeId, req.body.code) }
      catch (e) { return res.status(e.status || 400).json({ message: e.message }) }

      const userRes = await query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id])
      if (Number(userRes.rows[0].wallet_balance) < amountKobo) {
        return res.status(402).json({ message: 'Insufficient wallet balance.' })
      }

      await query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amountKobo, req.user.id])
      const result = await query(
        'INSERT INTO payout_requests (driver_id, amount_kobo) VALUES ($1, $2) RETURNING id, requested_at',
        [req.user.id, amountKobo]
      )
      // reference ties the wallet-side escrow to the payout record (and via
      // that to Anchor's transfer) — the spine of payout reconciliation
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'debit', amountKobo, 'Withdrawal request — pending approval', `payout-${result.rows[0].id}`]
      )

      // AML: fast in-out (fund → immediate withdrawal) gets flagged for the
      // back office; the payout itself still goes through admin review.
      runAmlChecksOnPayout(req.user.id, amountKobo).catch(() => {})

      res.status(201).json({ message: 'Withdrawal requested — pending admin approval.', payoutId: result.rows[0].id })
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
