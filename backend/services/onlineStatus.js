/**
 * Honest online status — a driver who closes the browser never tells the
 * server, so their is_online flag would lie forever. The sweep flips any
 * "online" user silent for 15+ minutes WITH NO RIDE IN PROGRESS to offline
 * and cancels their published availability.
 *
 * IMPORTANT: triggered by request activity (throttled), NOT by a timer — a
 * 24/7 interval would keep the Neon database awake permanently and burn the
 * entire compute allowance. If nobody is using the app there are no queries,
 * nobody is viewing the dashboard, and the sweep can wait for the next
 * request to make things honest.
 */
const { pool } = require('../db')

const SWEEP_EVERY_MS = 5 * 60 * 1000
let lastSweep = 0

async function sweepStaleOnline() {
  try {
    const stale = await pool.query(
      `UPDATE users SET is_online = false
        WHERE is_online = true
          AND last_seen_at IS NOT NULL
          AND last_seen_at < NOW() - INTERVAL '15 minutes'
          AND NOT EXISTS (
            SELECT 1 FROM rides r
             WHERE r.driver_id = users.id
               AND r.status IN ('pending', 'driver_assigned', 'arrived_pickup', 'in_transit')
          )
        RETURNING id`
    )
    if (stale.rows.length) {
      await pool.query(
        `UPDATE driver_availability SET status = 'cancelled'
          WHERE driver_id = ANY($1) AND status IN ('waiting', 'active', 'in_progress')`,
        [stale.rows.map(r => r.id)]
      )
      console.log(`Stale-online sweep: ${stale.rows.length} user(s) flipped offline.`)
    }
  } catch (err) {
    console.error('Stale-online sweep failed:', err.message)
  }
}

// Fire-and-forget, at most once per SWEEP_EVERY_MS — called from request
// middleware, so it piggybacks on activity that already woke the database.
function maybeSweep() {
  const now = Date.now()
  if (now - lastSweep < SWEEP_EVERY_MS) return
  lastSweep = now
  sweepStaleOnline()
}

module.exports = { sweepStaleOnline, maybeSweep }
