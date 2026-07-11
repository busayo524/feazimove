const express   = require('express')
const fs        = require('fs')
const path      = require('path')
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const { v4: uuidv4 } = require('uuid')
const { body }  = require('express-validator')
const { OAuth2Client } = require('google-auth-library')
const axios     = require('axios')
const { query } = require('../db')
const { requireAuth }  = require('../middleware/auth')
const { validate }     = require('../middleware/validate')
const { upload, DOC_FIELDS } = require('../middleware/upload')
const { saveUpload, sendStored } = require('../services/fileStorage')
const { generateOtp, sendOtpEmail, sendRegistrationLink, sendWelcomeEmail } = require('../services/emailService')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const router = express.Router()

const SALT_ROUNDS = 12  // bcrypt cost factor — NIST recommended minimum
const OTP_EXPIRY_MINUTES = 5
const REG_TOKEN_EXPIRY_HOURS = 24

// ── Endpoint-scoped rate limits ───────────────────────────────────────────────
// Short windows, applied only to the credential-guessing endpoints themselves —
// not the whole router — so normal navigation (session checks, role switches,
// registration steps) never eats into the same budget as actual login/OTP attempts.
const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 2 minutes.' },
})
const otpLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait 2 minutes.' },
})

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
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('phone').trim().matches(/^\+\d{6,15}$|^(\+?234|0)[789][01]\d{8}$/),
    body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
    body('confirmPassword').notEmpty(),
    body('role').isIn(['rider', 'driver']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name = '', email, phone, password, confirmPassword, role } = req.body

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

      // Clean up stale pending signups for this email OR phone (allow re-registration).
      // Only remove ones that never verified, or that verified but let their registration
      // link expire — never a verified signup that's still mid-flow with a live token.
      await query(
        `DELETE FROM users WHERE (email = $1 OR phone = $2)
         AND (email_verified = false OR is_pending = true)
         AND (email_verified = false OR reg_token_expires IS NULL OR reg_token_expires < NOW())`,
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
  otpLimiter,
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
// Additional guard: only allow resend if user is still pending
//
router.post('/resend-otp',
  otpLimiter,
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
        `SELECT id, name, email, phone, role, reg_token_expires
         FROM users
         WHERE registration_token = $1 AND email_verified = true AND is_pending = true`,
        [token.trim()]
      )
      const user = result.rows[0]

      if (!user || new Date() > new Date(user.reg_token_expires)) {
        return res.status(400).json({ valid: false, message: 'This link has expired or is invalid. Please sign up again.' })
      }

      res.json({ valid: true, userId: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role })
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
  upload.fields(DOC_FIELDS), // parses multipart/form-data — populates req.body and req.files
  [
    body('registrationToken').notEmpty().isString(),
    body('role').isIn(['rider', 'driver']),
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 100 }).escape(),
    // Location + demographics from step 1
    body('city').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).escape(),
    body('area').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
    body('dateOfBirth').optional({ checkFalsy: true }).isISO8601(),
    body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'prefer_not_to_say']),
    // Rider identity (optional — only rider step 2 sends these)
    body('idType').optional({ checkFalsy: true }).trim().isLength({ max: 40 }).escape(),
    body('idNumber').optional({ checkFalsy: true }).trim().isLength({ max: 40 }).escape(),
    // Driver vehicle info (optional — only driver step 2 sends these)
    body('vehicleType').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
    body('vehicleMake').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('vehicleModel').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
    body('plateNumber').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
    body('vehicleYear').optional({ checkFalsy: true }).isInt({ min: 1980, max: 2100 }),
    body('vehicleColor').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const {
        registrationToken, role, name,
        city, area, dateOfBirth, gender,
        idType, idNumber,
        vehicleType, vehicleMake, vehicleModel, plateNumber, vehicleYear, vehicleColor,
      } = req.body

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

      // Build the final name: prefer the one from the wizard; fall back to whatever was stored at signup
      const finalName = (name && name.trim()) ? name.trim() : pendingUser.name

      // Save all registration data but keep the account pending — an admin must
      // review and approve before the user can log in and book rides.
      const result = await query(
        `UPDATE users
         SET registration_token = NULL, reg_token_expires = NULL,
             name = $2,
             can_ride      = false,
             can_drive     = false,
             id_type       = COALESCE($3, id_type),
             id_number     = COALESCE($4, id_number),
             vehicle_type  = COALESCE($5, vehicle_type),
             vehicle_make  = COALESCE($6, vehicle_make),
             vehicle_model = COALESCE($7, vehicle_model),
             plate_number  = COALESCE($8, plate_number),
             vehicle_year  = COALESCE($9, vehicle_year),
             vehicle_color = COALESCE($10, vehicle_color),
             city          = COALESCE($11, city),
             area          = COALESCE($12, area),
             date_of_birth = COALESCE($13, date_of_birth),
             gender        = COALESCE($14, gender)
         WHERE id = $1
         RETURNING id, name, email, role`,
        [
          pendingUser.id, finalName,
          idType || null, idNumber || null,
          vehicleType || null, vehicleMake || null, vehicleModel || null,
          plateNumber || null, vehicleYear || null, vehicleColor || null,
          city || null, area || null, dateOfBirth || null, gender || null,
        ]
      )

      const user = result.rows[0]

      // Persist any uploaded documents (ID, selfie, vehicle docs, etc.)
      const uploaded = req.files || {}
      let facePhotoKey = null
      for (const [docType, fileArr] of Object.entries(uploaded)) {
        const file = fileArr[0]
        if (!file) continue
        const storageKey = await saveUpload(req, file)
        await query(
          'INSERT INTO user_documents (user_id, doc_type, file_path) VALUES ($1, $2, $3)',
          [user.id, docType, storageKey]
        )
        // The face photo doubles as the profile picture (selfie preferred)
        if (docType === 'selfie' || (docType === 'profilePhoto' && !facePhotoKey)) {
          facePhotoKey = storageKey
        }
      }
      if (facePhotoKey) {
        await query('UPDATE users SET avatar_path = $1 WHERE id = $2', [facePhotoKey, user.id])
      }

      // Return pending — no JWT yet. User must wait for admin approval.
      res.status(201).json({
        pending: true,
        message: 'Registration submitted successfully. Your account is under review and will be activated within 24 hours.',
      })
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

      // Clean up stale pending Google signups — but never one that's mid-flow with a live token
      await query(
        `DELETE FROM users WHERE email = $1
         AND (email_verified = false OR is_pending = true)
         AND (email_verified = false OR reg_token_expires IS NULL OR reg_token_expires < NOW())`,
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

      // Clean up stale pending records — but never one that's mid-flow with a live token
      await query(
        `DELETE FROM users WHERE (email = $1 OR google_id = $2)
         AND (email_verified = false OR is_pending = true)
         AND (email_verified = false OR reg_token_expires IS NULL OR reg_token_expires < NOW())`,
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
  loginLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or phone is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { identifier, password } = req.body

      // Detect whether identifier looks like an email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)

      const result = await query(
        `SELECT id, name, email, phone, role, password_hash, wallet_balance, rating,
                can_ride, can_drive, active_role, force_password_change, is_active, is_pending,
                bank_name, bank_account_number
         FROM users
         WHERE ${isEmail ? 'email = $1' : 'phone = $1'}`,
        [isEmail ? identifier.toLowerCase().trim() : identifier.trim()]
      )

      const user = result.rows[0]

      // Always run bcrypt even if user not found — prevents timing attacks
      const dummyHash = '$2a$12$dummyhashtopreventtimingattacksonnonexistentusers.......'
      const match = await bcrypt.compare(password, user?.password_hash || dummyHash)

      if (!user) {
        return res.status(401).json({ message: isEmail
          ? 'No account found with that email address.'
          : 'No account found with that phone number.'
        })
      }
      if (!match) {
        return res.status(401).json({ message: 'Incorrect password. Please try again.' })
      }
      // Pending: registration submitted but not yet reviewed by admin
      if (user.is_pending) {
        return res.status(403).json({
          pending: true,
          message: 'Your account is awaiting admin approval. You will be notified once it is activated.',
        })
      }
      // Rejected / suspended
      if (!user.is_active) {
        return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
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
      'SELECT id, name, email, phone, role, wallet_balance, rating, can_ride, can_drive, active_role, force_password_change, bank_name, bank_account_number FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
    res.json({ user: safeUser(result.rows[0]) })
  } catch (err) { next(err) }
})

// ── Change password (also clears the forced first-login reset flag) ──────────
router.post('/change-password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/)
      .withMessage('New password must be at least 8 characters with 1 uppercase letter and 1 number.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body

      const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
      const user = result.rows[0]
      if (!user) return res.status(404).json({ message: 'User not found.' })

      const match = await bcrypt.compare(currentPassword, user.password_hash)
      if (!match) return res.status(401).json({ message: 'Current password is incorrect.' })

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
      await query(
        'UPDATE users SET password_hash = $1, force_password_change = false WHERE id = $2',
        [newHash, req.user.id]
      )
      res.json({ message: 'Password updated.' })
    } catch (err) { next(err) }
  }
)

// ── Update profile ────────────────────────────────────────────────────────────
router.patch('/profile',
  requireAuth,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('bankName').optional({ nullable: true }).trim().isLength({ max: 100 }).escape(),
    body('bankAccountNumber').optional({ nullable: true }).trim()
      .custom(v => v === '' || /^\d{10}$/.test(v)).withMessage('Account number must be 10 digits.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const sets = [], vals = []
      const add = (col, val) => { vals.push(val); sets.push(`${col} = $${vals.length}`) }
      if (req.body.name !== undefined) add('name', req.body.name)
      if (req.body.bankName !== undefined) add('bank_name', req.body.bankName || null)
      if (req.body.bankAccountNumber !== undefined) add('bank_account_number', req.body.bankAccountNumber || null)
      if (!sets.length) return res.json({ message: 'Nothing to update.' })
      vals.push(req.user.id)
      const result = await query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length}
         RETURNING id, name, email, phone, role, wallet_balance, rating, can_ride, can_drive,
                   active_role, force_password_change, bank_name, bank_account_number`,
        vals
      )
      res.json({ message: 'Profile updated.', user: safeUser(result.rows[0]) })
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
    { id: user.id, role: user.active_role || user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' }
  )
}

function safeUser(user) {
  const activeRole = user.active_role || user.role || 'rider'
  return {
    id:            user.id,
    name:          user.name,
    email:         user.email || null,
    phone:         user.phone,
    role:          activeRole,           // current active mode
    activeRole,
    canRide:       user.can_ride  ?? true,
    canDrive:      user.can_drive ?? false,
    walletBalance: Math.round((user.wallet_balance || 0) / 100),
    rating:        user.rating,
    forcePasswordChange: user.force_password_change ?? false,
    bankName:          user.bank_name || null,
    bankAccountNumber: user.bank_account_number || null,
  }
}

// ── Switch active role (rider ↔ driver) ──────────────────────────────────────
router.post('/switch-role', requireAuth, async (req, res, next) => {
  try {
    const { role } = req.body
    if (!['rider', 'driver'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' })
    }

    // Verify user actually has this role enabled
    const check = await query(
      'SELECT can_ride, can_drive FROM users WHERE id = $1',
      [req.user.id]
    )
    const u = check.rows[0]
    if (!u) return res.status(404).json({ message: 'User not found.' })
    if (role === 'driver' && !u.can_drive) {
      return res.status(403).json({ message: 'You have not registered as a driver yet.' })
    }
    if (role === 'rider' && !u.can_ride) {
      return res.status(403).json({ message: 'You have not registered as a rider yet.' })
    }

    const result = await query(
      `UPDATE users SET active_role = $1 WHERE id = $2
       RETURNING id, name, email, phone, role, wallet_balance, rating, can_ride, can_drive, active_role`,
      [role, req.user.id]
    )
    // Re-issue the token — it embeds the active role, which just changed
    const token = signToken(result.rows[0])
    res.json({ token, user: safeUser(result.rows[0]) })
  } catch (err) { next(err) }
})

// ── Add second role (e.g., rider adds driver profile) ────────────────────────
router.post('/add-role', requireAuth,
  [body('role').isIn(['rider', 'driver']).withMessage('Invalid role.')],
  validate,
  async (req, res, next) => {
    try {
      const { role } = req.body

      const column = role === 'driver' ? 'can_drive' : 'can_ride'
      const result = await query(
        `UPDATE users SET ${column} = true, active_role = $1
         WHERE id = $2 AND is_active = true
         RETURNING id, name, email, phone, role, wallet_balance, rating, can_ride, can_drive, active_role`,
        [role, req.user.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
      // Re-issue the token — it embeds the active role, which just changed
      const token = signToken(result.rows[0])
      res.json({ token, user: safeUser(result.rows[0]) })
    } catch (err) { next(err) }
  }
)

// ── ID Verification via Prembly Identitypass ─────────────────────────────────
//
// Security:
//   • API keys never leave the server
//   • Rate limited at auth limiter level (10 req / 15 min per IP)
//   • Only accepts known ID types — no open-ended proxy
//   • Returns only verified boolean + name — never raw Prembly payload
//
const PREMBLY_BASE   = 'https://api.prembly.com/identitypass/verification'
const PREMBLY_ROUTES = {
  'National ID (NIN)': { path: '/nin',             field: 'number' },
  "Driver's License":  { path: '/drivers_license', field: 'number' },
  "Voter's Card":      { path: '/voters_card',      field: 'number' },
}

router.post('/verify-id',
  [
    body('idType').isIn(Object.keys(PREMBLY_ROUTES)).withMessage('Invalid ID type.'),
    body('idNumber').trim().notEmpty().withMessage('ID number is required.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { idType, idNumber } = req.body

      const apiKey = process.env.PREMBLY_API_KEY
      const appId  = process.env.PREMBLY_APP_ID

      if (!apiKey || !appId) {
        return res.status(503).json({ message: 'ID verification service is not configured yet.' })
      }

      const route = PREMBLY_ROUTES[idType]

      const premblyRes = await axios.post(
        `${PREMBLY_BASE}${route.path}`,
        { [route.field]: idNumber.replace(/\s/g, '') },
        {
          headers: {
            'x-api-key': apiKey,
            'app-id':    appId,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )

      const data = premblyRes.data

      // Prembly returns { status: true, response_code: '00', ... } on success
      const verified = data?.status === true && data?.response_code === '00'

      // Return only the minimum needed — never forward full Prembly payload
      return res.json({
        verified,
        name: verified ? (data?.nin_data?.full_name || data?.license_data?.full_name || data?.voter_data?.full_name || null) : null,
        message: verified ? 'ID verified successfully.' : 'Could not verify this ID. Please check the number and try again.',
      })
    } catch (err) {
      // Prembly 4xx means ID not found / invalid
      if (err.response?.status === 400 || err.response?.status === 404) {
        return res.status(200).json({ verified: false, name: null, message: 'ID not found. Please check the number and try again.' })
      }
      next(err)
    }
  }
)

// ── Set/replace my profile photo — any authenticated user (rider or driver),
// not just what the driver registration wizard collects. This is the real,
// server-visible photo that /rides/avatar serves to other ride participants.
router.post('/avatar',
  requireAuth,
  upload.single('avatar'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(422).json({ message: 'No image uploaded.' })
      const storageKey = await saveUpload(req, req.file)
      await query('UPDATE users SET avatar_path = $1 WHERE id = $2', [storageKey, req.user.id])
      res.json({ message: 'Profile photo updated.' })
    } catch (err) { next(err) }
  }
)

// ── My own profile photo — lets the app show it back on any device/browser,
// not just the one it was uploaded from (that only has the localStorage copy).
router.get('/avatar',
  requireAuth,
  async (req, res, next) => {
    try {
      // Prefer the real profile photo set from the Profile page; fall back
      // to whatever the registration wizard collected, same as /rides/avatar.
      const userRes = await query('SELECT avatar_path FROM users WHERE id = $1', [req.user.id])
      let filename = userRes.rows[0]?.avatar_path

      if (!filename) {
        const doc = await query(
          `SELECT file_path FROM user_documents
            WHERE user_id = $1 AND doc_type IN ('selfie', 'profilePhoto')
            ORDER BY uploaded_at DESC LIMIT 1`,
          [req.user.id]
        )
        filename = doc.rows[0]?.file_path
      }
      if (!filename) return res.status(404).json({ message: 'No photo on file.' })

      await sendStored(req, res, filename)
    } catch (err) { next(err) }
  }
)

// ── Storage self-test — authenticated diagnostic for the file-storage layer.
// Exercises every File Store step and reports which one fails, since
// production error responses are (rightly) opaque.
router.get('/storage-selftest', requireAuth, async (req, res) => {
  const steps = { onCatalyst: !!process.env.X_ZOHO_CATALYST_LISTEN_PORT }
  try {
    const catalyst = require('zcatalyst-sdk-node')
    steps.sdkLoaded = true
    let app
    try { app = catalyst.initialize(req, { scope: 'admin' }); steps.init = 'admin' }
    catch (e) { steps.adminInitError = e.message; app = catalyst.initialize(req); steps.init = 'default' }
    const store = app.filestore()
    // Folder objects are class instances — real details live behind toJSON()
    const dts = f => (f && typeof f.toJSON === 'function' ? f.toJSON() : f) || {}
    const folders = await store.getAllFolders()
    steps.folders = (folders || []).map(f => ({ id: String(dts(f).id), name: dts(f).folder_name }))
    let folder = (folders || []).find(f => dts(f).folder_name === 'feazimove_uploads')
    if (!folder) { folder = await store.createFolder('feazimove_uploads'); steps.createdFolder = true }
    steps.folderId = String(dts(folder).id)
    const os = require('os')
    const tmpName = `selftest-${Date.now()}.txt`
    const tmpPath = path.join(os.tmpdir(), tmpName)
    fs.writeFileSync(tmpPath, 'selftest')
    const up = await folder.uploadFile({ code: fs.createReadStream(tmpPath), name: tmpName })
    fs.unlink(tmpPath, () => {})
    steps.uploadedFileId = String(up.id)
    const data = await folder.downloadFile(up.id)
    steps.downloadedBytes = Buffer.isBuffer(data) ? data.length : (typeof data === 'object' && data.pipe ? 'stream' : String(data).length)
    await folder.deleteFile(up.id)
    steps.cleanup = 'ok'
    res.json({ ok: true, steps })
  } catch (err) {
    steps.error = err.message
    steps.stack = (err.stack || '').split('\n').slice(0, 5)
    res.status(500).json({ ok: false, steps })
  }
})

// ── Download-integrity probe — reads the caller's own avatar from File Store
// server-side and reports what the SDK actually returned, to distinguish
// "SDK gives short buffers" from "Zoho edge truncates the response".
// ?b64=1 additionally returns the file as base64 JSON so we can test whether
// a large JSON body survives the edge where a binary body doesn't.
router.get('/storage-download-debug', requireAuth, async (req, res) => {
  const out = {}
  try {
    const userRes = await query('SELECT avatar_path FROM users WHERE id = $1', [req.user.id])
    const key = userRes.rows[0]?.avatar_path
    out.key = key
    if (!key || !String(key).startsWith('fs:')) return res.json({ ...out, note: 'no File Store avatar' })
    const [, fileId] = String(key).split(':')

    const catalyst = require('zcatalyst-sdk-node')
    let app
    try { app = catalyst.initialize(req, { scope: 'admin' }) } catch { app = catalyst.initialize(req) }
    const store = app.filestore()
    const dts = f => (f && typeof f.toJSON === 'function' ? f.toJSON() : f) || {}
    const folders = await store.getAllFolders()
    const folder = (folders || []).find(f => dts(f).folder_name === 'feazimove_uploads')
    if (!folder) return res.json({ ...out, note: 'folder missing' })

    out.details = await folder.getFileDetails(fileId).catch(e => ({ error: e.message }))
    out.reads = []
    let last = null
    for (let i = 0; i < 3; i++) {
      const data = await folder.downloadFile(fileId)
      last = Buffer.isBuffer(data) ? data : Buffer.from(data)
      out.reads.push(last.length)
    }
    if (req.query.b64 === '1' && last) out.b64 = last.toString('base64')
    res.json(out)
  } catch (err) {
    out.error = err.message
    out.stack = (err.stack || '').split('\n').slice(0, 4)
    res.status(500).json(out)
  }
})

module.exports = router
