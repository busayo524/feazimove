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
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online           BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN   NOT NULL DEFAULT false;

ALTER TABLE users ADD COLUMN IF NOT EXISTS id_type        VARCHAR(40);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number      VARCHAR(40);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type   VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_make   VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_model  VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plate_number   VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_year   SMALLINT;

-- Admin is a third account type alongside rider/driver — widen the role check
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('rider','driver','admin'));

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

-- ── In-ride chat messages — between the rider and driver of a single ride ────
CREATE TABLE IF NOT EXISTS ride_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  body        VARCHAR(1000) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_messages_ride ON ride_messages(ride_id, created_at);

-- Documents uploaded at registration (ID, selfie, vehicle docs, etc.)
CREATE TABLE IF NOT EXISTS user_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type    VARCHAR(30) NOT NULL,
  file_path   TEXT        NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);

-- Driver withdrawal requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_kobo  BIGINT      NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_payouts_driver ON payout_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);

-- Driver route sessions: driver publishes availability for a time+route
-- (pre-existing tables that previously only lived in server.js's runtime
-- auto-migration — added here too so a fresh DB via this script also has them)
CREATE TABLE IF NOT EXISTS driver_availability (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period      VARCHAR(10)  NOT NULL CHECK (period IN ('morning','evening')),
  time_slot   VARCHAR(20)  NOT NULL,
  pickup      VARCHAR(100) NOT NULL,
  dropoff     VARCHAR(100) NOT NULL,
  seats       SMALLINT     NOT NULL DEFAULT 1,
  status      VARCHAR(20)  NOT NULL DEFAULT 'waiting',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW() + INTERVAL '8 hours'
);
CREATE INDEX IF NOT EXISTS idx_avail_driver ON driver_availability(driver_id);
CREATE INDEX IF NOT EXISTS idx_avail_match  ON driver_availability(period, time_slot, pickup, dropoff, status);

-- Rider booking intents: rider registers route so drivers can find them
CREATE TABLE IF NOT EXISTS rider_bookings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  availability_id UUID         REFERENCES driver_availability(id) ON DELETE SET NULL,
  period          VARCHAR(10)  NOT NULL,
  time_slot       VARCHAR(20)  NOT NULL,
  pickup          VARCHAR(100) NOT NULL,
  dropoff         VARCHAR(100) NOT NULL,
  service         VARCHAR(20)  NOT NULL DEFAULT 'pool',
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rb_rider ON rider_bookings(rider_id);
CREATE INDEX IF NOT EXISTS idx_rb_match ON rider_bookings(period, time_slot, pickup, dropoff, status);

-- Named locations (the vocabulary admin manages — adding a stop here doesn't
-- make it bookable on its own; a priced "routes" row using it does).
CREATE TABLE IF NOT EXISTS stops (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100) UNIQUE NOT NULL,
  group_name     VARCHAR(10)  NOT NULL CHECK (group_name IN ('mainland','island')),
  chain_position SMALLINT     NOT NULL,
  lat            NUMERIC(9,6),
  lng            NUMERIC(9,6),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (group_name, chain_position)
);

-- Priced pickup -> dropoff pairs — the actual source of truth for what's
-- bookable. FK on stop name (not id) so a rename cascades automatically and
-- a stop still used by an active route can't be deleted out from under it.
CREATE TABLE IF NOT EXISTS routes (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  period          VARCHAR(10)  NOT NULL CHECK (period IN ('morning','evening')),
  pickup          VARCHAR(100) NOT NULL REFERENCES stops(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  dropoff         VARCHAR(100) NOT NULL REFERENCES stops(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  pool_fare_kobo  BIGINT       NOT NULL,
  solo_fare_kobo  BIGINT       NOT NULL,
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  updated_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (period, pickup, dropoff)
);
CREATE INDEX IF NOT EXISTS idx_routes_period ON routes(period, is_active);

-- Fare is quoted and locked in at booking time, not re-looked-up at
-- confirmation time (see routes table comment above).
ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS quoted_fare_kobo BIGINT;

-- Driver's last-reported live GPS position on an active ride.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_lat NUMERIC(9,6);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_lng NUMERIC(9,6);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;

-- Rider's last-reported live GPS position, symmetric to the driver's.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_lat NUMERIC(9,6);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_lng NUMERIC(9,6);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_location_updated_at TIMESTAMPTZ;

-- Package-delivery ("Move an Item") bookings run through the same
-- book-intent -> match -> confirm-route pipeline, service = 'send'.
ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS recipient_name  VARCHAR(100);
ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS package_size    VARCHAR(10);
ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS notes           VARCHAR(500);

ALTER TABLE rides ADD COLUMN IF NOT EXISTS recipient_name  VARCHAR(100);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS package_size    VARCHAR(10);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS notes           VARCHAR(500);
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
