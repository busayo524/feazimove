// ── Scheduled rides ──────────────────────────────────────────────────────────
// A rider or driver can commit to a route on a specific day inside the coming
// week. Both sides store that as an ordinary rider_bookings / driver_availability
// row with a scheduled_date set, so nothing downstream needs a parallel pipeline:
//
//   • future date → the row sits out of the live queue (matching filters on the
//     date), and is paired in advance against the other side's schedule
//   • today       → the row IS the live queue. A driver going live now picks up
//     riders who scheduled today, and a rider booking now matches a driver who
//     scheduled today. That's the automatic same-day pairing.
//
// The real ride is only ever created by /driver/confirm-route, on the day.
const { query } = require('../db')

// "Within a week". The client offers today plus the next 6 days; the server
// allows one extra day at the far end so a device whose clock sits in another
// timezone isn't rejected on the boundary.
const SCHEDULE_WINDOW_DAYS = 7

// Today in Lagos, as yyyy-mm-dd. Every date comparison goes through this rather
// than Postgres's CURRENT_DATE, which follows the database's timezone (UTC on
// Neon) and would roll the day over an hour early for a Nigerian rider.
const TODAY_SQL = `(NOW() AT TIME ZONE 'Africa/Lagos')::date`

// Condition for "this row is in play today" — a live (dateless) row, or a
// schedule whose day has arrived. Takes the table alias so it can be dropped
// into any matching query.
const inPlayToday = alias => `(${alias}.scheduled_date IS NULL OR ${alias}.scheduled_date = ${TODAY_SQL})`

function lagosToday() {
  // en-CA renders as yyyy-mm-dd, which sorts and compares as a plain string.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`) // midday, so a DST-style shift can't move the date
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// null when the date is usable, otherwise the message to show the user.
function scheduleDateError(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return 'Pick a valid date for your scheduled ride.'
  const today = lagosToday()
  if (iso < today) return 'That date has already passed — pick a day from today onward.'
  if (iso > addDays(today, SCHEDULE_WINDOW_DAYS)) return 'Rides can only be scheduled up to a week ahead.'
  return null
}

// ── Advance pairing ──────────────────────────────────────────────────────────
// Both directions are deliberately EXACT-pickup matches, unlike live matching,
// which spans every stop a driver has expanded to. On a future date the driver
// hasn't moved anywhere yet, so their covered chain is that single stop — the
// wider chain matching happens on the day, once they're live.

// Hold a seat for one rider. A rider keeps at most one reservation row ever
// (UNIQUE on booking_id), so releasing one only crosses it out — re-pairing has
// to revive that row rather than insert a second. The WHERE guard is what keeps
// this from stealing a rider who is currently reserved to somebody else: for an
// already-'reserved' row the update is skipped and nothing is returned.
// Returns true when the seat was taken.
async function claimReservation(bookingId, availabilityId, scheduledDate) {
  const done = await query(
    `INSERT INTO scheduled_reservations (booking_id, availability_id, scheduled_date)
     VALUES ($1, $2, $3::date)
     ON CONFLICT (booking_id) DO UPDATE
        SET availability_id = EXCLUDED.availability_id,
            scheduled_date  = EXCLUDED.scheduled_date,
            status          = 'reserved',
            -- reserved-rider lists order by this, so it has to be the moment
            -- this pairing happened, not the moment the released one did
            created_at      = NOW()
      WHERE scheduled_reservations.status <> 'reserved'
     RETURNING id`,
    [bookingId, availabilityId, scheduledDate]
  )
  return !!done.rows[0]
}

// A rider just scheduled: find them a driver who already scheduled the same
// day/slot/route with a seat still unreserved. Returns the driver, or null.
async function reserveForBooking(bookingId) {
  const b = (await query(
    `SELECT id, rider_id, scheduled_date::text AS scheduled_date, period, time_slot, pickup, dropoff
       FROM rider_bookings
      WHERE id = $1 AND status = 'pending' AND scheduled_date IS NOT NULL`,
    [bookingId]
  )).rows[0]
  if (!b) return null

  // Oldest schedule first, so the driver who committed earliest fills up first.
  const a = (await query(
    `SELECT da.id, da.seats, da.comment, u.id AS driver_id, u.name, u.rating,
            u.vehicle_make, u.vehicle_model, u.vehicle_color, u.plate_number
       FROM driver_availability da
       JOIN users u ON u.id = da.driver_id
      WHERE da.status = 'scheduled'
        AND da.scheduled_date = $1::date
        AND da.period = $2 AND da.time_slot = $3
        AND da.pickup = $4 AND da.dropoff = $5
        AND da.driver_id <> $6
        AND u.is_active = true AND u.is_pending = false
        AND (SELECT COUNT(*) FROM scheduled_reservations sr
              WHERE sr.availability_id = da.id AND sr.status = 'reserved') < da.seats
      ORDER BY da.created_at ASC
      LIMIT 1`,
    [b.scheduled_date, b.period, b.time_slot, b.pickup, b.dropoff, b.rider_id]
  )).rows[0]
  if (!a) return null

  if (!await claimReservation(b.id, a.id, b.scheduled_date)) return null

  return {
    driverId: a.driver_id,
    name: a.name,
    rating: a.rating != null ? parseFloat(a.rating) : 5.0,
    vehicleMake: a.vehicle_make, vehicleModel: a.vehicle_model,
    vehicleColor: a.vehicle_color, plateNumber: a.plate_number,
  }
}

// A driver just scheduled: reserve every unpaired scheduled rider on the same
// day/slot/route, up to their seat count. Returns the riders reserved.
async function reserveForAvailability(availabilityId) {
  const a = (await query(
    `SELECT id, driver_id, scheduled_date::text AS scheduled_date, period, time_slot, pickup, dropoff, seats
       FROM driver_availability
      WHERE id = $1 AND status = 'scheduled' AND scheduled_date IS NOT NULL`,
    [availabilityId]
  )).rows[0]
  if (!a) return []

  const taken = Number((await query(
    `SELECT COUNT(*) AS n FROM scheduled_reservations
      WHERE availability_id = $1 AND status = 'reserved'`,
    [a.id]
  )).rows[0].n)
  const openSeats = a.seats - taken
  if (openSeats <= 0) return []

  const riders = (await query(
    `SELECT rb.id, rb.rider_id, u.name, u.rating
       FROM rider_bookings rb
       JOIN users u ON u.id = rb.rider_id
      WHERE rb.status = 'pending' AND rb.scheduled_date = $1::date
        AND rb.period = $2 AND rb.time_slot = $3
        AND rb.pickup = $4 AND rb.dropoff = $5
        AND rb.rider_id <> $6
        AND NOT EXISTS (
          SELECT 1 FROM scheduled_reservations sr
           WHERE sr.booking_id = rb.id AND sr.status = 'reserved'
        )
      ORDER BY rb.created_at ASC
      LIMIT $7`,
    [a.scheduled_date, a.period, a.time_slot, a.pickup, a.dropoff, a.driver_id, openSeats]
  )).rows

  const reserved = []
  for (const r of riders) {
    if (await claimReservation(r.id, a.id, a.scheduled_date)) {
      reserved.push({
        bookingId: r.id, riderId: r.rider_id, riderName: r.name,
        riderRating: r.rating != null ? parseFloat(r.rating) : 5.0,
      })
    }
  }
  return reserved
}

// A schedule went away (cancelled, or fulfilled by a real trip). Freeing the
// riders' reservations lets them be paired with another scheduled driver.
async function releaseReservationsForAvailability(availabilityId, status = 'cancelled') {
  await query(
    `UPDATE scheduled_reservations SET status = $2
      WHERE availability_id = $1 AND status = 'reserved'`,
    [availabilityId, status]
  )
}

async function releaseReservationForBooking(bookingId, status = 'cancelled') {
  await query(
    `UPDATE scheduled_reservations SET status = $2
      WHERE booking_id = $1 AND status = 'reserved'`,
    [bookingId, status]
  )
}

module.exports = {
  SCHEDULE_WINDOW_DAYS,
  TODAY_SQL,
  inPlayToday,
  lagosToday,
  addDays,
  scheduleDateError,
  reserveForBooking,
  reserveForAvailability,
  releaseReservationsForAvailability,
  releaseReservationForBooking,
}
