/**
 * Read-only, any-authenticated-user endpoints for the route/stop catalog.
 * Riders and drivers use these to populate pickup/dropoff dropdowns and map
 * pins — the actual admin CRUD for managing this data lives in routes/admin.js.
 */
const express = require('express')
const { query } = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

// ── Active routes for a period — drives rider/driver dropdowns + pricing ─────
router.get('/', async (req, res, next) => {
  try {
    const { period } = req.query
    if (!['morning', 'evening'].includes(period)) {
      return res.status(422).json({ message: 'period must be morning or evening.' })
    }
    const result = await query(
      `SELECT pickup, dropoff, pool_fare_kobo, solo_fare_kobo
       FROM routes WHERE period = $1 AND is_active = true
       ORDER BY pickup, dropoff`,
      [period]
    )
    res.json({
      routes: result.rows.map(r => ({
        pickup: r.pickup, dropoff: r.dropoff,
        poolFareKobo: Number(r.pool_fare_kobo), soloFareKobo: Number(r.solo_fare_kobo),
      })),
    })
  } catch (err) { next(err) }
})

// ── Active stops with coordinates — for map pins ──────────────────────────────
router.get('/stops', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT name, group_name, lat, lng FROM stops WHERE is_active = true ORDER BY group_name, chain_position`
    )
    res.json({
      stops: result.rows.map(s => ({
        name: s.name, group: s.group_name,
        lat: s.lat != null ? Number(s.lat) : null,
        lng: s.lng != null ? Number(s.lng) : null,
      })),
    })
  } catch (err) { next(err) }
})

module.exports = router
