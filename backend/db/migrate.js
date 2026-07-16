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
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_color  VARCHAR(30);

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
  pool_fare_kobo     BIGINT    NOT NULL,
  package_fare_kobo  BIGINT    NOT NULL,
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

-- One rating per (ride, rater) — supports both directions.
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_ride_rater_unique;
ALTER TABLE ratings ADD CONSTRAINT ratings_ride_rater_unique UNIQUE (ride_id, rater_id);

-- Real, server-visible profile photo — settable by any user.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path VARCHAR(255);

-- Payment status tracking on wallet top-ups (pending → completed/failed).
-- Existing rows default to 'completed' so history stays intact.
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'completed';

-- Timestamp when the rider actually boarded (status -> in_transit) — used for trip duration analytics
ALTER TABLE rides ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ;

-- Payout/refund bank details, editable from the profile page
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20);

-- Link each ride to the booking it was matched from, so cancelling a ride
-- can precisely requeue or cancel that exact booking
ALTER TABLE rides ADD COLUMN IF NOT EXISTS booking_id UUID;

-- Who cancelled a ride ('rider' | 'driver') — lets the rider app show
-- "Ride cancelled by driver" and auto-resume matching vs. a self-cancel.
ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(10);

-- Token generation counter — embedded in every JWT. Bumped on password
-- change so every previously-issued token (other devices, stolen tokens)
-- stops validating. Tokens with no version (pre-feature) count as 0.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Refresh tokens: short-lived access JWTs (15m) are silently renewed with a
-- long-lived, single-use, rotating refresh token. Reusing an already-rotated
-- token (theft signal) revokes the whole family. Only the sha256 hash is kept.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  family_id  UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT false,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Step-up 2FA: a short-lived emailed code that must be verified before a
-- sensitive action (password change, wallet withdrawal). Code stored hashed.
CREATE TABLE IF NOT EXISTS action_challenges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    VARCHAR(40) NOT NULL,
  code_hash  TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_challenges_user ON action_challenges(user_id);

-- email_otps is reused for both signup verification and password reset —
-- purpose keeps the two flows from cross-validating each other's codes.
ALTER TABLE email_otps ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'signup';

-- Backfill: the face photo collected at registration becomes the avatar
-- for accounts created before automatic assignment existed (selfie
-- preferred). Idempotent — only ever fills blanks.
UPDATE users u SET avatar_path = d.file_path
FROM (
  SELECT DISTINCT ON (user_id) user_id, file_path
    FROM user_documents
   WHERE doc_type IN ('selfie','profilePhoto')
   ORDER BY user_id, (doc_type = 'selfie') DESC, uploaded_at DESC
) d
WHERE u.id = d.user_id AND u.avatar_path IS NULL;

-- Optional handoff note each side can leave when booking/going live —
-- carried onto the matched ride and shown to the other party once
-- they're actually paired together (not before).
ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS comment VARCHAR(200);
ALTER TABLE driver_availability ADD COLUMN IF NOT EXISTS comment VARCHAR(200);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_comment VARCHAR(200);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_comment VARCHAR(200);

-- Single-row table holding the platform's cut of every fare (admin-tunable,
-- read live at ride-completion time — never retroactive on past payouts).
CREATE TABLE IF NOT EXISTS platform_settings (
  id                    SMALLINT     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_fee_percent  NUMERIC(5,2) NOT NULL DEFAULT 20.00 CHECK (platform_fee_percent BETWEEN 0 AND 100),
  updated_by            UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at            TIMESTAMPTZ
);
INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Location + demographics captured on the registration wizard
ALTER TABLE users ADD COLUMN IF NOT EXISTS city          VARCHAR(60);
ALTER TABLE users ADD COLUMN IF NOT EXISTS area          VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender        VARCHAR(20);

-- Admin action audit trail — feeds the dashboard "Recent Activity" panel
-- alongside events derived live from rides/users/payouts.
CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(60)  NOT NULL,
  category   VARCHAR(20)  NOT NULL,
  detail     VARCHAR(300),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- Solo-ride fare is no longer admin-priced — it's pool fare × the matched
-- driver's seats, computed at match time (see /driver/confirm-route).
-- This column now only prices package deliveries ("Move an Item"), so it's
-- renamed to reflect that — admins still set it the same way as before.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='solo_fare_kobo')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='package_fare_kobo') THEN
    ALTER TABLE routes RENAME COLUMN solo_fare_kobo TO package_fare_kobo;
  END IF;
END $$;
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
