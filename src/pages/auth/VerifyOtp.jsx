/**
 * FeaziMove — OTP Verification Page
 * ─────────────────────────────────────────────────────────────────────────────
 * 6-digit OTP entry with:
 *   • Auto-advance between digit boxes
 *   • Paste support
 *   • 10-minute countdown timer
 *   • Resend button (enabled after 60s cooldown)
 *   • Clear error feedback
 *
 * Security:
 *   • userId comes from navigation state — never from URL (prevents enumeration)
 *   • OTP is submitted as a string; server does bcrypt comparison
 *   • Page redirects back to /signup if accessed without state
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, AlertCircle, RefreshCw, ArrowRight, CheckCircle2 } from 'lucide-react'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'

/* ── Brand tokens ─────────────────────────────────────────────────────────── */
const LIME  = '#ccff00'
const GREEN = '#2a6048'
const DARK  = '#0a1f15'

const OTP_EXPIRY_SECS = 10 * 60   // 10 minutes
const RESEND_COOLDOWN = 60         // seconds before resend is allowed

export default function VerifyOtp() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const state      = location.state || {}

  // Guard — must arrive here from Signup page
  const { userId, maskedEmail, role } = state

  const [digits,    setDigits]    = useState(['', '', '', '', '', ''])
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  // Countdown timers
  const [timeLeft,  setTimeLeft]  = useState(OTP_EXPIRY_SECS)
  const [resendCD,  setResendCD]  = useState(RESEND_COOLDOWN)

  const inputRefs = useRef([])

  // Redirect if page accessed directly
  useEffect(() => {
    if (!userId || !maskedEmail) {
      navigate('/signup', { replace: true })
    }
  }, [userId, maskedEmail, navigate])

  // OTP expiry countdown
  useEffect(() => {
    if (timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timeLeft])

  // Resend cooldown
  useEffect(() => {
    if (resendCD <= 0) return
    const id = setInterval(() => setResendCD(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [resendCD])

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  /* ── Digit input handling ─────────────────────────────────────────────── */
  const handleDigitChange = useCallback((index, value) => {
    // Allow only digits
    const clean = value.replace(/\D/g, '').slice(-1)
    setDigits(prev => {
      const next = [...prev]
      next[index] = clean
      return next
    })
    setError('')
    // Auto-advance
    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0)  inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus()
    if (e.key === 'Enter') handleSubmit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    setError('')
    // Focus last filled or next empty
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }, [])

  /* ── Submit ───────────────────────────────────────────────────────────── */
  async function handleSubmit() {
    const otp = digits.join('')
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.')
      return
    }
    if (timeLeft <= 0) {
      setError('Your code has expired. Please request a new one.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/verify-otp', { userId, otp })
      setSuccess(true)
      // After short success animation, redirect to email-sent screen
      setTimeout(() => {
        navigate('/email-sent', {
          state: { maskedEmail, role },
          replace: true,
        })
      }, 1800)
    } catch (err) {
      setError(
        err.status === 400 ? (err.data?.message || 'Invalid or expired code. Please try again.')
        : err.status === 429 ? 'Too many attempts. Please wait a moment before trying again.'
        : 'Something went wrong. Please try again.'
      )
      // Clear digits on failure
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  /* ── Resend ───────────────────────────────────────────────────────────── */
  async function handleResend() {
    if (resendCD > 0 || !userId) return
    setResending(true)
    setError('')
    try {
      await api.post('/auth/resend-otp', { userId })
      setDigits(['', '', '', '', '', ''])
      setTimeLeft(OTP_EXPIRY_SECS)
      setResendCD(RESEND_COOLDOWN)
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError('Could not resend code. Please wait and try again.')
    } finally {
      setResending(false)
    }
  }

  const otpComplete = digits.every(Boolean)

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 50%, #f0f9ff 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '14px clamp(20px,5vw,60px)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <span style={{ fontSize: 15, fontWeight: 900, color: DARK, letterSpacing: '-0.3px' }}>
            Feazi<span style={{ color: GREEN }}>Move</span>
          </span>
        </Link>
      </nav>

      <main style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'clamp(40px,6vw,80px) clamp(16px,4vw,24px)',
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Card */}
          <div style={{
            background: '#fff', borderRadius: 24,
            boxShadow: '0 8px 40px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            {/* Accent */}
            <div style={{ height: 5, background: `linear-gradient(90deg, ${LIME}, #a8e063)` }} />

            <div style={{ padding: 'clamp(28px,5vw,48px)' }}>

              {/* Icon */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 72, height: 72, borderRadius: '50%',
                  background: success
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'linear-gradient(135deg, #e0f7e9, #ccff00)',
                  marginBottom: 4,
                  transition: 'background 0.4s',
                  boxShadow: success ? '0 4px 20px rgba(34,197,94,0.3)' : '0 4px 20px rgba(204,255,0,0.3)',
                }}>
                  {success
                    ? <CheckCircle2 size={36} color="#fff" />
                    : <Mail size={32} color={DARK} />
                  }
                </div>
              </div>

              <h1 style={{
                textAlign: 'center', margin: '0 0 8px',
                fontSize: 'clamp(1.4rem,3vw,1.75rem)', fontWeight: 900,
                color: DARK, letterSpacing: '-0.4px',
              }}>
                {success ? 'Email Verified! 🎉' : 'Check your email'}
              </h1>

              <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: '0 0 32px', lineHeight: 1.7 }}>
                {success
                  ? 'We\'re sending your registration link now…'
                  : <>
                      We sent a 6-digit code to{' '}
                      <strong style={{ color: DARK }}>{maskedEmail}</strong>.
                      <br />Enter it below to verify your email.
                    </>
                }
              </p>

              {/* OTP Input Boxes */}
              {!success && (
                <>
                  <div style={{
                    display: 'flex', gap: 10, justifyContent: 'center',
                    marginBottom: 8,
                  }}>
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        disabled={loading || timeLeft <= 0}
                        aria-label={`Digit ${i + 1} of 6`}
                        style={{
                          width: 'clamp(44px, 12vw, 56px)',
                          height: 'clamp(52px, 14vw, 64px)',
                          textAlign: 'center',
                          fontSize: 'clamp(20px,4vw,26px)',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          borderRadius: 12,
                          border: `2px solid ${
                            error ? '#fca5a5'
                            : digit ? LIME
                            : '#e5e7eb'
                          }`,
                          background: digit ? '#f0fdf4' : '#fafafa',
                          color: DARK,
                          outline: 'none',
                          cursor: loading || timeLeft <= 0 ? 'not-allowed' : 'text',
                          transition: 'border-color 0.15s, background 0.15s',
                          boxSizing: 'border-box',
                          caretColor: LIME,
                        }}
                        onFocus={e => {
                          e.target.style.borderColor = LIME
                          e.target.style.boxShadow = `0 0 0 3px rgba(204,255,0,0.2)`
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = digit ? LIME : error ? '#fca5a5' : '#e5e7eb'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    ))}
                  </div>

                  {/* Timer */}
                  <p style={{ textAlign: 'center', fontSize: 13, color: timeLeft < 60 ? '#ef4444' : '#9ca3af', marginBottom: 24 }}>
                    {timeLeft > 0
                      ? <>Code expires in <strong>{formatTime(timeLeft)}</strong></>
                      : <strong style={{ color: '#ef4444' }}>Code expired — please request a new one</strong>
                    }
                  </p>

                  {/* Error */}
                  {error && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                    }} role="alert">
                      <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                      <p style={{ color: '#dc2626', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{error}</p>
                    </div>
                  )}

                  {/* Verify button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !otpComplete || timeLeft <= 0}
                    style={{
                      width: '100%', padding: '14px 24px',
                      borderRadius: 50, border: 'none',
                      background: (loading || !otpComplete || timeLeft <= 0) ? '#e5e7eb' : LIME,
                      color: (loading || !otpComplete || timeLeft <= 0) ? '#9ca3af' : DARK,
                      fontSize: 15, fontWeight: 800,
                      cursor: (loading || !otpComplete || timeLeft <= 0) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s', letterSpacing: '-0.2px',
                      boxShadow: (!loading && otpComplete && timeLeft > 0) ? '0 4px 16px rgba(204,255,0,0.4)' : 'none',
                    }}
                  >
                    {loading ? <><Spinner /> Verifying…</> : <>Verify Email <ArrowRight size={16} /></>}
                  </button>

                  {/* Resend */}
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>
                      Didn't receive the code?
                    </p>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCD > 0 || resending}
                      style={{
                        background: 'none', border: 'none',
                        color: resendCD > 0 ? '#9ca3af' : GREEN,
                        fontSize: 13, fontWeight: 700,
                        cursor: resendCD > 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0,
                        fontFamily: 'inherit',
                      }}
                    >
                      <RefreshCw size={13} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} />
                      {resending
                        ? 'Sending…'
                        : resendCD > 0
                        ? `Resend in ${resendCD}s`
                        : 'Resend code'
                      }
                    </button>
                  </div>

                  {/* Wrong email */}
                  <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
                    Wrong email address?{' '}
                    <Link to="/signup" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>
                      Go back and edit
                    </Link>
                  </p>
                </>
              )}

            </div>
          </div>

          {/* Security note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'rgba(255,255,255,0.7)', border: '1px solid #e5e7eb',
            borderRadius: 12, padding: '14px 18px', marginTop: 20,
          }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.65 }}>
              <strong style={{ color: '#374151' }}>Your code is private.</strong> FeaziMove will never call or message you asking for this code. Do not share it with anyone.
            </p>
          </div>

        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: '50%',
      border: '2px solid rgba(10,31,21,0.3)',
      borderTopColor: DARK,
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    }} />
  )
}
