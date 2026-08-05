const express  = require('express')
const path     = require('path')
const fs       = require('fs')
const bcrypt   = require('bcryptjs')
const crypto   = require('crypto')
const rateLimit = require('express-rate-limit')
const { body, param } = require('express-validator')
const { query, pool } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { sendStored, readStored, deleteStored } = require('../services/fileStorage')
const { sendAccountCredentialsEmail, sendWelcomeEmail } = require('../services/emailService')
const anchor = require('../services/anchor')
const prembly = require('../services/prembly')
const kycVault = require('../services/kycVault')
const { provisionReservedAccount } = require('../services/reservedAccounts')
const { payoutAllowed, sandboxRails, active: paymentsGateActive } = require('../services/paymentsGate')
const totp = require('../services/totp')
const QRCode = require('qrcode')

const router = express.Router()
const SALT_ROUNDS = 12

router.use(requireAuth, requireRole('admin'))

function fmt(kobo) { return Math.round((kobo || 0) / 100) }

// Fire-and-forget audit write — a logging failure must never break the action.
//
// `ctx` carries what an auditor actually needs: WHO (snapshotted, so deleting
// the admin cannot anonymise their own access history), WHOSE record, and from
// where. Pass { req, target: { id, name, email } } on anything that touches
// personal data; plain calls still work for ordinary admin actions.
function logActivity(actorId, action, category, detail, ctx = {}) {
  const req = ctx.req
  const ip = req
    ? ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null)
    : null
  const ua = req ? ((req.headers['user-agent'] || '').slice(0, 300) || null) : null
  const t = ctx.target || {}
  // The actor's email is copied in at write time — the FK is ON DELETE SET NULL
  // and would otherwise erase the only record of who looked.
  query(
    `INSERT INTO activity_log
       (actor_id, action, category, detail, actor_email,
        target_user_id, target_name, target_email, ip_address, user_agent)
     VALUES ($1, $2, $3, $4,
             COALESCE($5, (SELECT email FROM users WHERE id = $1)),
             $6, $7, $8, $9, $10)`,
    [actorId, action, category, detail || null, ctx.actorEmail || null,
     t.id || null, t.name || null, t.email || null, ip, ua]
  ).catch(err => console.error('activity_log write failed:', err.message))
}

// ── Dashboard metrics ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [
      activeRiders, activeDrivers, onlineDrivers,
      tripsToday, ongoingTrips, pendingTrips,
      walletTotal, completedTotal,
    ] = await Promise.all([
      query("SELECT COUNT(*) c FROM users WHERE can_ride = true AND is_active = true"),
      query("SELECT COUNT(*) c FROM users WHERE can_drive = true AND is_active = true"),
      query("SELECT COUNT(*) c FROM users WHERE can_drive = true AND is_active = true AND is_online = true"),
      query("SELECT COUNT(*) c FROM rides WHERE created_at >= CURRENT_DATE"),
      query("SELECT COUNT(*) c FROM rides WHERE status IN ('driver_assigned','arrived_pickup','in_transit')"),
      query("SELECT COUNT(*) c FROM rides WHERE status = 'pending'"),
      query("SELECT COALESCE(SUM(wallet_balance),0) s FROM users"),
      query("SELECT COUNT(*) c FROM rides WHERE status = 'completed'"),
    ])

    res.json({
      activeRiders:    parseInt(activeRiders.rows[0].c, 10),
      activeDrivers:   parseInt(activeDrivers.rows[0].c, 10),
      driversOnline:   parseInt(onlineDrivers.rows[0].c, 10),
      tripsToday:      parseInt(tripsToday.rows[0].c, 10),
      ongoingTrips:    parseInt(ongoingTrips.rows[0].c, 10),
      pendingRequests: parseInt(pendingTrips.rows[0].c, 10),
      totalWalletBalance: fmt(walletTotal.rows[0].s),
      completedTrips:  parseInt(completedTotal.rows[0].c, 10),
    })
  } catch (err) { next(err) }
})

// ── Dashboard — everything the overview page needs in one round trip ──────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      activeRiders, activeDrivers, onlineDrivers, pendingApprovals,
      tripsToday, ongoingTrips, pendingTrips, completedTotal,
      walletTotal, revenueTotal, feeRes,
      trend, statusDist, ridesPerDay, topRoutes,
      recentRides, topDrivers, activity,
    ] = await Promise.all([
      query("SELECT COUNT(*) c FROM users WHERE can_ride = true AND is_active = true"),
      query("SELECT COUNT(*) c FROM users WHERE can_drive = true AND is_active = true"),
      query("SELECT COUNT(*) c FROM users WHERE can_drive = true AND is_active = true AND is_online = true"),
      query("SELECT COUNT(*) c FROM users WHERE is_pending = true AND role <> 'admin'"),
      query("SELECT COUNT(*) c FROM rides WHERE created_at >= CURRENT_DATE"),
      query("SELECT COUNT(*) c FROM rides WHERE status IN ('driver_assigned','arrived_pickup','in_transit')"),
      query("SELECT COUNT(*) c FROM rides WHERE status = 'pending'"),
      query("SELECT COUNT(*) c FROM rides WHERE status = 'completed'"),
      query("SELECT COALESCE(SUM(wallet_balance),0) s FROM users"),
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status = 'completed'"),
      query('SELECT platform_fee_percent FROM platform_settings WHERE id = 1'),
      // Completed-fare volume per month, last 6 months, zero-filled
      query(
        `SELECT to_char(m.month, 'Mon') AS label,
                COALESCE(SUM(r.fare_kobo), 0) AS total, COUNT(r.id) AS trips
         FROM generate_series(date_trunc('month', NOW()) - INTERVAL '5 months',
                              date_trunc('month', NOW()), '1 month') AS m(month)
         LEFT JOIN rides r ON date_trunc('month', r.completed_at) = m.month AND r.status = 'completed'
         GROUP BY m.month ORDER BY m.month`
      ),
      query(
        `SELECT CASE
           WHEN status = 'completed' THEN 'completed'
           WHEN status = 'pending'   THEN 'pending'
           WHEN status IN ('driver_assigned','arrived_pickup','in_transit') THEN 'ongoing'
           ELSE 'cancelled' END AS bucket, COUNT(*) c
         FROM rides GROUP BY bucket`
      ),
      // Trips per day, last 7 days, zero-filled
      query(
        `SELECT to_char(d.day, 'Dy') AS label, COUNT(r.id) AS trips
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d(day)
         LEFT JOIN rides r ON r.created_at::date = d.day::date
         GROUP BY d.day ORDER BY d.day`
      ),
      query(
        `SELECT pickup, destination, COUNT(*) AS cnt
         FROM rides GROUP BY pickup, destination ORDER BY cnt DESC LIMIT 5`
      ),
      query(
        `SELECT r.id, r.pickup, r.destination, r.fare_kobo, r.status, r.created_at, ur.name AS rider_name
         FROM rides r LEFT JOIN users ur ON r.rider_id = ur.id
         ORDER BY r.created_at DESC LIMIT 5`
      ),
      query(
        `SELECT u.id, u.name, u.is_online, u.rating, u.vehicle_make, u.vehicle_model,
                (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed') AS trips
         FROM users u WHERE u.can_drive = true AND u.is_active = true
         ORDER BY trips DESC, u.created_at ASC LIMIT 4`
      ),
      // Unified activity feed: audit-logged admin actions + events derived
      // live from operational tables (so history shows even for old data)
      query(
        `SELECT * FROM (
           SELECT a.action, a.category, COALESCE(u.name, 'System') AS actor, a.detail, a.created_at
           FROM activity_log a LEFT JOIN users u ON a.actor_id = u.id
           UNION ALL
           SELECT 'Ride Requested', 'ride', COALESCE(ur.name, 'Rider'),
                  r.pickup || ' → ' || r.destination, r.created_at
           FROM rides r LEFT JOIN users ur ON r.rider_id = ur.id
           UNION ALL
           SELECT 'Ride Completed', 'ride', COALESCE(ud.name, 'Driver'),
                  r.pickup || ' → ' || r.destination, r.completed_at
           FROM rides r LEFT JOIN users ud ON r.driver_id = ud.id
           WHERE r.status = 'completed' AND r.completed_at IS NOT NULL
           UNION ALL
           SELECT CASE WHEN u.role = 'driver' THEN 'New Driver Registered'
                       ELSE 'New Rider Registered' END, 'user', u.name, NULL, u.created_at
           FROM users u WHERE u.role <> 'admin'
           UNION ALL
           SELECT 'Payout Requested', 'payment', u.name,
                  '₦' || ROUND(p.amount_kobo / 100.0)::text, p.requested_at
           FROM payout_requests p JOIN users u ON p.driver_id = u.id
           UNION ALL
           SELECT CASE WHEN t.type = 'credit' THEN 'Wallet Credited' ELSE 'Wallet Debited' END,
                  'payment', u.name, '₦' || ROUND(t.amount_kobo / 100.0)::text || ' — ' || t.description, t.created_at
           FROM wallet_transactions t JOIN users u ON t.user_id = u.id
           WHERE t.status = 'completed' -- pending/expired top-ups are not money
         ) ev ORDER BY created_at DESC LIMIT 12`
      ),
    ])

    const feePercent = Number(feeRes.rows[0]?.platform_fee_percent ?? 20)
    const totalRevenue = fmt(revenueTotal.rows[0].s)

    res.json({
      stats: {
        totalRevenue,
        platformRevenue: Math.round(totalRevenue * feePercent / 100),
        activeRiders:     parseInt(activeRiders.rows[0].c, 10),
        pendingApprovals: parseInt(pendingApprovals.rows[0].c, 10),
        activeDrivers:    parseInt(activeDrivers.rows[0].c, 10),
        driversOnline:    parseInt(onlineDrivers.rows[0].c, 10),
        tripsToday:       parseInt(tripsToday.rows[0].c, 10),
        ongoingTrips:     parseInt(ongoingTrips.rows[0].c, 10),
        pendingRequests:  parseInt(pendingTrips.rows[0].c, 10),
        completedTrips:   parseInt(completedTotal.rows[0].c, 10),
        totalWalletBalance: fmt(walletTotal.rows[0].s),
      },
      revenueTrend: trend.rows.map(r => ({
        label: r.label.trim(), revenue: fmt(r.total), trips: parseInt(r.trips, 10),
      })),
      statusDist: statusDist.rows.map(r => ({ status: r.bucket, count: parseInt(r.c, 10) })),
      ridesPerDay: ridesPerDay.rows.map(r => ({ label: r.label.trim(), trips: parseInt(r.trips, 10) })),
      topRoutes: topRoutes.rows.map(r => ({
        route: `${r.pickup} → ${r.destination}`, count: parseInt(r.cnt, 10),
      })),
      recentRides: recentRides.rows.map(r => ({
        id: r.id, pickup: r.pickup, destination: r.destination,
        riderName: r.rider_name, fare: fmt(r.fare_kobo), status: r.status, createdAt: r.created_at,
      })),
      topDrivers: topDrivers.rows.map(d => ({
        id: d.id, name: d.name, isOnline: d.is_online,
        rating: d.rating ? parseFloat(d.rating) : null,
        vehicle: [d.vehicle_make, d.vehicle_model].filter(Boolean).join(' ') || null,
        trips: parseInt(d.trips, 10),
      })),
      recentActivity: activity.rows.map(a => ({
        action: a.action, category: a.category, actor: a.actor, detail: a.detail, at: a.created_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── Riders: list ───────────────────────────────────────────────────────────────
router.get('/riders', async (req, res, next) => {
  try {
    const search = `%${(req.query.search || '').trim()}%`
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.wallet_balance, u.is_active, u.created_at,
              (SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings rt WHERE rt.ratee_id = u.id) AS rating,
              (SELECT COUNT(*) FROM rides r WHERE r.rider_id = u.id) AS trip_count,
              (SELECT MAX(created_at) FROM rides r WHERE r.rider_id = u.id) AS last_ride
       FROM users u
       WHERE u.can_ride = true
         AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1)
       ORDER BY u.created_at DESC`,
      [search]
    )
    res.json({
      riders: result.rows.map(r => ({
        id: r.id, name: r.name, email: r.email, phone: r.phone,
        walletBalance: fmt(r.wallet_balance), rating: r.rating, isActive: r.is_active,
        tripCount: parseInt(r.trip_count, 10),
        lastRide: r.last_ride,
        joinedAt: r.created_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── Drivers: list ──────────────────────────────────────────────────────────────
router.get('/drivers', async (req, res, next) => {
  try {
    const search = `%${(req.query.search || '').trim()}%`
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.wallet_balance, u.is_active, u.is_online,
              u.vehicle_make, u.vehicle_model, u.plate_number, u.created_at,
              (SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings rt WHERE rt.ratee_id = u.id) AS rating,
              (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed') AS trip_count,
              (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed' AND r.completed_at >= CURRENT_DATE) AS trips_today
       FROM users u
       WHERE u.can_drive = true
         AND (u.name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1 OR u.plate_number ILIKE $1)
       ORDER BY u.created_at DESC`,
      [search]
    )
    res.json({
      drivers: result.rows.map(r => ({
        id: r.id, name: r.name, email: r.email, phone: r.phone,
        walletBalance: fmt(r.wallet_balance), rating: r.rating,
        isActive: r.is_active, isOnline: r.is_online,
        vehicle: [r.vehicle_make, r.vehicle_model].filter(Boolean).join(' ') || null,
        plateNumber: r.plate_number,
        tripCount: parseInt(r.trip_count, 10),
        tripsToday: parseInt(r.trips_today, 10),
        joinedAt: r.created_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── Shared: fetch a user's full profile + documents + recent rides ────────────
async function getUserDetail(userId, ridesClause) {
  const userRes = await query(
    `SELECT id, name, email, phone, role, active_role, can_ride, can_drive,
            wallet_balance, rating, is_active, is_online, created_at,
            id_type, id_number, vehicle_type, vehicle_make, vehicle_model, plate_number, vehicle_year, vehicle_color,
            -- City/area were rendered by the detail page but never selected, so
            -- every profile read "—" for both.
            city, area, work_area,
            drivers_license_number,
            identity_status, identity_summary, identity_detail, identity_checked_at,
            -- the photo itself is streamed separately; here we only need to know
            -- whether there is one to ask for
            (licence_photo IS NOT NULL) AS has_licence_photo,
            -- Wallet/KYC state. The detail page has always rendered these rows
            -- but never asked for the columns, so every one of them read "—"
            -- unless an admin ran the authenticator reveal.
            bvn_submitted, bvn_last4, residential_address, anchor_kyc_status,
            reserved_account_number, reserved_account_bank, reserved_account_name,
            bank_name, bank_account_number
     FROM users WHERE id = $1`,
    [userId]
  )
  const user = userRes.rows[0]
  if (!user) return null

  const [docsRes, ridesRes, walletRes, ratingsRes, activeRes] = await Promise.all([
    query('SELECT id, doc_type, uploaded_at FROM user_documents WHERE user_id = $1 ORDER BY uploaded_at DESC', [userId]),
    query(
      `SELECT id, type, pickup, destination, fare_kobo, status, created_at
       FROM rides WHERE ${ridesClause} = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    ),
    query(
      `SELECT id, type, amount_kobo, description, status, created_at
       FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    ),
    query(
      `SELECT r.id, r.stars, r.comment, r.created_at, u.name AS rater_name
       FROM ratings r LEFT JOIN users u ON r.rater_id = u.id
       WHERE r.ratee_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [userId]
    ),
    query(
      `SELECT r.id, r.type, r.pickup, r.destination, r.status, r.fare_kobo, r.created_at,
              ur.name AS rider_name, ud.name AS driver_name
       FROM rides r
       LEFT JOIN users ur ON r.rider_id = ur.id
       LEFT JOIN users ud ON r.driver_id = ud.id
       WHERE r.${ridesClause} = $1 AND r.status IN ('pending','driver_assigned','arrived_pickup','in_transit')
       ORDER BY r.created_at DESC LIMIT 1`,
      [userId]
    ),
  ])

  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, activeRole: user.active_role,
    canRide: user.can_ride, canDrive: user.can_drive,
    walletBalance: fmt(user.wallet_balance), rating: user.rating,
    isActive: user.is_active, isOnline: user.is_online, joinedAt: user.created_at,
    city: user.city, area: user.area, workArea: user.work_area,
    idType: user.id_type, idNumber: user.id_number,
    // Drivers are identified by licence number, not a NIN or a document scan,
    // so without these the driver detail page showed no identity at all.
    driversLicenseNumber: user.drivers_license_number,
    identity: {
      status:      user.identity_status || 'skipped',
      summary:     user.identity_summary || null,
      checks:      user.identity_detail?.checks || [],
      ninName:     user.identity_detail?.ninName || null,
      licenceName: user.identity_detail?.licenceName || null,
      // The FRSC record verbatim — name, date of birth, issue and expiry —
      // so an admin approves on the document's own evidence, not on our verdict.
      licence:     user.identity_detail?.licence || null,
      hasLicencePhoto: user.has_licence_photo,
      checkedAt:   user.identity_checked_at,
    },
    bvnSubmitted: user.bvn_submitted,
    bvnMasked: user.bvn_last4 ? `•••••••${user.bvn_last4}` : null,
    residentialAddress: user.residential_address,
    kycStatus: user.anchor_kyc_status,
    // `name` is what a payer actually sees — and the only way to tell an
    // account that carries the rider's name from one that does not.
    fundingAccount: user.reserved_account_number
      ? { number: user.reserved_account_number, bank: user.reserved_account_bank,
          name: user.reserved_account_name }
      : null,
    vehicleType: user.vehicle_type, vehicleMake: user.vehicle_make, vehicleModel: user.vehicle_model,
    plateNumber: user.plate_number, vehicleYear: user.vehicle_year, vehicleColor: user.vehicle_color,
    bankName: user.bank_name, bankAccountNumber: user.bank_account_number,
    documents: docsRes.rows.map(d => ({ id: d.id, type: d.doc_type, uploadedAt: d.uploaded_at })),
    rides: ridesRes.rows.map(r => ({
      id: r.id, type: r.type, pickup: r.pickup, destination: r.destination,
      fare: fmt(r.fare_kobo), status: r.status, date: r.created_at,
    })),
    walletTransactions: walletRes.rows.map(t => ({
      id: t.id, type: t.type, amount: fmt(t.amount_kobo),
      description: t.description, status: t.status, date: t.created_at,
    })),
    ratings: ratingsRes.rows.map(r => ({
      id: r.id, stars: r.stars, comment: r.comment, raterName: r.rater_name, date: r.created_at,
    })),
    activeTrip: activeRes.rows[0] ? {
      id: activeRes.rows[0].id, type: activeRes.rows[0].type,
      pickup: activeRes.rows[0].pickup, destination: activeRes.rows[0].destination,
      status: activeRes.rows[0].status, fare: fmt(activeRes.rows[0].fare_kobo),
      riderName: activeRes.rows[0].rider_name, driverName: activeRes.rows[0].driver_name,
      startedAt: activeRes.rows[0].created_at,
    } : null,
  }
}

router.get('/riders/:id',
  [param('id').isUUID()], validate,
  async (req, res, next) => {
    try {
      const detail = await getUserDetail(req.params.id, 'rider_id')
      if (!detail) return res.status(404).json({ message: 'Rider not found.' })
      res.json({ rider: detail })
    } catch (err) { next(err) }
  }
)

router.get('/drivers/:id',
  [param('id').isUUID()], validate,
  async (req, res, next) => {
    try {
      const detail = await getUserDetail(req.params.id, 'driver_id')
      if (!detail) return res.status(404).json({ message: 'Driver not found.' })
      res.json({ driver: detail })
    } catch (err) { next(err) }
  }
)

// ── Document file streaming — admin-only, never publicly accessible ───────────
router.get('/documents/:docId',
  [param('docId').isUUID()], validate,
  async (req, res, next) => {
    try {
      const result = await query('SELECT file_path FROM user_documents WHERE id = $1', [req.params.docId])
      const doc = result.rows[0]
      if (!doc) return res.status(404).json({ message: 'Document not found.' })

      await sendStored(req, res, doc.file_path)
    } catch (err) { next(err) }
  }
)

// ── Admin avatar — checks avatar_path first, then selfie/profilePhoto doc ────
router.get('/avatar/:userId',
  [param('userId').isUUID()], validate,
  async (req, res, next) => {
    try {
      const userRes = await query('SELECT avatar_path FROM users WHERE id = $1', [req.params.userId])
      let filename = userRes.rows[0]?.avatar_path

      if (!filename) {
        const doc = await query(
          `SELECT file_path FROM user_documents
            WHERE user_id = $1 AND doc_type IN ('selfie','profilePhoto')
            ORDER BY uploaded_at DESC LIMIT 1`,
          [req.params.userId]
        )
        filename = doc.rows[0]?.file_path
      }
      if (!filename) return res.status(404).json({ message: 'No photo on file.' })

      await sendStored(req, res, filename)
    } catch (err) { next(err) }
  }
)

// ── The portrait printed on the driver's licence (from FRSC via Prembly) ────
//
// Served on its own so the heavy base64 never rides along with the profile
// JSON, and so there is exactly one audited door to it. Placed beside the
// registration selfie in the admin UI, this is what lets a human — not a
// confidence score — decide whether the same person is in both photographs.
router.get('/users/:id/licence-photo',
  [param('id').isUUID()], validate,
  async (req, res, next) => {
    try {
      const r = await query('SELECT licence_photo FROM users WHERE id = $1', [req.params.id])
      if (!r.rows[0]) return res.status(404).json({ message: 'User not found.' })
      const b64 = r.rows[0].licence_photo
      if (!b64) return res.status(404).json({ message: 'No licence photo on file.' })

      const buf = Buffer.from(b64, 'base64')
      // FRSC sends JPEG or PNG with no content type of its own — read it from
      // the bytes rather than guessing, so the browser renders it either way.
      const png = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50
      // Same slice protocol as sendStored: Catalyst's edge truncates larger
      // bodies, and api.getBlob asks for the size before fetching.
      if (req.query.sizeinfo === '1') return res.json({ size: buf.length })
      res.type(png ? 'png' : 'jpg')
      const start = parseInt(req.query.start, 10)
      const end   = parseInt(req.query.end, 10)
      if (Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start <= end) {
        return res.send(buf.slice(start, Math.min(end + 1, buf.length)))
      }
      res.send(buf)
    } catch (err) { next(err) }
  }
)

// ── Live rides ──────────────────────────────────────────────────────────────────
router.get('/rides', async (req, res, next) => {
  try {
    const live = req.query.live === 'true'
    const result = await query(
      `SELECT r.id, r.type, r.pickup, r.destination, r.fare_kobo, r.status, r.created_at, r.completed_at,
              ur.name AS rider_name, ud.name AS driver_name
       FROM rides r
       LEFT JOIN users ur ON r.rider_id  = ur.id
       LEFT JOIN users ud ON r.driver_id = ud.id
       ${live ? "WHERE r.status IN ('pending','driver_assigned','arrived_pickup','in_transit')" : ''}
       ORDER BY r.created_at DESC LIMIT 100`
    )
    res.json({
      rides: result.rows.map(r => ({
        id: r.id, type: r.type, pickup: r.pickup, destination: r.destination,
        fare: fmt(r.fare_kobo), status: r.status,
        riderName: r.rider_name, driverName: r.driver_name,
        createdAt: r.created_at, completedAt: r.completed_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── All registered users (any role) — for the User Management table ──────────
router.get('/users', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.active_role,
              u.can_ride, u.can_drive, u.is_active, u.is_pending, u.rating, u.created_at,
              (SELECT COUNT(*) FROM rides r WHERE r.rider_id = u.id OR r.driver_id = u.id) AS trip_count,
              (u.avatar_path IS NOT NULL OR EXISTS (
                SELECT 1 FROM user_documents d WHERE d.user_id = u.id
                  AND d.doc_type IN ('selfie','profilePhoto')
              )) AS has_avatar
       FROM users u ORDER BY u.created_at DESC`
    )
    res.json({
      users: result.rows.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        role: u.role, activeRole: u.active_role, canRide: u.can_ride, canDrive: u.can_drive,
        isActive: u.is_active, isPending: u.is_pending,
        rating: u.rating ? parseFloat(u.rating) : null,
        tripCount: parseInt(u.trip_count, 10),
        joinedAt: u.created_at,
        hasAvatar: !!u.has_avatar,
      })),
    })
  } catch (err) { next(err) }
})

// ── Single user detail for admin ──────────────────────────────────────────────
router.get('/users/:id',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const [userRes, docsRes, ridesRes] = await Promise.all([
        query(
          `SELECT id, name, email, phone, role, active_role, can_ride, can_drive,
                  is_active, is_pending, rating, wallet_balance, created_at,
                  city, area, work_area, date_of_birth, gender,
                  id_type, id_number,
                  drivers_license_number,
                  identity_status, identity_summary, identity_detail, identity_checked_at,
                  bvn_submitted, bvn_last4, residential_address, anchor_kyc_status,
                  reserved_account_number, reserved_account_bank,
                  vehicle_type, vehicle_make, vehicle_model, plate_number, vehicle_year, vehicle_color,
                  avatar_path, bank_name, bank_account_number
           FROM users WHERE id = $1`,
          [req.params.id]
        ),
        query(
          `SELECT id, doc_type, uploaded_at FROM user_documents WHERE user_id = $1 ORDER BY uploaded_at DESC`,
          [req.params.id]
        ),
        query(
          `SELECT id, type, pickup, destination, fare_kobo, status, created_at
           FROM rides WHERE rider_id = $1 OR driver_id = $1
           ORDER BY created_at DESC LIMIT 20`,
          [req.params.id]
        ),
      ])
      if (!userRes.rows[0]) return res.status(404).json({ message: 'User not found.' })
      const u = userRes.rows[0]
      res.json({
        user: {
          id: u.id, name: u.name, email: u.email, phone: u.phone,
          role: u.role, activeRole: u.active_role, canRide: u.can_ride, canDrive: u.can_drive,
          isActive: u.is_active, isPending: u.is_pending,
          rating: u.rating ? parseFloat(u.rating) : null,
          walletBalance: fmt(u.wallet_balance),
          joinedAt: u.created_at,
          city: u.city, area: u.area, workArea: u.work_area,
          dateOfBirth: u.date_of_birth, gender: u.gender,
          bankName: u.bank_name, bankAccountNumber: u.bank_account_number,
          idType: u.id_type, idNumber: u.id_number,
          driversLicenseNumber: u.drivers_license_number,
          // Government identity verification (Prembly). Advisory by design:
          // it flags, an admin decides — a poor selfie must not auto-reject a
          // real driver.
          identity: {
            status: u.identity_status,          // verified | failed | error | skipped
            summary: u.identity_summary,
            checks: u.identity_detail?.checks || [],
            ninName: u.identity_detail?.ninName || null,
            licenceName: u.identity_detail?.licenceName || null,
            checkedAt: u.identity_checked_at,
          },
          // Wallet/CBN KYC. Only the last 4 BVN digits are ever stored, so
          // this is a confirmation aid, not a retrievable BVN.
          bvnSubmitted: u.bvn_submitted,
          bvnMasked: u.bvn_last4 ? `•••••••${u.bvn_last4}` : null,
          residentialAddress: u.residential_address,
          kycStatus: u.anchor_kyc_status,
          fundingAccount: u.reserved_account_number
            ? { number: u.reserved_account_number, bank: u.reserved_account_bank } : null,
          vehicleType: u.vehicle_type, vehicleMake: u.vehicle_make,
          vehicleModel: u.vehicle_model, plateNumber: u.plate_number,
          vehicleYear: u.vehicle_year, vehicleColor: u.vehicle_color,
          hasAvatar: !!(u.avatar_path || docsRes.rows.find(d => d.doc_type === 'selfie' || d.doc_type === 'profilePhoto')),
          documents: docsRes.rows,
          recentRides: ridesRes.rows.map(r => ({
            id: r.id, type: r.type, pickup: r.pickup, destination: r.destination,
            fare: fmt(r.fare_kobo), status: r.status,
            date: new Date(r.created_at).toLocaleDateString('en-NG'),
          })),
        },
      })
    } catch (err) { next(err) }
  }
)

// ── Create a new user (rider, driver, or admin) ───────────────────────────────
// Account is active immediately with a temporary password; a welcome email
// delivers the credentials and first login forces a password change.
router.post('/users',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['rider', 'driver', 'admin']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email } = req.body
      const role = req.body.role || 'admin'

      const existing = await query('SELECT id FROM users WHERE email = $1', [email])
      if (existing.rows[0]) {
        return res.status(409).json({ message: 'A user with that email already exists.' })
      }

      const password = crypto.randomBytes(16).toString('base64url').slice(0, 20)
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

      const result = await query(
        `INSERT INTO users (name, email, password_hash, role, active_role,
           is_active, is_pending, email_verified, force_password_change, can_ride, can_drive)
         VALUES ($1, $2, $3, $4, $4, true, false, true, true, $5, $6)
         RETURNING id, name, email, created_at`,
        [name, email, passwordHash, role, role === 'rider', role === 'driver']
      )

      const roleLabel = role === 'driver' ? 'Driver' : role === 'admin' ? 'Admin User' : 'Rider'
      logActivity(req.user.id, `${roleLabel} Created`, 'user', name)

      // Deliver credentials by email; creation still succeeds if SMTP is down —
      // the password is returned once below so the admin can share it manually.
      let emailSent = true
      try {
        await sendAccountCredentialsEmail(email, name, role, password)
      } catch (err) {
        emailSent = false
        console.error('Credentials email failed:', err.message)
      }

      // Returned once — never stored or logged elsewhere
      res.status(201).json({ user: result.rows[0], temporaryPassword: password, emailSent })
    } catch (err) { next(err) }
  }
)

// ── Approve a pending user registration ───────────────────────────────────────
router.patch('/users/:id/approve',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const userRes = await query('SELECT id, role, name, email FROM users WHERE id = $1', [req.params.id])
      if (!userRes.rows[0]) return res.status(404).json({ message: 'User not found.' })
      const { role, name, email } = userRes.rows[0]
      await query(
        `UPDATE users
         SET is_active = true, is_pending = false,
             can_ride  = CASE WHEN role IN ('rider','admin') THEN true ELSE can_ride END,
             can_drive = CASE WHEN role = 'driver' THEN true ELSE can_drive END
         WHERE id = $1`,
        [req.params.id]
      )
      logActivity(req.user.id, role === 'driver' ? 'Driver Approved' : 'Rider Approved', 'user', name)
      // Fire-and-forget — approval must succeed even if the mail server is down
      if (email) {
        sendWelcomeEmail(email, name, role).catch(err =>
          console.error(`Welcome email to ${email} failed:`, err.message))
      }
      res.json({ message: 'User approved and activated.' })
    } catch (err) { next(err) }
  }
)

// ── Reject a pending user registration ────────────────────────────────────────
router.patch('/users/:id/reject',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        'UPDATE users SET is_active = false, is_pending = false WHERE id = $1 RETURNING id, name',
        [req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
      logActivity(req.user.id, 'Registration Rejected', 'user', result.rows[0].name)
      res.json({ message: 'User registration rejected.' })
    } catch (err) { next(err) }
  }
)

// ── Suspend / reactivate any user ─────────────────────────────────────────────
router.patch('/users/:id/status',
  [param('id').isUUID(), body('isActive').isBoolean()],
  validate,
  async (req, res, next) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({ message: 'You cannot change your own account status.' })
      }
      const result = await query(
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name',
        [req.body.isActive, req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
      logActivity(req.user.id, req.body.isActive ? 'User Reactivated' : 'User Suspended', 'user', result.rows[0].name)
      res.json({ message: req.body.isActive ? 'User reactivated.' : 'User suspended.' })
    } catch (err) { next(err) }
  }
)

// ── Permanently delete a user and every trace of their PERSONAL data ─────────
// Cascades wipe OTPs, documents, availability and bookings; rides/ratings are
// anonymized (ids nulled). ride_messages.sender_id is NOT NULL, so those rows
// are deleted explicitly first — otherwise the FK's SET NULL would violate the
// constraint and error.
//
// Money is the exception. Wallet transactions, payout requests and AML flags
// are NOT deleted: an approved ₦2.5m withdrawal disappearing because someone
// tidied up a test account is a hole in the ledger, not a privacy win. Their
// user_id is nulled by the FK and the identity is snapshotted first, below.
router.delete('/users/:id',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' })
    }
    const client = await pool.connect()
    try {
      const userRes = await client.query(
        'SELECT id, name, avatar_path FROM users WHERE id = $1', [req.params.id]
      )
      const user = userRes.rows[0]
      if (!user) {
        client.release()
        return res.status(404).json({ message: 'User not found.' })
      }

      // Collect file names before the rows cascade away
      const docsRes = await client.query(
        'SELECT file_path FROM user_documents WHERE user_id = $1', [req.params.id]
      )
      const files = docsRes.rows.map(d => d.file_path)
      if (user.avatar_path) files.push(user.avatar_path)

      await client.query('BEGIN')
      // Stamp the identity onto every financial record BEFORE the delete —
      // once the user row is gone the FK nulls the link and there is nothing
      // left to join to. This is the only moment the copy can be made.
      for (const [table, col] of [
        ['wallet_transactions', 'user_id'],
        ['payout_requests', 'driver_id'],
        ['aml_flags', 'user_id'],
      ]) {
        await client.query(
          `UPDATE ${table} SET subject_name = u.name, subject_email = u.email, subject_role = u.role
             FROM users u WHERE ${table}.${col} = $1 AND u.id = $1`,
          [req.params.id]
        )
      }
      await client.query('DELETE FROM ride_messages WHERE sender_id = $1', [req.params.id])
      await client.query('DELETE FROM users WHERE id = $1', [req.params.id])
      await client.query('COMMIT')

      // Remove uploaded files from storage — best effort, DB is already clean
      for (const f of files) {
        deleteStored(req, f).catch(() => {})
      }

      logActivity(req.user.id, 'User Deleted', 'user', user.name)
      res.json({
        message: 'User deleted. Their financial records are retained for audit, '
          + 'attributed to their name but no longer linked to an account.',
      })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      next(err)
    } finally {
      client.release()
    }
  }
)

// ── Payments overview ───────────────────────────────────────────────────────────
// `range` filters the feed by when the money moved: today | week | month |
// year | all (default). Anything else is treated as 'all' rather than erroring,
// so a stale bookmark still loads the page.
const RANGE_INTERVALS = {
  today: '1 day', week: '7 days', month: '30 days', year: '365 days',
}
function rangeClause(range, column = 'created_at') {
  const interval = RANGE_INTERVALS[range]
  return interval ? `AND ${column} >= NOW() - INTERVAL '${interval}'` : ''
}

router.get('/payments', async (req, res, next) => {
  try {
    const range = req.query.range || 'all'
    const [walletTotal, pendingPayouts, revenue, txns, feeRes] = await Promise.all([
      query("SELECT COALESCE(SUM(wallet_balance),0) s FROM users"),
      query("SELECT COALESCE(SUM(amount_kobo),0) s FROM payout_requests WHERE status = 'pending'"),
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status = 'completed'"),
      // The feed must show BOTH money moments of a payout: the wallet-side
      // escrow (wallet_transactions, at request time) AND the bank-side
      // transfer (payout_requests.processed_at, when the NIP actually moved
      // money) — reconciliation needs each event at its true timestamp.
      //
      // LEFT JOIN, not JOIN: a deleted user's rows keep a NULL user_id, and an
      // inner join would silently drop exactly the history we now retain.
      query(
        `SELECT * FROM (
           SELECT t.id::text AS id, t.type, t.amount_kobo, t.description, t.created_at,
                  COALESCE(u.name, t.subject_name) AS user_name, u.id AS user_id
             FROM wallet_transactions t
             LEFT JOIN users u ON t.user_id = u.id
            WHERE t.status = 'completed' -- pending/expired top-ups are not money
              ${rangeClause(range, 't.created_at')}
           UNION ALL
           SELECT 'payout-' || p.id AS id, 'debit' AS type, p.amount_kobo,
                  CASE p.status WHEN 'completed' THEN 'Payout sent — bank transfer'
                                WHEN 'processing' THEN 'Payout — transfer in progress'
                                ELSE 'Payout — ' || p.status END AS description,
                  p.processed_at AS created_at,
                  COALESCE(u.name, p.subject_name) AS user_name, u.id AS user_id
             FROM payout_requests p
             LEFT JOIN users u ON p.driver_id = u.id
            WHERE p.processed_at IS NOT NULL AND p.status IN ('processing', 'completed', 'failed')
              ${rangeClause(range, 'p.processed_at')}
         ) feed ORDER BY created_at DESC LIMIT 200`
      ),
      query('SELECT platform_fee_percent FROM platform_settings WHERE id = 1'),
    ])

    // Estimate at the *current* fee — past rides may have actually paid out
    // at a different fee if the admin has changed it since, but each ride's
    // own payout (already settled to wallets) is never recalculated.
    const feePercent = Number(feeRes.rows[0]?.platform_fee_percent ?? 20)

    res.json({
      totalWalletBalance: fmt(walletTotal.rows[0].s),
      pendingPayouts: fmt(pendingPayouts.rows[0].s),
      platformRevenue: Math.round(fmt(revenue.rows[0].s) * feePercent / 100),
      range,
      transactions: txns.rows.map(t => ({
        id: t.id, type: t.type, amount: fmt(t.amount_kobo), description: t.description,
        userName: t.user_name || 'Deleted user', userId: t.user_id,
        // No live account behind this row — the name came from the snapshot.
        userDeleted: !t.user_id,
        date: t.created_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── Payout requests ─────────────────────────────────────────────────────────
// Riders withdraw too, not just drivers — the payout_requests.driver_id column
// name is historical. Each row carries the requester's role so the admin can
// tell them apart at a glance.
router.get('/payouts', async (req, res, next) => {
  try {
    const statusFilter = req.query.status || 'pending'
    const result = await query(
      `SELECT p.id, p.amount_kobo, p.fee_kobo, p.status, p.requested_at, p.processed_at,
              p.anchor_transfer_id, p.failure_reason, p.subject_name, p.subject_role,
              u.id AS user_id, u.name AS user_name, u.role, u.active_role,
              u.bank_name, u.bank_account_number
       FROM payout_requests p
       LEFT JOIN users u ON p.driver_id = u.id
       ${statusFilter !== 'all' ? 'WHERE p.status = $1' : ''}
       ORDER BY p.requested_at DESC LIMIT 50`,
      statusFilter !== 'all' ? [statusFilter] : []
    )
    res.json({
      payouts: result.rows.map(p => ({
        id: p.id, amount: fmt(p.amount_kobo), fee: fmt(p.fee_kobo || 0),
        net: fmt(Number(p.amount_kobo) - Number(p.fee_kobo || 0)), status: p.status,
        userId: p.user_id,
        userName: p.user_name || p.subject_name || 'Deleted user',
        // active_role is what the person was actually using the app as; role
        // is their registered default. Either beats guessing "driver".
        userRole: p.active_role || p.role || p.subject_role || null,
        userDeleted: !p.user_id,
        bankName: p.bank_name, accountNumber: p.bank_account_number,
        transferId: p.anchor_transfer_id, failureReason: p.failure_reason,
        requestedAt: p.requested_at, processedAt: p.processed_at,
      })),
    })
  } catch (err) { next(err) }
})

// Approving a payout now actually SENDS the money via an Anchor NIP transfer
// (docs.getanchor.co/docs/bank-transfer): verify the driver's account → create
// (or reuse) the CounterParty beneficiary → initiate the transfer from the
// master account. Final settlement lands via nip.transfer.successful/failed
// webhooks (routes/anchor.js) — failure automatically refunds the driver.
// Optional body.bankCode overrides the bank-name match when it's ambiguous.
router.post('/payouts/:id/approve',
  [
    param('id').isUUID(),
    body('bankCode').optional({ checkFalsy: true }).trim().isLength({ min: 3, max: 10 }),
    // Sandbox-only escape hatch for Anchor's randomised test name-enquiry.
    body('overrideNameCheck').optional().isBoolean(),
    body('overrideReason').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const p = await query(
        `SELECT p.id, p.amount_kobo, p.fee_kobo, p.status, u.id AS driver_id, u.name AS driver_name,
                u.bank_name, u.bank_account_number, u.anchor_counterparty_id
           FROM payout_requests p JOIN users u ON p.driver_id = u.id
          WHERE p.id = $1`,
        [req.params.id]
      )
      const payout = p.rows[0]
      if (!payout) return res.status(404).json({ message: 'Payout request not found.' })
      if (payout.status !== 'pending') return res.status(409).json({ message: 'This request is no longer pending.' })

      // On sandbox rails a NIP transfer reports success without moving money —
      // the driver's wallet would be debited and the payout marked sent while
      // nothing arrives. Refuse for anyone outside the test allowlist.
      const gate = await payoutAllowed(payout.driver_id)
      if (!gate.ok) return res.status(503).json({ message: gate.message })

      // Without Anchor configured, fall back to the old bookkeeping-only
      // approval (money moved by hand outside the app).
      if (!anchor.configured()) {
        const manual = await query(
          `UPDATE payout_requests SET status = 'approved', processed_at = NOW(), processed_by = $1
            WHERE id = $2 AND status = 'pending' RETURNING id`,
          [req.user.id, req.params.id]
        )
        if (!manual.rows[0]) return res.status(409).json({ message: 'This request is no longer pending.' })
        logActivity(req.user.id, 'Payout Approved', 'payment', `₦${fmt(payout.amount_kobo).toLocaleString()} (manual)`)
        return res.json({ message: 'Payout approved (manual transfer — payment rails not configured).' })
      }

      if (!/^\d{10}$/.test(payout.bank_account_number || '')) {
        return res.status(422).json({ message: `${payout.driver_name} has no valid 10-digit account number on their profile.` })
      }

      // First-party payouts ONLY: the bank account holder's name must match
      // the user's registered (immutable) name. Names are compared as tokens
      // since banks order surnames differently ("OLOWOOKERE BUSAYO A").
      const nameMatchesAccount = (registered, bankAccountName) => {
        const toks = s => (s || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(t => t.length >= 2)
        const need = toks(registered).slice(0, 2)           // first + last as registered
        const have = new Set(toks(bankAccountName))
        return need.length > 0 && have.size > 0 && need.every(t => have.has(t))
      }
      // Anchor's SANDBOX name-enquiry returns a freshly randomised name on every
      // call for the same account number (verified: three consecutive lookups of
      // 0000000000 returned "Taiwo Habibu", "Chinara Abubakar", "Kennedy Alabi").
      // The first-party check therefore CANNOT pass in sandbox, which would make
      // payouts untestable. An admin may override it — but only while the rails
      // are sandbox, and every override is written to the audit log. On live
      // keys the block is absolute: a real name mismatch means the money is
      // heading to someone else's account.
      const overrideRequested = req.body.overrideNameCheck === true
      const canOverride = overrideRequested && sandboxRails()
      const blockThirdParty = bankAccountName => {
        if (canOverride) return null
        return res.status(422).json({
          message: `Payout blocked: the bank account is named "${bankAccountName}" but the registered account holder is "${payout.driver_name}". Payouts can only go to an account in the user's own name — ask them to update their bank details.`,
          // Tells the admin UI it may offer the sandbox override.
          nameMismatch: true,
          bankAccountName,
          registeredName: payout.driver_name,
          overridable: sandboxRails(),
        })
      }
      const noteOverride = bankAccountName => {
        if (!canOverride) return
        logActivity(req.user.id, 'Payout Name-Check Overridden', 'payment',
          `${payout.driver_name} → account named "${bankAccountName}" (sandbox)`
          + (req.body.overrideReason ? ` — ${String(req.body.overrideReason).slice(0, 120)}` : ''))
      }

      // Resolve the driver's bank to its NIP code, then verify + save the
      // beneficiary once — reused for every future payout to this driver.
      let counterpartyId = payout.anchor_counterparty_id
      if (counterpartyId) {
        // Re-check the saved beneficiary's name on EVERY approval (fail
        // closed: if we can't confirm whose account it is, no money moves).
        const cp = await anchor.getCounterparty(counterpartyId)
        const cpName = cp?.attributes?.accountName || ''
        if (!nameMatchesAccount(payout.driver_name, cpName)) {
          const blocked = blockThirdParty(cpName || 'unknown')
          if (blocked) return blocked
          noteOverride(cpName || 'unknown')
        }
      }
      if (!counterpartyId) {
        let bankCode = req.body.bankCode
        if (!bankCode) {
          const banks = await anchor.listBanks()
          const norm = s => (s || '').toUpperCase().replace(/[^A-Z]/g, '').replace(/(PLC|LIMITED|LTD)$/g, '')
          const want = norm(payout.bank_name)
          if (!want) return res.status(422).json({ message: `${payout.driver_name} has no bank name on their profile.` })
          const matches = banks.filter(b => {
            const n = norm(b.attributes?.name)
            return n && (n === want || n.includes(want) || want.includes(n))
          })
          if (matches.length !== 1) {
            return res.status(422).json({
              message: `Could not uniquely match bank "${payout.bank_name}" — pick the exact bank.`,
              candidates: banks.slice(0, 200).map(b => ({ code: b.attributes?.nipCode, name: b.attributes?.name })),
            })
          }
          bankCode = matches[0].attributes.nipCode
        }
        const verified = await anchor.verifyAccount(bankCode, payout.bank_account_number)
        const accountName = verified?.attributes?.accountName || ''
        if (!nameMatchesAccount(payout.driver_name, accountName)) {
          const blocked = blockThirdParty(accountName || 'unknown')
          if (blocked) return blocked
          noteOverride(accountName || 'unknown')
        }
        const cp = await anchor.createCounterparty({ bankCode, accountName, accountNumber: payout.bank_account_number })
        counterpartyId = cp.id
        await query('UPDATE users SET anchor_counterparty_id = $1 WHERE id = $2', [counterpartyId, payout.driver_id])
      }

      // Approve, then fire the transfer. Anchor reference: lowercase
      // alphanumeric, unique — derived from the payout id.
      const reference = `po${payout.id.replace(/-/g, '')}`
      const approved = await query(
        `UPDATE payout_requests SET status = 'approved', processed_by = $1, anchor_reference = $2
          WHERE id = $3 AND status = 'pending' RETURNING id`,
        [req.user.id, reference, req.params.id]
      )
      if (!approved.rows[0]) return res.status(409).json({ message: 'This request is no longer pending.' })

      // Riders pay a 5% processing fee — the transfer sends the NET amount;
      // the fee stays with the platform (refunds always return the gross).
      const netKobo = Number(payout.amount_kobo) - Number(payout.fee_kobo || 0)
      try {
        const accountId = await anchor.getMasterAccountId()
        const transfer = await anchor.initiateNipTransfer({
          amountKobo: netKobo,
          reason: 'FeaziMove payout',
          reference,
          accountId,
          counterpartyId,
        })
        await query(
          `UPDATE payout_requests SET status = 'processing', anchor_transfer_id = $1 WHERE id = $2`,
          [transfer.id, req.params.id]
        )
        logActivity(req.user.id, 'Payout Sent', 'payment',
          `₦${fmt(payout.amount_kobo).toLocaleString()} → ${payout.driver_name} (NIP ${transfer.attributes?.status || 'PENDING'})`)
        res.json({ message: `Transfer of ₦${fmt(payout.amount_kobo).toLocaleString()} to ${payout.driver_name} is on its way.`, transferId: transfer.id })
      } catch (err) {
        // Initiation errored AMBIGUOUSLY (e.g. timeout) — Anchor may still
        // have created the transfer. Reverting to pending without checking
        // would let a retry double-pay the driver, so reconcile first:
        //   transfer exists   → adopt it (processing), webhook completes it
        //   confirmed absent  → safe to revert to pending for retry
        //   can't tell        → stay approved with the reference intact so a
        //                       later webhook can still match and settle it
        const existing = await anchor.findTransferByReference(reference).catch(() => undefined)
        if (existing) {
          await query(
            `UPDATE payout_requests SET status = 'processing', anchor_transfer_id = $1 WHERE id = $2`,
            [existing.id, req.params.id]
          )
          logActivity(req.user.id, 'Payout Sent', 'payment',
            `₦${fmt(payout.amount_kobo).toLocaleString()} → ${payout.driver_name} (recovered after timeout)`)
          return res.json({ message: `Transfer of ₦${fmt(payout.amount_kobo).toLocaleString()} to ${payout.driver_name} is on its way (recovered).`, transferId: existing.id })
        }
        if (existing === null) {
          await query(
            `UPDATE payout_requests SET status = 'pending', processed_by = NULL, anchor_reference = NULL WHERE id = $1 AND status = 'approved'`,
            [req.params.id]
          )
          return res.status(err.status || 502).json({ message: err.message || 'Transfer could not be initiated — the request is back in pending.' })
        }
        return res.status(502).json({
          message: 'Transfer initiation is uncertain — the request stays approved and will settle automatically if Anchor processed it. Do not retry; check Back Office events shortly.',
        })
      }
    } catch (err) {
      if (err.status) return res.status(err.status).json({ message: err.message })
      next(err)
    }
  }
)

router.post('/payouts/:id/reject',
  [param('id').isUUID()], validate,
  async (req, res, next) => {
    try {
      const payout = await query(
        `UPDATE payout_requests SET status = 'rejected', processed_at = NOW(), processed_by = $1
         WHERE id = $2 AND status = 'pending' RETURNING id, driver_id, amount_kobo`,
        [req.user.id, req.params.id]
      )
      if (!payout.rows[0]) return res.status(409).json({ message: 'This request is no longer pending.' })

      // Refund the escrowed balance back to the driver
      await query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
        [payout.rows[0].amount_kobo, payout.rows[0].driver_id])
      await query(
        'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description) VALUES ($1, $2, $3, $4)',
        [payout.rows[0].driver_id, 'credit', payout.rows[0].amount_kobo, 'Withdrawal request rejected — refunded']
      )

      logActivity(req.user.id, 'Payout Rejected', 'payment', `₦${fmt(payout.rows[0].amount_kobo).toLocaleString()} refunded`)
      res.json({ message: 'Payout rejected and refunded to driver wallet.' })
    } catch (err) { next(err) }
  }
)

// ── Anchor back office — monitoring for the go-live demo & daily operations ──
// Item 2 of the Anchor checklist: "back office where we monitor transactions
// and have details of all customers we have collected".
router.get('/anchor/overview', async (req, res, next) => {
  try {
    const [customers, events24, eventsAll, lastEvent, payins, transfers, openFlags, pendingTx,
           fallbackAccounts, kycVerified] = await Promise.all([
      query('SELECT COUNT(*)::int n FROM users WHERE anchor_customer_id IS NOT NULL'),
      query("SELECT COUNT(*)::int n FROM anchor_events WHERE created_at >= NOW() - INTERVAL '24 hours'"),
      query('SELECT COUNT(*)::int n FROM anchor_events'),
      query('SELECT MAX(created_at) t FROM anchor_events'),
      query("SELECT COUNT(*)::int n, COALESCE(SUM(amount_kobo),0) s FROM wallet_transactions WHERE gateway = 'anchor' AND type = 'credit' AND status = 'completed'"),
      query("SELECT COUNT(*)::int n FROM payout_requests WHERE anchor_transfer_id IS NOT NULL"),
      query("SELECT COUNT(*)::int n FROM aml_flags WHERE status = 'open'"),
      query("SELECT COUNT(*)::int n FROM wallet_transactions WHERE gateway = 'anchor' AND status = 'pending'"),
      // Users sitting on a FALLBACK account: the reserved-account request was
      // refused, so they hold a Virtual NUBAN in OUR company name and Anchor
      // never ran their BVN check. Counting this makes an otherwise invisible
      // compliance gap visible — the setup log reads like a success.
      query(`SELECT COUNT(*)::int n FROM users
              WHERE reserved_account_number IS NOT NULL
                AND anchor_kyc_status = 'pending_provider'`),
      query(`SELECT COUNT(*)::int n FROM users
              WHERE anchor_kyc_status IN ('approved','verified')`),
    ])
    res.json({
      customers: customers.rows[0].n,
      webhookEvents24h: events24.rows[0].n,
      webhookEventsTotal: eventsAll.rows[0].n,
      lastEventAt: lastEvent.rows[0].t,
      collections: { count: payins.rows[0].n, totalNaira: fmt(payins.rows[0].s) },
      transfersInitiated: transfers.rows[0].n,
      openAmlFlags: openFlags.rows[0].n,
      pendingCollections: pendingTx.rows[0].n,
      configured: anchor.configured(),
      // Which rails the money is really on, and who may move it. Surfaced so
      // this is answerable from the admin panel instead of the AppSail logs.
      rails: {
        live: !/sandbox/i.test(process.env.ANCHOR_BASE_URL || 'sandbox'),
        restricted: paymentsGateActive(),
        allowlistCount: (process.env.PAYMENTS_TEST_ALLOWLIST || '')
          .split(',').map(s => s.trim()).filter(Boolean).length,
      },
      // Compliance visibility: fallback accounts carry no verified identity.
      kyc: {
        onFallbackAccount: fallbackAccounts.rows[0].n,
        verified: kycVerified.rows[0].n,
      },
    })
  } catch (err) { next(err) }
})

// Live webhook/event feed — the raw evidence of every money movement.
router.get('/anchor/events', async (req, res, next) => {
  try {
    const type = req.query.type
    const result = await query(
      `SELECT id, event_id, event_type, resource_id, signature_valid, processed, created_at,
              payload->>'source' AS source, payload->>'detail' AS detail
         FROM anchor_events ${type ? 'WHERE event_type = $1' : ''}
        ORDER BY created_at DESC LIMIT 100`,
      type ? [type] : []
    )
    res.json({ events: result.rows.map(e => ({
      id: e.id, eventId: e.event_id, type: e.event_type, resourceId: e.resource_id,
      // Rows we wrote ourselves (wallet setup, KYC submission) were never signed
      // by anyone — reporting them as "signature valid" would be a lie.
      signatureValid: e.source === 'feazimove-api' ? null : e.signature_valid,
      internal: e.source === 'feazimove-api',
      detail: e.detail || null,
      processed: e.processed, at: e.created_at,
    })) })
  } catch (err) { next(err) }
})

// Registry of every user we've onboarded to Anchor as a customer.
router.get('/anchor/customers', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, anchor_customer_id, anchor_kyc_status,
              reserved_account_number, reserved_account_bank, anchor_counterparty_id,
              bank_name, bank_account_number, created_at
         FROM users WHERE anchor_customer_id IS NOT NULL
        ORDER BY created_at DESC LIMIT 200`
    )
    res.json({ customers: result.rows.map(u => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
      anchorCustomerId: u.anchor_customer_id, kycStatus: u.anchor_kyc_status,
      reservedAccount: u.reserved_account_number
        ? { number: u.reserved_account_number, bank: u.reserved_account_bank } : null,
      // The beneficiary is the bank account the user typed into their own
      // profile — that is where any withdrawal is paid. `registered` says
      // whether it has also been registered with Anchor as a counterparty.
      payoutBeneficiary: u.bank_account_number
        ? {
            bank: u.bank_name || null,
            accountNumber: u.bank_account_number,
            registered: !!u.anchor_counterparty_id,
          }
        : null,
      joinedAt: u.created_at,
    })) })
  } catch (err) { next(err) }
})

// ── AML monitoring (item 3 of the Anchor checklist) ──────────────────────────
// Rule hits from services/walletLedger.js land here for compliance review.
router.get('/aml/flags', async (req, res, next) => {
  try {
    const status = req.query.status || 'open'
    const result = await query(
      // The live user is preferred (name changes stay current), but the
      // snapshot taken when the flag was raised is the fallback — it is the
      // only identity left once an account is deleted.
      `SELECT f.id, f.rule, f.severity, f.detail, f.reference, f.status, f.created_at,
              f.reviewed_at, f.user_id, f.subject_name, f.subject_email, f.subject_role,
              u.id AS live_user_id, u.name AS user_name, u.email AS user_email, u.role,
              r.name AS reviewer_name
         FROM aml_flags f
         LEFT JOIN users u ON f.user_id = u.id
         LEFT JOIN users r ON f.reviewed_by = r.id
        ${status !== 'all' ? 'WHERE f.status = $1' : ''}
        ORDER BY f.created_at DESC LIMIT 100`,
      status !== 'all' ? [status] : []
    )
    res.json({ flags: result.rows.map(f => ({
      id: f.id, rule: f.rule, severity: f.severity, detail: f.detail, reference: f.reference,
      status: f.status,
      // userId is null when the account is gone — the UI uses it to decide
      // whether the subject is still clickable.
      userId: f.live_user_id,
      userName: f.user_name || f.subject_name || null,
      userEmail: f.user_email || f.subject_email || null,
      userRole: f.role || f.subject_role || null,
      subjectDeleted: !f.live_user_id && !!(f.subject_name || f.subject_email),
      createdAt: f.created_at, reviewedAt: f.reviewed_at, reviewerName: f.reviewer_name,
    })) })
  } catch (err) { next(err) }
})

router.post('/aml/flags/:id/review',
  [param('id').isUUID(), body('outcome').isIn(['reviewed', 'dismissed'])],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `UPDATE aml_flags SET status = $1, reviewed_by = $2, reviewed_at = NOW()
          WHERE id = $3 AND status = 'open' RETURNING id, rule`,
        [req.body.outcome, req.user.id, req.params.id]
      )
      if (!result.rows[0]) return res.status(409).json({ message: 'This flag has already been reviewed.' })
      logActivity(req.user.id, 'AML Flag Reviewed', 'payment', `${result.rows[0].rule} → ${req.body.outcome}`)
      res.json({ message: 'Flag updated.' })
    } catch (err) { next(err) }
  }
)

// ── Alerts — real, derived operational issues (no fabricated data) ────────────
router.get('/alerts', async (req, res, next) => {
  try {
    const [delayed, unmatched, lowBalance] = await Promise.all([
      query(
        `SELECT r.id, r.pickup, r.destination, r.status, r.created_at,
                ur.name AS rider_name, ud.name AS driver_name
         FROM rides r
         LEFT JOIN users ur ON r.rider_id = ur.id
         LEFT JOIN users ud ON r.driver_id = ud.id
         WHERE r.status IN ('driver_assigned','arrived_pickup','in_transit')
           AND r.created_at < NOW() - INTERVAL '10 minutes'
         ORDER BY r.created_at ASC LIMIT 20`
      ),
      query(
        `SELECT id, pickup, destination, created_at
         FROM rides WHERE status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes'
         ORDER BY created_at ASC LIMIT 20`
      ),
      query(
        `SELECT id, name, wallet_balance FROM users
         WHERE can_ride = true AND is_active = true AND wallet_balance <= 0
         ORDER BY wallet_balance ASC LIMIT 20`
      ),
    ])

    res.json({
      delayedRides: delayed.rows.map(r => ({
        id: r.id, pickup: r.pickup, destination: r.destination, status: r.status,
        riderName: r.rider_name, driverName: r.driver_name, since: r.created_at,
      })),
      unmatchedRequests: unmatched.rows.map(r => ({
        id: r.id, pickup: r.pickup, destination: r.destination, since: r.created_at,
      })),
      lowBalanceRiders: lowBalance.rows.map(u => ({
        id: u.id, name: u.name, walletBalance: fmt(u.wallet_balance),
      })),
    })
  } catch (err) { next(err) }
})

// ── Reports & analytics ──────────────────────────────────────────────────────
router.get('/reports', async (req, res, next) => {
  try {
    const [daily, weekly, monthly, series, routes, retention, feeRes] = await Promise.all([
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status='completed' AND completed_at >= CURRENT_DATE"),
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status='completed' AND completed_at >= NOW() - INTERVAL '7 days'"),
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status='completed' AND completed_at >= NOW() - INTERVAL '30 days'"),
      query(
        `SELECT DATE(completed_at) AS day, COALESCE(SUM(fare_kobo),0) AS total
         FROM rides WHERE status='completed' AND completed_at >= NOW() - INTERVAL '14 days'
         GROUP BY day ORDER BY day`
      ),
      query(
        `SELECT pickup, destination, COUNT(*) AS cnt
         FROM rides GROUP BY pickup, destination ORDER BY cnt DESC LIMIT 5`
      ),
      query(
        `WITH counts AS (
           SELECT rider_id, COUNT(*) AS c FROM rides WHERE status='completed' AND rider_id IS NOT NULL GROUP BY rider_id
         )
         SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c > 1) AS repeat_riders FROM counts`
      ),
      query('SELECT platform_fee_percent FROM platform_settings WHERE id = 1'),
    ])

    const totalRoutes = routes.rows.reduce((s, r) => s + parseInt(r.cnt, 10), 0)
    const totalRiders = parseInt(retention.rows[0].total, 10)
    const repeatRiders = parseInt(retention.rows[0].repeat_riders, 10)
    // Live platform fee — was hardcoded at 20%, which made this page disagree
    // with the Payments page whenever the admin changed the fee.
    const feeFrac = (parseFloat(feeRes.rows[0]?.platform_fee_percent) || 20) / 100

    res.json({
      dailyRevenue: Math.round(fmt(daily.rows[0].s) * feeFrac),
      weeklyRevenue: Math.round(fmt(weekly.rows[0].s) * feeFrac),
      monthlyRevenue: Math.round(fmt(monthly.rows[0].s) * feeFrac),
      dailySeries: series.rows.map(r => ({ day: r.day, amount: Math.round(fmt(r.total) * feeFrac) })),
      topRoutes: routes.rows.map(r => ({
        pickup: r.pickup, destination: r.destination, count: parseInt(r.cnt, 10),
        sharePct: totalRoutes > 0 ? Math.round((parseInt(r.cnt, 10) / totalRoutes) * 100) : 0,
      })),
      retention: {
        totalRiders, repeatRiders,
        pct: totalRiders > 0 ? Math.round((repeatRiders / totalRiders) * 100) : 0,
      },
    })
  } catch (err) { next(err) }
})

// ── CSV export ────────────────────────────────────────────────────────────────
// Dates render as "2026-07-22 22:11" (Lagos time) — Excel-sortable, no
// timezone noise. Everything else is stringified and CSV-escaped.
function csvDate(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d)) return String(v)
  return d.toLocaleString('sv-SE', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function toCsv(rows, columns) {
  const header = columns.map(c => c.label).join(',')
  const lines = rows.map(row =>
    columns.map(c => {
      const raw = row[c.key]
      const val = c.date ? csvDate(raw) : (raw ?? '')
      const escaped = String(val).replace(/"/g, '""')
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params
    if (!['rides', 'transactions', 'users'].includes(type)) {
      return res.status(400).json({ message: 'Unknown export type.' })
    }

    let csv
    if (type === 'rides') {
      const result = await query(
        `SELECT r.id, r.type, r.pickup, r.destination, r.fare_kobo, r.status, r.created_at, r.completed_at,
                ur.name AS rider_name, ud.name AS driver_name
         FROM rides r
         LEFT JOIN users ur ON r.rider_id = ur.id
         LEFT JOIN users ud ON r.driver_id = ud.id
         ORDER BY r.created_at DESC`
      )
      csv = toCsv(
        result.rows.map(r => ({ ...r, fare: fmt(r.fare_kobo) })),
        [
          { key:'id', label:'Ride ID' }, { key:'type', label:'Type' },
          { key:'rider_name', label:'Rider' }, { key:'driver_name', label:'Driver' },
          { key:'pickup', label:'Pickup' }, { key:'destination', label:'Destination' },
          { key:'fare', label:'Fare (NGN)' }, { key:'status', label:'Status' },
          { key:'created_at', label:'Booked At', date:true }, { key:'completed_at', label:'Completed At', date:true },
        ]
      )
    } else if (type === 'users') {
      // Platform-wide roster: personal information plus the KYC summary. The
      // BVN is masked here — the full number is available one user at a time
      // through the authenticator-gated reveal, never in a bulk download.
      const result = await query(
        `SELECT id, name, email, phone, role, active_role, is_active, is_pending,
                city, area, work_area, residential_address, date_of_birth, gender,
                id_type, id_number, bvn_submitted, bvn_last4, anchor_kyc_status,
                reserved_account_number, reserved_account_bank,
                bank_name, bank_account_number, wallet_balance, rating, created_at
           FROM users ORDER BY created_at DESC`
      )
      csv = toCsv(
        result.rows.map(u => ({
          ...u,
          status: u.is_pending ? 'pending' : u.is_active ? 'active' : 'suspended',
          bvn: u.bvn_last4 ? `•••••••${u.bvn_last4}` : '',
          kyc_status: u.anchor_kyc_status || (u.bvn_submitted ? 'submitted' : 'not started'),
          funding_account: u.reserved_account_number
            ? `${u.reserved_account_number}${u.reserved_account_bank ? ` (${u.reserved_account_bank})` : ''}` : '',
          wallet: fmt(u.wallet_balance),
        })),
        [
          { key:'id', label:'User ID' }, { key:'name', label:'Full Name' },
          { key:'email', label:'Email' }, { key:'phone', label:'Phone' },
          { key:'role', label:'Role' }, { key:'active_role', label:'Active Role' },
          { key:'status', label:'Status' },
          { key:'city', label:'City' }, { key:'area', label:'Home Area' },
          { key:'work_area', label:'Work / Office Area' },
          { key:'residential_address', label:'Residential Address' },
          { key:'date_of_birth', label:'Date of Birth', date:true },
          { key:'gender', label:'Gender' },
          { key:'id_type', label:'ID Type' }, { key:'id_number', label:'ID Number' },
          { key:'bvn', label:'BVN (masked)' }, { key:'kyc_status', label:'Wallet KYC Status' },
          { key:'funding_account', label:'Funding Account' },
          { key:'bank_name', label:'Payout Bank' }, { key:'bank_account_number', label:'Payout Account' },
          { key:'wallet', label:'Wallet Balance (NGN)' }, { key:'rating', label:'Rating' },
          { key:'created_at', label:'Joined', date:true },
        ]
      )
    } else {
      // LEFT JOIN so transactions belonging to deleted accounts still export —
      // they are the ones an auditor is most likely to ask about.
      const result = await query(
        `SELECT t.id, t.type, t.amount_kobo, t.description, t.status, t.gateway, t.reference,
                t.created_at, COALESCE(u.name, t.subject_name) AS user_name,
                COALESCE(u.email, t.subject_email) AS user_email,
                COALESCE(u.role, t.subject_role) AS user_role,
                (u.id IS NULL) AS user_deleted
         FROM wallet_transactions t LEFT JOIN users u ON t.user_id = u.id
         WHERE 1 = 1 ${rangeClause(req.query.range, 't.created_at')}
         ORDER BY t.created_at DESC`
      )
      csv = toCsv(
        result.rows.map(t => ({
          ...t,
          amount: fmt(t.amount_kobo),
          gateway: t.gateway || 'internal',
          user_name: t.user_name || 'Deleted user',
          account: t.user_deleted ? 'deleted' : 'active',
        })),
        [
          { key:'id', label:'Transaction ID' }, { key:'user_name', label:'User' },
          { key:'user_email', label:'User Email' }, { key:'user_role', label:'User Role' },
          { key:'account', label:'Account' },
          { key:'type', label:'Type' }, { key:'amount', label:'Amount (NGN)' },
          { key:'status', label:'Status' }, { key:'gateway', label:'Gateway' },
          { key:'reference', label:'Reference' },
          { key:'description', label:'Description' }, { key:'created_at', label:'Date', date:true },
        ]
      )
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="feazimove-${type}-export.csv"`)
    // UTF-8 BOM — without it Excel on Windows guesses Windows-1252 and
    // renders em-dashes in descriptions as "â€"" mojibake.
    res.send('﻿' + csv)
  } catch (err) { next(err) }
})

// ── Route demand — live supply/demand per period+slot+route (read-only) ──────
// Note: pickup/dropoff/time-slot options and pricing are still hardcoded in the
// frontend (BookRide.jsx, DriverDashboard.jsx) and rides.js/driver.js fare logic.
// This is a read-only view of current demand, not route/pricing management —
// that would mean moving the hardcoded route config into the DB and touching
// the live matching code, which is a separate, bigger change.
router.get('/routes', async (req, res, next) => {
  try {
    const result = await query(
      `WITH riders AS (
         SELECT period, time_slot, pickup, dropoff, COUNT(*) AS waiting
         FROM rider_bookings WHERE status = 'pending'
         GROUP BY period, time_slot, pickup, dropoff
       ),
       drivers AS (
         SELECT period, time_slot, pickup, dropoff, COUNT(*) AS live_drivers, COALESCE(SUM(seats),0) AS seats_available
         FROM driver_availability WHERE status IN ('waiting','active')
         GROUP BY period, time_slot, pickup, dropoff
       )
       SELECT
         COALESCE(r.period, d.period)     AS period,
         COALESCE(r.time_slot, d.time_slot) AS time_slot,
         COALESCE(r.pickup, d.pickup)       AS pickup,
         COALESCE(r.dropoff, d.dropoff)     AS dropoff,
         COALESCE(r.waiting, 0)             AS waiting,
         COALESCE(d.live_drivers, 0)        AS live_drivers,
         COALESCE(d.seats_available, 0)     AS seats_available
       FROM riders r
       FULL OUTER JOIN drivers d
         ON r.period = d.period AND r.time_slot = d.time_slot AND r.pickup = d.pickup AND r.dropoff = d.dropoff
       ORDER BY waiting DESC, live_drivers DESC`
    )
    res.json({
      routes: result.rows.map(r => ({
        period: r.period, timeSlot: r.time_slot, pickup: r.pickup, dropoff: r.dropoff,
        waitingRiders: parseInt(r.waiting, 10),
        liveDrivers: parseInt(r.live_drivers, 10),
        seatsAvailable: parseInt(r.seats_available, 10),
      })),
    })
  } catch (err) { next(err) }
})

// ── Stops management ─────────────────────────────────────────────────────────
// Stops live inside admin-manageable zones (Mainland 1, Mainland 2, Island 1…).
// stops.chain_position stays the side-wide "try next stop" walk order drivers
// use — derived as (zone position, order within zone) and recomputed by this
// helper whenever anything is rearranged.
async function recomputeChainPositions(client, side) {
  // Two-phase to dodge UNIQUE(group_name, chain_position): park at negatives,
  // then rewrite. Stops without a zone (shouldn't exist) sort last.
  await client.query('UPDATE stops SET chain_position = -1 - chain_position WHERE group_name = $1', [side])
  await client.query(
    `UPDATE stops s SET chain_position = r.pos FROM (
       SELECT s2.id, ROW_NUMBER() OVER (ORDER BY COALESCE(z.position, 32767), -1 - s2.chain_position) - 1 AS pos
       FROM stops s2 LEFT JOIN stop_zones z ON z.id = s2.zone_id
       WHERE s2.group_name = $1
     ) r WHERE s.id = r.id`,
    [side]
  )
}

router.get('/stops', async (req, res, next) => {
  try {
    const [zonesRes, stopsRes] = await Promise.all([
      query('SELECT id, side, name, position FROM stop_zones ORDER BY side, position'),
      query(
        `SELECT s.id, s.name, s.group_name, s.chain_position, s.zone_id, s.lat, s.lng, s.is_active, s.created_at
         FROM stops s LEFT JOIN stop_zones z ON z.id = s.zone_id
         ORDER BY s.group_name, COALESCE(z.position, 32767), s.chain_position`
      ),
    ])
    res.json({
      zones: zonesRes.rows.map(z => ({ id: z.id, side: z.side, name: z.name, position: z.position })),
      stops: stopsRes.rows.map(s => ({
        id: s.id, name: s.name, group: s.group_name, chainPosition: s.chain_position, zoneId: s.zone_id,
        lat: s.lat != null ? Number(s.lat) : null, lng: s.lng != null ? Number(s.lng) : null,
        isActive: s.is_active, createdAt: s.created_at,
      })),
    })
  } catch (err) { next(err) }
})

router.post('/stops',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('zoneId').isUUID(),
    body('lat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('lng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  ],
  validate,
  async (req, res, next) => {
    const { name, zoneId, lat, lng } = req.body
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const zone = await client.query('SELECT side FROM stop_zones WHERE id = $1', [zoneId])
      if (!zone.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Category not found.' }) }
      const side = zone.rows[0].side
      const result = await client.query(
        // $6 repeats the side instead of reusing $2. Postgres deduces a
        // parameter's type from EVERY position it appears in, and $2 sits both
        // in a SELECT list and in a varchar comparison — it deduces text in one
        // and character varying in the other and refuses the statement outright
        // ("inconsistent types deduced for parameter $2", SQLSTATE 42P08).
        // A distinct placeholder gives each position one unambiguous type.
        `INSERT INTO stops (name, group_name, chain_position, zone_id, lat, lng)
         SELECT $1, $2, COALESCE(MAX(chain_position), -1) + 1, $3, $4, $5 FROM stops WHERE group_name = $6
         RETURNING id`,
        [name, side, zoneId, lat || null, lng || null, side]
      )
      // Slot the new stop after the last stop of its zone, not the side's tail
      await recomputeChainPositions(client, side)
      await client.query('COMMIT')
      logActivity(req.user.id, 'Stop Added', 'route', name)
      res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      if (err.code === '23505') return res.status(409).json({ message: 'A stop with that name already exists.' })
      next(err)
    } finally { client.release() }
  }
)

router.patch('/stops/:id',
  [
    param('id').isUUID(),
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 100 }).escape(),
    body('lat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('lng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, lat, lng, isActive } = req.body
      const result = await query(
        `UPDATE stops SET
           name = COALESCE($1, name),
           lat = COALESCE($2, lat),
           lng = COALESCE($3, lng),
           is_active = COALESCE($4, is_active)
         WHERE id = $5 RETURNING id`,
        [name || null, lat ?? null, lng ?? null, isActive ?? null, req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'Stop not found.' })
      res.json({ message: 'Stop updated.' })
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ message: 'That name is already in use.' })
      next(err)
    }
  }
)

// ── Zone (category) management ───────────────────────────────────────────────
router.post('/zones',
  [
    body('side').isIn(['mainland', 'island']),
    body('name').trim().isLength({ min: 2, max: 60 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { side, name } = req.body
      const result = await query(
        `INSERT INTO stop_zones (side, name, position)
         SELECT $1, $2, COALESCE(MAX(position), -1) + 1 FROM stop_zones WHERE side = $1
         RETURNING id`,
        [side, name]
      )
      logActivity(req.user.id, 'Stop Category Added', 'route', name)
      res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ message: 'A category with that name already exists.' })
      next(err)
    }
  }
)

router.patch('/zones/:id',
  [param('id').isUUID(), body('name').trim().isLength({ min: 2, max: 60 }).escape()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query('UPDATE stop_zones SET name = $1 WHERE id = $2 RETURNING id', [req.body.name, req.params.id])
      if (!result.rows[0]) return res.status(404).json({ message: 'Category not found.' })
      res.json({ message: 'Category renamed.' })
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ message: 'A category with that name already exists.' })
      next(err)
    }
  }
)

router.delete('/zones/:id', [param('id').isUUID()], validate, async (req, res, next) => {
  try {
    // Emptiness check and delete in ONE statement so a concurrent move-into
    // this zone can't slip between them and orphan its stops.
    const result = await query(
      `DELETE FROM stop_zones WHERE id = $1
         AND NOT EXISTS (SELECT 1 FROM stops WHERE zone_id = $1)
       RETURNING name`,
      [req.params.id]
    )
    if (!result.rows[0]) {
      const exists = await query('SELECT 1 FROM stop_zones WHERE id = $1', [req.params.id])
      if (!exists.rows[0]) return res.status(404).json({ message: 'Category not found.' })
      return res.status(409).json({ message: 'Move its stops to another category first.' })
    }
    logActivity(req.user.id, 'Stop Category Deleted', 'route', result.rows[0].name)
    res.json({ message: 'Category deleted.' })
  } catch (err) { next(err) }
})

// ── Arrange stops: within-zone reorder AND cross-zone drag in one call ───────
// The frontend sends the full final ordered stop-id list for every zone it
// touched (one zone for a reorder, two for a drag between zones). Membership
// and order come from the payload; untouched zones keep their internal order.
router.post('/stops/arrange',
  [
    body('zones').isArray({ min: 1, max: 50 }),
    body('zones.*.zoneId').isUUID(),
    body('zones.*.orderedIds').isArray({ max: 200 }),
    body('zones.*.orderedIds.*').isUUID(),
  ],
  validate,
  async (req, res, next) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const sides = new Set()
      let parkBase = -30000 // distinct SMALLINT-safe temp range per arranged zone
      for (const { zoneId, orderedIds } of req.body.zones) {
        const zone = await client.query('SELECT side FROM stop_zones WHERE id = $1', [zoneId])
        if (!zone.rows[0]) { const e = new Error('Category not found.'); e.status = 404; throw e }
        const side = zone.rows[0].side
        sides.add(side)
        if (orderedIds.length === 0) continue
        // A stop can only live in a zone on its own side — moving a stop
        // across the water would corrupt route/pricing side pairing.
        const moved = await client.query(
          `UPDATE stops SET zone_id = $1 WHERE id = ANY($2::uuid[]) AND group_name = $3 RETURNING id`,
          [zoneId, orderedIds, side]
        )
        if (moved.rows.length !== orderedIds.length) {
          const e = new Error('One of the stops does not exist on that side.'); e.status = 422; throw e
        }
        // Record the requested within-zone order via parked temp positions
        // (base + index keeps the requested order after recompute's double
        // negation, and each zone gets its own range so nothing collides);
        // recompute below turns it into the final side-wide walk order.
        await client.query(
          `UPDATE stops SET chain_position = $2 + array_position($1::uuid[], id) WHERE id = ANY($1::uuid[])`,
          [orderedIds, parkBase]
        )
        parkBase += 250 // > max orderedIds per zone, so ranges never overlap
      }
      for (const side of sides) await recomputeChainPositions(client, side)
      await client.query('COMMIT')
      res.json({ message: 'Stops arranged.' })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      if (err.status) return res.status(err.status).json({ message: err.message })
      next(err)
    } finally { client.release() }
  }
)

// ── Route pricing management ──────────────────────────────────────────────────
router.get('/routes-pricing', async (req, res, next) => {
  try {
    const period = req.query.period
    const result = await query(
      `SELECT r.id, r.period, r.pickup, r.dropoff, r.pool_fare_kobo, r.package_fare_kobo,
              r.is_active, r.updated_at, u.name AS updated_by_name
       FROM routes r
       LEFT JOIN users u ON r.updated_by = u.id
       ${period ? 'WHERE r.period = $1' : ''}
       ORDER BY r.period, r.pickup, r.dropoff`,
      period ? [period] : []
    )
    res.json({
      routes: result.rows.map(r => ({
        id: r.id, period: r.period, pickup: r.pickup, dropoff: r.dropoff,
        poolFareKobo: r.pool_fare_kobo != null ? Number(r.pool_fare_kobo) : null,
        packageFareKobo: r.package_fare_kobo != null ? Number(r.package_fare_kobo) : null,
        isActive: r.is_active, updatedAt: r.updated_at, updatedByName: r.updated_by_name,
      })),
    })
  } catch (err) { next(err) }
})

router.post('/routes-pricing',
  [
    body('period').isIn(['morning', 'evening']),
    body('pickup').trim().isLength({ min: 1, max: 100 }).escape(),
    body('dropoff').trim().isLength({ min: 1, max: 100 }).escape(),
    body('dropoffGroup').optional().isIn(['mainland', 'island']),
    body('poolFareKobo').optional({ nullable: true, checkFalsy: false }).isInt({ min: 0 }),
    body('packageFareKobo').optional({ nullable: true, checkFalsy: false }).isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    const { period, pickup, dropoff, dropoffGroup } = req.body
    // Fares are optional now — a route can be created unpriced and priced later.
    const poolFareKobo = req.body.poolFareKobo == null || req.body.poolFareKobo === '' ? null : req.body.poolFareKobo
    const packageFareKobo = req.body.packageFareKobo == null || req.body.packageFareKobo === '' ? null : req.body.packageFareKobo
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // A hand-typed dropoff may be a brand-new location — create the stop first
      // (same globally-unique / wrong-side guard the fan-out uses) so the route
      // has a real stop to point at. Only runs when the admin supplied its side.
      if (dropoffGroup) {
        const found = await client.query('SELECT group_name FROM stops WHERE name = $1', [dropoff])
        if (found.rows[0]) {
          if (found.rows[0].group_name !== dropoffGroup) {
            const art = g => g === 'island' ? 'an' : 'a' // "an island" / "a mainland"
            const g0 = found.rows[0].group_name
            const e = new Error(`"${dropoff}" already exists as ${art(g0)} ${g0} stop, so it can't be used as ${art(dropoffGroup)} ${dropoffGroup} location.`)
            e.status = 409; throw e
          }
        } else {
          const pos = await client.query(
            'SELECT COALESCE(MAX(chain_position), -1) + 1 AS next FROM stops WHERE group_name = $1',
            [dropoffGroup]
          )
          // New hand-typed stop goes to the last zone of its side (end of the
          // walk chain) — admin can drag it to the right category later.
          await client.query(
            // $4 repeats the group rather than reusing $2 — see the note on the
            // stops-add query above: one parameter in two type contexts is a
            // hard 42P08 failure, not a coercion.
            `INSERT INTO stops (name, group_name, chain_position, zone_id)
             VALUES ($1, $2, $3, (SELECT id FROM stop_zones WHERE side = $4 ORDER BY position DESC LIMIT 1))`,
            [dropoff, dropoffGroup, pos.rows[0].next, dropoffGroup])
        }
      }
      const result = await client.query(
        `INSERT INTO routes (period, pickup, dropoff, pool_fare_kobo, package_fare_kobo, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
        [period, pickup, dropoff, poolFareKobo, packageFareKobo, req.user.id]
      )
      await client.query('COMMIT')
      logActivity(req.user.id, 'Route Created', 'route', `${pickup} → ${dropoff} (${period})`)
      res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      if (err.status) return res.status(err.status).json({ message: err.message })
      if (err.code === '23503') return res.status(422).json({ message: 'Pickup or dropoff is not a known stop.' })
      if (err.code === '23505') return res.status(409).json({ message: 'This route already exists for that period.' })
      next(err)
    } finally { client.release() }
  }
)

// ── Bulk fan-out: one new pickup → many opposite-side dropoffs (Item 7) ───────
// A mainland pickup fans out to selected island stops (morning); an island
// pickup fans out to selected mainland stops (evening). Routes are created
// UNPRICED — priced later per-route on the pricing page. The pickup stop is
// created if it doesn't exist yet.
router.post('/routes-bulk',
  [
    body('pickupName').trim().isLength({ min: 2, max: 100 }).escape(),
    body('pickupGroup').isIn(['mainland', 'island']),
    body('dropoffNames').isArray({ min: 1 }),
    body('dropoffNames.*').trim().isLength({ min: 1, max: 100 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    const { pickupName, pickupGroup, dropoffNames } = req.body
    const period = pickupGroup === 'mainland' ? 'morning' : 'evening'
    const dropoffGroup = pickupGroup === 'mainland' ? 'island' : 'mainland'
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Helper: make sure a stop exists in a given group, creating it at the end
      // of that group's chain if it's brand new (a hand-typed pickup OR dropoff).
      // Stop names are globally unique, so if a hand-typed name already exists on
      // the OTHER side, reject rather than silently building a wrong-side route.
      async function ensureStop(name, group) {
        const found = await client.query('SELECT group_name FROM stops WHERE name = $1', [name])
        if (found.rows[0]) {
          if (found.rows[0].group_name !== group) {
            const art = g => g === 'island' ? 'an' : 'a' // "an island" / "a mainland"
            const g0 = found.rows[0].group_name
            const e = new Error(`"${name}" already exists as ${art(g0)} ${g0} stop, so it can't be used as ${art(group)} ${group} location.`)
            e.status = 409; throw e
          }
          return
        }
        const pos = await client.query(
          'SELECT COALESCE(MAX(chain_position), -1) + 1 AS next FROM stops WHERE group_name = $1',
          [group]
        )
        // New hand-typed stop goes to the last zone of its side (end of the
        // walk chain) — admin can drag it to the right category later.
        await client.query(
          // $4 repeats the group rather than reusing $2 — same 42P08 issue.
          `INSERT INTO stops (name, group_name, chain_position, zone_id)
           VALUES ($1, $2, $3, (SELECT id FROM stop_zones WHERE side = $4 ORDER BY position DESC LIMIT 1))`,
          [name, group, pos.rows[0].next, group])
      }
      await ensureStop(pickupName, pickupGroup)

      // Create a route to each dropoff — existing stops OR a hand-typed new one
      // (created on the opposite side). Skip pairs that already exist.
      let created = 0
      for (const dropoff of dropoffNames) {
        await ensureStop(dropoff, dropoffGroup)
        const r = await client.query(
          `INSERT INTO routes (period, pickup, dropoff, updated_by, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (period, pickup, dropoff) DO NOTHING RETURNING id`,
          [period, pickupName, dropoff, req.user.id]
        )
        if (r.rows[0]) created++
      }
      await client.query('COMMIT')
      logActivity(req.user.id, 'Routes Fanned Out', 'route', `${pickupName} → ${created} stop(s) (${period})`)
      res.status(201).json({ created, period })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      if (err.status) return res.status(err.status).json({ message: err.message })
      if (err.code === '23503') return res.status(422).json({ message: 'One of the selected dropoffs is not a known stop.' })
      next(err)
    } finally { client.release() }
  }
)

// (The old side-wide /stops/reorder endpoint was replaced by /stops/arrange —
// order now lives inside zones, and the walk chain is derived from them.)

router.patch('/routes-pricing/:id',
  [
    param('id').isUUID(),
    body('poolFareKobo').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('packageFareKobo').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { poolFareKobo, packageFareKobo, isActive } = req.body
      const result = await query(
        `UPDATE routes SET
           pool_fare_kobo = COALESCE($1, pool_fare_kobo),
           package_fare_kobo = COALESCE($2, package_fare_kobo),
           is_active = COALESCE($3, is_active),
           updated_by = $4, updated_at = NOW()
         WHERE id = $5 RETURNING id`,
        [poolFareKobo ?? null, packageFareKobo ?? null, isActive ?? null, req.user.id, req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'Route not found.' })
      logActivity(req.user.id, 'Route Pricing Updated', 'route', null)
      res.json({ message: 'Route updated.' })
    } catch (err) { next(err) }
  }
)

// ── Platform fee — the cut taken from every fare before the driver is paid ───
router.get('/platform-fee', async (req, res, next) => {
  try {
    const result = await query('SELECT platform_fee_percent FROM platform_settings WHERE id = 1')
    res.json({ feePercent: Number(result.rows[0].platform_fee_percent) })
  } catch (err) { next(err) }
})

router.patch('/platform-fee',
  [body('feePercent').isFloat({ min: 0, max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const { feePercent } = req.body
      await query(
        `UPDATE platform_settings SET platform_fee_percent = $1, updated_by = $2, updated_at = NOW() WHERE id = 1`,
        [feePercent, req.user.id]
      )
      logActivity(req.user.id, 'Platform Fee Updated', 'admin', `${feePercent}%`)
      res.json({ feePercent, message: 'Platform fee updated.' })
    } catch (err) { next(err) }
  }
)

// ── "Move an Item" launch waitlist — who tapped Join on the Launching Soon page ─
router.get('/move-waitlist', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT w.id, w.user_id, w.name, w.email, w.phone, w.joined_at,
              u.can_drive, u.city, u.area
       FROM move_waitlist w
       LEFT JOIN users u ON u.id = w.user_id
       ORDER BY w.joined_at DESC`
    )
    const today = result.rows.filter(r => new Date(r.joined_at) >= new Date(new Date().toDateString())).length
    res.json({
      total: result.rows.length,
      joinedToday: today,
      entries: result.rows.map(r => ({
        id:       r.id,
        userId:   r.user_id,
        name:     r.name,
        email:    r.email,
        phone:    r.phone,
        city:     r.city || null,
        area:     r.area || null,
        isDriver: r.can_drive === true,
        joinedAt: r.joined_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── Admin authenticator (TOTP) + gated KYC reveal ───────────────────────────
// Anchor can require a user's complete KYC — full BVN, address, ID — at short
// notice, so it has to be retrievable. It is deliberately NOT visible by
// simply being logged in as an admin: the full BVN is stored encrypted and
// released only against a live code from an authenticator app, with every
// release written to the activity log.
//
// Deliberately not email-based: an email one-time code is only as strong as
// the mailbox, and the mailbox is the same thing that recovers the admin
// password.

// Brute force here is guessing a 6-digit code, so the attempt budget is the
// real defence. Keyed per admin, not per IP.
const revealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.user?.id || req.ip,
  message: { message: 'Too many verification attempts. Wait 15 minutes and try again.' },
})

router.get('/security/totp', async (req, res, next) => {
  try {
    const r = await query('SELECT totp_secret, totp_enabled_at FROM users WHERE id = $1', [req.user.id])
    res.json({
      enabled: !!r.rows[0]?.totp_enabled_at,
      pending: !!r.rows[0]?.totp_secret && !r.rows[0]?.totp_enabled_at,
      enrolledAt: r.rows[0]?.totp_enabled_at || null,
      vaultConfigured: kycVault.configured(),
    })
  } catch (err) { next(err) }
})

// Start enrolment: mint a secret and hand back a QR to scan. Re-enrolling
// while already enabled is refused — that would be a way to swap the second
// factor using only a stolen session.
router.post('/security/totp/setup', async (req, res, next) => {
  try {
    if (!kycVault.configured()) {
      return res.status(503).json({
        message: 'KYC vault is not configured on this server (KYC_ENCRYPTION_KEY missing).',
      })
    }
    // requireAuth attaches only { id, role } — the email for the authenticator
    // label has to be read here.
    const existing = await query('SELECT email, totp_enabled_at FROM users WHERE id = $1', [req.user.id])
    if (existing.rows[0]?.totp_enabled_at) {
      return res.status(409).json({
        message: 'An authenticator is already set up. Remove the current one first.',
      })
    }
    const secret = totp.generateSecret()
    const uri = totp.otpauthUri(secret, existing.rows[0]?.email || 'admin')
    // Stored encrypted and unconfirmed — enrolment only counts once a code
    // from the app proves the secret actually reached it.
    await query(
      'UPDATE users SET totp_secret = $1, totp_enabled_at = NULL WHERE id = $2',
      [kycVault.encrypt(secret), req.user.id]
    )
    res.json({
      secret, // shown for manual entry when the QR cannot be scanned
      otpauthUri: uri,
      qrDataUri: await QRCode.toDataURL(uri, { margin: 1, width: 240 }),
    })
  } catch (err) { next(err) }
})

router.post('/security/totp/enable',
  [body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code.')],
  validate,
  revealLimiter,
  async (req, res, next) => {
    try {
      const r = await query('SELECT totp_secret, totp_enabled_at FROM users WHERE id = $1', [req.user.id])
      if (r.rows[0]?.totp_enabled_at) return res.status(409).json({ message: 'Authenticator already active.' })
      const secret = kycVault.decrypt(r.rows[0]?.totp_secret)
      if (!secret) return res.status(400).json({ message: 'Start setup again — no pending enrolment found.' })
      if (!totp.verify(secret, req.body.code)) {
        return res.status(400).json({ message: 'That code is not right. Check your authenticator app and try again.' })
      }
      await query('UPDATE users SET totp_enabled_at = NOW() WHERE id = $1', [req.user.id])
      logActivity(req.user.id, 'Authenticator Enabled', 'security', 'TOTP enrolled for KYC access', { req })
      res.json({ message: 'Authenticator enabled. It is now required to view full KYC data.' })
    } catch (err) { next(err) }
  }
)

// Removing the factor requires a current code — a stolen session alone must
// not be able to turn the protection off.
router.post('/security/totp/disable',
  [body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code.')],
  validate,
  revealLimiter,
  async (req, res, next) => {
    try {
      const r = await query('SELECT totp_secret, totp_enabled_at FROM users WHERE id = $1', [req.user.id])
      if (!r.rows[0]?.totp_enabled_at) return res.status(409).json({ message: 'No authenticator is set up.' })
      const secret = kycVault.decrypt(r.rows[0]?.totp_secret)
      if (!secret || !totp.verify(secret, req.body.code)) {
        return res.status(400).json({ message: 'That code is not right.' })
      }
      await query('UPDATE users SET totp_secret = NULL, totp_enabled_at = NULL WHERE id = $1', [req.user.id])
      logActivity(req.user.id, 'Authenticator Removed', 'security', 'TOTP disabled', { req })
      res.json({ message: 'Authenticator removed.' })
    } catch (err) { next(err) }
  }
)

// The reveal itself. Returns the complete KYC record for ONE user, including
// the decrypted BVN, and records who looked and when.
router.post('/users/:id/kyc/reveal',
  [
    param('id').isUUID(),
    body('code').trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit code.'),
  ],
  validate,
  revealLimiter,
  async (req, res, next) => {
    try {
      const admin = await query('SELECT email, totp_secret, totp_enabled_at FROM users WHERE id = $1', [req.user.id])
      if (!admin.rows[0]?.totp_enabled_at) {
        // 428 Precondition Required — the client turns this into "set up your
        // authenticator first" rather than "wrong code".
        return res.status(428).json({
          message: 'Set up an authenticator app in Settings before viewing full KYC data.',
        })
      }
      const secret = kycVault.decrypt(admin.rows[0].totp_secret)
      if (!secret || !totp.verify(secret, req.body.code)) {
        // Failed attempts are logged with the same context — repeated denials
        // against one subject is exactly the pattern worth spotting.
        const t = await query('SELECT id, name, email FROM users WHERE id = $1', [req.params.id])
        logActivity(req.user.id, 'KYC Reveal Denied', 'security', 'Incorrect authenticator code',
          { req, actorEmail: admin.rows[0].email, target: t.rows[0] || { id: req.params.id } })
        return res.status(400).json({ message: 'That code is not right. Check your authenticator app and try again.' })
      }

      const r = await query(
        `SELECT id, name, email, phone, role, city, area, residential_address,
                date_of_birth, gender, id_type, id_number,
                bvn_encrypted, bvn_last4, bvn_submitted, anchor_kyc_status,
                anchor_customer_id, reserved_account_number, reserved_account_bank,
                bank_name, bank_account_number, created_at
           FROM users WHERE id = $1`,
        [req.params.id]
      )
      const u = r.rows[0]
      if (!u) return res.status(404).json({ message: 'User not found.' })

      const bvn = kycVault.decrypt(u.bvn_encrypted)
      // Every successful look is logged — this is the record we would show
      // Anchor to prove KYC access is controlled.
      logActivity(req.user.id, 'KYC Revealed', 'security',
        `Full KYC viewed${bvn ? ' including BVN' : ''}`,
        { req, actorEmail: admin.rows[0].email, target: { id: u.id, name: u.name, email: u.email } })

      res.json({
        kyc: {
          userId: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
          dateOfBirth: u.date_of_birth, gender: u.gender,
          city: u.city, area: u.area, residentialAddress: u.residential_address,
          idType: u.id_type, idNumber: u.id_number,
          // null when the BVN predates encryption, or the vault key changed.
          bvn: bvn,
          bvnLast4: u.bvn_last4,
          bvnUnavailable: !bvn && !!u.bvn_submitted,
          kycStatus: u.anchor_kyc_status,
          anchorCustomerId: u.anchor_customer_id,
          fundingAccount: u.reserved_account_number
            ? { number: u.reserved_account_number, bank: u.reserved_account_bank } : null,
          bankName: u.bank_name, bankAccountNumber: u.bank_account_number,
          joinedAt: u.created_at,
          revealedAt: new Date().toISOString(),
          revealedBy: admin.rows[0].email || req.user.id,
        },
      })
    } catch (err) { next(err) }
  }
)

// ── Reissue a rider's funding account ───────────────────────────────────────
//
// Anchor labels a reserved account "Merchant Name / Customer Name" and takes
// the customer half from the creation request. Accounts created before that
// block was sent came out as "FeaziMove Technologies Ltd / " with nothing after
// the slash, and Anchor offers no way to relabel an existing account — a new
// one is the only cure. The old number is retired into legacy_nuban_numbers by
// the provisioning code, so transfers a rider already scheduled to it still
// reach them.
router.post('/users/:id/reissue-funding-account',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const r = await query(
        `SELECT id, name, anchor_kyc_status, reserved_account_number, reserved_account_name
           FROM users WHERE id = $1`, [req.params.id]
      )
      const u = r.rows[0]
      if (!u) return res.status(404).json({ message: 'User not found.' })
      if (u.anchor_kyc_status !== 'account_named' && u.anchor_kyc_status !== 'approved' && u.anchor_kyc_status !== 'verified') {
        return res.status(409).json({
          message: 'This rider has no approved KYC yet, so Anchor cannot issue an account in their name.',
        })
      }
      const before = u.reserved_account_number
      const result = await provisionReservedAccount(u.id, { force: true })
      if (!result.provisioned) {
        return res.status(502).json({ message: `Anchor did not issue a new account (${result.reason}).` })
      }
      logActivity(req.user.id, 'Funding Account Reissued', 'payment',
        `${before || 'none'} → ${result.account.accountNumber} (${result.account.accountName || 'name pending'})`,
        { req, target: { id: u.id, name: u.name } })
      res.json({ account: result.account, previousAccountNumber: before })
    } catch (err) { next(err) }
  }
)

// ── Re-run identity verification for one user ───────────────────────────────
// Each call costs money, so this is deliberately manual: used when the first
// attempt errored, or the applicant has since uploaded a better selfie.
router.post('/users/:id/verify-identity',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      if (!prembly.configured()) {
        return res.status(503).json({ message: 'Prembly is not configured on this server.' })
      }
      const r = await query(
        `SELECT u.id, u.name, u.role, u.id_number, u.drivers_license_number, u.date_of_birth,
                COALESCE(
                  (SELECT file_path FROM user_documents d WHERE d.user_id = u.id AND d.doc_type = 'selfie' ORDER BY uploaded_at DESC LIMIT 1),
                  (SELECT file_path FROM user_documents d WHERE d.user_id = u.id AND d.doc_type = 'profilePhoto' ORDER BY uploaded_at DESC LIMIT 1),
                  u.avatar_path
                ) AS face_key
           FROM users u WHERE u.id = $1`,
        [req.params.id]
      )
      const u = r.rows[0]
      if (!u) return res.status(404).json({ message: 'User not found.' })
      if (!u.face_key) {
        return res.status(422).json({ message: 'This user has no selfie on file to compare against.' })
      }

      const selfieBuffer = await readStored(req, u.face_key)
      // Same role split as registration: riders by NIN, drivers by licence.
      const verdict = await prembly.verifyIdentity({
        role: u.role,
        registeredName: u.name,
        nin: u.role === 'driver' ? null : u.id_number,
        licenceNumber: u.role === 'driver' ? u.drivers_license_number : null,
        dob: u.date_of_birth,
        selfieBuffer,
      })
      await query(
        // licence_photo is only written when the lookup actually reached FRSC —
        // a failed re-run must not wipe a portrait an admin is relying on.
        `UPDATE users SET identity_status = $1, identity_summary = $2,
                identity_detail = $3, identity_checked_at = NOW(),
                licence_photo = CASE WHEN $5 THEN $4 ELSE licence_photo END
          WHERE id = $6`,
        [verdict.status, (verdict.summary || '').slice(0, 300),
         JSON.stringify({ checks: verdict.checks || [], ninName: verdict.ninName || null,
                          licenceName: verdict.licenceName || null,
                          licence: verdict.licence || null }),
         verdict.licencePhoto || null, verdict.status !== 'error', u.id]
      )
      logActivity(req.user.id, 'Identity Re-verified', 'security', verdict.summary,
        { req, target: { id: u.id, name: u.name } })
      // The photo itself is never returned here — the page fetches it from the
      // one endpoint that serves it.
      res.json({ identity: { status: verdict.status, summary: verdict.summary,
        checks: verdict.checks, ninName: verdict.ninName, licenceName: verdict.licenceName,
        licence: verdict.licence || null, hasLicencePhoto: !!verdict.licencePhoto } })
    } catch (err) { next(err) }
  }
)

// ── Feedback: messages sent through the public Contact form ─────────────────
router.get('/contact-messages', async (req, res, next) => {
  try {
    const status = req.query.status || 'all'
    const result = await query(
      `SELECT c.id, c.name, c.email, c.topic, c.message, c.status, c.emailed,
              c.ip_address, c.user_agent, c.created_at, c.handled_at,
              h.name AS handled_by_name
         FROM contact_messages c
         LEFT JOIN users h ON c.handled_by = h.id
        ${status !== 'all' ? 'WHERE c.status = $1' : ''}
        ORDER BY c.created_at DESC LIMIT 300`,
      status !== 'all' ? [status] : []
    )
    const counts = await query(
      `SELECT status, COUNT(*)::int n FROM contact_messages GROUP BY status`)
    res.json({
      messages: result.rows.map(m => ({
        id: m.id, name: m.name, email: m.email, topic: m.topic, message: m.message,
        status: m.status, emailed: m.emailed,
        ipAddress: m.ip_address, userAgent: m.user_agent,
        receivedAt: m.created_at, handledAt: m.handled_at, handledBy: m.handled_by_name,
      })),
      counts: Object.fromEntries(counts.rows.map(r => [r.status, r.n])),
    })
  } catch (err) { next(err) }
})

router.patch('/contact-messages/:id',
  [param('id').isUUID(), body('status').isIn(['new', 'read', 'handled'])],
  validate,
  async (req, res, next) => {
    try {
      const handled = req.body.status === 'handled'
      const r = await query(
        `UPDATE contact_messages
            SET status = $1,
                handled_by = ${handled ? '$2' : 'NULL'},
                handled_at = ${handled ? 'NOW()' : 'NULL'}
          WHERE id = $${handled ? '3' : '2'} RETURNING id`,
        handled ? [req.body.status, req.user.id, req.params.id] : [req.body.status, req.params.id]
      )
      if (!r.rows[0]) return res.status(404).json({ message: 'Message not found.' })
      res.json({ message: 'Updated.' })
    } catch (err) { next(err) }
  }
)

// ── KYC access log ──────────────────────────────────────────────────────────
// The compliance answer to "who looked at this person's record". Reads the
// snapshot columns so a deleted admin or a deleted subject still resolves.
function kycLogQuery(where, params) {
  return query(
    `SELECT a.id, a.action, a.detail, a.created_at, a.ip_address, a.user_agent,
            COALESCE(u.email, a.actor_email)   AS actor_email,
            COALESCE(u.name,  a.actor_email)   AS actor_name,
            (u.id IS NULL AND a.actor_email IS NOT NULL) AS actor_deleted,
            a.target_user_id,
            COALESCE(t.name,  a.target_name)   AS target_name,
            COALESCE(t.email, a.target_email)  AS target_email,
            (t.id IS NULL AND a.target_email IS NOT NULL) AS target_deleted
       FROM activity_log a
       LEFT JOIN users u ON a.actor_id = u.id
       LEFT JOIN users t ON a.target_user_id = t.id
      WHERE a.category = 'security' ${where}
      ORDER BY a.created_at DESC LIMIT 500`,
    params
  )
}

router.get('/kyc-access-log', async (req, res, next) => {
  try {
    const params = []
    let where = ''
    if (req.query.userId) { params.push(req.query.userId); where += ` AND a.target_user_id = $${params.length}` }
    if (req.query.action) { params.push(req.query.action); where += ` AND a.action = $${params.length}` }
    const result = await kycLogQuery(where, params)
    res.json({
      entries: result.rows.map(r => ({
        id: r.id, action: r.action, detail: r.detail, at: r.created_at,
        actorName: r.actor_name, actorEmail: r.actor_email, actorDeleted: r.actor_deleted,
        targetUserId: r.target_user_id, targetName: r.target_name, targetEmail: r.target_email,
        targetDeleted: r.target_deleted,
        ipAddress: r.ip_address, userAgent: r.user_agent,
      })),
    })
  } catch (err) { next(err) }
})

router.get('/kyc-access-log/export', async (req, res, next) => {
  try {
    const result = await kycLogQuery('', [])
    const csv = toCsv(
      result.rows.map(r => ({
        ...r,
        actor: r.actor_email || 'unknown',
        actor_state: r.actor_deleted ? 'account deleted' : 'active',
        target: r.target_email || r.target_name || '—',
        target_state: r.target_deleted ? 'account deleted' : 'active',
      })),
      [
        { key: 'created_at', label: 'When', date: true },
        { key: 'action', label: 'Event' },
        { key: 'actor', label: 'Admin' }, { key: 'actor_state', label: 'Admin Account' },
        { key: 'target', label: 'Subject' }, { key: 'target_state', label: 'Subject Account' },
        { key: 'ip_address', label: 'IP Address' }, { key: 'user_agent', label: 'Device' },
        { key: 'detail', label: 'Detail' },
      ]
    )
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="feazimove-kyc-access-log.csv"')
    res.send('﻿' + csv)
  } catch (err) { next(err) }
})

module.exports = router
