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
            id_type, id_number, vehicle_type, vehicle_make, vehicle_model, plate_number, vehicle_year
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
    plateNumber: user.plate_number, vehicleYear: user.vehicle_year,
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
      `SELECT id, name, email, phone, role, active_role, can_ride, can_drive, is_active, created_at
       FROM users ORDER BY created_at DESC`
    )
    res.json({
      users: result.rows.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        role: u.active_role || u.role, canRide: u.can_ride, canDrive: u.can_drive,
        isActive: u.is_active, joinedAt: u.created_at,
      })),
    })
  } catch (err) { next(err) }
})

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

// ── Suspend / reactivate or delete any user ───────────────────────────────────
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
    const [walletTotal, pendingPayouts, revenue, txns] = await Promise.all([
      query("SELECT COALESCE(SUM(wallet_balance),0) s FROM users"),
      query("SELECT COALESCE(SUM(amount_kobo),0) s FROM payout_requests WHERE status = 'pending'"),
      // Platform keeps 20% of every completed ride's fare (drivers are paid 80% — see rides.js)
      query("SELECT COALESCE(SUM(fare_kobo),0) s FROM rides WHERE status = 'completed'"),
      query(
        `SELECT t.id, t.type, t.amount_kobo, t.description, t.created_at, u.name AS user_name
         FROM wallet_transactions t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC LIMIT 25`
      ),
    ])

    res.json({
      totalWalletBalance: fmt(walletTotal.rows[0].s),
      pendingPayouts: fmt(pendingPayouts.rows[0].s),
      platformRevenue: Math.round(fmt(revenue.rows[0].s) * 0.2),
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

module.exports = router
