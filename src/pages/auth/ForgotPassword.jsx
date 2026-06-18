import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Mail, AlertCircle } from 'lucide-react'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'

const NEON = '#ccff00'
const DARK = '#0a0a0a'

function sanitizePhone(val) {
  return val.replace(/[^0-9+\-\s()]/g, '').slice(0, 20)
}

export default function ForgotPassword() {
  const [phone,   setPhone]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone) { setError('Please enter your phone number.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/forgot-password', { phone })
      setSent(true)
    } catch {
      setSent(true) // prevent phone enumeration — always show success
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '15px 18px', borderRadius: 10, fontSize: 16,
    background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
    border: '1.5px solid #e0e0e0', fontFamily: 'inherit', transition: 'border-color 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

      {/* Logo — side by side */}
      <Link to="/" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 28 }}>
        <img src={faviconImg} alt="FeaziMove" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <span style={{ fontSize: 26, letterSpacing: '-0.02em', color: DARK }}>
          <span style={{ fontWeight: 500 }}>Feazi</span><span style={{ fontWeight: 900 }}>Move</span>
        </span>
      </Link>

      {/* Heading */}
      <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 900, color: DARK, letterSpacing: '-0.03em', marginBottom: 6, textAlign: 'center' }}>
        Reset Password
      </h1>
      <p style={{ fontSize: 16, color: '#777', marginBottom: 32, textAlign: 'center' }}>
        {sent ? 'Check your phone for the OTP' : "We'll send an OTP to your phone number"}
      </p>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 24px rgba(0,0,0,0.08)', padding: 'clamp(36px,5vw,52px)', width: '100%', maxWidth: 520 }}>

        {sent ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(204,255,0,0.15)', border: '2px solid #ccff00', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={30} style={{ color: NEON }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: DARK, marginBottom: 8 }}>Check your phone</h3>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, marginBottom: 28 }}>
              If that number is registered, you'll receive an OTP shortly.
              Enter it to reset your password.
            </p>
            <Link to="/login" style={{ display: 'block', width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700, background: NEON, color: DARK, textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label htmlFor="fp-phone" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
                Phone Number
              </label>
              <input
                id="fp-phone"
                type="tel"
                value={phone}
                onChange={e => { setPhone(sanitizePhone(e.target.value)); setError('') }}
                placeholder="+234 800 000 0000"
                autoComplete="tel"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = NEON}
                onBlur={e  => e.target.style.borderColor = '#e0e0e0'}
              />
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }} role="alert">
                  <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700,
                background: loading ? '#aaa' : NEON,
                color: loading ? '#fff' : DARK,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? <><Spinner /> Sending…</> : 'Send Reset OTP'}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#555', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to login
        </Link>
        <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center' }}>
          Need help?{' '}
          <a href="mailto:support@feazimove.com" style={{ color: '#2a6048', fontWeight: 600, textDecoration: 'none' }}>
            support@feazimove.com
          </a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Spinner() {
  return <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
}
