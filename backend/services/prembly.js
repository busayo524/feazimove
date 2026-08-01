/**
 * Prembly (Identity Pass) — government identity verification.
 *
 * Riders  : NIN + face. Proves the NIN is real AND that the selfie is the
 *           person the NIN belongs to.
 * Drivers : NIN + face AND driver's licence + face, against the SAME selfie.
 *           Two independent government records both matching one face is what
 *           establishes "same person, correct person" — either alone can be
 *           borrowed.
 *
 * Auth is a single header, `x-api-key: <secret key>` (docs.prembly.com/docs/
 * authentication — no Authorization header, no app-id).
 *
 * Every call costs money, so results are stored on the user and never
 * re-requested automatically; an admin can force a re-run.
 */
const axios = require('axios')

const BASE_URL = (process.env.PREMBLY_BASE_URL || 'https://api.prembly.com').replace(/\/+$/, '')
// Prembly's face endpoints return confidence on a 0–1 scale. Their own
// `status` boolean is the primary verdict; this floor is a second opinion so a
// barely-passing match still gets a human look.
const FACE_MIN = Number(process.env.PREMBLY_FACE_MIN_CONFIDENCE) || 0.5

const configured = () => !!process.env.PREMBLY_API_KEY

async function call(path, body) {
  const res = await axios.post(`${BASE_URL}${path}`, body, {
    headers: { 'x-api-key': process.env.PREMBLY_API_KEY, 'Content-Type': 'application/json' },
    timeout: 45000, // government lookups are slow; well under the client's patience
    validateStatus: () => true, // Prembly signals failure in the body, not always the status
  })
  return { httpStatus: res.status, data: res.data || {} }
}

// Names come back ordered differently between NIN and FRSC records, so compare
// as token sets rather than strings. Two shared tokens (given + family name)
// is the bar — one is too easy to hit by coincidence.
function namesAgree(a, b) {
  const toks = s => new Set(String(s || '').toUpperCase().replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/).filter(t => t.length >= 2))
  const A = toks(a), B = toks(b)
  if (!A.size || !B.size) return false
  const shared = [...A].filter(t => B.has(t))
  return shared.length >= Math.min(2, Math.min(A.size, B.size))
}

const faceOf = d => d?.face_data || {}
const facePassed = f => f?.status === true && Number(f?.confidence ?? 0) >= FACE_MIN

function joinName(...parts) {
  return parts.filter(Boolean).join(' ').trim()
}

/**
 * Runs every check the user's role requires and returns ONE verdict.
 * Never throws — a Prembly outage must not block someone registering; it is
 * recorded as 'error' for an admin to retry.
 *
 * Returns { status, checks[], ninName, licenceName, summary }
 *   verified — every required check passed
 *   failed   — a government record or a face comparison disagreed
 *   error    — we could not reach Prembly, or it returned something unusable
 */
async function verifyIdentity({ role, registeredName, nin, licenceNumber, dob, selfieBuffer }) {
  if (!configured()) return { status: 'skipped', checks: [], summary: 'Prembly not configured' }
  if (!selfieBuffer?.length) {
    return { status: 'error', checks: [], summary: 'No selfie was supplied to compare against' }
  }
  const image = selfieBuffer.toString('base64')
  const checks = []
  const add = (name, passed, detail) => checks.push({ name, passed, detail })
  let ninName = null, licenceName = null

  // ── NIN + face (both roles) ───────────────────────────────────────────────
  if (!nin) {
    add('NIN provided', false, 'No NIN was captured at registration')
  } else {
    try {
      const { data } = await call('/verification/nin_w_face', { number: nin, image })
      const n = data.nin_data || data.data || {}
      ninName = joinName(n.firstname || n.firstName, n.middlename || n.middleName,
        n.surname || n.lastName || n.lastname)
      const f = faceOf(data)
      if (data.status === false && !n.firstname && !n.firstName) {
        add('NIN found', false, data.message || 'NIN could not be verified')
      } else {
        add('NIN found', true, ninName || 'record returned')
        add('Face matches NIN photo', facePassed(f),
          `${f.message || 'no result'} (confidence ${f.confidence ?? 'n/a'})`)
      }
    } catch (err) {
      return { status: 'error', checks, summary: `NIN check failed: ${err.message}` }
    }
  }

  // ── Driver's licence + face (drivers only) ────────────────────────────────
  if (role === 'driver') {
    if (!licenceNumber || !dob) {
      add('Licence details provided', false,
        !licenceNumber ? 'No licence number captured' : 'Date of birth is required for the licence check')
    } else {
      try {
        const { data } = await call('/verification/drivers_license/face', {
          number: licenceNumber,
          dob: typeof dob === 'string' ? dob.slice(0, 10) : new Date(dob).toISOString().slice(0, 10),
          image,
        })
        const d = data.data || data.drivers_license || {}
        licenceName = joinName(d.firstName || d.firstname, d.middleName || d.middlename,
          d.lastName || d.lastname)
        const verified = (data.verification?.status || '').toUpperCase() === 'VERIFIED'
          || !!licenceName
        const f = faceOf(data)
        add('Driver’s licence found', verified, licenceName || data.message || 'no record returned')
        if (verified) {
          add('Face matches licence photo', facePassed(f),
            `${f.message || 'no result'} (confidence ${f.confidence ?? 'n/a'})`)
        }
      } catch (err) {
        return { status: 'error', checks, summary: `Licence check failed: ${err.message}` }
      }
    }

    // The point of running both: the two government records must describe the
    // same human, not merely two valid documents.
    if (ninName && licenceName) {
      add('NIN and licence are the same person', namesAgree(ninName, licenceName),
        `NIN "${ninName}" vs licence "${licenceName}"`)
    }
  }

  // Registered name is advisory — people abbreviate, and the government record
  // is the authority. Recorded so an admin can see a deliberate mismatch.
  if (ninName && registeredName) {
    add('Matches the name they registered with', namesAgree(ninName, registeredName),
      `registered "${registeredName}" vs NIN "${ninName}"`)
  }

  const required = checks.filter(c => c.name !== 'Matches the name they registered with')
  const status = required.length && required.every(c => c.passed) ? 'verified' : 'failed'
  const failed = checks.filter(c => !c.passed).map(c => c.name)
  return {
    status,
    checks,
    ninName,
    licenceName,
    summary: status === 'verified'
      ? 'All identity checks passed'
      : `Failed: ${failed.join('; ')}`,
  }
}

module.exports = { configured, verifyIdentity, namesAgree, BASE_URL }
