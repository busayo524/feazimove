import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, NEON, ACCENT as OLIVE, DANGER_SOFT, ON_NEON, INFO_SOFT_2, INFO_TEXT, OK_SOFT, OK_SOFT_2, OK_TEXT } from '../../theme/palette'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { AlertCircle, CheckCircle, Lock, ShieldCheck } from 'lucide-react'
import StepUpModal from '../../components/StepUpModal'
import AppearanceSetting from '../../components/AppearanceSetting'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

export default function AdminSettings() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const forced = !!user?.forcePasswordChange

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showStepUp, setShowStepUp] = useState(false)

  // Step 1: validate, then require an emailed code before changing.
  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    if (!currentPassword || newPassword.length < 8) { setError('Please fill in all fields.'); return }
    setShowStepUp(true)
  }

  // Step 2: run the change with the emailed code — throws on failure so the
  // 2FA modal shows the error and stays open.
  async function verifyAndChange(challengeId, code) {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword, challengeId, code })
    if (res.data?.token) localStorage.setItem('fm_token', res.data.token)
    if (res.data?.refreshToken) localStorage.setItem('fm_refresh', res.data.refreshToken)
    updateUser({ forcePasswordChange: false })
    setShowStepUp(false)
    setSuccess(true)
    setCurrentPassword(''); setNewPassword(''); setConfirm('')
    if (forced) setTimeout(() => navigate('/admin', { replace: true }), 1200)
  }

  const content = (
    <div style={{ maxWidth: 440 }}>
      {forced && (
        <div style={{ display:'flex', gap:10, padding:'12px 16px', background:INFO_SOFT_2, border:'1px solid #fde68a', borderRadius:10, marginBottom:20 }}>
          <Lock size={16} color="#854d0e" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:16, color:INFO_TEXT }}>You're using a temporary password. Set a new one to continue.</p>
        </div>
      )}

      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:22 }}>
        <p style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:4 }}>Change Password</p>
        <p style={{ fontSize:16, color:MUTED, marginBottom:18 }}>Use at least 8 characters, one uppercase letter, and one number.</p>

        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:16, fontWeight:600, color:TEXT, marginBottom:6 }}>Current Password</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:15.5, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          <label style={{ display:'block', fontSize:16, fontWeight:600, color:TEXT, marginBottom:6 }}>New Password</label>
          <input type="password" autoComplete="off" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:15.5, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          <label style={{ display:'block', fontSize:16, fontWeight:600, color:TEXT, marginBottom:6 }}>Confirm New Password</label>
          <input type="password" autoComplete="off" value={confirm} onChange={e => setConfirm(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:15.5, marginBottom:16, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          {error && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:14 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:16, color:'#ef4444' }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:OK_SOFT_2, border:'1px solid #86efac', borderRadius:10, marginBottom:14 }}>
              <CheckCircle size={14} color="#15803d" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:16, color:OK_TEXT }}>Password updated.</p>
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:'12px', borderRadius:10, background:NEON, color:ON_NEON, border:'none', fontWeight:700, fontSize:15.5, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
      {showStepUp && (
        <StepUpModal purpose="change_password" actionText="change your password"
          onVerify={verifyAndChange} onClose={() => setShowStepUp(false)}/>
      )}
    </div>
  )

  // Forced flow: no sidebar, full-screen, can't navigate away until resolved
  if (forced) {
    return (
      <div style={{ minHeight:'100vh', background:'#f5f7f2', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:440 }}>
          <p style={{ fontWeight:900, fontSize:20, color:TEXT, marginBottom:18, textAlign:'center' }}>FeaziMove Admin</p>
          {content}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout title="Settings">
      {content}
      <div style={{ maxWidth: 520, marginTop: 20 }}><AppearanceSetting/></div>
      <AuthenticatorPanel/>
    </AdminLayout>
  )
}

/* Authenticator (TOTP) enrolment — the second factor that gates full KYC
   access. Deliberately app-based rather than email: an emailed code is only as
   strong as the mailbox, which is also what recovers the admin password. */
function AuthenticatorPanel() {
  const [state, setState] = useState(null)     // { enabled, pending, vaultConfigured }
  const [setup, setSetup] = useState(null)     // { secret, qrDataUri }
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = React.useCallback(() => {
    api.get('/admin/security/totp')
      .then(res => setState(res.data))
      .catch(() => setState({ enabled: false, vaultConfigured: false }))
  }, [])
  React.useEffect(() => { load() }, [load])

  async function startSetup() {
    setBusy(true); setError('')
    try {
      const res = await api.post('/admin/security/totp/setup')
      setSetup(res.data)
    } catch (err) {
      setError(err.data?.message || 'Could not start setup.')
    } finally { setBusy(false) }
  }

  async function confirm(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.post('/admin/security/totp/enable', { code })
      setNotice(res.data.message)
      setSetup(null); setCode('')
      load()
    } catch (err) {
      setError(err.data?.message || 'Could not verify that code.')
    } finally { setBusy(false) }
  }

  async function disable() {
    if (!code || code.length !== 6) { setError('Enter the current 6-digit code to remove it.'); return }
    setBusy(true); setError('')
    try {
      const res = await api.post('/admin/security/totp/disable', { code })
      setNotice(res.data.message)
      setCode('')
      load()
    } catch (err) {
      setError(err.data?.message || 'Could not remove the authenticator.')
    } finally { setBusy(false) }
  }

  const inputStyle = {
    width:'100%', padding:'12px 14px', borderRadius:10, fontSize:20, letterSpacing:'0.3em',
    textAlign:'center', border:`1.5px solid ${BORDER}`, boxSizing:'border-box',
    background:CARD, color:TEXT, fontFamily:'inherit', fontWeight:700, marginBottom:12,
  }

  if (!state) return null

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:24, maxWidth:520, marginTop:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
        <ShieldCheck size={17} color={OLIVE}/>
        <p style={{ margin:0, fontWeight:800, fontSize:16, color:TEXT }}>Authenticator App</p>
      </div>
      <p style={{ fontSize:16, color:MUTED, marginBottom:18, lineHeight:1.55 }}>
        Required to view a user’s full KYC details, including their complete BVN. Use Google
        Authenticator, Authy, Microsoft Authenticator or 1Password.
      </p>

      {notice && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:OK_SOFT, border:'1px solid #86efac', borderRadius:10, marginBottom:14 }}>
          <CheckCircle size={14} color="#15803d" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:16, color:OK_TEXT }}>{notice}</p>
        </div>
      )}
      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:14 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:16, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {!state.vaultConfigured && (
        <p style={{ fontSize:16, color:INFO_TEXT, lineHeight:1.5 }}>
          The KYC vault is not configured on this server, so the authenticator cannot be set up.
          Set <code>KYC_ENCRYPTION_KEY</code> in the backend environment first.
        </p>
      )}

      {state.vaultConfigured && state.enabled && (
        <>
          <p style={{ fontSize:16, color:OK_TEXT, fontWeight:700, marginBottom:14 }}>
            ✓ Active since {new Date(state.enrolledAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })}
          </p>
          <p style={{ fontSize:15.5, color:MUTED, marginBottom:10 }}>
            To remove it, enter the current code from your app.
          </p>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000" inputMode="numeric" style={inputStyle}/>
          <button onClick={disable} disabled={busy}
            style={{ padding:'10px 16px', borderRadius:10, background:'none', border:'1px solid #fca5a5',
              color:'#ef4444', fontWeight:700, fontSize:16, cursor:'pointer', fontFamily:'inherit' }}>
            Remove authenticator
          </button>
        </>
      )}

      {state.vaultConfigured && !state.enabled && !setup && (
        <button onClick={startSetup} disabled={busy}
          style={{ padding:'11px 20px', borderRadius:10, background:NEON, border:'none', color:ON_NEON,
            fontWeight:800, fontSize:16, cursor:'pointer', fontFamily:'inherit' }}>
          {busy ? 'Preparing…' : 'Set up authenticator'}
        </button>
      )}

      {setup && (
        <form onSubmit={confirm}>
          <p style={{ fontSize:16, color:TEXT, fontWeight:700, marginBottom:10 }}>1. Scan this with your app</p>
          <img src={setup.qrDataUri} alt="Authenticator QR code" width={200} height={200}
            style={{ display:'block', borderRadius:10, border:`1px solid ${BORDER}`, marginBottom:12 }}/>
          <p style={{ fontSize:15.5, color:MUTED, marginBottom:6 }}>
            Can’t scan? Enter this key manually:
          </p>
          <p style={{ fontFamily:'monospace', fontSize:16, background:'#f5f7f2', padding:'8px 10px',
            borderRadius:8, wordBreak:'break-all', marginBottom:16, color:TEXT }}>{setup.secret}</p>
          <p style={{ fontSize:16, color:TEXT, fontWeight:700, marginBottom:10 }}>2. Enter the 6-digit code it shows</p>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000" inputMode="numeric" autoFocus style={inputStyle}/>
          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" disabled={busy || code.length !== 6}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', fontWeight:800, fontSize:16, fontFamily:'inherit',
                background:(busy || code.length !== 6)?BORDER:NEON, color:(busy || code.length !== 6)?MUTED:ON_NEON,
                cursor:(busy || code.length !== 6)?'not-allowed':'pointer' }}>
              {busy ? 'Verifying…' : 'Confirm & enable'}
            </button>
            <button type="button" onClick={() => { setSetup(null); setCode(''); setError('') }}
              style={{ padding:'11px 16px', borderRadius:10, background:'none', border:`1.5px solid ${BORDER}`,
                color:MUTED, fontWeight:700, fontSize:16, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
