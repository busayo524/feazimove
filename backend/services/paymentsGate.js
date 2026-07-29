/**
 * Sandbox payment-rail gate.
 *
 * While ANCHOR_BASE_URL points at Anchor's SANDBOX, the rails are not real:
 * virtual NUBANs are not NIBSS-registered accounts (a real transfer to one
 * bounces or vanishes) and a NIP payout "succeeds" without moving any money —
 * which would debit a driver's wallet and record it as sent while they receive
 * nothing. That is fine for our own testing and unacceptable for real users, so
 * when the site is live on a public domain the money-moving endpoints are
 * restricted to an explicit allowlist of test accounts.
 *
 * Configure with:
 *   PAYMENTS_TEST_ALLOWLIST=@feazimove.com,someone@gmail.com
 * Entries are exact emails, or "@domain" to allow a whole domain. The gate is
 * INACTIVE when the list is empty, so setting live Anchor keys (or clearing the
 * variable) opens the rails to everyone with no code change.
 *
 * PAYMENTS_TEST_MODE=1 forces the gate on even against live keys; =0 forces it
 * off. Both are escape hatches — normally leave it unset.
 */
const { query } = require('../db')

function sandboxRails() {
  if (process.env.PAYMENTS_TEST_MODE === '1') return true
  if (process.env.PAYMENTS_TEST_MODE === '0') return false
  return /sandbox/i.test(process.env.ANCHOR_BASE_URL || '')
}

function allowlist() {
  return (process.env.PAYMENTS_TEST_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
}

// Deliberately fail-OPEN on an empty list: an unconfigured environment behaves
// exactly as it did before this gate existed, so a missing variable can never
// silently break a live launch. Safety comes from setting the list.
function active() {
  return sandboxRails() && allowlist().length > 0
}

function emailAllowed(email) {
  const e = (email || '').toLowerCase()
  if (!e) return false
  return allowlist().some(entry => (entry.startsWith('@') ? e.endsWith(entry) : e === entry))
}

const UNAVAILABLE = 'Wallet payments are temporarily unavailable while we finish '
  + 'testing with our banking partner. Nothing has been charged — please try again soon.'

// Express middleware for the authenticated money-moving routes.
async function requireTestAccount(req, res, next) {
  try {
    if (!active()) return next()
    const r = await query('SELECT email FROM users WHERE id = $1', [req.user.id])
    if (emailAllowed(r.rows[0]?.email)) return next()
    return res.status(503).json({ message: UNAVAILABLE })
  } catch (err) { next(err) }
}

// For the admin payout-approval path: approving a non-test user's payout would
// mark real money as sent through sandbox rails.
async function payoutAllowed(userId) {
  if (!active()) return { ok: true }
  const r = await query('SELECT email FROM users WHERE id = $1', [userId])
  const email = r.rows[0]?.email
  if (emailAllowed(email)) return { ok: true }
  return {
    ok: false,
    message: `Payments are in sandbox test mode, so this transfer would be recorded `
      + `as sent without moving real money. ${email || 'This user'} is not on `
      + `PAYMENTS_TEST_ALLOWLIST — add them, or wait for live keys, before approving.`,
  }
}

// Logged once at boot so the mode is visible in AppSail logs.
function describe() {
  if (!sandboxRails()) return 'Anchor rails: LIVE'
  return active()
    ? `Anchor rails: SANDBOX — payments restricted to ${allowlist().join(', ')}`
    : 'Anchor rails: SANDBOX — OPEN TO ALL USERS (PAYMENTS_TEST_ALLOWLIST is unset)'
}

module.exports = { active, emailAllowed, requireTestAccount, payoutAllowed, describe, sandboxRails }
