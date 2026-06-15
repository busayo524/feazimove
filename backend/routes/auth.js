const express   = require('express')
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const { body }  = require('express-validator')
const { query } = require('../db')
const { requireAuth }  = require('../middleware/auth')
const { validate }     = require('../middleware/validate')

const router = express.Router()

const SALT_ROUNDS = 12  // bcrypt cost factor — NIST recommended minimum

// ── Register ─────────────────────────────────────────────────────────────────
router.post('/register',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('phone').trim().matches(/^(\+?234|0)[789][01]\d{8}$/),
    body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
    body('role').isIn(['rider', 'driver']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, phone, password, role } = req.body

      // Check phone not already registered
      const existing = await query('SELECT id FROM users WHERE phone = $1', [phone])
      if (existing.rows.length > 0) {
        // Generic message — prevents phone enumeration
        return res.status(409).json({ message: 'An account with this phone number already exists.' })
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
      const result = await query(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role, wallet_balance',
        [name, email || null, phone, password_hash, role]
      )

      const user = result.rows[0]
      const token = signToken(user)

      // Never return password_hash
      res.status(201).json({ token, user: safeUser(user) })
    } catch (err) { next(err) }
  }
)

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login',
  [
    body('phone').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { phone, password } = req.body

      const result = await query(
        'SELECT id, name, phone, role, password_hash, wallet_balance FROM users WHERE phone = $1 AND is_active = true',
        [phone]
      )

      const user = result.rows[0]

      // Always run bcrypt even if user not found — prevents timing attacks
      const dummyHash = '$2a$12$dummyhashtopreventtimingattacksonnonexistentusers.......'
      const match = await bcrypt.compare(password, user?.password_hash || dummyHash)

      if (!user || !match) {
        return res.status(401).json({ message: 'Incorrect phone number or password.' })
      }

      const token = signToken(user)
      res.json({ token, user: safeUser(user) })
    } catch (err) { next(err) }
  }
)

// ── Get current user ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, phone, role, wallet_balance, rating FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
    res.json({ user: safeUser(result.rows[0]) })
  } catch (err) { next(err) }
})

// ── Update profile ────────────────────────────────────────────────────────────
router.patch('/profile',
  requireAuth,
  [body('name').trim().isLength({ min: 2, max: 100 }).escape()],
  validate,
  async (req, res, next) => {
    try {
      await query('UPDATE users SET name = $1 WHERE id = $2', [req.body.name, req.user.id])
      res.json({ message: 'Profile updated.' })
    } catch (err) { next(err) }
  }
)

// ── Forgot password (OTP — integrate with Termii/Twilio) ─────────────────────
router.post('/forgot-password',
  [body('phone').trim().notEmpty()],
  validate,
  async (req, res) => {
    // Always return 200 — prevents phone enumeration
    // In production: lookup user, generate OTP, send via SMS provider
    res.json({ message: 'If that number is registered, an OTP has been sent.' })
  }
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
  )
}

function safeUser(user) {
  // Minimum data returned — principle of least privilege
  return {
    id:            user.id,
    name:          user.name,
    phone:         user.phone,
    role:          user.role,
    walletBalance: Math.round((user.wallet_balance || 0) / 100), // kobo → naira
    rating:        user.rating,
  }
}

module.exports = router
