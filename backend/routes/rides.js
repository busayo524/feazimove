const express  = require('express')
const { body, param } = require('express-validator')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const router = express.Router()

// All ride routes require authentication
router.use(requireAuth)

// ── Book a ride ───────────────────────────────────────────────────────────────
router.post('/',
  requireRole('rider'),
  [
    body('pickup').trim().isLength({ min: 3, max: 200 }).escape(),
    body('destination').trim().isLength({ min: 3, max: 200 }).escape(),
    body('type').isIn(['pool', 'send']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { pickup, destination, type } = req.body

      // Prevent same pickup/destination
      if (pickup.toLowerCase() === destination.toLowerCase()) {
        return res.status(422).json({ message: 'Pickup and destination cannot be the same.' })
      }

      // Estimate fare (kobo) — real implementation uses distance matrix API
      const fareKobo = type === 'pool' ? 45000 : 70000 // ₦450 / ₦700

      // Check wallet balance before booking
      const userRes = await query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id])
      if (userRes.rows[0].wallet_balance < fareKobo) {
        return res.status(402).json({ message: 'Insufficient wallet balance. Please top up and try again.' })
      }

      const result = await query(
        'INSERT INTO rides (rider_id, type, pickup, destination, fare_kobo, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [req.user.id, type, pickup, destination, fareKobo, 'pending']
      )

      res.status(201).json({ ride: sanitizeRide(result.rows[0]) })
    } catch (err) { next(err) }
  }
)

// ── Get ride by ID ────────────────────────────────────────────────────────────
router.get('/:rideId',
  [param('rideId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT r.*,
          u.name AS driver_name, u.phone AS driver_phone, u.rating AS driver_rating
          FROM rides r
          LEFT JOIN users u ON r.driver_id = u.id
          WHERE r.id = $1 AND (r.rider_id = $2 OR r.driver_id = $2)`,
        [req.params.rideId, req.user.id]
      )

      if (!result.rows[0]) return res.status(404).json({ message: 'Ride not found.' })

      const row = result.rows[0]
      res.json({
        ride: {
          ...sanitizeRide(row),
          driver: row.driver_name ? {
            name:   row.driver_name,
            phone:  row.driver_phone,
            rating: row.driver_rating,
          } : null,
        },
      })
    } catch (err) { next(err) }
  }
)

// ── Get ride status ───────────────────────────────────────────────────────────
router.get('/:rideId/status',
  [param('rideId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        'SELECT status FROM rides WHERE id = $1 AND (rider_id = $2 OR driver_id = $2)',
        [req.params.rideId, req.user.id]
      )
      if (!result.rows[0]) return res.status(404).json({ message: 'Ride not found.' })
      res.json({ status: result.rows[0].status })
    } catch (err) { next(err) }
  }
)

// ── Cancel ride ───────────────────────────────────────────────────────────────
router.patch('/:rideId/cancel',
  [param('rideId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `UPDATE rides SET status = 'cancelled'
          WHERE id = $1 AND rider_id = $2 AND status IN ('pending', 'driver_assigned')
          RETURNING id`,
        [req.params.rideId, req.user.id]
      )
      if (!result.rows[0]) return res.status(400).json({ message: 'Cannot cancel this ride.' })
      res.json({ message: 'Ride cancelled.' })
    } catch (err) { next(err) }
  }
)

// ── Driver accepts ride ───────────────────────────────────────────────────────
router.post('/:rideId/accept',
  requireRole('driver'),
  [param('rideId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `UPDATE rides SET driver_id = $1, status = 'driver_assigned'
          WHERE id = $2 AND status = 'pending' AND driver_id IS NULL
          RETURNING id`,
        [req.user.id, req.params.rideId]
      )
      if (!result.rows[0]) return res.status(409).json({ message: 'Ride no longer available.' })
      res.json({ message: 'Ride accepted.' })
    } catch (err) { next(err) }
  }
)

// ── Update ride status (driver) ───────────────────────────────────────────────
router.patch('/:rideId/status',
  requireRole('driver'),
  [
    param('rideId').isUUID(),
    body('status').isIn(['arrived_pickup', 'in_transit', 'completed']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status } = req.body
      const extra = status === 'completed' ? ', completed_at = NOW()' : ''
      const result = await query(
        `UPDATE rides SET status = $1 ${extra} WHERE id = $2 AND driver_id = $3 RETURNING id, fare_kobo, rider_id`,
        [status, req.params.rideId, req.user.id]
      )

      if (!result.rows[0]) return res.status(404).json({ message: 'Ride not found.' })

      // On completion: deduct from rider, credit driver
      if (status === 'completed') {
        const { fare_kobo, rider_id } = result.rows[0]
        await query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [fare_kobo, rider_id])
        await query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [Math.round(fare_kobo * 0.8), req.user.id]) // 80% to driver

        // Record wallet transactions
        await query(
          'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description) VALUES ($1, $2, $3, $4)',
          [rider_id, 'debit', fare_kobo, `FeaziMove ride — ${result.rows[0].id.slice(0,8)}`]
        )
        await query(
          'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description) VALUES ($1, $2, $3, $4)',
          [req.user.id, 'credit', Math.round(fare_kobo * 0.8), `Ride earnings — ${result.rows[0].id.slice(0,8)}`]
        )
      }

      res.json({ message: 'Status updated.' })
    } catch (err) { next(err) }
  }
)

// ── Trip history ──────────────────────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, type, pickup, destination, fare_kobo, status, created_at
        FROM rides WHERE rider_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    res.json({ rides: result.rows.map(sanitizeRide) })
  } catch (err) { next(err) }
})

// ── Rate a ride ───────────────────────────────────────────────────────────────
router.post('/:rideId/rate',
  [
    param('rideId').isUUID(),
    body('driverRating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 300 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { driverRating, comment } = req.body
      const { rideId } = req.params

      // Verify ride belongs to this rider and is completed
      const ride = await query(
        'SELECT driver_id FROM rides WHERE id = $1 AND rider_id = $2 AND status = $3',
        [rideId, req.user.id, 'completed']
      )
      if (!ride.rows[0]) return res.status(400).json({ message: 'Cannot rate this ride.' })

      await query(
        'INSERT INTO ratings (ride_id, rater_id, ratee_id, stars, comment) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [rideId, req.user.id, ride.rows[0].driver_id, driverRating, comment || null]
      )

      // Update driver average rating
      await query(
        `UPDATE users SET rating = (
          SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings WHERE ratee_id = $1
        ) WHERE id = $1`,
        [ride.rows[0].driver_id]
      )

      res.json({ message: 'Rating submitted. Thank you!' })
    } catch (err) { next(err) }
  }
)

function sanitizeRide(row) {
  return {
    id:          row.id,
    type:        row.type,
    pickup:      row.pickup,
    destination: row.destination,
    fare:        Math.round((row.fare_kobo || 0) / 100), // kobo → naira
    status:      row.status,
    date:        row.created_at ? new Date(row.created_at).toLocaleDateString('en-NG', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '',
  }
}

module.exports = router
