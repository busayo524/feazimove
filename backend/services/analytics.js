/**
 * Server-side Mixpanel — the source of truth for money and trip events.
 * Frontend tracking can drop events (dead battery, lost signal, closed tab);
 * these fire from the backend at the moment the database change commits.
 *
 * Every helper is fire-and-forget and silently no-ops without a token —
 * analytics must never fail a request.
 */
const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN

let mp = null
if (MIXPANEL_TOKEN) {
  try { mp = require('mixpanel').init(MIXPANEL_TOKEN) }
  catch (err) { console.error('Mixpanel init failed:', err.message) }
}

// distinctId = users.id — the same id the frontend passes to mixpanel.identify()
function track(distinctId, event, props = {}) {
  if (!mp || !distinctId) return
  try { mp.track(event, { distinct_id: distinctId, ...props }) } catch { /* ignore */ }
}

function setProfile(distinctId, props) {
  if (!mp || !distinctId) return
  try { mp.people.set(distinctId, props) } catch { /* ignore */ }
}

function incrementProfile(distinctId, props) {
  if (!mp || !distinctId) return
  try { mp.people.increment(distinctId, props) } catch { /* ignore */ }
}

// "Advance" if booked the night before, "Last_Minute" if booked on travel day.
// Slots are strings like "06:30 AM"; if that time is still ahead today
// (Africa/Lagos), the trip is today → Last_Minute; if it already passed,
// the booking must be for a later day → Advance.
function bookingWindow(timeSlot) {
  try {
    const m = String(timeSlot).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (!m) return 'Unknown'
    let hour = parseInt(m[1], 10) % 12
    if ((m[3] || '').toUpperCase() === 'PM') hour += 12
    const lagosNow = new Date(Date.now() + 60 * 60 * 1000) // UTC+1, no DST
    const nowMinutes  = lagosNow.getUTCHours() * 60 + lagosNow.getUTCMinutes()
    const slotMinutes = hour * 60 + parseInt(m[2], 10)
    return slotMinutes > nowMinutes ? 'Last_Minute' : 'Advance'
  } catch { return 'Unknown' }
}

module.exports = { track, setProfile, incrementProfile, bookingWindow }
