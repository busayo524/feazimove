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

// ── Toggle online status ──────────────────────────────────────────────────────
router.patch('/status',
  [body('online').isBoolean()],
  validate,
  async (req, res, next) => {
    try {
      // In production: update a driver_sessions table with location + timestamp
      res.json({ online: req.body.online, message: `You are now ${req.body.online ? 'online' : 'offline'}.` })
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

module.exports = router
