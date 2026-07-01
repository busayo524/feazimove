const express  = require('express')
const path     = require('path')
const fs       = require('fs')
const bcrypt   = require('bcryptjs')
const crypto   = require('crypto')
const { body, param } = require('express-validator')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { UPLOAD_DIR } = require('../middleware/upload')

const router = express.Router()
const SALT_ROUNDS = 12

router.use(requireAuth, requireRole('admin'))

function fmt(kobo) { return Math.round((kobo || 0) / 100) }

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

// ── Riders: list ───────────────────────────────────────────────────────────────
router.get('/riders', async (req, res, next) => {
  try {
    const search = `%${(req.query.search || '').trim()}%`
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.wallet_balance, u.rating, u.is_active, u.created_at,
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
      `SELECT u.id, u.name, u.email, u.phone, u.wallet_balance, u.rating, u.is_active, u.is_online,
              u.vehicle_make, u.vehicle_model, u.plate_number, u.created_at,
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
            id_type, id_number, vehicle_type, vehicle_make, vehicle_model, plate_number, vehicle_year, vehicle_color
     FROM users WHERE id = $1`,
    [userId]
  )
  const user = userRes.rows[0]
  if (!user) return null

  const [docsRes, ridesRes] = await Promise.all([
    query('SELECT id, doc_type, uploaded_at FROM user_documents WHERE user_id = $1 ORDER BY uploaded_at DESC', [userId]),
    query(
      `SELECT id, type, pickup, destination, fare_kobo, status, created_at
       FROM rides WHERE ${ridesClause} = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    ),
  ])

  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    role: user.role, activeRole: user.active_role,
    canRide: user.can_ride, canDrive: user.can_drive,
    walletBalance: fmt(user.wallet_balance), rating: user.rating,
    isActive: user.is_active, isOnline: user.is_online, joinedAt: user.created_at,
    idType: user.id_type, idNumber: user.id_number,
    vehicleType: user.vehicle_type, vehicleMake: user.vehicle_make, vehicleModel: user.vehicle_model,
    plateNumber: user.plate_number, vehicleYear: user.vehicle_year, vehicleColor: user.vehicle_color,
    documents: docsRes.rows.map(d => ({ id: d.id, type: d.doc_type, uploadedAt: d.uploaded_at })),
    rides: ridesRes.rows.map(r => ({
      id: r.id, type: r.type, pickup: r.pickup, destination: r.destination,
      fare: fmt(r.fare_kobo), status: r.status, date: r.created_at,
    })),
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

      const filePath = path.join(UPLOAD_DIR, path.basename(doc.file_path)) // basename — defeats path traversal
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk.' })
      res.sendFile(filePath)
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
              (SELECT d.id FROM user_documents d WHERE d.user_id = u.id
                 AND d.doc_type IN ('selfie','profilePhoto')
                 ORDER BY d.uploaded_at DESC LIMIT 1) AS profile_doc_id
       FROM users u ORDER BY u.created_at DESC`
    )
    res.json({
      users: result.rows.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        role: u.active_role || u.role, canRide: u.can_ride, canDrive: u.can_drive,
        isActive: u.is_active, isPending: u.is_pending,
        rating: u.rating ? parseFloat(u.rating) : null,
        tripCount: parseInt(u.trip_count, 10),
        joinedAt: u.created_at,
        profileDocId: u.profile_doc_id || null,
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
                  id_type, id_number,
                  vehicle_type, vehicle_make, vehicle_model, plate_number, vehicle_year, vehicle_color
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
          role: u.active_role || u.role, canRide: u.can_ride, canDrive: u.can_drive,
          isActive: u.is_active, isPending: u.is_pending,
          rating: u.rating ? parseFloat(u.rating) : null,
          walletBalance: fmt(u.wallet_balance),
          joinedAt: u.created_at,
          idType: u.id_type, idNumber: u.id_number,
          vehicleType: u.vehicle_type, vehicleMake: u.vehicle_make,
          vehicleModel: u.vehicle_model, plateNumber: u.plate_number,
          vehicleYear: u.vehicle_year, vehicleColor: u.vehicle_color,
          profileDocId: docsRes.rows.find(d => d.doc_type === 'selfie' || d.doc_type === 'profilePhoto')?.id || null,
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

// ── Create a new admin/staff user ─────────────────────────────────────────────
router.post('/users',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email } = req.body

      const existing = await query('SELECT id FROM users WHERE email = $1', [email])
      if (existing.rows[0]) {
        return res.status(409).json({ message: 'A user with that email already exists.' })
      }

      const password = crypto.randomBytes(16).toString('base64url').slice(0, 20)
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

      const result = await query(
        `INSERT INTO users (name, email, password_hash, role, active_role,
           is_active, is_pending, email_verified, force_password_change, can_ride, can_drive)
         VALUES ($1, $2, $3, 'admin', 'admin', true, false, true, true, false, false)
         RETURNING id, name, email, created_at`,
        [name, email, passwordHash]
      )

      // Returned once — never stored or logged elsewhere
      res.status(201).json({ user: result.rows[0], temporaryPassword: password })
    } catch (err) { next(err) }
  }
)

// ── Approve a pending user registration ───────────────────────────────────────
router.patch('/users/:id/approve',
  [param('id').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const userRes = await query('SELECT id, role FROM users WHERE id = $1', [req.params.id])
      if (!userRes.rows[0]) return res.status(404).json({ message: 'User not found.' })
      const { role } = userRes.rows[0]
      await query(
        `UPDATE users
         SET is_active = true, is_pending = false,
             can_ride  = CASE WHEN role IN ('rider','admin') THEN true ELSE can_ride END,
             can_drive = CASE WHEN role = 'driver' THEN true ELSE can_drive END
         WHERE id = $1`,
        [req.params.id]
      )
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
        'UPDATE users SET is_active = false, is_pending = false WHERE id = $1 RETURNING id',
        [req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
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
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id',
        [req.body.isActive, req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'User not found.' })
      res.json({ message: req.body.isActive ? 'User reactivated.' : 'User suspended.' })
    } catch (err) { next(err) }
  }
)

// ── Payments overview ───────────────────────────────────────────────────────────
router.get('/payments', async (req, res, next) => {
  try {
    const [walletTotal, pendingPayouts, revenue, txns, feeRes] = await Promise.all([
      query("SELECT COALESCE(SUM(wallet_balance),0) s FROM users"),
      query("SELECT COALESCE(SUM(amount_kobo),0) s FROM payout_requests WHERE status = 'pending'"),
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status = 'completed'"),
      query(
        `SELECT t.id, t.type, t.amount_kobo, t.description, t.created_at, u.name AS user_name
         FROM wallet_transactions t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC LIMIT 25`
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
      transactions: txns.rows.map(t => ({
        id: t.id, type: t.type, amount: fmt(t.amount_kobo), description: t.description,
        userName: t.user_name, date: t.created_at,
      })),
    })
  } catch (err) { next(err) }
})

// ── Driver payout requests ──────────────────────────────────────────────────────
router.get('/payouts', async (req, res, next) => {
  try {
    const statusFilter = req.query.status || 'pending'
    const result = await query(
      `SELECT p.id, p.amount_kobo, p.status, p.requested_at, p.processed_at,
              u.id AS driver_id, u.name AS driver_name
       FROM payout_requests p
       JOIN users u ON p.driver_id = u.id
       ${statusFilter !== 'all' ? 'WHERE p.status = $1' : ''}
       ORDER BY p.requested_at DESC LIMIT 50`,
      statusFilter !== 'all' ? [statusFilter] : []
    )
    res.json({
      payouts: result.rows.map(p => ({
        id: p.id, amount: fmt(p.amount_kobo), status: p.status,
        driverId: p.driver_id, driverName: p.driver_name,
        requestedAt: p.requested_at, processedAt: p.processed_at,
      })),
    })
  } catch (err) { next(err) }
})

router.post('/payouts/:id/approve',
  [param('id').isUUID()], validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `UPDATE payout_requests SET status = 'approved', processed_at = NOW(), processed_by = $1
         WHERE id = $2 AND status = 'pending' RETURNING id`,
        [req.user.id, req.params.id]
      )
      if (!result.rows[0]) return res.status(409).json({ message: 'This request is no longer pending.' })
      res.json({ message: 'Payout approved.' })
    } catch (err) { next(err) }
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

      res.json({ message: 'Payout rejected and refunded to driver wallet.' })
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
    const [daily, weekly, monthly, series, routes, retention] = await Promise.all([
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
    ])

    const totalRoutes = routes.rows.reduce((s, r) => s + parseInt(r.cnt, 10), 0)
    const totalRiders = parseInt(retention.rows[0].total, 10)
    const repeatRiders = parseInt(retention.rows[0].repeat_riders, 10)

    res.json({
      dailyRevenue: Math.round(fmt(daily.rows[0].s) * 0.2),
      weeklyRevenue: Math.round(fmt(weekly.rows[0].s) * 0.2),
      monthlyRevenue: Math.round(fmt(monthly.rows[0].s) * 0.2),
      dailySeries: series.rows.map(r => ({ day: r.day, amount: Math.round(fmt(r.total) * 0.2) })),
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
function toCsv(rows, columns) {
  const header = columns.map(c => c.label).join(',')
  const lines = rows.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? ''
      const escaped = String(val).replace(/"/g, '""')
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params
    if (!['rides', 'transactions'].includes(type)) {
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
          { key:'created_at', label:'Created At' }, { key:'completed_at', label:'Completed At' },
        ]
      )
    } else {
      const result = await query(
        `SELECT t.id, t.type, t.amount_kobo, t.description, t.created_at, u.name AS user_name
         FROM wallet_transactions t JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC`
      )
      csv = toCsv(
        result.rows.map(t => ({ ...t, amount: fmt(t.amount_kobo) })),
        [
          { key:'id', label:'Transaction ID' }, { key:'user_name', label:'User' },
          { key:'type', label:'Type' }, { key:'amount', label:'Amount (NGN)' },
          { key:'description', label:'Description' }, { key:'created_at', label:'Date' },
        ]
      )
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="feazimove-${type}-export.csv"`)
    res.send(csv)
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
router.get('/stops', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, group_name, chain_position, lat, lng, is_active, created_at
       FROM stops ORDER BY group_name, chain_position`
    )
    res.json({
      stops: result.rows.map(s => ({
        id: s.id, name: s.name, group: s.group_name, chainPosition: s.chain_position,
        lat: s.lat != null ? Number(s.lat) : null, lng: s.lng != null ? Number(s.lng) : null,
        isActive: s.is_active, createdAt: s.created_at,
      })),
    })
  } catch (err) { next(err) }
})

router.post('/stops',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('group').isIn(['mainland', 'island']),
    body('chainPosition').isInt({ min: 0 }),
    body('lat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('lng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, group, chainPosition, lat, lng } = req.body
      const result = await query(
        `INSERT INTO stops (name, group_name, chain_position, lat, lng)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [name, group, chainPosition, lat || null, lng || null]
      )
      res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ message: 'A stop with that name or chain position already exists.' })
      next(err)
    }
  }
)

router.patch('/stops/:id',
  [
    param('id').isUUID(),
    body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 100 }).escape(),
    body('chainPosition').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('lat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
    body('lng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, chainPosition, lat, lng, isActive } = req.body
      const result = await query(
        `UPDATE stops SET
           name = COALESCE($1, name),
           chain_position = COALESCE($2, chain_position),
           lat = COALESCE($3, lat),
           lng = COALESCE($4, lng),
           is_active = COALESCE($5, is_active)
         WHERE id = $6 RETURNING id`,
        [name || null, chainPosition ?? null, lat ?? null, lng ?? null, isActive ?? null, req.params.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'Stop not found.' })
      res.json({ message: 'Stop updated.' })
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ message: 'That name or chain position is already in use.' })
      next(err)
    }
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
        poolFareKobo: Number(r.pool_fare_kobo), packageFareKobo: Number(r.package_fare_kobo),
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
    body('poolFareKobo').isInt({ min: 0 }),
    body('packageFareKobo').isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { period, pickup, dropoff, poolFareKobo, packageFareKobo } = req.body
      const result = await query(
        `INSERT INTO routes (period, pickup, dropoff, pool_fare_kobo, package_fare_kobo, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
        [period, pickup, dropoff, poolFareKobo, packageFareKobo, req.user.id]
      )
      res.status(201).json({ id: result.rows[0].id })
    } catch (err) {
      if (err.code === '23503') return res.status(422).json({ message: 'Pickup or dropoff is not a known stop.' })
      if (err.code === '23505') return res.status(409).json({ message: 'This route already exists for that period.' })
      next(err)
    }
  }
)

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
      res.json({ feePercent, message: 'Platform fee updated.' })
    } catch (err) { next(err) }
  }
)

module.exports = router
