/**
 * Refresh-token store — long-lived, single-use, rotating tokens that renew the
 * short-lived (15m) access JWT. Security properties:
 *   • Opaque random 256-bit token; only its sha256 hash is stored.
 *   • Rotation: every use issues a new token and marks the old one `used`.
 *   • Reuse detection: presenting an already-used token means it was stolen and
 *     replayed → the entire family (that login session) is revoked immediately.
 *   • Password change / logout revoke tokens so a stolen refresh token dies.
 */
const crypto = require('crypto')
const { query } = require('../db')

const REFRESH_TTL_DAYS = 30

const sha256 = t => crypto.createHash('sha256').update(t).digest('hex')

// Mint a brand-new refresh token in a fresh family (called at login/signup).
async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const familyId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, sha256(token), familyId, expiresAt]
  )
  return token
}

// Validate + rotate. Returns { userId, refreshToken } on success, or throws an
// Error with a `.code` describing why it failed.
async function rotateRefreshToken(token) {
  if (!token || typeof token !== 'string') { const e = new Error('No refresh token.'); e.code = 'missing'; throw e }
  const hash = sha256(token)
  const res = await query(
    `SELECT id, user_id, family_id, expires_at, revoked, used FROM refresh_tokens WHERE token_hash = $1`,
    [hash]
  )
  const row = res.rows[0]
  if (!row) { const e = new Error('Invalid refresh token.'); e.code = 'invalid'; throw e }

  if (row.revoked) { const e = new Error('Session revoked.'); e.code = 'revoked'; throw e }

  // Reuse of an already-rotated token = theft replay → nuke the whole family.
  if (row.used) {
    await query(`UPDATE refresh_tokens SET revoked = true WHERE family_id = $1`, [row.family_id])
    const e = new Error('Refresh token reuse detected — session revoked.'); e.code = 'reuse'; throw e
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    const e = new Error('Refresh token expired.'); e.code = 'expired'; throw e
  }

  // Rotate: mark this one used, issue a successor in the SAME family.
  const next = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)
  await query(`UPDATE refresh_tokens SET used = true WHERE id = $1`, [row.id])
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [row.user_id, sha256(next), row.family_id, expiresAt]
  )
  return { userId: row.user_id, refreshToken: next }
}

// Revoke a single family (used on logout — kills just this device's session).
async function revokeRefreshToken(token) {
  if (!token) return
  const res = await query(`SELECT family_id FROM refresh_tokens WHERE token_hash = $1`, [sha256(token)])
  if (res.rows[0]) {
    await query(`UPDATE refresh_tokens SET revoked = true WHERE family_id = $1`, [res.rows[0].family_id])
  }
}

// Revoke EVERY session for a user (used on password change).
async function revokeAllForUser(userId) {
  await query(`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false`, [userId])
}

module.exports = { issueRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllForUser }
