import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Lock } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
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
  const [googleLoading, setGoogleLoading] = useState(false)

  const from = location.state?.from?.pathname || null

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true); setError('')
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const info = await infoRes.json()
        const res = await api.post('/auth/google-access', {
          accessToken: tokenResponse.access_token,
          email: info.email, name: info.name, googleId: info.sub,
          emailVerified: info.email_verified,
        })
        if (res.data.needsRole) {
          navigate('/register', { state: { googlePrefill: { email: info.email, name: info.name } } })
        } else if (res.data.isNew) {
          navigate('/register', { state: { googlePrefill: { email: info.email, name: info.name } } })
        } else {
          if (from) { navigate(from, { replace: true }); return }
          navigate(res.data.user?.role === 'driver' ? '/driver' : '/book', { replace: true })
        }
      } catch (err) {
        setError(err.data?.message || 'Google sign-in failed. Please try again.')
      } finally { setGoogleLoading(false) }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
  })

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
            {loading ? <><Spinner /> Signing in…</> : 'Sign in'}
          </button>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* Google button */}
          <button type="button" onClick={() => googleLogin()} disabled={googleLoading} style={{
            width: '100%', padding: '14px 16px', borderRadius: 10, fontSize: 15, fontWeight: 600,
            background: '#fff', color: '#3c4043',
            border: '1.5px solid #dadce0', cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'box-shadow 0.2s, border-color 0.2s', fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.14)'; e.currentTarget.style.borderColor = '#bbb' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#dadce0' }}
          >
            {googleLoading ? <Spinner /> : <GoogleIcon />}
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
