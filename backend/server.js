/**
 * FeaziMove API Server
 * Security: helmet, CORS allowlist, rate limiting, no stack traces in prod
 */
require('dotenv').config()

// ── Fail fast on missing/placeholder critical env vars ──────────────────────
// Without JWT_SECRET the server would sign unverifiable tokens; without
// DATABASE_URL every query fails at request time instead of at boot.
for (const key of ['JWT_SECRET', 'DATABASE_URL']) {
  const val = process.env[key]
  if (!val || val.includes('replace_with') || val.includes('USER:PASSWORD')) {
    console.error(`FATAL: ${key} is not set — configure it in .env or the AppSail environment`)
    process.exit(1)
  }
}

// Loud (non-fatal) alarm: a production boot pointed at Anchor's SANDBOX means
// real riders would be "paying" fake money — the classic footgun when an
// AppSail promotion wipes env config and the bundled .env fallback kicks in.
if (process.env.NODE_ENV === 'production'
    && (process.env.ANCHOR_BASE_URL || '').includes('sandbox')
    && process.env.ANCHOR_API_KEY) {
  console.error('⚠️  WARNING: NODE_ENV=production but ANCHOR_BASE_URL points at the SANDBOX. '
    + 'Set the live base URL + live API key in the AppSail environment before serving real users.')
}

const express    = require('express')
const helmet     = require('helmet')
const cors       = require('cors')
const rateLimit  = require('express-rate-limit')

const { pool } = require('./db')
const authRoutes   = require('./routes/auth')
const rideRoutes   = require('./routes/rides')
const walletRoutes = require('./routes/wallet')
const driverRoutes = require('./routes/driver')
const adminRoutes  = require('./routes/admin')
const routesCatalog = require('./routes/routes')

const app  = express()
// Catalyst AppSail assigns the listen port via X_ZOHO_CATALYST_LISTEN_PORT
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 4000

// Behind AppSail's load balancer the client IP arrives in X-Forwarded-For —
// without this, every user shares one rate-limit bucket (proxy's IP).
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

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
    ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id      VARCHAR(128) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pending     BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_token TEXT UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reg_token_expires  TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online          BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

    -- Info collected at registration that previously had nowhere to live
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

    -- Dual-role support: users can be both rider and driver
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_ride   BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_drive  BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active_role VARCHAR(10) NOT NULL DEFAULT 'rider';
    -- Backfill existing users based on their role column
    UPDATE users SET can_ride  = true  WHERE role = 'rider'  AND can_drive = false;
    UPDATE users SET can_drive = true  WHERE role = 'driver';
    UPDATE users SET can_ride  = true  WHERE role = 'driver' AND can_ride = false;
    UPDATE users SET active_role = role WHERE active_role = 'rider' AND role = 'driver';

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
      status       VARCHAR(20)  NOT NULL DEFAULT 'completed',
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    -- Pre-existing installs created wallet_transactions without status
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

    -- Driver route sessions: driver publishes availability for a time+route
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

    -- In-ride chat between the rider and driver of a single ride
    CREATE TABLE IF NOT EXISTS ride_messages (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      ride_id     UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      sender_id   UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      body        VARCHAR(1000) NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ride_messages_ride ON ride_messages(ride_id, created_at);

    -- Documents uploaded at registration (ID, selfie, vehicle docs, etc.) —
    -- lets admins review what a rider/driver actually submitted.
    CREATE TABLE IF NOT EXISTS user_documents (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_type    VARCHAR(30) NOT NULL,
      file_path   TEXT        NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);

    -- Driver withdrawal requests — balance is escrowed (deducted) on request,
    -- refunded if an admin rejects it, otherwise paid out externally on approval.
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

    -- Fare is quoted and locked in at booking time, not re-looked-up at
    -- confirmation time, so a later admin price edit never silently changes
    -- what an already-matched rider is charged.
    ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS quoted_fare_kobo BIGINT;

    -- Driver's last-reported live GPS position on an active ride, pushed
    -- periodically from their device so the rider can see real movement
    -- (not a simulated position) before and during the trip.
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_lat NUMERIC(9,6);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_lng NUMERIC(9,6);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;

    -- Rider's last-reported live GPS position, symmetric to the driver's —
    -- lets the driver's map show where the rider actually is too.
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_lat NUMERIC(9,6);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_lng NUMERIC(9,6);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS rider_location_updated_at TIMESTAMPTZ;

    -- Package-delivery ("Move an Item") bookings run through the exact same
    -- book-intent -> match -> confirm-route pipeline as pool/solo rides, just
    -- with service = 'send' and these extra fields carried along.
    ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS recipient_name  VARCHAR(100);
    ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
    ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS package_size    VARCHAR(10);
    ALTER TABLE rider_bookings ADD COLUMN IF NOT EXISTS notes           VARCHAR(500);

    ALTER TABLE rides ADD COLUMN IF NOT EXISTS recipient_name  VARCHAR(100);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS package_size    VARCHAR(10);
    ALTER TABLE rides ADD COLUMN IF NOT EXISTS notes           VARCHAR(500);

    -- One rating per (ride, rater) — lets a completed ride be rated by both
    -- the rider (rating the driver) and the driver (rating the rider).
    ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_ride_rater_unique;
    ALTER TABLE ratings ADD CONSTRAINT ratings_ride_rater_unique UNIQUE (ride_id, rater_id);

    -- Real, server-visible profile photo — settable by ANY user from their
    -- Profile page (riders included), not just drivers via the registration
    -- wizard. This is what /rides/avatar actually serves.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path VARCHAR(255);

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

    -- "Move an Item" pre-launch waitlist — one row per user who tapped Join.
    -- Contact details are snapshotted at join time so the list survives later
    -- profile edits/deletions intact for the launch campaign.
    CREATE TABLE IF NOT EXISTS move_waitlist (
      id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID         UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(254),
      phone      VARCHAR(20),
      joined_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_move_waitlist_joined ON move_waitlist(joined_at DESC);

    -- Driver's original go-live stop. The pickup column moves forward as the
    -- driver expands along the chain; matching spans origin -> current pickup
    -- so riders matched at earlier stops are never dropped by expanding.
    ALTER TABLE driver_availability ADD COLUMN IF NOT EXISTS origin_pickup VARCHAR(100);

    -- ── Stop zones: admin-manageable corridors within each side ──────────────
    -- (Mainland 1, Mainland 2, Island 1, …) — admins create/rename/delete
    -- zones and drag stops between them. stops.chain_position stays the
    -- side-wide walk order drivers use ("try next stop") and is recomputed
    -- from zone order + within-zone order whenever stops are rearranged.
    CREATE TABLE IF NOT EXISTS stop_zones (
      id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      side       VARCHAR(10)  NOT NULL CHECK (side IN ('mainland','island')),
      name       VARCHAR(60)  UNIQUE NOT NULL,
      position   SMALLINT     NOT NULL,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE (side, position)
    );
    ALTER TABLE stops ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES stop_zones(id) ON DELETE SET NULL;

    -- One-time seed (Jul 22 2026 launch split) — only runs while no zones
    -- exist. Zone membership per the agreed corridors; each zone keeps its
    -- stops in the old side-wide order, then chain_position is rewritten as
    -- (zone, old order). Kept in sync with db/migrate.js.
    DO $$
    DECLARE m1 UUID; m2 UUID; m3 UUID; i1 UUID; i2 UUID;
    BEGIN
      IF EXISTS (SELECT 1 FROM stop_zones) THEN RETURN; END IF;
      INSERT INTO stop_zones (side, name, position) VALUES ('mainland', 'Mainland 1', 0) RETURNING id INTO m1;
      INSERT INTO stop_zones (side, name, position) VALUES ('mainland', 'Mainland 2', 1) RETURNING id INTO m2;
      INSERT INTO stop_zones (side, name, position) VALUES ('mainland', 'Mainland 3', 2) RETURNING id INTO m3;
      INSERT INTO stop_zones (side, name, position) VALUES ('island',   'Island 1',   0) RETURNING id INTO i1;
      INSERT INTO stop_zones (side, name, position) VALUES ('island',   'Island 2',   1) RETURNING id INTO i2;
      UPDATE stops SET zone_id = m2 WHERE group_name = 'mainland' AND name IN ('Ikorodu', 'Agric Ikorodu', 'Ikorodu Garage');
      UPDATE stops SET zone_id = m3 WHERE group_name = 'mainland' AND name = 'Yaba';
      UPDATE stops SET zone_id = i2 WHERE group_name = 'island'   AND name IN ('SandFill', 'Lekki Phase 1', 'Lekki Phase 2', 'Checking Point', 'Ajah');
      UPDATE stops SET zone_id = m1 WHERE group_name = 'mainland' AND zone_id IS NULL;
      UPDATE stops SET zone_id = i1 WHERE group_name = 'island'   AND zone_id IS NULL;
      UPDATE stops SET chain_position = -1 - chain_position;
      UPDATE stops s SET chain_position = r.pos FROM (
        SELECT s2.id, ROW_NUMBER() OVER (PARTITION BY s2.group_name ORDER BY z.position, -1 - s2.chain_position) - 1 AS pos
        FROM stops s2 JOIN stop_zones z ON z.id = s2.zone_id
      ) r WHERE s.id = r.id;
    END $$;

    -- ── Anchor (getanchor.co) banking rails — kept in sync with db/migrate.js ─
    ALTER TABLE users ADD COLUMN IF NOT EXISTS anchor_customer_id       VARCHAR(60);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS anchor_kyc_status        VARCHAR(30);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS anchor_reserved_account_id VARCHAR(60);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reserved_account_number  VARCHAR(20);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reserved_account_bank    VARCHAR(80);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reserved_account_name    VARCHAR(120);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS anchor_counterparty_id   VARCHAR(60);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bvn_submitted BOOLEAN NOT NULL DEFAULT false;

    ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS gateway VARCHAR(12);

    ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS anchor_transfer_id VARCHAR(60);
    ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS anchor_reference   VARCHAR(100);
    ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS failure_reason     VARCHAR(300);
    CREATE INDEX IF NOT EXISTS idx_payouts_anchor_ref ON payout_requests(anchor_reference);

    CREATE TABLE IF NOT EXISTS anchor_events (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id        VARCHAR(80) UNIQUE,
      event_type      VARCHAR(60) NOT NULL,
      resource_id     VARCHAR(80),
      signature_valid BOOLEAN     NOT NULL DEFAULT true,
      processed       BOOLEAN     NOT NULL DEFAULT false,
      payload         JSONB,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_anchor_events_type ON anchor_events(event_type, created_at DESC);

    CREATE TABLE IF NOT EXISTS aml_flags (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
      rule        VARCHAR(40)  NOT NULL,
      severity    VARCHAR(10)  NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
      detail      VARCHAR(300) NOT NULL,
      reference   VARCHAR(100),
      status      VARCHAR(15)  NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
      reviewed_by UUID         REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_aml_flags_status ON aml_flags(status, created_at DESC);

    -- ── Late-ordered statements: these reference tables/columns created above,
    -- so they MUST run last — the whole migration executes as one implicit
    -- transaction, and on a FRESH database an early reference to a
    -- not-yet-created relation aborts and rolls back EVERYTHING.
    -- Routes can be created UNPRICED (hidden from riders until priced).
    ALTER TABLE routes ALTER COLUMN pool_fare_kobo DROP NOT NULL;
    ALTER TABLE routes ALTER COLUMN package_fare_kobo DROP NOT NULL;
    -- Backfill: registration face photo becomes the avatar for old accounts.
    UPDATE users u SET avatar_path = d.file_path
    FROM (
      SELECT DISTINCT ON (user_id) user_id, file_path
        FROM user_documents
       WHERE doc_type IN ('selfie','profilePhoto')
       ORDER BY user_id, (doc_type = 'selfie') DESC, uploaded_at DESC
    ) d
    WHERE u.id = d.user_id AND u.avatar_path IS NULL;
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
// On Catalyst AppSail, Zoho's edge injects Access-Control-Allow-* headers for
// the project's authorized domains. If the app adds its own, browsers see a
// duplicated Access-Control-Allow-Origin and block EVERY request — so on
// Catalyst the edge must be the only CORS layer. FORCE_APP_CORS=1 restores
// app-level CORS (e.g. if the edge behavior ever changes).
const ON_CATALYST = !!process.env.X_ZOHO_CATALYST_LISTEN_PORT

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

// In development also always allow localhost variants
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']

if (!ON_CATALYST || process.env.FORCE_APP_CORS === '1') {
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
}

// Capture the raw body alongside the parsed one — needed to verify the
// Anchor webhook signature (HMAC over the exact bytes Anchor sent).
app.use(express.json({
  limit: '10kb', // Prevent large payload attacks
  verify: (req, _res, buf) => { req.rawBody = buf },
}))

// ── Global rate limit ────────────────────────────────────────────────────────
// This is a generic DoS backstop, not a feature throttle — the app polls for
// live ride status and chat messages every few seconds, so the budget needs
// real headroom above that. Sensitive endpoints (login, OTP) have their own
// much tighter, endpoint-scoped limits inside routes/auth.js.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
}))

// ── Routes ───────────────────────────────────────────────────────────────────
// Stricter, endpoint-specific rate limits (login, OTP) are applied inside routes/auth.js
// — scoping them per-endpoint instead of the whole /api/auth router so that normal
// navigation (session check, switching roles, registration steps) can't burn through
// the same budget as actual login attempts.
app.use('/api/auth',   authRoutes)
app.use('/api/rides',  rideRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/driver', driverRoutes)
app.use('/api/admin',  adminRoutes)
app.use('/api/routes', routesCatalog)
// Anchor webhooks — authenticated by x-anchor-signature, not a user session
app.use('/api/anchor', require('./routes/anchor'))

// ── Health check (public, no sensitive info) ─────────────────────────────────
// version identifies the running build so Dev→Prod promotions can be verified
const BUILD_VERSION = require('./package.json').version
app.get('/health', (_, res) => res.json({ status: 'ok', version: BUILD_VERSION }))

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
