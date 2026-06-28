const express = require('express')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { body } = require('express-validator')
const { validate } = require('../middleware/validate')

const router = express.Router()
router.use(requireAuth, requireRole('driver'))

// ── Driver stats ──────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [earningsRes, tripsRes, ratingRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(amount_kobo), 0) AS total
          FROM wallet_transactions
          WHERE user_id = $1 AND type = 'credit'
            AND created_at >= NOW() - INTERVAL '1 day'`,
        [req.user.id]
      ),
      query(
        `SELECT COUNT(*) AS count FROM rides
          WHERE driver_id = $1 AND status = 'completed'
            AND completed_at >= NOW() - INTERVAL '1 day'`,
        [req.user.id]
      ),
      query('SELECT rating FROM users WHERE id = $1', [req.user.id]),
    ])

    res.json({
      todayEarnings: Math.round(earningsRes.rows[0].total / 100),
      tripsToday:    parseInt(tripsRes.rows[0].count, 10),
      rating:        ratingRes.rows[0]?.rating || 5.0,
      hoursOnline:   0, // tracked via driver_sessions table in production
    })
  } catch (err) { next(err) }
})

// ── Available ride requests ───────────────────────────────────────────────────
router.get('/requests', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.id, r.type, r.pickup, r.destination, r.fare_kobo,
              COUNT(sub.id) AS riders
        FROM rides r
        LEFT JOIN rides sub ON sub.pickup = r.pickup AND sub.destination = r.destination AND sub.status = 'pending'
        WHERE r.status = 'pending' AND r.driver_id IS NULL
        GROUP BY r.id
        ORDER BY r.created_at ASC
        LIMIT 10`,
      []
    )

    res.json({
      requests: result.rows.map(r => ({
        id:          r.id,
        type:        r.type,
        pickup:      r.pickup,
        destination: r.destination,
        fare:        Math.round(r.fare_kobo / 100),
        riders:      Math.min(parseInt(r.riders, 10), 3),
        pickupEta:   '3 min',  // real: calculate from driver location
        distance:    '12 km',  // real: distance matrix API
      })),
    })
  } catch (err) { next(err) }
})

// ── Get current online status ─────────────────────────────────────────────────
router.get('/status', async (req, res, next) => {
  try {
    const result = await query('SELECT is_online FROM users WHERE id = $1', [req.user.id])
    res.json({ online: result.rows[0]?.is_online || false })
  } catch (err) { next(err) }
})

// ── Toggle online status — drivers are only matchable while online ───────────
router.patch('/status',
  [body('online').isBoolean()],
  validate,
  async (req, res, next) => {
    try {
      const { online } = req.body
      await query('UPDATE users SET is_online = $1 WHERE id = $2', [online, req.user.id])

      // Going offline ends any live route immediately — riders can no longer match it
      if (!online) {
        await query(
          `UPDATE driver_availability SET status = 'cancelled'
           WHERE driver_id = $1 AND status IN ('waiting', 'active')`,
          [req.user.id]
        )
      }

      res.json({ online, message: `You are now ${online ? 'online' : 'offline'}.` })
    } catch (err) { next(err) }
  }
)

// Fixed business rule: morning pickups are mainland stops, evening pickups
// are island stops (mirrors the dropdown direction in BookRide.jsx/DriverDashboard.jsx).
const PICKUP_GROUP_FOR_PERIOD = { morning: 'mainland', evening: 'island' }

// Walks forward through the pickup chain (by chain_position within the
// driver's pickup group) and returns the next stop that also has an active
// priced route to the given dropoff — stops and routes are decoupled, so a
// stop can exist without every pairing being priced. Read-only; the caller
// decides whether to actually move the driver's availability there.
async function findNextPickup(period, currentPickup, dropoff) {
  const group = PICKUP_GROUP_FOR_PERIOD[period]
  const currentStop = await query(
    'SELECT chain_position FROM stops WHERE name = $1 AND group_name = $2',
    [currentPickup, group]
  )
  if (!currentStop.rows[0]) return null

  const candidates = await query(
    `SELECT name FROM stops WHERE group_name = $1 AND chain_position > $2 AND is_active = true
     ORDER BY chain_position ASC`,
    [group, currentStop.rows[0].chain_position]
  )
  for (const candidate of candidates.rows) {
    const routeCheck = await query(
      `SELECT 1 FROM routes WHERE period = $1 AND pickup = $2 AND dropoff = $3 AND is_active = true`,
      [period, candidate.name, dropoff]
    )
    if (routeCheck.rows[0]) return candidate.name
  }
  return null
}

// ── Go live on a route ────────────────────────────────────────────────────────
router.post('/go-live',
  [
    body('period').isIn(['morning', 'evening']),
    body('timeSlot').trim().notEmpty().isLength({ max: 20 }).escape(),
    body('pickup').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('dropoff').trim().notEmpty().isLength({ max: 100 }).escape(),
    body('seats').isInt({ min: 1, max: 8 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { period, timeSlot, pickup, dropoff, seats } = req.body

      // Reject any pair that isn't an active, priced route (previously only
      // checked pickup against a flat list — dropoff was never validated)
      const routeCheck = await query(
        `SELECT 1 FROM routes WHERE period = $1 AND pickup = $2 AND dropoff = $3 AND is_active = true`,
        [period, pickup, dropoff]
      )
      if (!routeCheck.rows[0]) {
        return res.status(422).json({ message: 'That route is not currently available.' })
      }

      const onlineCheck = await query('SELECT is_online FROM users WHERE id = $1', [req.user.id])
      if (!onlineCheck.rows[0]?.is_online) {
        return res.status(409).json({ message: 'Go online before setting a route.' })
      }

      // Cancel any existing active session for this driver — including a stale
      // 'in_progress' one left behind by a completed trip, so it never piles up
      await query(
        `UPDATE driver_availability SET status = 'cancelled'
         WHERE driver_id = $1 AND status IN ('waiting','active','in_progress')`,
        [req.user.id]
      )

      const result = await query(
        `INSERT INTO driver_availability (driver_id, period, time_slot, pickup, dropoff, seats)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.user.id, period, timeSlot, pickup, dropoff, seats]
      )

      res.status(201).json({ availabilityId: result.rows[0].id })
    } catch (err) { next(err) }
  }
)

// ── Poll for matched riders ───────────────────────────────────────────────────
router.get('/matches', async (req, res, next) => {
  try {
    const { availabilityId } = req.query
    if (!availabilityId) return res.status(422).json({ message: 'availabilityId required.' })

    // Verify this availability belongs to the requesting driver
    const avail = await query(
      `SELECT id, period, time_slot, pickup, dropoff, seats
       FROM driver_availability WHERE id = $1 AND driver_id = $2`,
      [availabilityId, req.user.id]
    )
    if (!avail.rows[0]) return res.status(404).json({ message: 'Availability not found.' })
    const a = avail.rows[0]

    // Find pending riders on the exact same route + time
    const matches = await query(
      `SELECT rb.id, rb.pickup, rb.dropoff, rb.service, rb.created_at,
              u.name AS rider_name, u.phone AS rider_phone, u.rating AS rider_rating
       FROM rider_bookings rb
       JOIN users u ON rb.rider_id = u.id
       WHERE rb.period   = $1
         AND rb.time_slot = $2
         AND rb.pickup    = $3
         AND rb.dropoff   = $4
         AND rb.status    = 'pending'
         AND rb.rider_id != $5
       ORDER BY rb.created_at ASC
       LIMIT $6`,
      [a.period, a.time_slot, a.pickup, a.dropoff, req.user.id, a.seats]
    )

    res.json({
      count: matches.rows.length,
      pickup: a.pickup,
      matches: matches.rows.map(r => ({
        id:          r.id,
        pickup:      r.pickup,
        dropoff:     r.dropoff,
        service:     r.service,
        riderName:   r.rider_name,
        riderRating: parseFloat(r.rider_rating) || 5.0,
        waitingSince: new Date(r.created_at).toLocaleTimeString('en-NG', {
          hour: '2-digit', minute: '2-digit',
        }),
      })),
    })
  } catch (err) { next(err) }
})

// ── Peek at the next chain stop without moving there (for UI preview) ────────
router.get('/next-pickup', async (req, res, next) => {
  try {
    const { availabilityId } = req.query
    if (!availabilityId) return res.status(422).json({ message: 'availabilityId required.' })

    const avail = await query(
      `SELECT period, pickup, dropoff FROM driver_availability
       WHERE id = $1 AND driver_id = $2 AND status IN ('waiting','active')`,
      [availabilityId, req.user.id]
    )
    if (!avail.rows[0]) return res.status(404).json({ message: 'Active session not found.' })
    const a = avail.rows[0]

    const newPickup = await findNextPickup(a.period, a.pickup, a.dropoff)
    res.json({ newPickup })
  } catch (err) { next(err) }
})

// ── Actually move to the next location in the chain ───────────────────────────
router.post('/expand-pickup',
  [body('availabilityId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { availabilityId } = req.body

      const avail = await query(
        `SELECT period, pickup, dropoff FROM driver_availability
         WHERE id = $1 AND driver_id = $2 AND status IN ('waiting','active')`,
        [availabilityId, req.user.id]
      )
      if (!avail.rows[0]) return res.status(404).json({ message: 'Active session not found.' })
      const a = avail.rows[0]

      const newPickup = await findNextPickup(a.period, a.pickup, a.dropoff)
      if (!newPickup) return res.json({ newPickup: null, endOfChain: true })

      await query(
        `UPDATE driver_availability SET pickup = $1
         WHERE id = $2 AND driver_id = $3 AND status IN ('waiting','active')`,
        [newPickup, availabilityId, req.user.id]
      )

      res.json({ availabilityId, newPickup })
    } catch (err) { next(err) }
  }
)

// ── Confirm a matched route: create a real ride and start the trip ───────────
router.post('/confirm-route',
  [body('availabilityId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { availabilityId } = req.body

      const avail = await query(
        `SELECT id, period, time_slot, pickup, dropoff, status
         FROM driver_availability WHERE id = $1 AND driver_id = $2`,
        [availabilityId, req.user.id]
      )
      if (!avail.rows[0]) return res.status(404).json({ message: 'Availability not found.' })
      const a = avail.rows[0]
      if (!['waiting', 'active'].includes(a.status)) {
        return res.status(409).json({ message: 'This route is no longer active.' })
      }

      // Re-derive the oldest still-pending matched rider on this exact route + time
      // (same matching logic as GET /driver/matches)
      const match = await query(
        `SELECT id, rider_id, service, quoted_fare_kobo,
                recipient_name, recipient_phone, package_size, notes
         FROM rider_bookings
         WHERE period = $1 AND time_slot = $2 AND pickup = $3 AND dropoff = $4
           AND status = 'pending' AND rider_id != $5
         ORDER BY created_at ASC LIMIT 1`,
        [a.period, a.time_slot, a.pickup, a.dropoff, req.user.id]
      )
      if (!match.rows[0]) return res.status(409).json({ message: 'No riders currently matched on this route.' })
      const m = match.rows[0]

      // Fare was quoted and locked in at book-intent time — never re-looked-up
      // here, so an admin price edit after booking never changes what's charged.
      // A null here means this booking predates the quoted-fare column (made
      // before this rollout) — reject rather than silently charging nothing.
      if (m.quoted_fare_kobo == null) {
        return res.status(409).json({ message: 'This booking is outdated. Please ask the rider to book again.' })
      }
      const fareKobo = m.quoted_fare_kobo
      const rideType = m.service === 'send' ? 'send' : 'pool'

      const ride = await query(
        `INSERT INTO rides
          (rider_id, driver_id, type, pickup, destination, fare_kobo, status,
           recipient_name, recipient_phone, package_size, notes)
         VALUES ($1, $2, $3, $4, $5, $6, 'driver_assigned', $7, $8, $9, $10) RETURNING id`,
        [m.rider_id, req.user.id, rideType, a.pickup, a.dropoff, fareKobo,
         m.recipient_name, m.recipient_phone, m.package_size, m.notes]
      )

      await query(`UPDATE rider_bookings SET status = 'matched' WHERE id = $1`, [m.id])
      await query(`UPDATE driver_availability SET status = 'in_progress' WHERE id = $1`, [availabilityId])

      res.status(201).json({ rideId: ride.rows[0].id })
    } catch (err) { next(err) }
  }
)

// ── Go offline / cancel session ───────────────────────────────────────────────
router.post('/go-offline',
  [body('availabilityId').optional().isUUID()],
  validate,
  async (req, res, next) => {
    try {
      if (req.body.availabilityId) {
        await query(
          `UPDATE driver_availability SET status = 'cancelled'
           WHERE id = $1 AND driver_id = $2`,
          [req.body.availabilityId, req.user.id]
        )
      }
      res.json({ message: 'You are now offline.' })
    } catch (err) { next(err) }
  }
)

// ── Earnings history ──────────────────────────────────────────────────────────
router.get('/earnings', async (req, res, next) => {
  try {
    const period = req.query.period || 'This Week'
    const intervals = {
      'This Week':  '7 days',
      'This Month': '30 days',
      'All Time':   '3650 days',
    }
    const interval = intervals[period] || '7 days'

    const [totalRes, tripsRes, ratingRes, dailyRes, payoutRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(amount_kobo),0) AS total FROM wallet_transactions
          WHERE user_id=$1 AND type='credit' AND created_at >= NOW() - INTERVAL '${interval}'`,
        [req.user.id]
      ),
      query(
        `SELECT COUNT(*) AS count FROM rides
          WHERE driver_id=$1 AND status='completed' AND completed_at >= NOW() - INTERVAL '${interval}'`,
        [req.user.id]
      ),
      query('SELECT rating FROM users WHERE id=$1', [req.user.id]),
      query(
        `SELECT DATE(created_at) AS day, SUM(amount_kobo) AS amount
          FROM wallet_transactions
          WHERE user_id=$1 AND type='credit' AND created_at >= NOW() - INTERVAL '7 days'
          GROUP BY day ORDER BY day`,
        [req.user.id]
      ),
      query(
        `SELECT id, amount_kobo, created_at FROM wallet_transactions
          WHERE user_id=$1 AND type='credit' AND description ILIKE '%payout%'
          ORDER BY created_at DESC LIMIT 10`,
        [req.user.id]
      ),
    ])

    const total = parseInt(totalRes.rows[0].total, 10)
    const trips = parseInt(tripsRes.rows[0].count, 10)
    const maxAmt = Math.max(...dailyRes.rows.map(r => parseInt(r.amount, 10)), 1)

    res.json({
      totalEarned: Math.round(total / 100),
      totalTrips:  trips,
      avgPerTrip:  trips > 0 ? Math.round(total / trips / 100) : 0,
      rating:      ratingRes.rows[0]?.rating || 5.0,
      daily:       dailyRes.rows.map(r => ({
        day:    new Date(r.day).toLocaleDateString('en-NG', { weekday: 'short' }),
        amount: Math.round(parseInt(r.amount, 10) / 100),
        max:    Math.round(maxAmt / 100),
      })),
      payouts: payoutRes.rows.map(p => ({
        id:     p.id,
        amount: Math.round(p.amount_kobo / 100),
        date:   new Date(p.created_at).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      })),
    })
  } catch (err) { next(err) }
})

// ── Push live GPS position while on an active ride, for the rider to track ────
router.patch('/location',
  [
    body('lat').isFloat({ min: -90, max: 90 }),
    body('lng').isFloat({ min: -180, max: 180 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { lat, lng } = req.body
      const result = await query(
        `UPDATE rides SET driver_lat = $1, driver_lng = $2, driver_location_updated_at = NOW()
          WHERE driver_id = $3 AND status IN ('pending', 'driver_assigned', 'arrived_pickup', 'in_transit')
          RETURNING id`,
        [lat, lng, req.user.id]
      )
      res.json({ updated: result.rows.length > 0 })
    } catch (err) { next(err) }
  }
)

module.exports = router
