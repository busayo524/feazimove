import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'

const NEON = '#ccff00'
const DARK = '#0a0a0a'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [stage, setStage]   = useState('email') // 'email' | 'reset' | 'done'
  const [email, setEmail]   = useState('')
  const [otp, setOtp]       = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode(e) {
    e?.preventDefault()
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setStage('reset') // always advance — no email enumeration
    } catch {
      setStage('reset')
    } finally { setLoading(false) }
  }

  async function resetPassword(e) {
    e.preventDefault()
    if (otp.length !== 6) { setError('Enter the 6-digit code from your email.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword })
      setStage('done')
    } catch (err) {
      setError(err.data?.message || 'Could not reset password. Please try again.')
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '15px 18px', borderRadius: 10, fontSize: 16,
    background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
    border: '1.5px solid #e0e0e0', fontFamily: 'inherit', transition: 'border-color 0.2s', colorScheme: 'light',
  }
  const label = { display: 'block', fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <Link to="/" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 28 }}>
        <img src={faviconImg} alt="FeaziMove" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <span style={{ fontSize: 26, letterSpacing: '-0.02em', color: DARK }}>
          <span style={{ fontWeight: 500 }}>Feazi</span><span style={{ fontWeight: 900 }}>Move</span>
        </span>
      </Link>

      <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 900, color: DARK, letterSpacing: '-0.03em', marginBottom: 6, textAlign: 'center' }}>
        Reset Password
      </h1>
      <p style={{ fontSize: 16, color: '#777', marginBottom: 32, textAlign: 'center' }}>
        {stage === 'email' ? "We'll email you a reset code"
          : stage === 'reset' ? 'Enter the code we emailed you'
          : 'All done'}
      </p>

      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 24px rgba(0,0,0,0.08)', padding: 'clamp(36px,5vw,52px)', width: '100%', maxWidth: 520 }}>

        {stage === 'done' ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(204,255,0,0.15)', border: '2px solid #ccff00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={30} style={{ color: NEON }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Password reset</h3>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, marginBottom: 28 }}>
              Your password has been changed. All other sessions were signed out for your security.
            </p>
            <button onClick={() => navigate('/login')}
              style={{ width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700, background: NEON, color: DARK, border: 'none', cursor: 'pointer' }}>
              Back to Sign In
            </button>
          </div>
        ) : stage === 'email' ? (
          <form onSubmit={sendCode} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="fp-email" style={label}>Email Address</label>
              <input id="fp-email" type="email" value={email} autoComplete="email"
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = NEON} onBlur={e => e.target.style.borderColor = '#e0e0e0'} />
              {error && <ErrorNote text={error} />}
            </div>
            <button type="submit" disabled={loading} style={btn(loading)}>
              {loading ? <><Spinner /> Sending…</> : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13.5, color: '#777', lineHeight: 1.6, margin: 0 }}>
              We emailed a 6-digit code to <strong style={{ color: DARK }}>{email}</strong>. Enter it below with your new password.
            </p>
            <div>
              <label htmlFor="fp-otp" style={label}>Reset Code</label>
              <input id="fp-otp" inputMode="numeric" maxLength={6} value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="000000" style={{ ...inputStyle, letterSpacing: 6, textAlign: 'center', fontSize: 20 }} />
            </div>
            <div>
              <label htmlFor="fp-np" style={label}>New Password</label>
              <input id="fp-np" type="password" value={newPassword} autoComplete="off"
                onChange={e => { setNewPassword(e.target.value); setError('') }}
                placeholder="At least 8 characters" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="fp-cp" style={label}>Confirm New Password</label>
              <input id="fp-cp" type="password" value={confirm} autoComplete="off"
                onChange={e => { setConfirm(e.target.value); setError('') }}
                placeholder="Re-enter new password" style={inputStyle} />
            </div>
            {error && <ErrorNote text={error} />}
            <button type="submit" disabled={loading} style={btn(loading)}>
              {loading ? <><Spinner /> Resetting…</> : 'Reset Password'}
            </button>
            <button type="button" onClick={sendCode} disabled={loading}
              style={{ background: 'none', border: 'none', color: '#2a6048', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              Resend code
            </button>
          </form>
        )}
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to login
        </Link>
        <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center' }}>
          Need help? <a href="mailto:support@feazimove.com" style={{ color: '#2a6048', fontWeight: 600, textDecoration: 'none' }}>support@feazimove.com</a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function btn(loading) {
  return {
    width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700,
    background: loading ? '#aaa' : NEON, color: loading ? '#fff' : DARK,
    border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }
}
function ErrorNote({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }} role="alert">
      <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
      <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{text}</p>
    </div>
  )
}
function Spinner() {
  return <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
}
