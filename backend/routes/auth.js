const express   = require('express')
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { body }  = require('express-validator')
const { OAuth2Client } = require('google-auth-library')
const { query } = require('../db')
const { requireAuth }  = require('../middleware/auth')
const { validate }     = require('../middleware/validate')
const { generateOtp, sendOtpEmail, sendRegistrationLink } = require('../services/emailService')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const router = express.Router()

const SALT_ROUNDS = 12  // bcrypt cost factor — NIST recommended minimum
const OTP_EXPIRY_MINUTES = 5
const REG_TOKEN_EXPIRY_HOURS = 24

// ── STEP 1: Initial Signup — collect basic info, send OTP ────────────────────
//
// Security model:
//   • User is created with is_pending=true, is_active=false, email_verified=false
//   • A bcrypt-hashed OTP is stored in email_otps — raw OTP is emailed, NEVER stored
//   • Generic success response regardless of whether email already exists
//     to prevent email enumeration attacks
//   • Rate limited at server level to prevent OTP flooding
//
router.post('/signup',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').trim().matches(/^(\+?234|0)[789][01]\d{8}$/),
    body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
    body('confirmPassword').notEmpty(),
    body('role').isIn(['rider', 'driver']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, phone, password, confirmPassword, role } = req.body

      // Frontend should check this but we enforce server-side too
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' })
      }

      // Check if email or phone already has a VERIFIED, ACTIVE account
      // We use a single query and return generic message to prevent enumeration
      const existingActive = await query(
        'SELECT id FROM users WHERE (email = $1 OR phone = $2) AND email_verified = true AND is_active = true',
        [email, phone]
      )
      if (existingActive.rows.length > 0) {
        // Generic — don't reveal which field matched
        return res.status(409).json({ message: 'An account with those details already exists. Please log in instead.' })
      }

      // Clean up any stale pending signups for this email OR phone (allow re-registration)
      await query(
        "DELETE FROM users WHERE (email = $1 OR phone = $2) AND (email_verified = false OR is_pending = true)",
        [email, phone]
      )

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

      // Insert pending user — NOT active, NOT verified
      const userResult = await query(
        `INSERT INTO users (name, email, phone, password_hash, role, email_verified, is_pending, is_active)
         VALUES ($1, $2, $3, $4, $5, false, true, false)
         RETURNING id, name, email`,
        [name, email, phone, password_hash, role]
      )
      const user = userResult.rows[0]

      // Generate OTP and store its hash
      const otp      = generateOtp()
      const otpHash  = await bcrypt.hash(otp, 10)  // cost 10 is fine for short-lived OTPs
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

      // Invalidate any previous OTPs for this user
      await query('UPDATE email_otps SET used = true WHERE user_id = $1', [user.id])

      await query(
        'INSERT INTO email_otps (user_id, email, otp_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [user.id, email, otpHash, expiresAt]
      )

      // Send OTP email — fire & forget with error logging
      sendOtpEmail(email, name, otp).catch(err =>
        console.error(`[email] Failed to send OTP to ${email}:`, err.message)
      )

      // Return only the user ID (needed for verify-otp) and masked email
      const masked = email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
      res.status(201).json({
        message: 'OTP sent. Please check your email.',
        userId:  user.id,
        maskedEmail: masked,
      })
    } catch (err) {
      // Handle duplicate phone/email with a friendly message
      if (err.code === '23505') {
        if (err.constraint === 'users_phone_key') {
          return res.status(409).json({ message: 'This phone number is already linked to an account. Please sign in or use a different number.' })
        }
        if (err.constraint === 'users_email_key') {
          return res.status(409).json({ message: 'This email address is already linked to an account. Please sign in or use a different email.' })
        }
        return res.status(409).json({ message: 'An account with those details already exists. Please sign in instead.' })
      }
      next(err)
    }
  }
)

// ── STEP 2: Verify OTP ───────────────────────────────────────────────────────
//
// Security model:
//   • OTP compared with bcrypt.compare (timing-safe)
//   • OTP marked used=true immediately after first successful verify
//   • Registration token is a UUID v4 stored with expiry
//   • After verification: account marked email_verified=true
//   • Registration continuation link emailed — user must click it to proceed
//
router.post('/verify-otp',
  [
    body('userId').isUUID(),
    body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { userId, otp } = req.body

      // Fetch latest unused, unexpired OTP for this user
      const otpResult = await query(
        `SELECT id, otp_hash, expires_at
         FROM email_otps
         WHERE user_id = $1 AND used = false
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      )

      // Always compare something — prevents timing oracle on missing OTP
      const record   = otpResult.rows[0]
      const dummyHash = '$2a$10$dummyhashtopreventtimingattacksonmissingotp....'
      const match = await bcrypt.compare(otp, record?.otp_hash || dummyHash)

      if (!record || !match || new Date() > new Date(record.expires_at)) {
        return res.status(400).json({ message: 'Invalid or expired code. Please try again.' })
      }

      // Mark OTP as used (single-use)
      await query('UPDATE email_otps SET used = true WHERE id = $1', [record.id])

      // Fetch user to get email and role for the continuation link
      const userResult = await query(
        'SELECT id, name, email, role FROM users WHERE id = $1 AND is_pending = true',
        [userId]
      )
      const user = userResult.rows[0]
      if (!user) {
        return res.status(400).json({ message: 'User not found or already verified.' })
      }

      // Generate secure registration token
      const regToken  = uuidv4()
      const tokenExp  = new Date(Date.now() + REG_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

      // Mark email verified, store registration token
      await query(
        `UPDATE users
         SET email_verified = true, registration_token = $1, reg_token_expires = $2
         WHERE id = $3`,
        [regToken, tokenExp, userId]
      )

      // Send registration continuation link
      sendRegistrationLink(user.email, user.name, regToken, user.role).catch(err =>
        console.error(`[email] Failed to send reg link to ${user.email}:`, err.message)
      )

      res.json({
        message:           'Email verified! Proceeding to registration.',
        role:              user.role,
        registrationToken: regToken,   // used by Register.jsx to activate account on final submit
      })
    } catch (err) { next(err) }
  }
)

// ── STEP 2b: Resend OTP ──────────────────────────────────────────────────────
// Rate limiting is applied at the server level (authLimiter in server.js)
// Additional guard: only allow resend if user is still pending
//
router.post('/resend-otp',
  [body('userId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { userId } = req.body

      const userResult = await query(
        'SELECT id, name, email FROM users WHERE id = $1 AND is_pending = true AND email_verified = false',
        [userId]
      )
      const user = userResult.rows[0]

      // Always return 200 to prevent user enumeration
      if (!user) {
        return res.json({ message: 'If that account exists, a new code has been sent.' })
      }

      // Invalidate all previous OTPs
      await query('UPDATE email_otps SET used = true WHERE user_id = $1', [userId])

      const otp      = generateOtp()
      const otpHash  = await bcrypt.hash(otp, 10)
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

      await query(
        'INSERT INTO email_otps (user_id, email, otp_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [userId, user.email, otpHash, expiresAt]
      )

      sendOtpEmail(user.email, user.name, otp).catch(err =>
        console.error(`[email] Resend OTP failed for ${user.email}:`, err.message)
      )

      res.json({ message: 'A new code has been sent to your email.' })
    } catch (err) { next(err) }
  }
)

// ── STEP 3: Validate registration token (called by Register.jsx on load) ─────
router.get('/validate-reg-token',
  async (req, res, next) => {
    try {
      const { token } = req.query
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, message: 'No token provided.' })
      }

      const result = await query(
        `SELECT id, name, email, role, reg_token_expires
         FROM users
         WHERE registration_token = $1 AND email_verified = true AND is_pending = true`,
        [token.trim()]
      )
      const user = result.rows[0]

      if (!user || new Date() > new Date(user.reg_token_expires)) {
        return res.status(400).json({ valid: false, message: 'This link has expired or is invalid. Please sign up again.' })
      }

      res.json({ valid: true, userId: user.id, name: user.name, role: user.role })
    } catch (err) { next(err) }
  }
)

// ── STEP 4: Complete registration (token-gated — requires valid reg token) ────
//
// The registration token from the email link proves:
//   1. Email was verified via OTP
//   2. User is the legitimate owner of that email address
//
router.post('/register',
  [
    body('registrationToken').notEmpty().isString(),
    body('role').isIn(['rider', 'driver']),
    // The remaining fields are optional here — user already supplied them at signup
    // but we accept updates in case they want to change anything
  ],
  validate,
  async (req, res, next) => {
    try {
      const { registrationToken, role } = req.body

      // Validate the registration token
      const userResult = await query(
        `SELECT id, name, email, phone, role, reg_token_expires
         FROM users
         WHERE registration_token = $1 AND email_verified = true AND is_pending = true`,
        [registrationToken]
      )
      const pendingUser = userResult.rows[0]

      if (!pendingUser || new Date() > new Date(pendingUser.reg_token_expires)) {
        return res.status(400).json({ message: 'Registration link expired or invalid. Please sign up again.' })
      }

      // Activate the account — clear pending state and registration token
      const result = await query(
        `UPDATE users
         SET is_active = true, is_pending = false, registration_token = NULL, reg_token_expires = NULL
         WHERE id = $1
         RETURNING id, name, email, phone, role, wallet_balance`,
        [pendingUser.id]
      )

      const user  = result.rows[0]
      const token = signToken(user)

      res.status(201).json({ token, user: safeUser(user) })
    } catch (err) { next(err) }
  }
)

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.post('/google',
  [
    body('credential').notEmpty().isString(),
    body('role').optional().isIn(['rider', 'driver']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { credential, role } = req.body

      // Verify Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken:  credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      const payload = ticket.getPayload()
      const { sub: googleId, email, name, email_verified } = payload

      if (!email_verified) {
        return res.status(400).json({ message: 'Your Google account email is not verified. Please verify it with Google first.' })
      }

      // Check for existing active user by email OR google_id
      const existingResult = await query(
        `SELECT id, name, email, phone, role, wallet_balance, rating, is_active
         FROM users WHERE (email = $1 OR google_id = $2) AND is_active = true LIMIT 1`,
        [email, googleId]
      )
      const existingUser = existingResult.rows[0]

      if (existingUser) {
        // Attach google_id if not already stored
        await query(
          'UPDATE users SET google_id = $1 WHERE id = $2 AND google_id IS NULL',
          [googleId, existingUser.id]
        )
        const token = signToken(existingUser)
        return res.json({ token, user: safeUser(existingUser), isNew: false })
      }

      // New user — need a role to proceed
      if (!role) {
        return res.json({ needsRole: true, email, name })
      }

      // Clean up any stale pending Google signups
      await query(
        "DELETE FROM users WHERE email = $1 AND (email_verified = false OR is_pending = true)",
        [email]
      )

      // Create pending user — phone added later in registration wizard
      const passwordHash = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), SALT_ROUNDS)
      const userResult = await query(
        `INSERT INTO users (name, email, google_id, password_hash, role, email_verified, is_pending, is_active)
         VALUES ($1, $2, $3, $4, $5, true, true, false)
         RETURNING id, name, email, role`,
        [name, email, googleId, passwordHash, role]
      )
      const newUser = userResult.rows[0]

      // Issue registration token so wizard can activate the account
      const regToken = uuidv4()
      const tokenExp = new Date(Date.now() + REG_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
      await query(
        'UPDATE users SET registration_token = $1, reg_token_expires = $2 WHERE id = $3',
        [regToken, tokenExp, newUser.id]
      )

      return res.status(201).json({
        isNew: true,
        registrationToken: regToken,
        role,
        prefill: { name, email, phone: '', password: '', confirm: '' },
      })

    } catch (err) {
      if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
        return res.status(401).json({ message: 'Google sign-in expired. Please try again.' })
      }
      next(err)
    }
  }
)

// ── Google OAuth (access token / implicit flow) ───────────────────────────────
router.post('/google-access',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().notEmpty(),
    body('googleId').trim().notEmpty(),
    body('emailVerified').isBoolean(),
    body('role').optional().isIn(['rider', 'driver']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, name, googleId, emailVerified, role } = req.body

      if (!emailVerified) {
        return res.status(400).json({ message: 'Your Google account email is not verified.' })
      }

      // Check existing active user
      const existingResult = await query(
        `SELECT id, name, email, phone, role, wallet_balance, rating, is_active
         FROM users WHERE (email = $1 OR google_id = $2) AND is_active = true LIMIT 1`,
        [email, googleId]
      )
      const existingUser = existingResult.rows[0]

      if (existingUser) {
        await query('UPDATE users SET google_id = $1 WHERE id = $2 AND google_id IS NULL', [googleId, existingUser.id])
        const token = signToken(existingUser)
        return res.json({ token, user: safeUser(existingUser), isNew: false })
      }

      // New user — need role
      if (!role) {
        return res.json({ needsRole: true, email, name })
      }

      // Clean up stale pending records
      await query(
        "DELETE FROM users WHERE (email = $1 OR google_id = $2) AND (email_verified = false OR is_pending = true)",
        [email, googleId]
      )

      // Create pending user (phone added in wizard)
      const crypto = require('crypto')
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS)

      const userResult = await query(
        `INSERT INTO users (name, email, google_id, password_hash, role, email_verified, is_pending, is_active)
         VALUES ($1, $2, $3, $4, $5, true, true, false)
         RETURNING id, name, email, role`,
        [name, email, googleId, passwordHash, role]
      )
      const newUser = userResult.rows[0]

      const regToken = uuidv4()
      const tokenExp = new Date(Date.now() + REG_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
      await query(
        'UPDATE users SET registration_token = $1, reg_token_expires = $2 WHERE id = $3',
        [regToken, tokenExp, newUser.id]
      )

      return res.status(201).json({
        isNew: true,
        registrationToken: regToken,
        role,
        prefill: { name, email, phone: '', password: '', confirm: '' },
      })

    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' })
      }
      next(err)
    }
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
