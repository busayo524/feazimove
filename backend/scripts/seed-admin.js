/**
 * Seeds (or re-seeds) the default FeaziMove admin account.
 * Run once: node scripts/seed-admin.js
 *
 * Generates a fresh random password every run and prints it ONCE —
 * it is never stored or logged anywhere else. The account is flagged
 * force_password_change so the admin must set their own password on
 * first login.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { pool, query } = require('../db')

const ADMIN_EMAIL = 'support@feazimove.com'
const SALT_ROUNDS = 12

function generatePassword() {
  // 16 random bytes → base64url, trimmed to 20 chars — strong, URL/console safe
  return crypto.randomBytes(16).toString('base64url').slice(0, 20)
}

;(async () => {
  try {
    const password = generatePassword()
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const existing = await query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL])

    if (existing.rows[0]) {
      await query(
        `UPDATE users SET password_hash = $1, force_password_change = true,
           role = 'admin', active_role = 'admin', is_active = true,
           is_pending = false, email_verified = true
         WHERE email = $2`,
        [passwordHash, ADMIN_EMAIL]
      )
      console.log('✅ Existing admin account reset.')
    } else {
      await query(
        `INSERT INTO users (name, email, password_hash, role, active_role,
           is_active, is_pending, email_verified, force_password_change, can_ride, can_drive)
         VALUES ($1, $2, $3, 'admin', 'admin', true, false, true, true, false, false)`,
        ['System Administrator', ADMIN_EMAIL, passwordHash]
      )
      console.log('✅ Admin account created.')
    }

    console.log('──────────────────────────────────────────────')
    console.log('  Email:    ', ADMIN_EMAIL)
    console.log('  Password: ', password)
    console.log('──────────────────────────────────────────────')
    console.log('Save this password now — it will not be shown again.')
    console.log('You will be required to change it on first login.')
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
})()
