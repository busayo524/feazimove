import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, ADMIN_BG as BG, DANGER_SOFT, ON_NEON, ACCENT_FILL, ON_ACCENT_FILL } from '../../theme/palette'
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { ArrowLeft, Ban, CheckCircle2, XCircle, FileText, AlertCircle, Car, Trash2,
  Eye, EyeOff, ShieldCheck, ShieldAlert, RefreshCw, Download } from 'lucide-react'

/* palette: themed tokens — see src/theme/palette.js */
const GREEN = '#2a6048', NEON = '#ccff00', OLIVE = '#243800'

const DOC_LABELS = {
  selfie:         'Selfie / Profile Photo',
  idDoc:          'National ID (NIN)',
  otherIdDoc:     'Other Valid ID Document',
  driverLicense:  "Driver's License",
  vehicleReg:     'Vehicle Registration',
  insurance:      'Insurance Certificate',
  profilePhoto:   'Profile Photo',
  carFront:       'Car — Front View',
  carSide:        'Car — Side View',
  roadworthiness: 'Roadworthiness Certificate',
  utilityBill:    'Utility Bill',
}

// Raw anchor_kyc_status values are internal shorthand — spell them out so an
// admin reading this page knows whether anyone actually verified the BVN.
function kycLabel(status, bvnSubmitted) {
  if (!status) return bvnSubmitted ? 'BVN submitted — no decision recorded' : 'Not started'
  return {
    submitted:        'Submitted — awaiting Anchor decision',
    pending_provider: 'BVN captured — not yet checked by Anchor',
    approved:         'Approved by Anchor',
    verified:         'Verified by Anchor',
    rejected:         'Rejected by Anchor',
  }[status] || status
}

function userStatus(u) {
  if (u.isPending) return 'pending'
  if (u.isActive)  return 'approved'
  return 'rejected'
}

const STATUS_MAP = {
  pending:  { label:'Pending', bg:'#fef9c3', fg:'#854d0e' },
  approved: { label:'Approved',       bg:'#dcfce7', fg:'#15803d' },
  rejected: { label:'Rejected',       bg:DANGER_SOFT, fg:'#dc2626' },
}

function Section({ title, action, children }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14,
      overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:20 }}>
      <div style={{ padding:'13px 20px', borderBottom:`1px solid ${BORDER}`, background:BG,
        display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <p style={{ margin:0, fontWeight:700, fontSize:13.5, color:MUTED, textTransform:'uppercase', letterSpacing:'0.06em' }}>{title}</p>
        {action}
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  )
}

/* Authenticator gate for full KYC. The code goes straight to the server —
   nothing is decrypted client-side, and the modal never holds the BVN unless
   the server released it. */
function KycRevealModal({ userId, onRevealed, onClose }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsSetup, setNeedsSetup] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.post(`/admin/users/${userId}/kyc/reveal`, { code })
      onRevealed(res.data.kyc)
    } catch (err) {
      // 428 means "no authenticator enrolled yet", not "wrong code".
      if (err.status === 428) setNeedsSetup(true)
      setError(err.data?.message || 'Could not verify that code.')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, width:'100%', maxWidth:400 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
          <ShieldCheck size={17} color={GREEN}/>
          <p style={{ margin:0, fontWeight:800, fontSize:16, color:TEXT }}>Verify it’s you</p>
        </div>
        <p style={{ fontSize:14.5, color:MUTED, marginBottom:16, lineHeight:1.5 }}>
          Full KYC data — including the complete BVN — is protected. Enter the current 6-digit
          code from your authenticator app. This access is recorded.
        </p>
        {needsSetup ? (
          <>
            <p style={{ fontSize:14.5, color:'#b45309', marginBottom:16, lineHeight:1.5 }}>
              You haven’t set up an authenticator app yet. Go to Settings → Security to enrol,
              then come back.
            </p>
            <button onClick={onClose}
              style={{ width:'100%', padding:'11px', borderRadius:10, background:ACCENT_FILL, color:ON_ACCENT_FILL, border:'none',
                fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
              Close
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" inputMode="numeric" autoFocus autoComplete="one-time-code"
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, fontSize:22, letterSpacing:'0.32em',
                textAlign:'center', border:`1.5px solid ${BORDER}`, marginBottom:12, boxSizing:'border-box',
                background:CARD, color:TEXT, fontFamily:'inherit', fontWeight:700 }}/>
            {error && <p style={{ fontSize:14, color:'#ef4444', marginBottom:12 }}>{error}</p>}
            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" disabled={busy || code.length !== 6}
                style={{ flex:1, padding:'11px', borderRadius:10, border:'none', fontWeight:800, fontSize:15, fontFamily:'inherit',
                  background:(busy || code.length !== 6)?BORDER:NEON, color:(busy || code.length !== 6)?MUTED:ON_NEON,
                  cursor:(busy || code.length !== 6)?'not-allowed':'pointer' }}>
                {busy ? 'Verifying…' : 'Reveal KYC'}
              </button>
              <button type="button" onClick={onClose}
                style={{ padding:'11px 16px', borderRadius:10, background:'none', border:`1.5px solid ${BORDER}`,
                  color:MUTED, fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* One photograph, fetched through the authenticated API — none of these images
   have a public URL — and released when it leaves the screen. */
function IdPhoto({ path, caption, note }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(null); setFailed(false)
    if (!path) return
    let url, cancelled = false
    api.getBlob(path)
      .then(blob => { if (cancelled) return; url = URL.createObjectURL(blob); setSrc(url) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [path])

  return (
    <div style={{ width:104, flexShrink:0 }}>
      <div style={{ width:104, height:130, borderRadius:10, overflow:'hidden', background:BG,
        border:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'center',
        textAlign:'center', padding:6, boxSizing:'border-box' }}>
        {src
          ? <img src={src} alt={caption} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          : <span style={{ fontSize:12.5, color:MUTED, lineHeight:1.4 }}>
              {failed ? 'Could not load' : note || 'Not available'}
            </span>}
      </div>
      <p style={{ margin:'6px 0 0', fontSize:12, fontWeight:700, color:MUTED,
        textTransform:'uppercase', letterSpacing:'0.05em', textAlign:'center' }}>{caption}</p>
    </div>
  )
}

const fmtDate = s => {
  const d = new Date(s)
  return isNaN(d) ? s : d.toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })
}

/* The licence exactly as FRSC holds it, printed photo included.
   The verdict above is a machine's opinion; this is the evidence it formed the
   opinion from. An admin who can read the name, the date of birth, the expiry
   and the face on the card can overrule a failed face match on sight — and can
   see when there is nothing behind the verdict at all. */
function LicenceRecord({ identity, userId }) {
  const rec = identity.licence
  // Checks run before the full record was captured stored only a name — and
  // sometimes stored Prembly's failure text in its place. Keep the name if it
  // is one; a string with digits in it never was.
  const legacyName = !/\d/.test(identity.licenceName || '') ? identity.licenceName : null
  const name = rec?.name || legacyName
  if (!rec?.found && !identity.hasLicencePhoto && !name) return null

  const rows = [
    ['Name on licence',  name],
    ['Licence number',   rec?.number],
    ['Date of birth',    rec?.dateOfBirth && fmtDate(rec.dateOfBirth)],
    ['Gender',           rec?.gender],
    ['State of issue',   rec?.stateOfIssue],
    ['Issued',           rec?.issuedDate && fmtDate(rec.issuedDate)],
  ].filter(([, v]) => v)

  return (
    <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${BORDER}` }}>
      <p style={{ margin:'0 0 12px', fontSize:12.5, fontWeight:700, color:MUTED,
        textTransform:'uppercase', letterSpacing:'0.06em' }}>What the licence itself says</p>

      <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:12 }}>
          <IdPhoto path={`/admin/users/${userId}/licence-photo`} caption="Photo on licence"
            note="FRSC returned no photo"/>
          <IdPhoto path={`/admin/avatar/${userId}`} caption="Selfie they uploaded"
            note="No selfie on file"/>
        </div>

        <div style={{ flex:'1 1 260px', minWidth:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'10px 18px' }}>
            {rows.map(([label, value]) => (
              <div key={label}>
                <p style={{ margin:'0 0 2px', fontSize:12, fontWeight:700, color:MUTED,
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:TEXT }}>{value}</p>
              </div>
            ))}
            {rec?.expiryDate && (
              <div>
                <p style={{ margin:'0 0 2px', fontSize:12, fontWeight:700, color:MUTED,
                  textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {rec.expired ? 'Expired' : 'Expires'}
                </p>
                <p style={{ margin:0, fontSize:15, fontWeight:800,
                  color:rec.expired ? '#b91c1c' : '#15803d' }}>
                  {fmtDate(rec.expiryDate)}
                </p>
              </div>
            )}
          </div>
          {rec?.expired && (
            <p style={{ margin:'12px 0 0', fontSize:14, color:'#b91c1c', lineHeight:1.5 }}>
              FRSC records this licence as expired. They cannot legally drive on it until it is renewed.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* Anchor names a funding account "FeaziMove Technologies Ltd / <rider>". This
   asks the only question that matters: does the rider's own name actually
   appear after the slash? Accounts issued before we sent the customer block
   came back as "FeaziMove Technologies Ltd / " — correct-looking until you
   notice there is nothing there. */
function nameOnAccountLooksRight(accountName, riderName) {
  const label = String(accountName || '')
  const after = label.includes('/') ? label.slice(label.indexOf('/') + 1) : label
  const surname = String(riderName || '').trim().split(/\s+/).filter(Boolean).pop() || ''
  return !!surname && after.toUpperCase().includes(surname.toUpperCase())
}

/* Replaces a funding account whose label never carried the rider's name. The
   old number keeps routing to them, so this is additive, not destructive. */
function ReissueFundingAccount({ userId, account, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function reissue() {
    if (!window.confirm(
      `Issue a NEW funding account for this rider?\n\nAnchor cannot rename an existing account, so the current one (${account.number}) is replaced. Transfers to the old number still reach them.`
    )) return
    setBusy(true); setError('')
    try {
      await api.post(`/admin/users/${userId}/reissue-funding-account`)
      onDone()
    } catch (err) {
      setError(err.data?.message || 'Could not issue a new account.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ marginTop:14, background:'#fff7ed', border:'1px solid #fdba74', borderRadius:12, padding:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
        <AlertCircle size={14} color="#c2410c"/>
        <p style={{ fontSize:14, fontWeight:800, color:'#9a3412' }}>This account is not in the rider’s name</p>
      </div>
      <p style={{ fontSize:13.5, color:MUTED, lineHeight:1.5, marginBottom:10 }}>
        Anchor issued it as “{account.name || '—'}”. Their KYC has since been approved, so a new
        account will carry their own name. Anchor cannot relabel the existing one.
      </p>
      {error && <p style={{ fontSize:13.5, color:'#ef4444', marginBottom:8 }}>{error}</p>}
      <button onClick={reissue} disabled={busy}
        style={{ padding:'9px 16px', borderRadius:10, background:'none', border:`1.5px solid ${OLIVE}`,
          color:OLIVE, fontWeight:700, fontSize:14, cursor:busy?'wait':'pointer', fontFamily:'inherit' }}>
        {busy ? 'Issuing…' : 'Issue New Funding Account'}
      </button>
    </div>
  )
}

/* The Prembly verdict. Advisory by design — it never blocks approval, but a
   failure is loud enough that approving anyway is a deliberate act. */
function IdentityVerdict({ identity, userId, onRerun }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const TONE = {
    verified: { bg:'#f0fdf4', bd:'#86efac', fg:'#15803d', label:'IDENTITY VERIFIED',
      icon:<ShieldCheck size={17} color="#15803d"/> },
    failed:   { bg:DANGER_SOFT, bd:'#fca5a5', fg:'#b91c1c', label:'IDENTITY CHECK FAILED',
      icon:<ShieldAlert size={17} color="#b91c1c"/> },
    error:    { bg:'#fffbeb', bd:'#fcd34d', fg:'#b45309', label:'VERIFICATION COULD NOT RUN',
      icon:<AlertCircle size={17} color="#b45309"/> },
    skipped:  { bg:BG, bd:BORDER, fg:MUTED, label:'NOT VERIFIED',
      icon:<AlertCircle size={17} color={MUTED}/> },
  }
  const t = TONE[identity.status] || TONE.skipped

  async function rerun() {
    // Prembly bills per lookup (~₦120) and charges even when the record is not
    // found, so a mistyped NIN costs the same as a real one. Never let this be
    // a stray click.
    if (!window.confirm('Re-run identity verification?\n\nThis performs a fresh government lookup and charges your Prembly wallet (about ₦120), even if no record is found.')) return
    setBusy(true); setError('')
    try {
      await api.post(`/admin/users/${userId}/verify-identity`)
      onRerun()
    } catch (err) {
      setError(err.data?.message || 'Could not re-run verification.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ background:t.bg, border:`1.5px solid ${t.bd}`, borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:10 }}>
        {t.icon}
        <p style={{ margin:0, fontWeight:900, fontSize:14.5, color:t.fg, letterSpacing:'0.04em' }}>{t.label}</p>
        <span style={{ flex:1 }}/>
        <button onClick={rerun} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
            border:`1px solid ${BORDER}`, background:CARD, color:MUTED, fontWeight:700, fontSize:13,
            cursor: busy?'wait':'pointer', fontFamily:'inherit' }}>
          <RefreshCw size={12}/> {busy ? 'Checking…' : 'Re-run'}
        </button>
      </div>

      <p style={{ fontSize:15, color:t.fg, lineHeight:1.55, marginBottom:12 }}>{identity.summary}</p>

      {/* Each individual check, so a failure says exactly what disagreed. */}
      {identity.checks?.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
          {identity.checks.map((c, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
              {c.passed
                ? <CheckCircle2 size={14} color="#15803d" style={{ flexShrink:0, marginTop:2 }}/>
                : <XCircle size={14} color="#b91c1c" style={{ flexShrink:0, marginTop:2 }}/>}
              <div>
                <p style={{ fontSize:14.5, fontWeight:600, color:TEXT }}>{c.name}</p>
                {c.detail && <p style={{ fontSize:13.5, color:MUTED, marginTop:1 }}>{c.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {identity.ninName && (
        <div style={{ borderTop:`1px solid ${t.bd}`, paddingTop:10 }}>
          <p style={{ fontSize:12.5, color:MUTED, fontWeight:600 }}>NAME ON NIN</p>
          <p style={{ fontSize:14.5, color:TEXT, fontWeight:700 }}>{identity.ninName}</p>
        </div>
      )}

      {/* The licence record replaces the old bare "NAME ON LICENCE" line — a
          name alone could not be checked against anything. */}
      <LicenceRecord identity={identity} userId={userId}/>

      {identity.checkedAt && (
        <p style={{ fontSize:13, color:MUTED, marginTop:10 }}>
          Checked {new Date(identity.checkedAt).toLocaleString('en-NG', { timeZone:'Africa/Lagos' })}
        </p>
      )}
      {error && <p style={{ fontSize:14, color:'#ef4444', marginTop:8 }}>{error}</p>}
    </div>
  )
}

function InfoGrid({ rows }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'14px 24px' }}>
      {rows.filter(([,v]) => v != null && v !== '').map(([label, value]) => (
        <div key={label}>
          <p style={{ margin:'0 0 3px', fontSize:12.5, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:TEXT }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

function ProfilePhoto({ userId, hasAvatar, initials }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!hasAvatar) return
    let url
    let cancelled = false
    api.getBlob(`/admin/avatar/${userId}`)
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {})
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [userId, hasAvatar])

  return (
    <div style={{ width:72, height:72, borderRadius:'50%', background:NEON, color:ON_NEON,
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden', fontWeight:800, fontSize:26, flexShrink:0 }}>
      {src
        ? <img src={src} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : initials}
    </div>
  )
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser]   = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const [action, setAction] = useState('')
  // Revealed KYC lives only in memory for this page view — never cached, and
  // gone on refresh, so the full BVN is on screen no longer than needed.
  const [kyc, setKyc] = useState(null)
  const [showReveal, setShowReveal] = useState(false)

  // Built client-side from the already-revealed payload, so exporting needs no
  // second authenticator prompt and the code never travels in a URL.
  function exportKyc() {
    if (!kyc) return
    const rows = [
      ['Field', 'Value'],
      ['User ID', kyc.userId], ['Full Name', kyc.name], ['Email', kyc.email],
      ['Phone', kyc.phone], ['Role', kyc.role],
      ['Date of Birth', kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString('en-NG') : ''],
      ['Gender', kyc.gender || ''], ['City', kyc.city || ''], ['Area', kyc.area || ''],
      ['Residential Address', kyc.residentialAddress || ''],
      ['ID Type', kyc.idType || ''], ['ID Number', kyc.idNumber || ''],
      ["Driver's Licence Number", user?.driversLicenseNumber || ''],
      ['BVN (full)', kyc.bvn || (kyc.bvnUnavailable ? 'not recoverable' : '')],
      ['Wallet KYC Status', kyc.kycStatus || ''],
      ['Anchor Customer ID', kyc.anchorCustomerId || ''],
      ['Funding Account', kyc.fundingAccount ? `${kyc.fundingAccount.number} (${kyc.fundingAccount.bank || ''})` : ''],
      ['Payout Bank', kyc.bankName || ''], ['Payout Account', kyc.bankAccountNumber || ''],
      ['Joined', kyc.joinedAt ? new Date(kyc.joinedAt).toLocaleString('en-NG') : ''],
      ['Revealed At', new Date(kyc.revealedAt).toLocaleString('en-NG')],
      ['Revealed By', kyc.revealedBy || ''],
    ]
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '').replace(/"/g, '""')
      return /[",\n]/.test(s) ? `"${s}"` : s
    }).join(',')).join('\n')
    // BOM so Excel on Windows reads it as UTF-8 (matches the server exports).
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feazimove-kyc-${(kyc.name || 'user').replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function load() {
    api.get(`/admin/users/${id}`)
      .then(res => setUser(res.data.user))
      .catch(err => setError(err.data?.message || 'Could not load this user.'))
  }
  useEffect(() => { load() }, [id])

  async function approve() {
    setBusy(true); setAction('approve')
    try {
      await api.patch(`/admin/users/${id}/approve`)
      load()
    } catch (err) { alert(err.data?.message || 'Could not approve user.') }
    finally { setBusy(false); setAction('') }
  }

  async function reject() {
    if (!window.confirm('Are you sure you want to reject this registration?')) return
    setBusy(true); setAction('reject')
    try {
      await api.patch(`/admin/users/${id}/reject`)
      load()
    } catch (err) { alert(err.data?.message || 'Could not reject user.') }
    finally { setBusy(false); setAction('') }
  }

  async function toggleSuspend() {
    setBusy(true); setAction('suspend')
    try {
      await api.patch(`/admin/users/${id}/status`, { isActive: !user.isActive })
      load()
    } catch (err) { alert(err.data?.message || 'Could not update status.') }
    finally { setBusy(false); setAction('') }
  }

  async function deleteUser() {
    if (!window.confirm(`Permanently delete ${user.name} and all their data? This cannot be undone.`)) return
    setBusy(true); setAction('delete')
    try {
      await api.delete(`/admin/users/${id}`)
      navigate('/admin/user-management', { replace: true })
    } catch (err) {
      alert(err.data?.message || 'Could not delete user.')
      setBusy(false); setAction('')
    }
  }

  async function viewDocument(docId) {
    try {
      const blob = await api.getBlob(`/admin/documents/${docId}`)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { alert('Could not load that file.') }
  }

  if (error) return (
    <AdminLayout title="User Detail">
      <div style={{ display:'flex', gap:8, padding:'12px 16px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10 }}>
        <AlertCircle size={15} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ fontSize:14, color:'#ef4444' }}>{error}</p>
      </div>
    </AdminLayout>
  )

  if (!user) return (
    <AdminLayout title="User Detail">
      <p style={{ color:MUTED, fontSize:14 }}>Loading…</p>
    </AdminLayout>
  )

  const st = userStatus(user)
  const s  = STATUS_MAP[st]
  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'U'
  const isDriver = user.role === 'driver' || user.canDrive

  return (
    <AdminLayout title="User Detail">
      {/* Back */}
      <button onClick={() => navigate('/admin/user-management')}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none',
          cursor:'pointer', color:MUTED, fontWeight:600, fontSize:14, fontFamily:'inherit', padding:0, marginBottom:20 }}>
        <ArrowLeft size={16}/> Back to User Management
      </button>

      {/* Profile card + action buttons */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:24,
        marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
          {/* Avatar with View button */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
            <ProfilePhoto userId={user.id} hasAvatar={user.hasAvatar} initials={initials}/>
            {user.hasAvatar && (
              <button onClick={async () => {
                  try {
                    const blob = await api.getBlob(`/admin/avatar/${user.id}`)
                    window.open(URL.createObjectURL(blob), '_blank')
                  } catch { alert('Could not load photo.') }
                }}
                style={{ fontSize:12.5, fontWeight:700, color:GREEN, background:'none', border:`1px solid ${GREEN}`,
                  borderRadius:6, padding:'3px 10px', cursor:'pointer', fontFamily:'inherit' }}>
                View Photo
              </button>
            )}
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:20, color:TEXT }}>{user.name}</p>
            <p style={{ margin:0, fontSize:14, color:MUTED }}>{user.email || user.phone}</p>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:13.5, fontWeight:700, padding:'4px 12px', borderRadius:20,
                background:s.bg, color:s.fg, border:`1px solid ${s.fg}33` }}>{s.label}</span>
              <span style={{ fontSize:13.5, fontWeight:600, color:MUTED, textTransform:'capitalize' }}>{user.role}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {/* Pending: show Approve + Reject */}
            {st === 'pending' && user.role !== 'admin' && <>
              <button onClick={approve} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:'#dcfce7', color:'#15803d', border:'1.5px solid #86efac',
                  fontWeight:700, fontSize:14.5, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy&&action==='approve'?0.6:1 }}>
                <CheckCircle2 size={15}/>{busy&&action==='approve'?'Approving…':'Approve'}
              </button>
              <button onClick={reject} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:DANGER_SOFT, color:'#dc2626', border:'1.5px solid #fca5a5',
                  fontWeight:700, fontSize:14.5, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy&&action==='reject'?0.6:1 }}>
                <XCircle size={15}/>{busy&&action==='reject'?'Rejecting…':'Reject'}
              </button>
            </>}
            {/* Approved: show Suspend */}
            {st === 'approved' && user.role !== 'admin' && (
              <button onClick={toggleSuspend} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:DANGER_SOFT, color:'#dc2626', border:'1.5px solid #fca5a5',
                  fontWeight:700, fontSize:14.5, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
                <Ban size={15}/>Suspend User
              </button>
            )}
            {/* Rejected/suspended: show Reactivate */}
            {st === 'rejected' && user.role !== 'admin' && (
              <button onClick={approve} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:'#dcfce7', color:'#15803d', border:'1.5px solid #86efac',
                  fontWeight:700, fontSize:14.5, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
                <CheckCircle2 size={15}/>Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <Section title="Personal Information">
        <InfoGrid rows={[
          ['Full Name',    user.name],
          ['Email',        user.email],
          ['Phone',        user.phone],
          ['Role',         user.role?.charAt(0).toUpperCase() + user.role?.slice(1)],
          ['City',         user.city || '—'],
          ['Home Area',    user.area || '—'],
          ['Work / Office Area', user.workArea || '—'],
          ['Date of Birth', user.dateOfBirth
            ? new Date(user.dateOfBirth).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })
            : '—'],
          ['Gender',       user.gender ? user.gender.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '—'],
          ['Bank Name',      user.bankName || '—'],
          ['Account Number', user.bankAccountNumber || '—'],
          ['Date Joined',  new Date(user.joinedAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })],
          ['Wallet Balance', `₦${(user.walletBalance||0).toLocaleString()}`],
        ]}/>
      </Section>

      {/* Government identity verification. Sits ABOVE the KYC section and the
          approve/reject buttons' reach because it is the single most important
          thing to read before approving someone. */}
      {user.identity?.status && <IdentityVerdict identity={user.identity} userId={user.id} onRerun={load}/>}

      {/* Identity + wallet KYC — shown for riders AND drivers. Registration
          ID details and the CBN/BVN wallet check are one compliance story, so
          they live in one section even when only half of it is filled in. */}
      {/* driversLicenseNumber must be in this condition: drivers are identified
          by their licence, not a NIN, so idType/idNumber are empty for them and
          the whole section used to vanish on exactly the accounts an admin most
          needs to vet. */}
      {(user.idType || user.idNumber || user.driversLicenseNumber || user.bvnSubmitted || user.residentialAddress) && (
        <Section
          title="Identity Verification/KYC"
          action={
            <div style={{ display:'flex', gap:8 }}>
              {kyc ? (
                <>
                  <button onClick={exportKyc}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
                      border:`1px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:700, fontSize:13,
                      cursor:'pointer', fontFamily:'inherit' }}>
                    <Download size={12}/> Export KYC
                  </button>
                  <button onClick={() => setKyc(null)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
                      border:`1px solid ${BORDER}`, background:CARD, color:MUTED, fontWeight:700, fontSize:13,
                      cursor:'pointer', fontFamily:'inherit' }}>
                    <EyeOff size={12}/> Hide
                  </button>
                </>
              ) : (
                <button onClick={() => setShowReveal(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8,
                    border:'none', background:ACCENT_FILL, color:ON_ACCENT_FILL, fontWeight:700, fontSize:13,
                    cursor:'pointer', fontFamily:'inherit' }}>
                  <Eye size={12}/> View full KYC
                </button>
              )}
            </div>
          }
        >
          <InfoGrid rows={[
            ['ID Type',   user.idType || '—'],
            ['ID Number', kyc?.idNumber || user.idNumber || '—'],
            // The number the applicant typed, alongside the verdict panel above
            // that says whether it checked out. Shown for any driver even when
            // blank, so a missing licence is visible rather than merely absent.
            ...(user.driversLicenseNumber || user.role === 'driver'
              ? [["Driver's Licence Number", user.driversLicenseNumber || '—']]
              : []),
            // Masked until an authenticator code releases the real number.
            ['BVN', kyc
              ? (kyc.bvn || (kyc.bvnUnavailable
                  ? 'Not recoverable — submitted before encrypted storage'
                  : '—'))
              : user.bvnMasked
                ? `${user.bvnMasked} — hidden`
                : user.bvnSubmitted ? 'Submitted before BVN capture' : '—'],
            ['Residential Address', kyc?.residentialAddress || user.residentialAddress || '—'],
            ['Date of Birth', kyc?.dateOfBirth
              ? new Date(kyc.dateOfBirth).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })
              : '—'],
            ['Wallet KYC Status', kycLabel(user.kycStatus, user.bvnSubmitted)],
            ['Anchor Customer ID', kyc?.anchorCustomerId || '—'],
            ['Funding Account', user.fundingAccount
              ? `${user.fundingAccount.number}${user.fundingAccount.bank ? ` · ${user.fundingAccount.bank}` : ''}`
              : '—'],
          ]}/>
          {/* Anchor cannot relabel an account once issued, so a funding account
              that is not in the rider's own name can only be replaced. Shown
              only when there is something to replace and the rider is verified. */}
          {user.fundingAccount && user.kycStatus === 'account_named'
            && !nameOnAccountLooksRight(user.fundingAccount.name, user.name) && (
            <ReissueFundingAccount userId={user.id} account={user.fundingAccount} onDone={load}/>
          )}

          {kyc && (
            <p style={{ fontSize:13, color:'#b45309', marginTop:14, lineHeight:1.5 }}>
              Full KYC revealed {new Date(kyc.revealedAt).toLocaleString('en-NG', { timeZone:'Africa/Lagos' })}.
              This access has been recorded in the activity log.
            </p>
          )}
        </Section>
      )}

      {showReveal && (
        <KycRevealModal
          userId={user.id}
          onRevealed={data => { setKyc(data); setShowReveal(false) }}
          onClose={() => setShowReveal(false)}
        />
      )}

      {/* Vehicle info (drivers) */}
      {isDriver && (
        <Section title={<span style={{display:'flex',alignItems:'center',gap:6}}><Car size={13}/>Vehicle Information</span>}>
          <InfoGrid rows={[
            ['Vehicle Type',  user.vehicleType],
            ['Make',          user.vehicleMake],
            ['Model',         user.vehicleModel],
            ['Year',          user.vehicleYear],
            ['Color',         user.vehicleColor],
            ['Plate Number',  user.plateNumber],
          ]}/>
        </Section>
      )}

      {/* Documents */}
      <Section title={`Uploaded Documents (${user.documents?.length || 0})`}>
        {!user.documents?.length ? (
          <p style={{ color:MUTED, fontSize:14, margin:0 }}>No documents uploaded.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {user.documents.map(doc => (
              <div key={doc.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 16px', borderRadius:10, border:`1px solid ${BORDER}`, background:BG }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'#f3fbd3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FileText size={15} color="#3f6212"/></div>
                  <div>
                    <p style={{ margin:0, fontWeight:600, fontSize:14, color:TEXT }}>
                      {DOC_LABELS[doc.doc_type] || doc.doc_type}
                    </p>
                    <p style={{ margin:0, fontSize:13.5, color:MUTED }}>
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => viewDocument(doc.id)}
                  style={{ padding:'7px 16px', borderRadius:8, background:NEON, color:ON_NEON,
                    border:'none', fontWeight:600, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Danger zone — permanent deletion */}
      <div style={{ background:DANGER_SOFT, border:'1px solid #fecdca', borderRadius:14, padding:'20px 24px',
        marginTop:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:'1 1 300px', minWidth:0 }}>
          <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:14, color:'#b42318' }}>Delete this user</p>
          <p style={{ margin:0, fontSize:14.5, color:'#912018', lineHeight:1.6 }}>
            Permanently removes {user.name} and all their data — wallet, documents, messages and bookings are
            erased; ride history is anonymized. This cannot be undone.
          </p>
        </div>
        <button onClick={deleteUser} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10,
            background:'#d92d20', color:'#fff', border:'none', fontWeight:700, fontSize:14.5,
            cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1, flexShrink:0 }}>
          <Trash2 size={15}/> {action === 'delete' ? 'Deleting…' : 'Delete User'}
        </button>
      </div>

    </AdminLayout>
  )
}
