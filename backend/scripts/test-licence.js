/**
 * One-off check that Prembly's driver's-licence endpoint works for OUR account,
 * before a real driver ever registers.
 *
 *   node scripts/test-licence.js <LICENCE_NUMBER> <YYYY-MM-DD>
 *
 * Sends a placeholder image, so the FACE comparison is expected to fail — that
 * part is only meaningful with a real selfie. What this proves is the rest:
 * our key is accepted on this endpoint, the licence number + date of birth
 * resolve to a real FRSC record, and the response shape matches what
 * services/prembly.js parses.
 *
 * The licence number is never printed in full.
 *
 * NOTE: Prembly bills per lookup (~₦120) even when nothing is found.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const axios = require('axios')

const [licence, dob] = process.argv.slice(2)
if (!licence || !dob) {
  console.error('Usage: node scripts/test-licence.js <LICENCE_NUMBER> <YYYY-MM-DD>')
  process.exit(1)
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
  console.error('Date of birth must look like 1995-09-17')
  process.exit(1)
}

const mask = s => s.slice(0, 3) + '•'.repeat(Math.max(0, s.length - 6)) + s.slice(-3)

;(async () => {
  const key = (process.env.PREMBLY_API_KEY || '').trim()
  if (!key || /^your_/i.test(key)) {
    console.error('PREMBLY_API_KEY is missing or still a placeholder in backend/.env')
    process.exit(1)
  }
  console.log(`Checking licence ${mask(licence)} with DOB ${dob}…\n`)

  const res = await axios.post(
    'https://api.prembly.com/verification/drivers_license/face',
    { number: licence, dob, image: 'aW52YWxpZC1wbGFjZWhvbGRlcg==' },
    { headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      timeout: 45000, validateStatus: () => true }
  )

  const d = res.data || {}
  const rec = d.data || d.drivers_license || {}
  const face = d.face_data || {}
  const name = [rec.firstName || rec.firstname, rec.middleName || rec.middlename,
                rec.lastName || rec.lastname].filter(Boolean).join(' ')

  console.log('HTTP status        :', res.status)
  console.log('message            :', d.message || d.detail || '(none)')
  console.log('licence record     :', name || '(no name returned)')
  console.log('date of birth      :', rec.birthDate || rec.dob || '(not returned)')
  console.log('expiry             :', rec.expiryDate || rec.expiry_date || '(not returned)')
  console.log('face comparison    :', face.message || '(none)',
    face.confidence !== undefined ? `(confidence ${face.confidence})` : '')
  console.log('billed             :', d.billing_info
    ? `${d.billing_info.was_charged ? 'yes' : 'no'} ${d.billing_info.amount || ''} ${d.billing_info.currency || ''}`
    : '(not reported)')

  console.log('\nVERDICT:')
  if (res.status === 401 || res.status === 403) {
    console.log('  KEY REJECTED on this endpoint — the licence product may not be enabled.')
  } else if (name) {
    console.log('  WORKS — the licence resolved to a real FRSC record.')
    console.log('  (The face result is meaningless here; a real selfie is needed for that.)')
  } else {
    console.log('  Authenticated, but no record came back. Check the number and date of birth.')
  }
  // Field names we did not expect are worth seeing — the parser depends on them.
  console.log('\nraw keys returned  :', Object.keys(rec).join(', ') || '(none)')
})().catch(e => { console.error('Request failed:', e.message); process.exit(1) })
