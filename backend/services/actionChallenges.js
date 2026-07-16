/**
 * Step-up 2FA challenges — a short-lived 6-digit code emailed to the account
 * owner that must be verified before a sensitive action (password change,
 * wallet withdrawal). The code is stored only as a bcrypt hash.
 */
const bcrypt = require('bcryptjs')
const { query } = require('../db')

const CODE_TTL_MINUTES = 10
const MAX_ATTEMPTS = 5
const PURPOSES = ['change_password', 'wallet_withdraw']

const genCode = () => String(Math.floor(100000 + Math.random() * 900000)) // 6 digits

// Create a challenge, return { challengeId, code }. Caller emails the code.
async function createChallenge(userId, purpose) {
  if (!PURPOSES.includes(purpose)) { const e = new Error('Unknown action.'); e.status = 400; throw e }
  const code = genCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000)
  // Invalidate any earlier open challenge of the same purpose for this user
  await query(
    `UPDATE action_challenges SET used = true WHERE user_id = $1 AND purpose = $2 AND used = false`,
    [userId, purpose]
  )
  const r = await query(
    `INSERT INTO action_challenges (user_id, purpose, code_hash, expires_at) VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, purpose, codeHash, expiresAt]
  )
  return { challengeId: r.rows[0].id, code }
}

// Verify and consume a challenge. Throws { status, message } on any failure;
// resolves on success (marks the challenge used so it can't be replayed).
async function consumeChallenge(userId, purpose, challengeId, code) {
  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e }
  if (!challengeId || !code) fail(403, 'Verification required.')
  const r = await query(
    `SELECT id, code_hash, expires_at, used, attempts FROM action_challenges
      WHERE id = $1 AND user_id = $2 AND purpose = $3`,
    [challengeId, userId, purpose]
  )
  const c = r.rows[0]
  if (!c) fail(400, 'Verification code not found. Please request a new one.')
  if (c.used) fail(400, 'This code has already been used. Please request a new one.')
  if (new Date(c.expires_at).getTime() < Date.now()) fail(400, 'Your code has expired. Please request a new one.')
  if (c.attempts >= MAX_ATTEMPTS) {
    await query(`UPDATE action_challenges SET used = true WHERE id = $1`, [c.id])
    fail(400, 'Too many incorrect attempts. Please request a new code.')
  }
  const ok = await bcrypt.compare(String(code), c.code_hash)
  if (!ok) {
    await query(`UPDATE action_challenges SET attempts = attempts + 1 WHERE id = $1`, [c.id])
    fail(400, 'Incorrect code. Please check your email and try again.')
  }
  await query(`UPDATE action_challenges SET used = true WHERE id = $1`, [c.id])
}

module.exports = { createChallenge, consumeChallenge, PURPOSES }
