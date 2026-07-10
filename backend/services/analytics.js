/**
 * Server-side Mixpanel — the source of truth for money and trip events.
 * Frontend tracking can drop events (dead battery, lost signal, closed tab);
 * these fire from the backend at the moment the database change commits.
 *
 * Talks to Mixpanel's HTTP API directly with Node's built-in https module —
 * no SDK dependency. Every helper is fire-and-forget and silently no-ops
 * without a token; analytics must never fail a request.
 */
const https = require('https')

const MIXPANEL_TOKEN = process.env.MIXPANEL_TOKEN

// POST base64-encoded JSON to a Mixpanel ingestion endpoint, fire-and-forget
function send(path, payload) {
  try {
    const body = 'data=' + encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'))
    const req = https.request({
      hostname: 'api.mixpanel.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 5000,
    }, res => res.resume())
    req.on('error', () => { /* analytics must never break a request */ })
    req.on('timeout', () => req.destroy())
    req.write(body)
    req.end()
  } catch { /* ignore */ }
}

// distinctId = users.id — the same id the frontend passes to mixpanel.identify()
function track(distinctId, event, props = {}) {
  if (!MIXPANEL_TOKEN || !distinctId) return
  send('/track?ip=0', {
    event,
    properties: {
      token: MIXPANEL_TOKEN,
      distinct_id: String(distinctId),
      time: Math.floor(Date.now() / 1000),
      ...props,
    },
  })
}

function setProfile(distinctId, props) {
  if (!MIXPANEL_TOKEN || !distinctId) return
  send('/engage#profile-set', {
    $token: MIXPANEL_TOKEN,
    $distinct_id: String(distinctId),
    $set: props,
  })
}

function incrementProfile(distinctId, props) {
  if (!MIXPANEL_TOKEN || !distinctId) return
  send('/engage#profile-numerical-add', {
    $token: MIXPANEL_TOKEN,
    $distinct_id: String(distinctId),
    $add: props,
  })
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
