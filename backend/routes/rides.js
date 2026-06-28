const express  = require('express')
const { body, param } = require('express-validator')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const router = express.Router()

// All ride routes require authentication
router.use(requireAuth)

// ── Rider registers their route intent for driver matching ────────────────────
router.post('/book-intent',
  [
    body('period').isIn(['morning', 'evening']),
    body('timeSlot').trim().notEmpty().isLength({ max: 20 }).escape(),
    body('pickup').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('dropoff').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('service').isIn(['pool', 'solo', 'send']),
    // Only required/validated when sending a package — same route structure
    // as a ride, just with a recipient instead of a second rider.
    body('recipientName').if(body('service').equals('send')).trim().notEmpty().isLength({ max: 100 }).escape(),
    body('recipientPhone').if(body('service').equals('send')).trim().notEmpty().isLength({ max: 20 }).escape(),
    body('packageSize').if(body('service').equals('send')).isIn(['sm', 'md', 'lg']),
    body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { period, timeSlot, pickup, dropoff, service, recipientName, recipientPhone, packageSize, notes } = req.body

      if (pickup === dropoff) {
        return res.status(422).json({ message: 'Pickup and drop-off cannot be the same.' })
      }

      // Look up the active, priced route for this exact pair — this both
      // validates the pickup/dropoff (previously unchecked) and gives us the
      // fare to quote. The fare is locked in now, not re-looked-up later, so
      // an admin price edit after this point never changes what's charged.
      // Package sends are priced as a dedicated (solo) trip — there's no
      // separate package price table.
      const routeRes = await query(
        `SELECT pool_fare_kobo, solo_fare_kobo FROM routes
         WHERE period = $1 AND pickup = $2 AND dropoff = $3 AND is_active = true`,
        [period, pickup, dropoff]
      )
      const route = routeRes.rows[0]
      if (!route) {
        return res.status(422).json({ message: 'That route is not currently available.' })
      }
      const quotedFareKobo = service === 'pool' ? route.pool_fare_kobo : route.solo_fare_kobo

      // Cancel any existing pending intent for same period+slot (prevent duplicates)
      await query(
        `UPDATE rider_bookings SET status = 'cancelled'
         WHERE rider_id = $1 AND status = 'pending' AND period = $2 AND time_slot = $3`,
        [req.user.id, period, timeSlot]
      )

      const result = await query(
        `INSERT INTO rider_bookings
          (rider_id, period, time_slot, pickup, dropoff, service, quoted_fare_kobo,
           recipient_name, recipient_phone, package_size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [req.user.id, period, timeSlot, pickup, dropoff, service, quotedFareKobo,
         recipientName || null, recipientPhone || null, packageSize || null, notes || null]
      )

      res.status(201).json({ bookingId: result.rows[0].id, quotedFare: Math.round(quotedFareKobo / 100) })
    } catch (err) { next(err) }
  }
)

// ── Get my current active ride (driver or rider) ──────────────────────────────
router.get('/me/active', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id FROM rides
        WHERE (rider_id = $1 OR driver_id = $1)
          AND status IN ('pending', 'driver_assigned', 'arrived_pickup', 'in_transit')
        ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    )
    res.json({ rideId: result.rows[0]?.id || null })
  } catch (err) { next(err) }
})

// ── Get ride by ID ────────────────────────────────────────────────────────────
router.get('/:rideId',
  [param('rideId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `SELECT r.*,
          ud.name AS driver_name, ud.phone AS driver_phone, ud.rating AS driver_rating,
          ur.name AS rider_name,  ur.phone AS rider_phone,  ur.rating AS rider_rating
          FROM rides r
          LEFT JOIN users ud ON r.driver_id = ud.id
          LEFT JOIN users ur ON r.rider_id  = ur.id
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
          rider: row.rider_name ? {
            name:   row.rider_name,
            phone:  row.rider_phone,
            rating: row.rider_rating,
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

// ── Push the rider's live GPS position while on an active ride, symmetric to
// the driver's POST /driver/location, so the driver's map can show it too ────
router.patch('/:rideId/location',
  [
    param('rideId').isUUID(),
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { lat, lng } = req.body
      const result = await query(
        `UPDATE rides SET rider_lat = $1, rider_lng = $2, rider_location_updated_at = NOW()
          WHERE id = $3 AND rider_id = $4 AND status IN ('pending', 'driver_assigned', 'arrived_pickup', 'in_transit')
          RETURNING id`,
        [lat, lng, req.params.rideId, req.user.id]
      )
      res.json({ updated: result.rows.length > 0 })
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

// ── Ride chat: list messages ──────────────────────────────────────────────────
router.get('/:rideId/messages',
  [param('rideId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      // Only a participant (rider or driver) on this ride may read its messages
      const ride = await query(
        'SELECT id FROM rides WHERE id = $1 AND (rider_id = $2 OR driver_id = $2)',
        [req.params.rideId, req.user.id]
      )
      if (!ride.rows[0]) return res.status(404).json({ message: 'Ride not found.' })

      const result = await query(
        `SELECT m.id, m.sender_id, m.body, m.created_at
          FROM ride_messages m
          WHERE m.ride_id = $1
          ORDER BY m.created_at ASC
          LIMIT 200`,
        [req.params.rideId]
      )

      res.json({
        messages: result.rows.map(m => ({
          id:       m.id,
          body:     m.body,
          mine:     m.sender_id === req.user.id,
          time:     new Date(m.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
        })),
      })
    } catch (err) { next(err) }
  }
)

// ── Ride chat: send a message ─────────────────────────────────────────────────
router.post('/:rideId/messages',
  [
    param('rideId').isUUID(),
    body('body').trim().isLength({ min: 1, max: 1000 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const ride = await query(
        'SELECT id FROM rides WHERE id = $1 AND (rider_id = $2 OR driver_id = $2)',
        [req.params.rideId, req.user.id]
      )
      if (!ride.rows[0]) return res.status(404).json({ message: 'Ride not found.' })

      const result = await query(
        `INSERT INTO ride_messages (ride_id, sender_id, body)
          VALUES ($1, $2, $3) RETURNING id, body, created_at`,
        [req.params.rideId, req.user.id, req.body.body]
      )

      const m = result.rows[0]
      res.status(201).json({
        message: {
          id:   m.id,
          body: m.body,
          mine: true,
          time: new Date(m.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
        },
      })
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
    driverLocation: (row.driver_lat != null && row.driver_lng != null)
      ? { lat: parseFloat(row.driver_lat), lng: parseFloat(row.driver_lng), updatedAt: row.driver_location_updated_at }
      : null,
    riderLocation: (row.rider_lat != null && row.rider_lng != null)
      ? { lat: parseFloat(row.rider_lat), lng: parseFloat(row.rider_lng), updatedAt: row.rider_location_updated_at }
      : null,
    recipientName:  row.recipient_name  || null,
    recipientPhone: row.recipient_phone || null,
    packageSize:    row.package_size    || null,
    notes:          row.notes           || null,
  }
}

module.exports = router
