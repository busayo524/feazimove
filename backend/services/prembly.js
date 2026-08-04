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

// A placeholder left in .env is worse than nothing: it would make us attempt
// real calls, get rejected, and record genuine applicants as FAILED.
const configured = () => {
  const k = (process.env.PREMBLY_API_KEY || '').trim()
  return !!k && !/^your_|_here$|^replace/i.test(k)
}

// Distinguishes "Prembly refused US" from "this person's document is wrong".
// Conflating them would accuse a real applicant of failing verification when
// the fault is our key, our quota or their outage.
function ourFault(httpStatus, data) {
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429 || httpStatus >= 500) return true
  const msg = `${data?.message || ''} ${data?.detail || ''}`
  return /api\s*key|unauthor|forbidden|not\s*permitted|insufficient|wallet|balance|subscri|quota/i.test(msg)
}

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

const text = v => {
  const s = String(v ?? '').trim()
  return s && s.toLowerCase() !== 'null' ? s : null
}

// When a lookup fails, Prembly puts its explanation where the record normally
// goes ("Licence number EKY77620AA21 has expired"). Read as a name it produced
// an admin screen showing NAME ON LICENCE: "Licence number EKY77620AA21 has
// expired" — software inventing a person out of an error message, and then
// failing him for not being called that. A name carries no digits, is short,
// and is at most a few words.
function nameField(v) {
  const s = text(v)
  if (!s || s.length > 40 || /\d/.test(s) || s.split(/\s+/).length > 3) return null
  return s
}

// FRSC dates arrive as YYYY-MM-DD. Returns null when there is no usable date —
// "we don't know" must never be reported as "expired".
function isExpired(dateStr) {
  const t = Date.parse(text(dateStr) || '')
  return Number.isFinite(t) ? t < Date.now() : null
}

/**
 * The FRSC record exactly as Prembly documents it (frsc_data), minus the
 * portrait, which is returned separately because it is stored separately.
 * This is what lets an admin judge the driver on the facts — the name printed
 * on the licence, when it expires, where it was issued — instead of taking our
 * pass/fail on trust.
 */
function licenceRecord(d) {
  const rec = {
    number:       text(d.licenseNo || d.license_no || d.licenseNumber),
    firstName:    nameField(d.firstName || d.firstname),
    middleName:   nameField(d.middleName || d.middlename),
    lastName:     nameField(d.lastName || d.lastname),
    gender:       nameField(d.gender),
    dateOfBirth:  text(d.birthDate || d.birth_date || d.dob),
    issuedDate:   text(d.issuedDate || d.issued_date),
    expiryDate:   text(d.expiryDate || d.expiry_date),
    stateOfIssue: text(d.stateOfIssue || d.state_of_issue),
  }
  rec.name = joinName(rec.firstName, rec.middleName, rec.lastName) || null
  rec.expired = isExpired(rec.expiryDate)
  // A record is "found" only if FRSC returned actual cardholder data. An error
  // string in the payload is not a record, however cheerful the HTTP status.
  rec.found = !!(rec.name || rec.dateOfBirth || rec.expiryDate)
  return rec
}

// The portrait printed on the licence, base64. Rejected unless it is big
// enough to be a real photograph — placeholder strings and stray flags in this
// field would otherwise reach the admin screen as a broken image.
function licencePhotoOf(d) {
  const p = String(d.photo || d.image || d.picture || '').replace(/^data:image\/\w+;base64,/, '').trim()
  return p.length > 500 ? p : null
}

/**
 * Runs every check the user's role requires and returns ONE verdict.
 * Never throws — a Prembly outage must not block someone registering; it is
 * recorded as 'error' for an admin to retry.
 *
 * Returns { status, checks[], ninName, licenceName, licence, licencePhoto, summary }
 *   licence      — the FRSC record itself (name, dob, issue/expiry, state), so
 *                  an admin can decide on the facts rather than on our verdict
 *   licencePhoto — the portrait printed on the licence, base64, for the only
 *                  face comparison that carries real weight: a human's
 *
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
  let ninName = null, licenceName = null, licence = null, licencePhoto = null
  // One document per role: riders are identified by NIN, drivers by their FRSC
  // licence (which they must hold anyway). Each is checked against the live
  // selfie, so the document still has to belong to the person registering.
  const isDriver = role === 'driver'

  // ── NIN + face (riders) ───────────────────────────────────────────────────
  if (!isDriver && !nin) {
    add('NIN provided', false, 'No NIN was captured at registration')
  } else if (!isDriver) {
    try {
      const { httpStatus, data } = await call('/verification/nin_w_face', { number: nin, image })
      if (ourFault(httpStatus, data)) {
        return { status: 'error', checks,
          summary: `Prembly rejected the request (HTTP ${httpStatus}): ${data?.message || 'check the API key and account balance'}` }
      }
      const n = data.nin_data || data.data || {}
      ninName = joinName(nameField(n.firstname || n.firstName), nameField(n.middlename || n.middleName),
        nameField(n.surname || n.lastName || n.lastname)) || null
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

  // ── Driver's licence + face (drivers) ─────────────────────────────────────
  if (isDriver) {
    if (!licenceNumber || !dob) {
      add('Licence details provided', false,
        !licenceNumber ? 'No licence number captured' : 'Date of birth is required for the licence check')
    } else {
      try {
        // first_name / last_name are REQUIRED even though the face endpoint's
        // docs list only number/dob/image — omitting them returns
        // 400 "Invalid request data" for every licence, valid or not.
        const parts = String(registeredName || '').trim().split(/\s+/).filter(Boolean)
        const { httpStatus, data } = await call('/verification/drivers_license/face', {
          number: licenceNumber,
          dob: typeof dob === 'string' ? dob.slice(0, 10) : new Date(dob).toISOString().slice(0, 10),
          first_name: parts[0] || '',
          last_name: parts.length > 1 ? parts[parts.length - 1] : '',
          image,
        })
        if (ourFault(httpStatus, data)) {
          return { status: 'error', checks,
            summary: `Prembly rejected the request (HTTP ${httpStatus}): ${data?.message || 'check the API key and account balance'}` }
        }
        // The licence record comes back under `frsc_data` (Prembly's docs) —
        // the other keys are defensive fallbacks in case that ever changes.
        const d = data.frsc_data || data.data || data.drivers_license || {}
        const why = text(data.detail) || text(data.message) || 'FRSC returned no record'
        licence = licenceRecord(typeof d === 'object' && d ? d : {})
        licenceName = licence.name
        licencePhoto = licencePhotoOf(typeof d === 'object' && d ? d : {})

        const f = faceOf(data)
        add('Driver’s licence found', licence.found, licence.found
          ? joinName(licence.name, licence.number && `(${licence.number})`) || 'record returned'
          : why)

        if (licence.found) {
          // An expired licence is a real disqualification, not a footnote:
          // FRSC's own record says this person may not currently drive.
          if (licence.expired !== null) {
            add('Licence is still valid', !licence.expired,
              `${licence.expired ? 'expired' : 'expires'} ${licence.expiryDate}`)
          }
          add('Face matches licence photo', facePassed(f),
            `${f.message || 'no result'} (confidence ${f.confidence ?? 'n/a'})`)
        } else {
          // Nothing came back to compare a face against, so no face check is
          // recorded — a phantom "face did not match" would read as an accusation
          // when the truth is that FRSC had nothing to show. Logged because the
          // shape of a failure response is not documented anywhere.
          console.warn('prembly licence: no record returned —',
            JSON.stringify({ httpStatus, keys: Object.keys(data), detail: data.detail, message: data.message }))
        }
      } catch (err) {
        return { status: 'error', checks, summary: `Licence check failed: ${err.message}` }
      }
    }
  }

  // Registered name vs the government record. Advisory — people abbreviate,
  // and the document is the authority — but a wholly different name is worth
  // an admin's eye.
  const officialName = ninName || licenceName
  if (officialName && registeredName) {
    add('Matches the name they registered with', namesAgree(officialName, registeredName),
      `registered "${registeredName}" vs document "${officialName}"`)
  }

  const required = checks.filter(c => c.name !== 'Matches the name they registered with')
  const status = required.length && required.every(c => c.passed) ? 'verified' : 'failed'
  const failed = checks.filter(c => !c.passed).map(c => c.name)
  return {
    status,
    checks,
    ninName,
    licenceName,
    licence,
    licencePhoto,
    summary: status === 'verified'
      ? 'All identity checks passed'
      : `Failed: ${failed.join('; ')}`,
  }
}

module.exports = { configured, verifyIdentity, namesAgree, BASE_URL }
