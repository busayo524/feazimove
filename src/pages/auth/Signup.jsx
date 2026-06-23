/**
 * FeaziMove — Signup Page (two-phase)
 * Phase 1: Full Name, Email, Phone, Password, Confirm Password
 * Phase 2: 6 OTP boxes appear inline after submit (no page change)
 * After OTP → navigate to /register/:role with prefill + token
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, User, Mail, Phone, Lock,
  AlertCircle, RefreshCw, CheckCircle2,
} from 'lucide-react'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'

const LIME  = '#ccff00'
const GREEN = '#2a6048'
const DARK  = '#0a1f15'
const OTP_SECS = 5 * 60

function sanitize(v)      { return v.replace(/[<>"'`]/g, '').trimStart() }
function validEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }
function validPhone(p)    { return /^(\+?234|0)[789][01]\d{8}$/.test(p.replace(/\s/g, '')) }
function validPassword(p) { return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) }
function maskEmail(e)     { return e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c) }
function fmt(s)           { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

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
  return             { pct: 100,          label: 'Strong', color: LIME }
}

const fieldStyle = (err) => ({
  width: '100%', padding: '13px 14px 13px 42px',
  border: `1.5px solid ${err ? '#ef4444' : '#e5e7eb'}`,
  borderRadius: 12, fontSize: 15, color: DARK,
  background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
})

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
    if (!validPhone(form.phone))            e.phone    = 'Valid Nigerian number required.'
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
        err.status === 409 ? err.data?.message || 'Account already exists. Please sign in.'
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

  const otpFull  = digits.every(Boolean)
  const pw       = strength(form.password)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 60%, #f0f9ff 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Navbar */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '14px clamp(20px,5vw,60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: DARK, letterSpacing: '-0.3px' }}>
              Feazi<span style={{ color: GREEN }}>Move</span>
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Smart Urban Mobility</p>
          </div>
        </Link>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Have an account?{' '}
          <Link to="/login" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </span>
      </nav>

      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px,5vw,64px) clamp(16px,4vw,24px)',
      }}>
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* ══════ PHASE 1 — FORM ══════ */}
          {phase === 'form' && (
            <div style={{
              background: '#fff', borderRadius: 24,
              boxShadow: '0 8px 48px rgba(0,0,0,0.09)',
              overflow: 'hidden',
            }}>
              <div style={{ height: 5, background: `linear-gradient(90deg, ${LIME}, #a8e063)` }} />

              <div style={{ padding: 'clamp(28px,5vw,48px)' }}>
                <h1 style={{
                  margin: '0 0 6px',
                  fontSize: 'clamp(1.5rem,3.5vw,1.9rem)',
                  fontWeight: 900, color: DARK, letterSpacing: '-0.5px',
                }}>
                  {role === 'driver' ? 'Create Driver Account' : 'Create Rider Account'}
                </h1>
                <p style={{ margin: '0 0 32px', fontSize: 14, color: '#6b7280' }}>
                  Sign up as a {role === 'driver' ? 'FeaziMove driver' : 'FeaziMove rider'} — it only takes a minute.
                </p>

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Full Name */}
                  <Field label="Full Name" Icon={User} error={errors.name}>
                    <input
                      type="text" value={form.name} placeholder="Adaeze Okonkwo"
                      autoComplete="name"
                      onChange={e => set('name', e.target.value)}
                      style={fieldStyle(!!errors.name)}
                      onFocus={e => { e.target.style.borderColor = LIME; e.target.style.boxShadow = '0 0 0 3px rgba(204,255,0,0.18)' }}
                      onBlur={e  => { e.target.style.borderColor = errors.name ? '#ef4444' : '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    />
                  </Field>

                  {/* Email */}
                  <Field label="Email Address" Icon={Mail} error={errors.email}>
                    <input
                      type="email" value={form.email} placeholder="you@example.com"
                      autoComplete="email"
                      onChange={e => set('email', e.target.value)}
                      style={fieldStyle(!!errors.email)}
                      onFocus={e => { e.target.style.borderColor = LIME; e.target.style.boxShadow = '0 0 0 3px rgba(204,255,0,0.18)' }}
                      onBlur={e  => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    />
                  </Field>

                  {/* Phone */}
                  <Field label="Phone Number" Icon={Phone} error={errors.phone} hint="e.g. 08012345678 or +2348012345678">
                    <input
                      type="tel" value={form.phone} placeholder="+234 801 234 5678"
                      autoComplete="tel"
                      onChange={e => set('phone', e.target.value)}
                      style={fieldStyle(!!errors.phone)}
                      onFocus={e => { e.target.style.borderColor = LIME; e.target.style.boxShadow = '0 0 0 3px rgba(204,255,0,0.18)' }}
                      onBlur={e  => { e.target.style.borderColor = errors.phone ? '#ef4444' : '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    />
                  </Field>

                  {/* Password */}
                  <Field label="Password" Icon={Lock} error={errors.password}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password} placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      onChange={e => set('password', e.target.value)}
                      style={{ ...fieldStyle(!!errors.password), paddingRight: 46 }}
                      onFocus={e => { e.target.style.borderColor = LIME; e.target.style.boxShadow = '0 0 0 3px rgba(204,255,0,0.18)' }}
                      onBlur={e  => { e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      aria-label="Toggle password visibility"
                      style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2,
                      }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {form.password && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${pw.pct}%`, background: pw.color, transition: 'width 0.3s, background 0.3s' }} />
                        </div>
                        <p style={{ fontSize: 11, color: pw.color, margin: '4px 0 0', fontWeight: 600 }}>{pw.label}</p>
                      </div>
                    )}
                  </Field>

                  {/* Confirm Password */}
                  <Field label="Confirm Password" Icon={Lock} error={errors.confirm}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.confirm} placeholder="Repeat your password"
                      autoComplete="new-password"
                      onChange={e => set('confirm', e.target.value)}
                      style={fieldStyle(!!errors.confirm)}
                      onFocus={e => { e.target.style.borderColor = LIME; e.target.style.boxShadow = '0 0 0 3px rgba(204,255,0,0.18)' }}
                      onBlur={e  => { e.target.style.borderColor = errors.confirm ? '#ef4444' : '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    />
                  </Field>

                  {formErr && <ErrBox msg={formErr} />}

                  <button type="submit" disabled={sending} style={{
                    width: '100%', padding: '15px', borderRadius: 50, border: 'none',
                    background: sending ? '#d1d5db' : LIME,
                    color: sending ? '#9ca3af' : DARK,
                    fontSize: 15, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: sending ? 'none' : '0 4px 20px rgba(204,255,0,0.4)',
                    transition: 'all 0.2s', marginTop: 4,
                  }}>
                    {sending ? <><Spin dark /> Sending code…</> : <>Continue <ArrowRight size={16} /></>}
                  </button>

                  <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', margin: 0 }}>
                    By continuing you agree to our{' '}
                    <Link to="/policies" style={{ color: GREEN, fontWeight: 600 }}>Terms & Privacy Policy</Link>
                  </p>
                </form>
              </div>
            </div>
          )}

          {/* ══════ PHASE 2 — OTP ══════ */}
          {phase === 'otp' && (
            <div style={{
              background: '#fff', borderRadius: 24,
              boxShadow: '0 8px 48px rgba(0,0,0,0.09)',
              overflow: 'hidden',
            }}>
              <div style={{ height: 5, background: `linear-gradient(90deg, ${LIME}, #a8e063)` }} />

              <div style={{ padding: 'clamp(32px,5vw,52px)', textAlign: 'center' }}>

                {/* Icon */}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e0f7e9, #ccff00)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 4px 24px rgba(204,255,0,0.35)',
                }}>
                  <Mail size={32} color={DARK} />
                </div>

                <h2 style={{ margin: '0 0 8px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 900, color: DARK }}>
                  Check your email
                </h2>
                <p style={{ margin: '0 0 32px', fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
                  We sent a 6-digit code to <strong style={{ color: DARK }}>{maskedEmail}</strong>.<br />
                  Enter it below to verify your account.
                </p>

                {/* Six OTP boxes */}
                <div style={{ display: 'flex', gap: 'clamp(8px,2vw,12px)', justifyContent: 'center', marginBottom: 12 }}>
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
                        width: 'clamp(48px,13vw,62px)',
                        height: 'clamp(58px,15vw,72px)',
                        textAlign: 'center',
                        fontSize: 'clamp(22px,5vw,30px)',
                        fontWeight: 900, fontFamily: 'monospace',
                        borderRadius: 14,
                        border: `2.5px solid ${otpErr ? '#fca5a5' : d ? LIME : '#e5e7eb'}`,
                        background: d ? '#f0fdf4' : '#fafafa',
                        color: DARK, outline: 'none',
                        cursor: verifying || timeLeft <= 0 ? 'not-allowed' : 'text',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.target.style.borderColor = LIME; e.target.style.boxShadow = '0 0 0 3px rgba(204,255,0,0.22)' }}
                      onBlur={e  => { e.target.style.borderColor = d ? LIME : otpErr ? '#fca5a5' : '#e5e7eb'; e.target.style.boxShadow = 'none' }}
                    />
                  ))}
                </div>

                {/* Timer */}
                <p style={{
                  fontSize: 13, marginBottom: 20,
                  color: timeLeft === 0 ? '#ef4444' : timeLeft < 60 ? '#f59e0b' : '#9ca3af',
                  fontWeight: timeLeft < 60 ? 700 : 400,
                }}>
                  {timeLeft > 0 ? <>Expires in <strong>{fmt(timeLeft)}</strong></> : <strong>Code expired</strong>}
                </p>

                {otpErr && <ErrBox msg={otpErr} />}

                {/* Verify button */}
                <button
                  type="button" onClick={submitOtp}
                  disabled={verifying || !otpFull || timeLeft <= 0}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 50, border: 'none',
                    background: (verifying || !otpFull || timeLeft <= 0) ? '#e5e7eb' : LIME,
                    color:      (verifying || !otpFull || timeLeft <= 0) ? '#9ca3af' : DARK,
                    fontSize: 15, fontWeight: 800,
                    cursor: (verifying || !otpFull || timeLeft <= 0) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: (!verifying && otpFull && timeLeft > 0) ? '0 4px 20px rgba(204,255,0,0.4)' : 'none',
                    transition: 'all 0.2s', marginBottom: 20,
                  }}>
                  {verifying ? <><Spin /> Verifying…</> : <><CheckCircle2 size={17} /> Verify & Continue <ArrowRight size={15} /></>}
                </button>

                {/* Resend */}
                <div style={{ marginBottom: 20 }}>
                  {timeLeft > 0 ? (
                    <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                      Resend available in <strong>{fmt(timeLeft)}</strong>
                    </p>
                  ) : (
                    <button type="button" onClick={handleResend} disabled={resending}
                      style={{
                        background: 'none', border: 'none',
                        color: resending ? '#9ca3af' : GREEN,
                        fontSize: 13, fontWeight: 700,
                        cursor: resending ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'inherit', padding: 0,
                      }}>
                      <RefreshCw size={13} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} />
                      {resending ? 'Sending…' : 'Resend code'}
                    </button>
                  )}
                </div>

                <button type="button"
                  onClick={() => { setPhase('form'); setDigits(['', '', '', '', '', '']); setOtpErr('') }}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#9ca3af', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  ← Wrong email? Go back
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', marginTop: 24 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Field({ label, Icon, error, hint, children }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
        {label} <span style={{ color: '#ef4444' }}>*</span>
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={16} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: error ? '#ef4444' : '#9ca3af', pointerEvents: 'none',
        }} />}
        {children}
      </div>
      {error && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', margin: '5px 0 0' }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {hint && !error && <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 10, padding: '12px 16px',
    }} role="alert">
      <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
      <p style={{ color: '#dc2626', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{msg}</p>
    </div>
  )
}

function Spin({ dark }) {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%',
      border: `2px solid ${dark ? 'rgba(10,31,21,0.2)' : 'rgba(255,255,255,0.3)'}`,
      borderTopColor: dark ? DARK : '#fff',
      animation: 'spin 0.8s linear infinite', display: 'inline-block',
    }} />
  )
}
