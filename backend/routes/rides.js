const express  = require('express')
const fs = require('fs')
const path = require('path')
const { body, param } = require('express-validator')
const { query } = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { sendStored } = require('../services/fileStorage')
const analytics = require('../services/analytics')

const router = express.Router()

// All ride routes require authentication
router.use(requireAuth)

// ── Profile photo of someone you're actually matched/riding with ─────────────
// Not publicly accessible — only a driver↔rider pair who are currently
// matched (or have an actual ride together) can see each other's photo.
router.get('/avatar/:userId',
  [param('userId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const { userId } = req.params
      const linked = await query(
        `SELECT 1 WHERE EXISTS (
           SELECT 1 FROM rides
           WHERE (rider_id = $2 AND driver_id = $1) OR (driver_id = $2 AND rider_id = $1)
         ) OR EXISTS (
           SELECT 1 FROM rider_bookings rb
           JOIN driver_availability da ON da.driver_id = $1
             AND da.period = rb.period AND da.time_slot = rb.time_slot
             AND da.pickup = rb.pickup AND da.dropoff = rb.dropoff
           WHERE rb.rider_id = $2 AND rb.status IN ('pending', 'matched')
             AND da.status IN ('waiting', 'active', 'in_progress')
         )`,
        [req.user.id, userId]
      )
      if (!linked.rows[0]) return res.status(403).json({ message: 'Not authorized to view this photo.' })

      // Prefer the real profile photo set from the Profile page (works for
      // any user); fall back to whatever the driver registration wizard
      // collected, for accounts that set one that way and nothing since.
      const userRes = await query('SELECT avatar_path FROM users WHERE id = $1', [userId])
      let filename = userRes.rows[0]?.avatar_path

      if (!filename) {
        const doc = await query(
          `SELECT file_path FROM user_documents
            WHERE user_id = $1 AND doc_type IN ('selfie', 'profilePhoto')
            ORDER BY uploaded_at DESC LIMIT 1`,
          [userId]
        )
        filename = doc.rows[0]?.file_path
      }
      if (!filename) return res.status(404).json({ message: 'No photo on file.' })

      await sendStored(req, res, filename)
    } catch (err) { next(err) }
  }
)

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
    body('comment').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { period, timeSlot, pickup, dropoff, service, recipientName, recipientPhone, packageSize, notes, comment } = req.body

      // Block unapproved riders from booking
      const approval = await query('SELECT is_active, is_pending FROM users WHERE id = $1', [req.user.id])
      if (approval.rows[0]?.is_pending) {
        return res.status(403).json({ message: 'Your account is pending admin approval. You cannot book rides yet.' })
      }
      if (!approval.rows[0]?.is_active) {
        return res.status(403).json({ message: 'Your account is not active. Please contact support.' })
      }

      if (pickup === dropoff) {
        return res.status(422).json({ message: 'Pickup and drop-off cannot be the same.' })
      }

      // Look up the active, priced route for this exact pair — this both
      // validates the pickup/dropoff (previously unchecked) and gives us the
      // fare to quote. Pool and package fares are locked in now, not
      // re-looked-up later, so an admin price edit after this point never
      // changes what's charged. Solo fare is NOT priced here — a solo rider
      // buys out a whole car, so the price depends on which driver's vehicle
      // they end up matched with (its seat count) and is only known once
      // /driver/confirm-route actually pairs them.
      const routeRes = await query(
        `SELECT pool_fare_kobo, package_fare_kobo FROM routes
         WHERE period = $1 AND pickup = $2 AND dropoff = $3 AND is_active = true`,
        [period, pickup, dropoff]
      )
      const route = routeRes.rows[0]
      if (!route) {
        analytics.track(req.user.id, 'reservation_failed', {
          route_name: `${pickup}_to_${dropoff}`, reason: 'no_route_available',
        })
        return res.status(422).json({ message: 'That route is not currently available.' })
      }
      const quotedFareKobo = service === 'pool' ? route.pool_fare_kobo
        : service === 'send' ? route.package_fare_kobo
        : null // solo — determined at match time

      // Reject if rider can't cover the fare — skipped for solo since the
      // fare isn't known yet; that check happens at match time instead.
      if (quotedFareKobo != null) {
        const walletRes = await query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id])
        // BIGINT columns come back from pg as strings — compare as Numbers,
        // not strings, or "400000" < "45000" lexicographically (wrongly) true.
        if (Number(walletRes.rows[0].wallet_balance) < Number(quotedFareKobo)) {
          analytics.track(req.user.id, 'reservation_failed', {
            route_name: `${pickup}_to_${dropoff}`, reason: 'insufficient_funds',
          })
          return res.status(402).json({
            message: `Insufficient wallet balance. This ride costs ₦${Math.round(quotedFareKobo / 100)}. Please top up your wallet first.`,
            requiredAmount: Math.round(quotedFareKobo / 100),
            currentBalance: Math.round(walletRes.rows[0].wallet_balance / 100),
          })
        }
      }

      // Cancel any existing pending intent for same period+slot (prevent duplicates)
      await query(
        `UPDATE rider_bookings SET status = 'cancelled'
         WHERE rider_id = $1 AND status = 'pending' AND period = $2 AND time_slot = $3`,
        [req.user.id, period, timeSlot]
      )

      const result = await query(
        `INSERT INTO rider_bookings
          (rider_id, period, time_slot, pickup, dropoff, service, quoted_fare_kobo,
           recipient_name, recipient_phone, package_size, notes, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [req.user.id, period, timeSlot, pickup, dropoff, service, quotedFareKobo,
         recipientName || null, recipientPhone || null, packageSize || null, notes || null, comment || null]
      )

      analytics.track(req.user.id, 'reserve_seat', {
        route_name: `${pickup}_to_${dropoff}`,
        departure_time_slot: timeSlot,
        period, service,
        booking_window: analytics.bookingWindow(timeSlot),
      })
      analytics.setProfile(req.user.id, { primary_route: `${pickup}_to_${dropoff}` })

      res.status(201).json({
        bookingId: result.rows[0].id,
        quotedFare: quotedFareKobo != null ? Math.round(quotedFareKobo / 100) : null,
      })
    } catch (err) { next(err) }
  }
)

// ── Cancel a pending booking intent before a driver has matched it ───────────
router.patch('/book-intent/:bookingId/cancel',
  [param('bookingId').isUUID()],
  validate,
  async (req, res, next) => {
    try {
      const result = await query(
        `UPDATE rider_bookings SET status = 'cancelled'
          WHERE id = $1 AND rider_id = $2 AND status = 'pending'
          RETURNING id`,
        [req.params.bookingId, req.user.id]
      )
      if (!result.rows[0]) return res.status(409).json({ message: 'This request can no longer be cancelled.' })
      res.json({ message: 'Request cancelled.' })
    } catch (err) { next(err) }
  }
)

// ── Trip history ──────────────────────────────────────────────────────────────
// MUST be declared before GET /:rideId — otherwise Express matches "history"
// as a rideId param, fails UUID validation, and returns 422 instead.
router.get('/history', async (req, res, next) => {
  try {
    // Union pre-match bookings (pending / cancelled before a driver accepted)
    // with post-match rides (driver_assigned through completed/cancelled).
    // Exclude 'matched' bookings — those already have a corresponding rides row.
    const result = await query(
      `SELECT
          id,
          service                      AS type,
          pickup,
          dropoff                      AS destination,
          COALESCE(quoted_fare_kobo,0) AS fare_kobo,
          status,
          created_at,
          NULL AS driver_lat, NULL AS driver_lng, NULL AS driver_location_updated_at,
          NULL AS rider_lat,  NULL AS rider_lng,  NULL AS rider_location_updated_at,
          recipient_name, recipient_phone, package_size, notes,
          comment AS rider_comment, NULL AS driver_comment
        FROM rider_bookings
        WHERE rider_id = $1 AND status IN ('pending','cancelled')
       UNION ALL
       SELECT
          id, type, pickup, destination, fare_kobo, status, created_at,
          driver_lat, driver_lng, driver_location_updated_at,
          rider_lat, rider_lng, rider_location_updated_at,
          recipient_name, recipient_phone, package_size, notes,
          rider_comment, driver_comment
        FROM rides
        WHERE rider_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    )
    res.json({ rides: result.rows.map(sanitizeRide) })
  } catch (err) { next(err) }
})

// ── Get my current active ride (driver or rider) ──────────────────────────────
router.get('/me/active', async (req, res, next) => {
  try {
    // A pool driver carries several concurrent rides (one per rider); a rider
    // only ever has one. rideIds carries the whole pool, rideId stays for
    // older clients that expect a single value.
    const result = await query(
      `SELECT id FROM rides
        WHERE (rider_id = $1 OR driver_id = $1)
          AND status IN ('pending', 'driver_assigned', 'arrived_pickup', 'in_transit')
        ORDER BY created_at ASC`,
      [req.user.id]
    )
    res.json({
      rideId: result.rows[0]?.id || null,
      rideIds: result.rows.map(r => r.id),
    })
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
          ud.vehicle_make AS driver_vehicle_make, ud.vehicle_model AS driver_vehicle_model,
          ud.vehicle_color AS driver_vehicle_color, ud.plate_number AS driver_plate_number,
          ur.name AS rider_name,  ur.phone AS rider_phone,  ur.rating AS rider_rating,
          EXISTS(SELECT 1 FROM ratings WHERE ride_id = r.id AND rater_id = $2) AS already_rated
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
          myRole: req.user.id === row.rider_id ? 'rider' : 'driver',
          alreadyRated: row.already_rated,
          driver: row.driver_name ? {
            id:          row.driver_id,
            name:        row.driver_name,
            phone:       row.driver_phone,
            rating:      row.driver_rating,
            vehicleMake: row.driver_vehicle_make,
            vehicleModel:row.driver_vehicle_model,
            vehicleColor:row.driver_vehicle_color,
            plateNumber: row.driver_plate_number,
          } : null,
          rider: row.rider_name ? {
            id:     row.rider_id,
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

// ── Update ride status — either the driver or the rider on this ride can
// advance it. Pooled drivers may have several riders matched at once and
// can't always tap a button for each one individually, so the rider can
// confirm their own pickup/arrival/completion too. ───────────────────────────
router.patch('/:rideId/status',
  [
    param('rideId').isUUID(),
    body('status').isIn(['arrived_pickup', 'in_transit', 'completed']),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { status } = req.body
      const extra = status === 'completed' ? ', completed_at = NOW()'
        : status === 'in_transit' ? ', in_transit_at = NOW()' : ''
      // Only allow the correct next step from the current status, regardless
      // of which side (driver or rider) is the one confirming it.
      const result = await query(
        `UPDATE rides SET status = $1 ${extra}
          WHERE id = $2
            AND (driver_id = $3 OR rider_id = $3)
            AND (
              ($1 = 'arrived_pickup' AND status IN ('pending', 'driver_assigned')) OR
              ($1 = 'in_transit' AND status = 'arrived_pickup') OR
              ($1 = 'completed' AND status = 'in_transit')
            )
          RETURNING id, fare_kobo, rider_id, driver_id, pickup, destination, in_transit_at, completed_at`,
        [status, req.params.rideId, req.user.id]
      )

      if (!result.rows[0]) return res.status(409).json({ message: 'Could not update this ride — it may already be past this stage.' })

      const ride = result.rows[0]
      const routeName = `${ride.pickup}_to_${ride.destination}`
      if (status === 'in_transit') {
        analytics.track(ride.rider_id, 'board_shuttle', {
          shuttle_id: ride.id, route_name: routeName, driver_id: ride.driver_id,
        })
      }

      // On completion: deduct from rider, credit driver — use the ride's
      // actual driver_id/rider_id, not req.user.id, since either side may
      // have been the one to confirm this transition.
      if (status === 'completed') {
        const { fare_kobo, rider_id, driver_id } = result.rows[0]

        // Platform fee is read live (admin-tunable), not locked in at booking
        // time — so a fee change only affects rides completed after the change.
        const feeRes = await query('SELECT platform_fee_percent FROM platform_settings WHERE id = 1')
        const feePercent = Number(feeRes.rows[0]?.platform_fee_percent ?? 20)
        const driverShareKobo = Math.round(fare_kobo * (100 - feePercent) / 100)

        await query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [fare_kobo, rider_id])
        await query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [driverShareKobo, driver_id])

        // Record wallet transactions
        await query(
          'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description) VALUES ($1, $2, $3, $4)',
          [rider_id, 'debit', fare_kobo, `FeaziMove ride — ${result.rows[0].id.slice(0,8)}`]
        )
        await query(
          'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description) VALUES ($1, $2, $3, $4)',
          [driver_id, 'credit', driverShareKobo, `Ride earnings — ${result.rows[0].id.slice(0,8)}`]
        )

        // Server-side analytics — the authoritative trip + revenue events
        const travelMinutes = ride.in_transit_at && ride.completed_at
          ? Math.round((new Date(ride.completed_at) - new Date(ride.in_transit_at)) / 60000)
          : undefined
        analytics.track(rider_id, 'trip_completed', {
          route_name: routeName, trip_id: ride.id,
          total_travel_time_minutes: travelMinutes,
        })
        analytics.track(rider_id, 'wallet_deducted', {
          fare_amount: Math.round(fare_kobo / 100), trip_id: ride.id,
        })
        analytics.incrementProfile(rider_id, { lifetime_trips_completed: 1 })
        const balances = await query('SELECT id, wallet_balance FROM users WHERE id = ANY($1)', [[rider_id, driver_id]])
        for (const u of balances.rows) {
          analytics.setProfile(u.id, { current_wallet_balance: Math.round(u.wallet_balance / 100) })
        }
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

// ── Rate a ride ───────────────────────────────────────────────────────────────
// ── Rate the other party on a completed ride — works both ways: the rider
// rates the driver, and the driver rates the rider, off the same endpoint. ──
router.post('/:rideId/rate',
  [
    param('rideId').isUUID(),
    body('stars').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 300 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { stars, comment } = req.body
      const { rideId } = req.params

      const ride = await query(
        `SELECT rider_id, driver_id FROM rides
          WHERE id = $1 AND status = 'completed' AND (rider_id = $2 OR driver_id = $2)`,
        [rideId, req.user.id]
      )
      if (!ride.rows[0]) return res.status(400).json({ message: 'Cannot rate this ride.' })

      const { rider_id, driver_id } = ride.rows[0]
      const rateeId = req.user.id === rider_id ? driver_id : rider_id
      if (!rateeId) return res.status(400).json({ message: 'There is no one to rate on this ride.' })

      const result = await query(
        `INSERT INTO ratings (ride_id, rater_id, ratee_id, stars, comment)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (ride_id, rater_id) DO NOTHING
          RETURNING id`,
        [rideId, req.user.id, rateeId, stars, comment || null]
      )
      if (!result.rows[0]) return res.status(409).json({ message: 'You already rated this ride.' })

      // Recompute the ratee's average rating
      await query(
        `UPDATE users SET rating = (
          SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings WHERE ratee_id = $1
        ) WHERE id = $1`,
        [rateeId]
      )

      res.json({ message: 'Rating submitted. Thank you!' })
    } catch (err) { next(err) }
  }
)

// ── Batch rating — the exception-based post-trip screen submits all riders at
// once (each defaulted to 5★). Same rules as single rating; already-rated or
// invalid rides are skipped, never failing the whole batch. ──────────────────
router.post('/rate/batch',
  [
    body('ratings').isArray({ min: 1, max: 20 }),
    body('ratings.*.rideId').isUUID(),
    body('ratings.*.stars').isInt({ min: 1, max: 5 }),
    body('ratings.*.comment').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).escape(),
  ],
  validate,
  async (req, res, next) => {
    try {
      let saved = 0
      for (const { rideId, stars, comment } of req.body.ratings) {
        const ride = await query(
          `SELECT rider_id, driver_id FROM rides
            WHERE id = $1 AND status = 'completed' AND (rider_id = $2 OR driver_id = $2)`,
          [rideId, req.user.id]
        )
        if (!ride.rows[0]) continue

        const { rider_id, driver_id } = ride.rows[0]
        const rateeId = req.user.id === rider_id ? driver_id : rider_id
        if (!rateeId) continue

        const result = await query(
          `INSERT INTO ratings (ride_id, rater_id, ratee_id, stars, comment)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (ride_id, rater_id) DO NOTHING
            RETURNING id`,
          [rideId, req.user.id, rateeId, stars, comment || null]
        )
        if (!result.rows[0]) continue

        await query(
          `UPDATE users SET rating = (
            SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings WHERE ratee_id = $1
          ) WHERE id = $1`,
          [rateeId]
        )
        saved++
      }
      res.json({ saved, message: saved > 0 ? 'Ratings submitted. Thank you!' : 'Nothing new to rate.' })
    } catch (err) { next(err) }
  }
)

// ── "Move an Item" launch waitlist ────────────────────────────────────────────
// One tap from the Launching Soon overlay — contact details come from the
// authenticated account, never from the request body, so nothing user-supplied
// is trusted and the entry can't be spoofed for someone else.

// Has the current user already joined?
router.get('/move-waitlist/me', async (req, res, next) => {
  try {
    const result = await query('SELECT 1 FROM move_waitlist WHERE user_id = $1', [req.user.id])
    res.json({ joined: !!result.rows[0] })
  } catch (err) { next(err) }
})

// Join — idempotent, snapshots name/email/phone at join time
router.post('/move-waitlist', async (req, res, next) => {
  try {
    await query(
      `INSERT INTO move_waitlist (user_id, name, email, phone)
       SELECT id, name, email, phone FROM users WHERE id = $1
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.id]
    )
    res.status(201).json({ joined: true, message: "You're on the list! We'll notify you at launch." })
  } catch (err) { next(err) }
})

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
    riderComment:   row.rider_comment   || null,
    driverComment:  row.driver_comment  || null,
  }
}

module.exports = router
