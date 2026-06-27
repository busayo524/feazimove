/**
 * Seeds the `stops` and `routes` tables with today's existing hardcoded
 * locations and flat fares — purely additive, idempotent (safe to re-run),
 * and changes nothing about live behavior until an admin edits a row via
 * the admin panel.
 *
 * Run once: node scripts/seed-routes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { pool, query } = require('../db')

// Mainland stops, in the existing MORNING_PICKUP_CHAIN order, with
// "Ogudu Roundabout" slotted in next to "Ogudu Express" — it was present in
// BookRide.jsx's pickup list but missing from the chain array, so a driver
// starting there never got a "try next stop" suggestion. Fixed here.
const MAINLAND = [
  'Berger', 'Secretariate', '7up', 'Estate (Alapere)',
  'Ogudu Express', 'Ogudu Roundabout', 'Ifako', 'Iyana Woro (Berger)',
]

// Island stops, in the existing EVENING_PICKUP_CHAIN order.
const ISLAND = [
  'Ajah', 'Checking Point', 'SandFill', 'Lekki Phase 2',
  'Lekki Phase 1', 'Victoria Island', 'Marina (CMS)',
]

// Coordinates carried over from src/utils/locations.js
const COORDS = {
  'Ifako':               { lng: 3.3334, lat: 6.6376 },
  'Iyana Woro (Berger)': { lng: 3.3773, lat: 6.6194 },
  'Ogudu Roundabout':    { lng: 3.3837, lat: 6.5836 },
  'Ogudu Express':       { lng: 3.3867, lat: 6.5915 },
  'Estate (Alapere)':    { lng: 3.3719, lat: 6.5851 },
  '7up':                 { lng: 3.3812, lat: 6.5756 },
  'Secretariate':        { lng: 3.3637, lat: 6.5795 },
  'Berger':              { lng: 3.3764, lat: 6.6259 },
  'Marina (CMS)':        { lng: 3.3921, lat: 6.4524 },
  'Victoria Island':     { lng: 3.4219, lat: 6.4281 },
  'Lekki Phase 1':       { lng: 3.4752, lat: 6.4483 },
  'Lekki Phase 2':       { lng: 3.5128, lat: 6.4443 },
  'SandFill':            { lng: 3.5219, lat: 6.4521 },
  'Checking Point':      { lng: 3.5584, lat: 6.4435 },
  'Ajah':                { lng: 3.5893, lat: 6.4651 },
}

const POOL_FARE_KOBO = 45000 // ₦450 — today's flat rate
const SOLO_FARE_KOBO = 70000 // ₦700 — today's flat rate

;(async () => {
  try {
    let stopsInserted = 0, routesInserted = 0

    for (const [group, list] of [['mainland', MAINLAND], ['island', ISLAND]]) {
      for (let i = 0; i < list.length; i++) {
        const name = list[i]
        const coord = COORDS[name] || {}
        const result = await query(
          `INSERT INTO stops (name, group_name, chain_position, lat, lng)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (name) DO NOTHING
           RETURNING id`,
          [name, group, i, coord.lat ?? null, coord.lng ?? null]
        )
        if (result.rows[0]) stopsInserted++
      }
    }

    // Morning: pickup = mainland, dropoff = island. Evening: reversed.
    for (const [period, pickups, dropoffs] of [
      ['morning', MAINLAND, ISLAND],
      ['evening', ISLAND, MAINLAND],
    ]) {
      for (const pickup of pickups) {
        for (const dropoff of dropoffs) {
          const result = await query(
            `INSERT INTO routes (period, pickup, dropoff, pool_fare_kobo, solo_fare_kobo)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (period, pickup, dropoff) DO NOTHING
             RETURNING id`,
            [period, pickup, dropoff, POOL_FARE_KOBO, SOLO_FARE_KOBO]
          )
          if (result.rows[0]) routesInserted++
        }
      }
    }

    console.log(`✅ Seed complete. Stops inserted: ${stopsInserted}, routes inserted: ${routesInserted}.`)
    console.log('   (0 for either means it was already seeded — safe, this script is idempotent.)')
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
})()
