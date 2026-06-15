const express  = require('express')
const { body } = require('express-validator')
const crypto   = require('crypto')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')
const { validate }    = require('../middleware/validate')

const router = express.Router()
router.use(requireAuth)

// ── Get wallet balance ────────────────────────────────────────────────────────
router.get('/balance', async (req, res, next) => {
  try {
    const result = await query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id])
    res.json({ balance: Math.round(result.rows[0].wallet_balance / 100) }) // kobo → naira
  } catch (err) { next(err) }
})

// ── Transaction history ───────────────────────────────────────────────────────
router.get('/transactions', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, type, amount_kobo, description, created_at
        FROM wallet_transactions WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    res.json({
      transactions: result.rows.map(t => ({
        id:          t.id,
        type:        t.type,
        amount:      Math.round(t.amount_kobo / 100),
        description: t.description,
        date:        new Date(t.created_at).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      })),
    })
  } catch (err) { next(err) }
})

// ── Initiate Flutterwave top-up ───────────────────────────────────────────────
router.post('/fund',
  [body('amount').isInt({ min: 100, max: 500000 })],
  validate,
  async (req, res, next) => {
    try {
      const { amount } = req.body
      const reference = `FM-${crypto.randomUUID()}`

      // Get user details for Flutterwave
      const userRes = await query('SELECT name, phone FROM users WHERE id = $1', [req.user.id])
      const user = userRes.rows[0]

      // Store pending transaction (verified on webhook)
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'credit', amount * 100, 'Wallet top-up via Flutterwave', reference]
      )

      // Build Flutterwave payment link
      // In production: call Flutterwave API to create a hosted payment link
      const paymentUrl = `https://checkout.flutterwave.com/v3/hosted/pay?public_key=${process.env.FLW_PUBLIC_KEY}&amount=${amount}&currency=NGN&payment_options=card,ussd,bank_transfer&customer[phone_number]=${encodeURIComponent(user.phone)}&customer[name]=${encodeURIComponent(user.name)}&tx_ref=${reference}&redirect_url=${encodeURIComponent(process.env.FLW_REDIRECT_URL)}`

      res.json({ paymentUrl, reference })
    } catch (err) { next(err) }
  }
)

// ── Flutterwave webhook — verify and credit wallet ────────────────────────────
// This endpoint is called by Flutterwave, NOT by the frontend
router.post('/webhook/flutterwave', async (req, res, next) => {
  try {
    // Verify webhook signature
    const signature = req.headers['verif-hash']
    if (signature !== process.env.FLW_WEBHOOK_SECRET) {
      return res.status(401).json({ message: 'Invalid webhook signature.' })
    }

    const { event, data } = req.body
    if (event !== 'charge.completed' || data.status !== 'successful') {
      return res.sendStatus(200) // Acknowledge non-success events
    }

    const reference = data.tx_ref
    // Find matching pending transaction
    const txRes = await query(
      'SELECT id, user_id, amount_kobo FROM wallet_transactions WHERE reference = $1 AND type = $2',
      [reference, 'credit']
    )

    if (!txRes.rows[0]) return res.sendStatus(200) // Unknown reference — ignore

    const { user_id, amount_kobo } = txRes.rows[0]

    // Credit wallet atomically
    await query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount_kobo, user_id])

    res.sendStatus(200)
  } catch (err) { next(err) }
})

module.exports = router
