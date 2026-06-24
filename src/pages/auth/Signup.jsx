import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'

const NEON  = '#ccff00'
const DARK  = '#0a0a0a'
const GREEN = '#2a6048'
const OTP_SECS = 5 * 60

function validEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }
function validPhone(p)    { return /^(\+?234|0)[789][01]\d{8}$/.test(p.replace(/\s/g, '')) }
function validPassword(p) { return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) }
function maskEmail(e)     { return e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c) }
function fmt(s)           { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
function sanitize(v)      { return v.replace(/[<>"'`]/g, '').trimStart() }

function strength(p) {
  if (!p) return { pct: 0, label: '', color: '#e5e7eb' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (s <= 2) return { pct: s / 5 * 100, label: 'Weak',   color: '#ef4444' }
  if (s === 3) return { pct: s / 5 * 100, label: 'Fair',   color: '#f59e0b' }
  if (s === 4) return { pct: s / 5 * 100, label: 'Good',   color: '#22c55e' }
  return             { pct: 100,          label: 'Strong', color: NEON }
}

export default function Signup() {
  const navigate    = useNavigate()
  const [params]    = useSearchParams()
  const role        = params.get('role') === 'driver' ? 'driver' : 'rider'

  const [phase,   setPhase]   = useState('form')
  const [form,    setForm]    = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [errors,  setErrors]  = useState({})
  const [formErr, setFormErr] = useState('')
  const [sending, setSending] = useState(false)

  const [userId,      setUserId]      = useState(null)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [digits,      setDigits]      = useState(['', '', '', '', '', ''])
  const [otpErr,      setOtpErr]      = useState('')
  const [verifying,   setVerifying]   = useState(false)
  const [resending,   setResending]   = useState(false)
  const [timeLeft,    setTimeLeft]    = useState(OTP_SECS)
  const inputRefs = useRef([])

  useEffect(() => {
    if (phase !== 'otp' || timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, timeLeft])

  function set(field, val) {
    setForm(p => ({ ...p, [field]: sanitize(val) }))
    setErrors(p => ({ ...p, [field]: '' }))
    setFormErr('')
  }

  function validate() {
    const e = {}
    if (!form.name || form.name.length < 2) e.name     = 'Enter your full name.'
    if (!validEmail(form.email))            e.email    = 'Enter a valid email address.'
    if (!validPhone(form.phone))            e.phone    = 'Valid Nigerian number required (e.g. 08012345678).'
    if (!validPassword(form.password))      e.password = 'Min 8 chars, 1 uppercase, 1 number.'
    if (form.password !== form.confirm)     e.confirm  = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSending(true); setFormErr('')
    try {
      const res = await api.post('/auth/signup', {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, confirmPassword: form.confirm, role,
      })
      setUserId(res.data.userId)
      setMaskedEmail(res.data.maskedEmail || maskEmail(form.email))
      setTimeLeft(OTP_SECS)
      setDigits(['', '', '', '', '', ''])
      setOtpErr('')
      setPhase('otp')
      setTimeout(() => inputRefs.current[0]?.focus(), 80)
    } catch (err) {
      setFormErr(
        err.status === 409 ? 'An account with those details already exists. Please sign in.'
        : err.status === 429 ? 'Too many attempts. Please wait before trying again.'
        : !err.status ? 'Cannot reach the server. Is the backend running?'
        : err.data?.message || 'Something went wrong. Please try again.'
      )
    } finally { setSending(false) }
  }

  const handleDigit = useCallback((i, val) => {
    const clean = val.replace(/\D/g, '').slice(-1)
    setDigits(prev => { const n = [...prev]; n[i] = clean; return n })
    setOtpErr('')
    if (clean && i < 5) inputRefs.current[i + 1]?.focus()
  }, [])

  const handleKey = useCallback((i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft'  && i > 0) inputRefs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputRefs.current[i + 1]?.focus()
    if (e.key === 'Enter') submitOtp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!p) return
    const n = ['', '', '', '', '', '']
    for (let i = 0; i < p.length; i++) n[i] = p[i]
    setDigits(n); setOtpErr('')
    inputRefs.current[Math.min(p.length, 5)]?.focus()
  }, [])

  async function submitOtp() {
    const otp = digits.join('')
    if (otp.length !== 6) { setOtpErr('Enter all 6 digits.'); return }
    if (timeLeft <= 0)    { setOtpErr('Code expired — request a new one.'); return }
    setVerifying(true); setOtpErr('')
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp })
      navigate(`/register/${res.data.role || role}`, {
        state: {
          registrationToken: res.data.registrationToken,
          prefill: { name: form.name, email: form.email, phone: form.phone, password: form.password, confirm: form.confirm },
        },
        replace: true,
      })
    } catch (err) {
      setOtpErr(
        err.status === 400 ? (err.data?.message || 'Invalid or expired code. Try again.')
        : err.status === 429 ? 'Too many attempts. Please wait.'
        : 'Something went wrong. Please try again.'
      )
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally { setVerifying(false) }
  }

  async function handleResend() {
    if (timeLeft > 0 || !userId) return
    setResending(true); setOtpErr('')
    try {
      await api.post('/auth/resend-otp', { userId })
      setDigits(['', '', '', '', '', ''])
      setTimeLeft(OTP_SECS)
      inputRefs.current[0]?.focus()
    } catch { setOtpErr('Could not resend. Please try again.') }
    finally  { setResending(false) }
  }

  const otpFull = digits.every(Boolean)
  const pw      = strength(form.password)

  const inputStyle = {
    width: '100%', padding: '15px 18px',
    borderRadius: 10, fontSize: 16,
    background: '#fff', color: '#1a1a1a',
    outline: 'none', boxSizing: 'border-box',
    border: '1.5px solid #e0e0e0',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }

  const labelStyle = {
    display: 'block', fontSize: 15,
    fontWeight: 600, color: '#1a1a1a', marginBottom: 8,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>

      {/* Logo */}
      <Link to="/" style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 28 }}>
        <img src={faviconImg} alt="FeaziMove" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <span style={{ fontSize: 26, letterSpacing: '-0.02em', color: DARK }}>
          <span style={{ fontWeight: 500 }}>Feazi</span><span style={{ fontWeight: 900 }}>Move</span>
        </span>
      </Link>

      {/* ══ PHASE 1 — FORM ══ */}
      {phase === 'form' && (<>
        <p style={{ fontSize: 16, color: '#6c63ff', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
          Step 1 of 3
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 900, color: DARK, letterSpacing: '-0.03em', marginBottom: 6, textAlign: 'center' }}>
          {role === 'driver' ? 'Create Driver Account' : 'Create Rider Account'}
        </h1>
        <p style={{ fontSize: 16, color: '#777', marginBottom: 32, textAlign: 'center' }}>
          Sign up as a FeaziMove {role} — it only takes a minute.
        </p>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 24px rgba(0,0,0,0.08)', padding: 'clamp(36px,5vw,52px)', width: '100%', maxWidth: 520 }}>
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text" value={form.name} placeholder="Adaeze Okonkwo"
                autoComplete="name"
                onChange={e => set('name', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : '#e0e0e0' }}
                onFocus={e => e.target.style.borderColor = NEON}
                onBlur={e  => e.target.style.borderColor = errors.name ? '#ef4444' : '#e0e0e0'}
              />
              {errors.name && <Err msg={errors.name} />}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email" value={form.email} placeholder="you@example.com"
                autoComplete="email"
                onChange={e => set('email', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : '#e0e0e0' }}
                onFocus={e => e.target.style.borderColor = NEON}
                onBlur={e  => e.target.style.borderColor = errors.email ? '#ef4444' : '#e0e0e0'}
              />
              {errors.email && <Err msg={errors.email} />}
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel" value={form.phone} placeholder="+234 801 234 5678"
                autoComplete="tel"
                onChange={e => set('phone', e.target.value)}
                style={{ ...inputStyle, borderColor: errors.phone ? '#ef4444' : '#e0e0e0' }}
                onFocus={e => e.target.style.borderColor = NEON}
                onBlur={e  => e.target.style.borderColor = errors.phone ? '#ef4444' : '#e0e0e0'}
              />
              {errors.phone
                ? <Err msg={errors.phone} />
                : <p style={{ fontSize: 12, color: '#aaa', marginTop: 5 }}>e.g. 08012345678 or +2348012345678</p>
              }
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password} placeholder="Min 8 chars, 1 uppercase, 1 number"
                  autoComplete="new-password"
                  onChange={e => set('password', e.target.value)}
                  style={{ ...inputStyle, paddingRight: 46, borderColor: errors.password ? '#ef4444' : '#e0e0e0' }}
                  onFocus={e => e.target.style.borderColor = NEON}
                  onBlur={e  => e.target.style.borderColor = errors.password ? '#ef4444' : '#e0e0e0'}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${pw.pct}%`, background: pw.color, transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: pw.color, margin: '4px 0 0', fontWeight: 600 }}>{pw.label}</p>
                </div>
              )}
              {errors.password && <Err msg={errors.password} />}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.confirm} placeholder="Repeat your password"
                  autoComplete="new-password"
                  onChange={e => set('confirm', e.target.value)}
                  style={{ ...inputStyle, paddingRight: 46, borderColor: errors.confirm ? '#ef4444' : '#e0e0e0' }}
                  onFocus={e => e.target.style.borderColor = NEON}
                  onBlur={e  => e.target.style.borderColor = errors.confirm ? '#ef4444' : '#e0e0e0'}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && <Err msg={errors.confirm} />}
            </div>

            {formErr && <ErrBox msg={formErr} />}

            <button type="submit" disabled={sending} style={{
              width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700,
              background: sending ? '#aaa' : NEON,
              color: sending ? '#fff' : DARK,
              border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s', marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {sending ? <><Spinner /> Sending code…</> : 'Continue'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Already have an account?{' '}
            <Link to="/login" style={{ color: DARK, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </span>
          <span style={{ color: '#ccc' }}>·</span>
          <Link to="/register" style={{ color: '#777', textDecoration: 'none' }}>← Change role</Link>
        </div>
        <p style={{ marginTop: 10, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
          By continuing you agree to our{' '}
          <Link to="/policies" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Terms & Privacy Policy</Link>
        </p>
      </>)}

      {/* ══ PHASE 2 — OTP ══ */}
      {phase === 'otp' && (<>
        <p style={{ fontSize: 16, color: '#6c63ff', fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>
          Step 2 of 3
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 900, color: DARK, letterSpacing: '-0.03em', marginBottom: 6, textAlign: 'center' }}>
          Check your email
        </h1>
        <p style={{ fontSize: 16, color: '#777', marginBottom: 32, textAlign: 'center', lineHeight: 1.6 }}>
          We sent a 6-digit code to <strong style={{ color: DARK }}>{maskedEmail}</strong>.<br />
          Enter it below to verify your account.
        </p>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 24px rgba(0,0,0,0.08)', padding: 'clamp(36px,5vw,52px)', width: '100%', maxWidth: 520 }}>

          {/* OTP boxes */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={verifying || timeLeft <= 0}
                aria-label={`Digit ${i + 1}`}
                style={{
                  width: 'clamp(48px,12vw,62px)',
                  height: 'clamp(56px,14vw,68px)',
                  textAlign: 'center',
                  fontSize: 'clamp(22px,5vw,28px)',
                  fontWeight: 900, fontFamily: 'monospace',
                  borderRadius: 10,
                  border: `1.5px solid ${otpErr ? '#fca5a5' : d ? NEON : '#e0e0e0'}`,
                  background: d ? '#f9ffe6' : '#fff',
                  color: DARK, outline: 'none',
                  cursor: verifying || timeLeft <= 0 ? 'not-allowed' : 'text',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = NEON}
                onBlur={e  => e.target.style.borderColor = d ? NEON : otpErr ? '#fca5a5' : '#e0e0e0'}
              />
            ))}
          </div>

          {/* Timer */}
          <p style={{
            textAlign: 'center', fontSize: 14, marginBottom: 20,
            color: timeLeft === 0 ? '#ef4444' : timeLeft < 60 ? '#f59e0b' : '#aaa',
            fontWeight: timeLeft < 60 ? 700 : 400,
          }}>
            {timeLeft > 0 ? <>Expires in <strong>{fmt(timeLeft)}</strong></> : <strong>Code expired</strong>}
          </p>

          {otpErr && <ErrBox msg={otpErr} />}

          {/* Verify */}
          <button
            type="button" onClick={submitOtp}
            disabled={verifying || !otpFull || timeLeft <= 0}
            style={{
              width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700,
              background: (verifying || !otpFull || timeLeft <= 0) ? '#e5e7eb' : NEON,
              color: (verifying || !otpFull || timeLeft <= 0) ? '#9ca3af' : DARK,
              border: 'none',
              cursor: (verifying || !otpFull || timeLeft <= 0) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 20, transition: 'all 0.2s',
            }}>
            {verifying ? <><Spinner /> Verifying…</> : 'Verify & Continue'}
          </button>

          {/* Resend */}
          <div style={{ textAlign: 'center' }}>
            {timeLeft > 0 ? (
              <p style={{ fontSize: 13, color: '#aaa' }}>
                Didn't get it? Resend in <strong>{fmt(timeLeft)}</strong>
              </p>
            ) : (
              <button type="button" onClick={handleResend} disabled={resending}
                style={{
                  background: 'none', border: 'none',
                  color: resending ? '#aaa' : GREEN,
                  fontSize: 14, fontWeight: 700,
                  cursor: resending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontFamily: 'inherit',
                }}>
                <RefreshCw size={13} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} />
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>
        </div>

        <button type="button"
          onClick={() => { setPhase('form'); setDigits(['', '', '', '', '', '']); setOtpErr('') }}
          style={{ marginTop: 16, background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Wrong email? Go back
        </button>
      </>)}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Err({ msg }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', margin: '6px 0 0' }}>
      <AlertCircle size={12} /> {msg}
    </p>
  )
}

function ErrBox({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '11px 14px', marginBottom: 4 }} role="alert">
      <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
      <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{msg}</p>
    </div>
  )
}

function Spinner() {
  return <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: DARK, animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
}
