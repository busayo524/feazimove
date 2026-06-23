/**
 * FeaziMove — Signup Page (two-phase)
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 1 — Form:
 *   Role selector (Rider / Driver) + Name, Email, Phone, Password, Confirm
 *   → POST /api/auth/signup → OTP sent to email
 *
 * Phase 2 — OTP (appears inline after submit, no page change):
 *   6 digit-box squares, 5-min countdown, resend after expiry
 *   → POST /api/auth/verify-otp → navigate to /register/:role with prefill + token
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Eye, EyeOff, ArrowRight, User, Mail, Phone, Lock,
  AlertCircle, Car, Bike, RefreshCw, CheckCircle2,
} from 'lucide-react'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'

/* ── Brand tokens ─────────────────────────────────────────────────────────── */
const LIME  = '#ccff00'
const GREEN = '#2a6048'
const DARK  = '#0a1f15'

/* ── Constants ────────────────────────────────────────────────────────────── */
const OTP_SECS    = 5 * 60   // 5 minutes
const RESEND_SECS = 5 * 60   // resend allowed after 5 min (when timer hits 0)

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function sanitize(v)     { return v.replace(/[<>"'`]/g, '').trimStart() }
function validEmail(e)   { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }
function validPhone(p)   { return /^(\+?234|0)[789][01]\d{8}$/.test(p.replace(/\s/g,'')) }
function validPassword(p){ return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) }

function passwordStrength(p) {
  if (!p) return { pct: 0, label: '', color: '#e5e7eb' }
  let s = 0
  if (p.length >= 8)         s++
  if (p.length >= 12)        s++
  if (/[A-Z]/.test(p))       s++
  if (/[0-9]/.test(p))       s++
  if (/[^A-Za-z0-9]/.test(p))s++
  if (s <= 2) return { pct: (s/5)*100, label: 'Weak',   color: '#ef4444' }
  if (s === 3) return { pct: (s/5)*100, label: 'Fair',   color: '#f59e0b' }
  if (s === 4) return { pct: (s/5)*100, label: 'Good',   color: '#22c55e' }
  return               { pct: 100,      label: 'Strong', color: LIME }
}

function maskEmail(e) {
  return e.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) =>
    a + '*'.repeat(Math.min(b.length, 5)) + c
  )
}

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2,'0')}`
}

/* ── Small shared input style ─────────────────────────────────────────────── */
const inp = (err) => ({
  width: '100%', padding: '12px 14px 12px 40px',
  border: `1.5px solid ${err ? '#ef4444' : '#e5e7eb'}`,
  borderRadius: 10, fontSize: 14, color: DARK,
  background: '#fff', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
})

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Signup() {
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const initRole     = params.get('role') === 'driver' ? 'driver' : 'rider'

  /* ── phase: 'form' | 'otp' ──────────────────────────────────────────── */
  const [phase, setPhase] = useState('form')

  /* ── Form state ──────────────────────────────────────────────────────── */
  const [role,   setRole]   = useState(initRole)
  const [form,   setForm]   = useState({ name:'', email:'', phone:'', password:'', confirm:'' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [formErr,setFormErr]= useState('')
  const [sending,setSending]= useState(false)

  /* saved after successful signup (needed for OTP phase) */
  const [userId,      setUserId]      = useState(null)
  const [maskedEmail, setMaskedEmail] = useState('')

  /* ── OTP state ───────────────────────────────────────────────────────── */
  const [digits,   setDigits]   = useState(['','','','','',''])
  const [otpErr,   setOtpErr]   = useState('')
  const [verifying,setVerifying]= useState(false)
  const [resending,setResending]= useState(false)
  const [timeLeft, setTimeLeft] = useState(OTP_SECS)
  const inputRefs = useRef([])

  /* countdown */
  useEffect(() => {
    if (phase !== 'otp') return
    if (timeLeft <= 0)   return
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase, timeLeft])

  /* ── Form helpers ────────────────────────────────────────────────────── */
  function set(field, val) {
    setForm(p => ({ ...p, [field]: sanitize(val) }))
    setErrors(p => ({ ...p, [field]: '' }))
    setFormErr('')
  }

  function validate() {
    const e = {}
    if (!form.name || form.name.length < 2) e.name    = 'Enter your full name.'
    if (!validEmail(form.email))            e.email   = 'Enter a valid email address.'
    if (!validPhone(form.phone))            e.phone   = 'Valid Nigerian number required (e.g. 08012345678).'
    if (!validPassword(form.password))      e.password= 'Min 8 chars, 1 uppercase, 1 number.'
    if (form.password !== form.confirm)     e.confirm = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleFormSubmit(e) {
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
      setDigits(['','','','','',''])
      setOtpErr('')
      setPhase('otp')
      // focus first box after transition
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

  /* ── OTP helpers ─────────────────────────────────────────────────────── */
  const handleDigit = useCallback((i, val) => {
    const clean = val.replace(/\D/g,'').slice(-1)
    setDigits(prev => { const n=[...prev]; n[i]=clean; return n })
    setOtpErr('')
    if (clean && i < 5) inputRefs.current[i+1]?.focus()
  }, [])

  const handleKey = useCallback((i, e) => {
    if (e.key==='Backspace' && !digits[i] && i>0) inputRefs.current[i-1]?.focus()
    if (e.key==='ArrowLeft'  && i>0) inputRefs.current[i-1]?.focus()
    if (e.key==='ArrowRight' && i<5) inputRefs.current[i+1]?.focus()
    if (e.key==='Enter') submitOtp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (!p) return
    const n = ['','','','','','']
    for (let i=0;i<p.length;i++) n[i]=p[i]
    setDigits(n); setOtpErr('')
    inputRefs.current[Math.min(p.length,5)]?.focus()
  }, [])

  async function submitOtp() {
    const otp = digits.join('')
    if (otp.length !== 6) { setOtpErr('Enter all 6 digits.'); return }
    if (timeLeft <= 0)    { setOtpErr('Code expired — request a new one below.'); return }
    setVerifying(true); setOtpErr('')
    try {
      const res = await api.post('/auth/verify-otp', { userId, otp })
      // Navigate directly to the multi-step registration wizard
      navigate(`/register/${res.data.role || role}`, {
        state: {
          registrationToken: res.data.registrationToken,
          prefill: {
            name:     form.name,
            email:    form.email,
            phone:    form.phone,
            password: form.password,
            confirm:  form.confirm,
          },
        },
        replace: true,
      })
    } catch (err) {
      setOtpErr(
        err.status === 400 ? (err.data?.message || 'Invalid or expired code. Try again.')
        : err.status === 429 ? 'Too many attempts. Please wait.'
        : 'Something went wrong. Please try again.'
      )
      setDigits(['','','','','',''])
      inputRefs.current[0]?.focus()
    } finally { setVerifying(false) }
  }

  async function handleResend() {
    if (timeLeft > 0 || !userId) return
    setResending(true); setOtpErr('')
    try {
      await api.post('/auth/resend-otp', { userId })
      setDigits(['','','','','',''])
      setTimeLeft(OTP_SECS)
      inputRefs.current[0]?.focus()
    } catch { setOtpErr('Could not resend. Please try again.') }
    finally  { setResending(false) }
  }

  const otpFull   = digits.every(Boolean)
  const strength  = passwordStrength(form.password)

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#f0fdf4 0%,#fefce8 50%,#f0f9ff 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Navbar ── */}
      <nav style={{
        background:'#fff', borderBottom:'1px solid #f0f0f0',
        padding:'14px clamp(20px,5vw,60px)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:10,
      }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width:36, height:36, objectFit:'contain' }} />
          <div>
            <p style={{ margin:0, fontSize:15, fontWeight:900, color:DARK, lineHeight:1.1, letterSpacing:'-0.3px' }}>
              Feazi<span style={{ color:GREEN }}>Move</span>
            </p>
            <p style={{ margin:0, fontSize:10, color:'#9ca3af' }}>Smart Urban Mobility</p>
          </div>
        </Link>
        <span style={{ fontSize:13, color:'#6b7280' }}>
          Have an account?{' '}
          <Link to="/login" style={{ color:GREEN, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
        </span>
      </nav>

      <main style={{
        flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding:'clamp(28px,4vw,56px) clamp(16px,4vw,24px)',
      }}>
        <div style={{ width:'100%', maxWidth: phase==='otp' ? 480 : 520, transition:'max-width 0.3s' }}>

          {/* ════════════════ PHASE 1 — FORM ════════════════ */}
          {phase === 'form' && (
            <>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <h1 style={{
                  margin:'0 0 8px',
                  fontSize:'clamp(1.6rem,4vw,2rem)', fontWeight:900, color:DARK,
                  letterSpacing:'-0.5px', lineHeight:1.2,
                }}>
                  Create your account
                </h1>
                <p style={{ margin:0, fontSize:15, color:'#6b7280', lineHeight:1.6 }}>
                  Join thousands moving smarter across African cities.
                </p>
              </div>

              {/* Role toggle */}
              <div style={{
                background:'#f9fafb', borderRadius:14, padding:6,
                display:'flex', gap:6, marginBottom:24,
                border:`1.5px solid #f0f0f0`,
              }}>
                {[
                  { value:'rider',  Icon:Bike, label:'Sign up as Rider',  sub:'Commuter / Passenger' },
                  { value:'driver', Icon:Car,  label:'Sign up as Driver', sub:'Driver / Operator' },
                ].map(({ value, Icon, label, sub }) => {
                  const active = role === value
                  return (
                    <button key={value} type="button" onClick={() => setRole(value)} style={{
                      flex:1, display:'flex', flexDirection:'column',
                      alignItems:'center', gap:4,
                      padding:'14px 10px', borderRadius:10, border:'none',
                      cursor:'pointer', fontFamily:'inherit',
                      background: active ? DARK : 'transparent',
                      color:      active ? '#fff' : '#6b7280',
                      transition: 'all 0.2s',
                    }}>
                      <Icon size={20} color={active ? LIME : '#9ca3af'} />
                      <span style={{ fontSize:13, fontWeight:700, lineHeight:1.3 }}>{label}</span>
                      <span style={{ fontSize:11, opacity:0.65 }}>{sub}</span>
                    </button>
                  )
                })}
              </div>

              {/* Card */}
              <div style={{
                background:'#fff', borderRadius:20,
                boxShadow:'0 8px 40px rgba(0,0,0,0.08)',
                overflow:'hidden',
              }}>
                <div style={{ height:5, background:`linear-gradient(90deg,${LIME},#a8e063)` }} />

                <form onSubmit={handleFormSubmit} style={{ padding:'clamp(24px,4vw,40px)' }} noValidate>
                  <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

                    {/* Full name */}
                    <FormField label="Full Name" Icon={User} error={errors.name}>
                      <input type="text" value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="Adaeze Okonkwo" autoComplete="name"
                        style={inp(!!errors.name)}
                        onFocus={e => e.target.style.borderColor=LIME}
                        onBlur={e  => e.target.style.borderColor=errors.name?'#ef4444':'#e5e7eb'}
                      />
                    </FormField>

                    {/* Email */}
                    <FormField label="Email Address" Icon={Mail} error={errors.email}>
                      <input type="email" value={form.email}
                        onChange={e => set('email', e.target.value)}
                        placeholder="you@example.com" autoComplete="email"
                        style={inp(!!errors.email)}
                        onFocus={e => e.target.style.borderColor=LIME}
                        onBlur={e  => e.target.style.borderColor=errors.email?'#ef4444':'#e5e7eb'}
                      />
                    </FormField>

                    {/* Phone */}
                    <FormField label="Phone Number" Icon={Phone} error={errors.phone}
                      hint="Nigerian format: 08012345678 or +2348012345678">
                      <input type="tel" value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder="+234 801 234 5678" autoComplete="tel"
                        style={inp(!!errors.phone)}
                        onFocus={e => e.target.style.borderColor=LIME}
                        onBlur={e  => e.target.style.borderColor=errors.phone?'#ef4444':'#e5e7eb'}
                      />
                    </FormField>

                    {/* Password */}
                    <FormField label="Password" Icon={Lock} error={errors.password}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        autoComplete="new-password"
                        style={{ ...inp(!!errors.password), paddingRight:44 }}
                        onFocus={e => e.target.style.borderColor=LIME}
                        onBlur={e  => e.target.style.borderColor=errors.password?'#ef4444':'#e5e7eb'}
                      />
                      <button type="button" onClick={() => setShowPw(s=>!s)} aria-label="Toggle password"
                        style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:4 }}>
                        {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                      {/* Strength bar */}
                      {form.password && (
                        <div style={{ marginTop:8 }}>
                          <div style={{ height:4, borderRadius:99, background:'#e5e7eb', overflow:'hidden' }}>
                            <div style={{
                              height:'100%', borderRadius:99,
                              width:`${strength.pct}%`, background:strength.color,
                              transition:'width 0.3s, background 0.3s',
                            }}/>
                          </div>
                          <p style={{ fontSize:11, color:strength.color, margin:'4px 0 0', fontWeight:600 }}>
                            {strength.label}
                          </p>
                        </div>
                      )}
                    </FormField>

                    {/* Confirm */}
                    <FormField label="Confirm Password" Icon={Lock} error={errors.confirm}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={e => set('confirm', e.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                        style={inp(!!errors.confirm)}
                        onFocus={e => e.target.style.borderColor=LIME}
                        onBlur={e  => e.target.style.borderColor=errors.confirm?'#ef4444':'#e5e7eb'}
                      />
                    </FormField>

                  </div>

                  {/* API error */}
                  {formErr && <ErrBox msg={formErr} />}

                  {/* Submit */}
                  <button type="submit" disabled={sending} style={{
                    width:'100%', marginTop:26,
                    padding:'14px 24px', borderRadius:50, border:'none',
                    background: sending ? '#d1d5db' : LIME,
                    color:      sending ? '#fff'     : DARK,
                    fontSize:15, fontWeight:800,
                    cursor: sending ? 'not-allowed' : 'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    letterSpacing:'-0.2px',
                    boxShadow: sending ? 'none' : '0 4px 16px rgba(204,255,0,0.4)',
                    transition:'all 0.2s',
                  }}>
                    {sending
                      ? <><Spin/> Sending verification code…</>
                      : <>{role === 'driver' ? '🚗' : '🛵'} Create {role === 'driver' ? 'Driver' : 'Rider'} Account <ArrowRight size={16}/></>
                    }
                  </button>

                  <p style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginTop:14, lineHeight:1.6 }}>
                    By continuing you agree to our{' '}
                    <Link to="/policies" style={{ color:GREEN, fontWeight:600 }}>Terms & Privacy Policy</Link>.
                  </p>
                </form>
              </div>

              <p style={{ textAlign:'center', fontSize:14, color:'#6b7280', marginTop:20 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color:GREEN, fontWeight:700, textDecoration:'none' }}>Sign in</Link>
              </p>
            </>
          )}

          {/* ════════════════ PHASE 2 — OTP ════════════════ */}
          {phase === 'otp' && (
            <>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                {/* Animated mail icon */}
                <div style={{
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                  width:72, height:72, borderRadius:'50%',
                  background:'linear-gradient(135deg,#e0f7e9,#ccff00)',
                  marginBottom:16,
                  boxShadow:'0 4px 24px rgba(204,255,0,0.35)',
                  animation:'bounce 1.2s ease-in-out',
                }}>
                  <Mail size={32} color={DARK}/>
                </div>
                <h1 style={{
                  margin:'0 0 8px',
                  fontSize:'clamp(1.4rem,3vw,1.8rem)', fontWeight:900, color:DARK,
                  letterSpacing:'-0.4px',
                }}>
                  Enter your verification code
                </h1>
                <p style={{ margin:0, fontSize:14, color:'#6b7280', lineHeight:1.7 }}>
                  We sent a 6-digit code to{' '}
                  <strong style={{ color:DARK }}>{maskedEmail}</strong>
                </p>
              </div>

              {/* OTP Card */}
              <div style={{
                background:'#fff', borderRadius:24,
                boxShadow:'0 8px 40px rgba(0,0,0,0.09)',
                overflow:'hidden',
              }}>
                <div style={{ height:5, background:`linear-gradient(90deg,${LIME},#a8e063)` }}/>

                <div style={{ padding:'clamp(28px,5vw,44px)' }}>

                  {/* ── Six OTP boxes ── */}
                  <div style={{
                    display:'flex', gap:'clamp(8px,2vw,14px)',
                    justifyContent:'center', marginBottom:12,
                  }}>
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleKey(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        disabled={verifying || timeLeft <= 0}
                        aria-label={`Digit ${i+1}`}
                        style={{
                          width:'clamp(46px,13vw,60px)',
                          height:'clamp(56px,15vw,72px)',
                          textAlign:'center',
                          fontSize:'clamp(22px,5vw,30px)',
                          fontWeight:900,
                          fontFamily:'monospace',
                          borderRadius:14,
                          border:`2.5px solid ${
                            otpErr  ? '#fca5a5'
                            : d     ? LIME
                                    : '#e5e7eb'
                          }`,
                          background: d ? '#f0fdf4' : '#fafafa',
                          color: DARK,
                          outline:'none',
                          cursor: (verifying || timeLeft <= 0) ? 'not-allowed' : 'text',
                          transition:'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                          boxSizing:'border-box',
                          caretColor: LIME,
                        }}
                        onFocus={e => {
                          e.target.style.borderColor  = LIME
                          e.target.style.boxShadow    = '0 0 0 3px rgba(204,255,0,0.22)'
                          e.target.style.background   = '#f0fdf4'
                        }}
                        onBlur={e => {
                          e.target.style.borderColor  = d ? LIME : otpErr ? '#fca5a5' : '#e5e7eb'
                          e.target.style.boxShadow    = 'none'
                          e.target.style.background   = d ? '#f0fdf4' : '#fafafa'
                        }}
                      />
                    ))}
                  </div>

                  {/* Timer */}
                  <p style={{
                    textAlign:'center', fontSize:13, marginBottom:24,
                    color: timeLeft === 0 ? '#ef4444' : timeLeft < 60 ? '#f59e0b' : '#9ca3af',
                    fontWeight: timeLeft < 60 ? 700 : 400,
                  }}>
                    {timeLeft > 0
                      ? <>Code expires in <strong>{fmt(timeLeft)}</strong></>
                      : <strong>Code expired</strong>
                    }
                  </p>

                  {/* OTP error */}
                  {otpErr && <ErrBox msg={otpErr} />}

                  {/* Verify button */}
                  <button
                    type="button"
                    onClick={submitOtp}
                    disabled={verifying || !otpFull || timeLeft <= 0}
                    style={{
                      width:'100%', padding:'14px 24px',
                      borderRadius:50, border:'none',
                      background: (verifying || !otpFull || timeLeft <= 0) ? '#e5e7eb' : LIME,
                      color:      (verifying || !otpFull || timeLeft <= 0) ? '#9ca3af' : DARK,
                      fontSize:15, fontWeight:800,
                      cursor: (verifying || !otpFull || timeLeft <= 0) ? 'not-allowed' : 'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      transition:'all 0.2s', letterSpacing:'-0.2px',
                      boxShadow: (!verifying && otpFull && timeLeft > 0)
                        ? '0 4px 16px rgba(204,255,0,0.4)' : 'none',
                    }}
                  >
                    {verifying
                      ? <><Spin/> Verifying…</>
                      : <><CheckCircle2 size={17}/> Verify & Continue to Registration <ArrowRight size={15}/></>
                    }
                  </button>

                  {/* Resend */}
                  <div style={{ textAlign:'center', marginTop:22 }}>
                    <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 8px' }}>
                      Didn't receive the code?
                    </p>
                    {timeLeft > 0 ? (
                      <p style={{ fontSize:13, color:'#9ca3af', margin:0 }}>
                        Resend available in <strong>{fmt(timeLeft)}</strong>
                      </p>
                    ) : (
                      <button type="button" onClick={handleResend} disabled={resending}
                        style={{
                          background:'none', border:'none',
                          color: resending ? '#9ca3af' : GREEN,
                          fontSize:13, fontWeight:700,
                          cursor: resending ? 'not-allowed' : 'pointer',
                          display:'inline-flex', alignItems:'center', gap:5, padding:0,
                          fontFamily:'inherit',
                        }}>
                        <RefreshCw size={13}
                          style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }}/>
                        {resending ? 'Sending new code…' : 'Resend code'}
                      </button>
                    )}
                  </div>

                  {/* Back link */}
                  <p style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginTop:20 }}>
                    Wrong email?{' '}
                    <button type="button"
                      onClick={() => { setPhase('form'); setDigits(['','','','','','']); setOtpErr('') }}
                      style={{
                        background:'none', border:'none', padding:0,
                        color:GREEN, fontWeight:600, fontSize:12,
                        cursor:'pointer', fontFamily:'inherit',
                      }}>
                      Go back and edit
                    </button>
                  </p>
                </div>
              </div>

              {/* Security note */}
              <div style={{
                display:'flex', alignItems:'flex-start', gap:10,
                background:'rgba(255,255,255,0.75)', border:'1px solid #e5e7eb',
                borderRadius:12, padding:'14px 18px', marginTop:18,
              }}>
                <span style={{ fontSize:15, flexShrink:0 }}>🔒</span>
                <p style={{ margin:0, fontSize:12, color:'#6b7280', lineHeight:1.65 }}>
                  <strong style={{ color:'#374151' }}>Keep this code private.</strong>{' '}
                  FeaziMove will never call or message you to ask for this code.
                </p>
              </div>
            </>
          )}

        </div>
      </main>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          40%     { transform: translateY(-10px); }
          60%     { transform: translateY(-5px);  }
        }
      `}</style>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
function FormField({ label, Icon, error, hint, children }) {
  return (
    <div>
      <label style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', display:'block', marginBottom:6 }}>
        {label} <span style={{ color:'#ef4444' }}>*</span>
      </label>
      <div style={{ position:'relative' }}>
        {Icon && <Icon size={16} style={{
          position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
          color: error ? '#ef4444' : '#9ca3af', pointerEvents:'none',
        }}/>}
        {children}
      </div>
      {error && (
        <p style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#ef4444', margin:'4px 0 0' }}>
          <AlertCircle size={12}/> {error}
        </p>
      )}
      {hint && !error && <p style={{ fontSize:11, color:'#9ca3af', margin:'4px 0 0' }}>{hint}</p>}
    </div>
  )
}

function ErrBox({ msg }) {
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:10,
      background:'#fef2f2', border:'1px solid #fecaca',
      borderRadius:10, padding:'12px 16px', marginTop:16,
    }} role="alert">
      <AlertCircle size={15} style={{ color:'#ef4444', flexShrink:0, marginTop:1 }}/>
      <p style={{ color:'#dc2626', fontSize:13, margin:0, lineHeight:1.5 }}>{msg}</p>
    </div>
  )
}

function Spin() {
  return (
    <span style={{
      width:16, height:16, borderRadius:'50%',
      border:'2px solid rgba(0,0,0,0.2)', borderTopColor: DARK,
      animation:'spin 0.8s linear infinite', display:'inline-block',
    }}/>
  )
}
