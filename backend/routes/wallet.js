const express  = require('express')
const { body, param } = require('express-validator')
const crypto   = require('crypto')
const axios    = require('axios')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')
const { validate }    = require('../middleware/validate')
const { consumeChallenge } = require('../services/actionChallenges')
const analytics = require('../services/analytics')

const router = express.Router()

// ── Paystack webhook — verify and credit wallet ───────────────────────────────
// Called by Paystack, NOT by the frontend — so it MUST be registered before
// the router-wide requireAuth below (behind it, Paystack got 401 before the
// signature was ever checked and crediting depended entirely on the payer
// coming back to poll /fund/status). Signature is an HMAC SHA512 of the raw
// request body using our secret key (req.rawBody is captured in server.js).
router.post('/webhook/paystack', async (req, res, next) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) return res.sendStatus(401)

    const expectedSignature = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest('hex')

    if (req.headers['x-paystack-signature'] !== expectedSignature) {
      return res.status(401).json({ message: 'Invalid webhook signature.' })
    }

    const { event, data } = req.body
    if (event !== 'charge.success') {
      return res.sendStatus(200) // Acknowledge non-success events silently
    }

    await creditTransaction(data.reference, data.channel, data.amount, data.currency) // no-op if already credited via the verify-fallback

    res.sendStatus(200)
  } catch (err) { next(err) }
})

router.use(requireAuth)

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
        date:        new Date(t.created_at).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      })),
    })
  } catch (err) { next(err) }
})

// ── Initiate wallet top-up via Paystack ───────────────────────────────────────
// Returns a Paystack checkout URL. When the user completes payment, Paystack
// fires a webhook → /wallet/webhook/paystack which credits the wallet.
// context: 'ride' = paying for a specific ride from the booking flow — the
// redirect returns to the booking page (which auto-completes the booking)
// instead of the wallet page. The money still lands in the wallet either way,
// so ride settlement stays on the single wallet rail.
router.post('/fund',
  [
    body('amount').isInt({ min: 100, max: 500000 }),
    body('context').optional().isIn(['wallet', 'ride']),
  ],
  validate,
  async (req, res, next) => {
    try {
      if (!process.env.PAYSTACK_SECRET_KEY) {
        return res.status(503).json({ message: 'Payment gateway not configured. Please contact support.' })
      }

      const { amount } = req.body
      const isRidePayment = req.body.context === 'ride'
      const reference = `FM-${crypto.randomUUID()}`

      const userRes = await query('SELECT name, email FROM users WHERE id = $1', [req.user.id])
      const user = userRes.rows[0]
      if (!user.email) {
        return res.status(422).json({ message: 'Please add an email to your profile before funding your wallet.' })
      }

      // Record as pending — upgraded to 'completed' by the webhook after payment
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, 'credit', amount * 100, isRidePayment ? 'Ride payment' : 'Wallet top-up', reference, 'pending']
      )

      const appBase = (process.env.APP_URL || '').replace(/\/+$/, '')
      const callbackUrl = isRidePayment && appBase
        ? `${appBase}/book?funded=1`
        : process.env.PAYSTACK_CALLBACK_URL

      // Initialize Paystack transaction — Paystack also takes amount in kobo
      const psRes = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: user.email,
          amount: amount * 100,
          reference,
          callback_url: callbackUrl,
        },
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      )

      res.json({ paymentUrl: psRes.data.data.authorization_url, reference })
    } catch (err) {
      if (err.response) {
        return res.status(502).json({ message: 'Payment gateway error. Please try again.' })
      }
      next(err)
    }
  }
)

// Credits a still-pending transaction and marks it completed. Used by both
// the webhook and the verify-fallback below — guarded by the 'pending' check
// in the UPDATE so a transaction is never credited twice. When Paystack
// reports what was actually paid, require it to cover the pending amount in
// NGN — defense in depth against partial-payment/currency surprises.
async function creditTransaction(reference, paymentMethod, paidKobo, currency) {
  if (currency != null && currency !== 'NGN') return false
  const txRes = await query(
    `UPDATE wallet_transactions SET status = 'completed'
      WHERE reference = $1 AND status = 'pending'
        AND ($2::bigint IS NULL OR amount_kobo <= $2::bigint)
      RETURNING user_id, amount_kobo`,
    [reference, paidKobo ?? null]
  )
  if (!txRes.rows[0]) return false // already credited, unknown reference, or short-paid
  const { user_id, amount_kobo } = txRes.rows[0]
  const balRes = await query(
    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
    [amount_kobo, user_id]
  )

  // Server-side revenue event — fires only on verified payment confirmation
  analytics.track(user_id, 'fund_wallet', {
    amount_loaded: Math.round(amount_kobo / 100),
    payment_gateway: 'Paystack',
    payment_method: paymentMethod || 'unknown',
  })
  analytics.setProfile(user_id, {
    current_wallet_balance: Math.round(balRes.rows[0].wallet_balance / 100),
  })
  return true
}

// ── Poll payment status — frontend calls this after redirect back from Paystack ──
// Webhooks can't reach a local dev server, so as a fallback this also asks
// Paystack directly whether the transaction succeeded, and credits it here
// if so. In production the webhook will usually win the race, but this keeps
// the flow working without a public webhook URL.
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
      let t = result.rows[0]

      if (t.status === 'pending' && process.env.PAYSTACK_SECRET_KEY) {
        try {
          const verifyRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(req.params.reference)}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
          )
          if (verifyRes.data.data.status === 'success') {
            const ok = await creditTransaction(req.params.reference, verifyRes.data.data.channel,
              verifyRes.data.data.amount, verifyRes.data.data.currency)
            if (ok) t = { ...t, status: 'completed' }
          }
        } catch { /* Paystack unreachable or not yet recorded — keep polling */ }
      }

      res.json({ status: t.status, amount: Math.round(t.amount_kobo / 100) })
    } catch (err) { next(err) }
  }
)

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
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'debit', amountKobo, 'Withdrawal request — pending approval']
      )

      res.status(201).json({ message: 'Withdrawal requested — pending admin approval.', payoutId: result.rows[0].id })
    } catch (err) { next(err) }
  }
)

// ── My payout request history ─────────────────────────────────────────────────
router.get('/payouts', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, amount_kobo, status, requested_at, processed_at
       FROM payout_requests WHERE driver_id = $1 ORDER BY requested_at DESC LIMIT 20`,
      [req.user.id]
    )
    res.json({
      payouts: result.rows.map(p => ({
        id: p.id, amount: Math.round(p.amount_kobo / 100), status: p.status,
        requestedAt: p.requested_at, processedAt: p.processed_at,
      })),
    })
  } catch (err) { next(err) }
})

module.exports = router
