import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import faviconImg from '../../assets/favicon.png'

const NEON = '#ccff00'
const DARK = '#0a0a0a'

function sanitizePhone(val) {
  return val.replace(/[^0-9+\-\s()]/g, '').slice(0, 20)
}

export default function Login() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const from = location.state?.from?.pathname || null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!identifier || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    try {
      const user = await login(identifier, password)
      if (from) { navigate(from, { replace: true }); return }
      navigate(user.role === 'driver' ? '/driver' : '/book', { replace: true })
    } catch (err) {
      setError(!err.status
        ? 'Cannot connect to server. Make sure the backend is running on port 4000.'
        : err.data?.message || 'Incorrect email / phone or password.'
      )
    } finally { setLoading(false) }
  }

  const inputStyle = (focused) => ({
    width: '100%', padding: '15px 18px', borderRadius: 10, fontSize: 16,
    background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
    border: '1.5px solid #e0e0e0', fontFamily: 'inherit', transition: 'border-color 0.2s',
  })

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
        Welcome back
      </h1>
      <p style={{ fontSize: 16, color: '#777', marginBottom: 32, textAlign: 'center' }}>
        Sign in to continue your journey
      </p>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 24px rgba(0,0,0,0.08)', padding: 'clamp(36px,5vw,52px)', width: '100%', maxWidth: 520 }}>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Email / Phone */}
          <div>
            <label htmlFor="login-id" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Email or Phone Number
            </label>
            <input
              id="login-id"
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="you@example.com or +234 800 000 0000"
              autoComplete="username"
              style={inputStyle()}
              onFocus={e => e.target.style.borderColor = NEON}
              onBlur={e  => e.target.style.borderColor = '#e0e0e0'}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                style={{ ...inputStyle(), paddingRight: 46 }}
                onFocus={e => e.target.style.borderColor = NEON}
                onBlur={e  => e.target.style.borderColor = '#e0e0e0'}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '11px 14px' }} role="alert">
              <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '16px', borderRadius: 10, fontSize: 17, fontWeight: 700,
              background: loading ? '#aaa' : NEON,
              color: loading ? '#fff' : DARK,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s', marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><Spinner /> Signing in…</>
              : 'Sign in'
            }
          </button>
        </form>
      </div>

      {/* Footer links */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Don't have an account?{' '}
            <Link to="/register" style={{ color: DARK, fontWeight: 700, textDecoration: 'none' }}>Create account</Link>
          </span>
          <span style={{ color: '#ccc' }}>·</span>
          <Link to="/forgot-password" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2a6048', fontWeight: 600, textDecoration: 'none' }}>
            <Lock size={12} /> Forgot password?
          </Link>
        </div>
        <p style={{ fontSize: 13, color: '#aaa', textAlign: 'center' }}>
          Need help?{' '}
          <a href="mailto:support@feazimove.com" style={{ color: '#2a6048', fontWeight: 600, textDecoration: 'none' }}>
            support@feazimove.com
          </a>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Spinner() {
  return <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
}
