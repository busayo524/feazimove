/**
 * Database migration — run once: node db/migrate.js
 * Creates all tables if they don't exist
 */
require('dotenv').config({ path: '../.env' })
const { pool } = require('./index')

const SQL = `
-- Users (riders + drivers in one table, separated by role)
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100)        NOT NULL,
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
