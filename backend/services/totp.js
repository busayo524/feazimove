/**
 * TOTP (RFC 6238) — the second factor for revealing full KYC data.
 *
 * Implemented on node's crypto rather than pulled from npm: the algorithm is
 * ~40 lines, and an auth primitive with a supply chain is a worse trade than
 * one we can read end to end. Compatible with Google Authenticator, Authy,
 * Microsoft Authenticator and 1Password (SHA-1, 6 digits, 30s — the defaults
 * every authenticator app assumes when the otpauth:// URI omits them).
 */
const crypto = require('crypto')

const DIGITS = 6
const PERIOD = 30
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' // RFC 4648 base32

function base32Encode(buf) {
  let bits = 0, value = 0, out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(str) {
  let bits = 0, value = 0
  const out = []
  for (const ch of String(str).toUpperCase().replace(/[\s=]/g, '')) {
    const idx = ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error('Invalid base32 character in TOTP secret.')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

// 160-bit secret — the size RFC 4226 recommends for HMAC-SHA1.
function generateSecret() {
  return base32Encode(crypto.randomBytes(20))
}

function hotp(secret, counter) {
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac('sha1', secret).update(counterBuf).digest()
  // Dynamic truncation (RFC 4226 §5.4)
  const offset = digest[digest.length - 1] & 0x0f
  const code = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0')
}

/**
 * `window` allows codes from adjacent 30s steps so a phone clock that drifts
 * by a few seconds still works. 1 step either side is the usual compromise
 * between usability and keeping the guessable surface small.
 */
function verify(secretB32, token, window = 1) {
  const clean = String(token || '').replace(/\D/g, '')
  if (clean.length !== DIGITS || !secretB32) return false
  let secret
  try { secret = base32Decode(secretB32) } catch { return false }
  const step = Math.floor(Date.now() / 1000 / PERIOD)
  const supplied = Buffer.from(clean)
  let ok = false
  // Every candidate is checked (no early return) so the time taken does not
  // reveal which step matched.
  for (let i = -window; i <= window; i++) {
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, step + i)), supplied)) ok = true
  }
  return ok
}

// The string an authenticator app scans or accepts typed in.
function otpauthUri(secretB32, accountLabel, issuer = 'FeaziMove Admin') {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`)
  const params = new URLSearchParams({
    secret: secretB32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

module.exports = { generateSecret, verify, otpauthUri, PERIOD, DIGITS }
