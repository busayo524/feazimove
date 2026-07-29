/**
 * KYC vault — AES-256-GCM encryption for the few fields that must be
 * retrievable in full (currently the BVN) but must never sit in the database
 * as plaintext.
 *
 * Anchor can require complete KYC on any rider or driver at short notice, so
 * "hash it and forget it" is not an option the way it is for a password. GCM
 * is used rather than CBC so tampering with a stored value fails loudly at
 * decrypt time instead of silently returning garbage.
 *
 * KYC_ENCRYPTION_KEY is 32 bytes as 64 hex characters. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * LOSING OR CHANGING THE KEY MAKES EVERY STORED BVN PERMANENTLY UNREADABLE.
 * It is deliberately NOT derived from JWT_SECRET — rotating login secrets
 * must never destroy KYC records.
 */
const crypto = require('crypto')

const ALGO = 'aes-256-gcm'

function keyBuf() {
  const raw = process.env.KYC_ENCRYPTION_KEY
  if (!raw || !/^[0-9a-fA-F]{64}$/.test(raw.trim())) return null
  return Buffer.from(raw.trim(), 'hex')
}

// False when the key is missing or malformed — callers degrade gracefully
// (the last 4 digits still get stored) rather than failing a user's signup.
function configured() {
  return !!keyBuf()
}

// Returns "v1.<iv>.<tag>.<ciphertext>", all base64, or null if unavailable.
function encrypt(plaintext) {
  const key = keyBuf()
  if (!key || plaintext == null || plaintext === '') return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.')
}

// Null on any failure — wrong key, tampered value, unknown version. Callers
// treat null as "not available" and must never surface the raw blob instead.
function decrypt(blob) {
  const key = keyBuf()
  if (!key || !blob) return null
  const parts = String(blob).split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  try {
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(parts[1], 'base64'))
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'))
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

module.exports = { configured, encrypt, decrypt }
