/**
 * Database migration — run once: node db/migrate.js
 * Creates all tables if they don't exist
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { pool } = require('./index')

const SQL = `
-- Users (riders + drivers in one table, separated by role)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)        NOT NULL,
  email           VARCHAR(254) UNIQUE,
  phone           VARCHAR(20) UNIQUE  NOT NULL,
  password_hash   TEXT                NOT NULL,
  role            VARCHAR(10)         NOT NULL CHECK (role IN ('rider', 'driver')),
  wallet_balance  BIGINT              NOT NULL DEFAULT 0,  -- stored in kobo
  rating          NUMERIC(3,2)        DEFAULT 5.0,
  is_active       BOOLEAN             NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Rides
CREATE TABLE IF NOT EXISTS rides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  type            VARCHAR(10)  NOT NULL CHECK (type IN ('pool', 'send')),
  pickup          VARCHAR(200) NOT NULL,
  destination     VARCHAR(200) NOT NULL,
  status          VARCHAR(30)  NOT NULL DEFAULT 'pending',
  fare_kobo       BIGINT,
  distance_m      INTEGER,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(10)  NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_kobo     BIGINT       NOT NULL,
  description     VARCHAR(200) NOT NULL,
  reference       VARCHAR(100) UNIQUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id         UUID REFERENCES rides(id) ON DELETE CASCADE,
  rater_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  ratee_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  stars           SMALLINT     NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rides_rider    ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver   ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status   ON rides(status);
CREATE INDEX IF NOT EXISTS idx_wallet_user    ON wallet_transactions(user_id);

-- ── Email verification columns on users ──────────────────────────────────────
-- Add email column for databases created before it was included in the schema
ALTER TABLE users ADD COLUMN IF NOT EXISTS email              VARCHAR(254);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified     BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pending         BOOLEAN     NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_token TEXT        UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reg_token_expires  TIMESTAMPTZ;

-- ── Email OTPs — hashed, expiring, single-use ─────────────────────────────────
-- Security: we store a bcrypt hash of the OTP, never the raw value.
-- Each OTP expires in 10 minutes and is marked used after verification.
CREATE TABLE IF NOT EXISTS email_otps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       VARCHAR(254) NOT NULL,
  otp_hash    TEXT        NOT NULL,           -- bcrypt hash of 6-digit OTP
  expires_at  TIMESTAMPTZ NOT NULL,           -- 10 minutes from creation
  used        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_user_id ON email_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON email_otps(expires_at);
`

;(async () => {
  try {
    await pool.query(SQL)
    console.log('✅ Migration complete.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
})()
