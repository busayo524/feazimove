/**
 * FeaziMove API Server
 * Security: helmet, CORS allowlist, rate limiting, no stack traces in prod
 */
require('dotenv').config()
const express    = require('express')
const helmet     = require('helmet')
const cors       = require('cors')
const rateLimit  = require('express-rate-limit')

const { pool } = require('./db')
const authRoutes   = require('./routes/auth')
const rideRoutes   = require('./routes/rides')
const walletRoutes = require('./routes/wallet')
const driverRoutes = require('./routes/driver')

const app  = express()
const PORT = process.env.PORT || 4000

// ── Auto-migrate on startup ──────────────────────────────────────────────────
// Safely adds any missing columns / tables without dropping existing data.
async function runMigrations() {
  const migrations = `
    -- Core users table
    CREATE TABLE IF NOT EXISTS users (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name            VARCHAR(100)        NOT NULL,
      email           VARCHAR(254) UNIQUE,
      phone           VARCHAR(20) UNIQUE  NOT NULL,
      password_hash   TEXT                NOT NULL,
      role            VARCHAR(10)         NOT NULL CHECK (role IN ('rider','driver')),
      wallet_balance  BIGINT              NOT NULL DEFAULT 0,
      rating          NUMERIC(3,2)        DEFAULT 5.0,
      is_active       BOOLEAN             NOT NULL DEFAULT true,
      created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
    );

    -- Add columns that may be missing from older deployments
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email          VARCHAR(254);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pending     BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_token TEXT UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reg_token_expires  TIMESTAMPTZ;

    -- OTP table
    CREATE TABLE IF NOT EXISTS email_otps (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email       VARCHAR(254) NOT NULL,
      otp_hash    TEXT        NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN     NOT NULL DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_otps_user_id ON email_otps(user_id);
    CREATE INDEX IF NOT EXISTS idx_otps_expires ON email_otps(expires_at);

    -- Other tables
    CREATE TABLE IF NOT EXISTS rides (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rider_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      driver_id    UUID REFERENCES users(id) ON DELETE SET NULL,
      type         VARCHAR(10)  NOT NULL CHECK (type IN ('pool','send')),
      pickup       VARCHAR(200) NOT NULL,
      destination  VARCHAR(200) NOT NULL,
      status       VARCHAR(30)  NOT NULL DEFAULT 'pending',
      fare_kobo    BIGINT,
      distance_m   INTEGER,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
      type         VARCHAR(10)  NOT NULL CHECK (type IN ('credit','debit')),
      amount_kobo  BIGINT       NOT NULL,
      description  VARCHAR(200) NOT NULL,
      reference    VARCHAR(100) UNIQUE,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ride_id    UUID REFERENCES rides(id) ON DELETE CASCADE,
      rater_id   UUID REFERENCES users(id) ON DELETE SET NULL,
      ratee_id   UUID REFERENCES users(id) ON DELETE SET NULL,
      stars      SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
      comment    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_rides_rider   ON rides(rider_id);
    CREATE INDEX IF NOT EXISTS idx_rides_driver  ON rides(driver_id);
    CREATE INDEX IF NOT EXISTS idx_rides_status  ON rides(status);
    CREATE INDEX IF NOT EXISTS idx_wallet_user   ON wallet_transactions(user_id);
  `
  try {
    await pool.query(migrations)
    console.log('✅ Database ready.')
  } catch (err) {
    console.error('❌ Migration error:', err.message)
  }
}

// ── Security headers (OWASP) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))

// ── CORS — only allow frontend origin ────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

// In development also always allow localhost variants
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true)
    const allowed = [...ALLOWED_ORIGINS, ...(process.env.NODE_ENV !== 'production' ? DEV_ORIGINS : [])]
    if (allowed.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10kb' })) // Prevent large payload attacks

// ── Global rate limit ────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
}))

// ── Stricter rate limit for auth endpoints ───────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
})

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',   authLimiter, authRoutes)
app.use('/api/rides',  rideRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/driver', driverRoutes)

// ── Health check (public, no sensitive info) ─────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: 'Not found' }))

// ── Global error handler — NEVER expose stack traces in production ────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // Log internally (use a real logger like Winston in production)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`)

  const status = err.status || 500
  res.status(status).json({
    message: process.env.NODE_ENV === 'production'
      ? status === 500 ? 'An internal error occurred.' : err.message
      : err.message,
  })
})

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`FeaziMove API running on http://localhost:${PORT}`)
  })
})

module.exports = app
