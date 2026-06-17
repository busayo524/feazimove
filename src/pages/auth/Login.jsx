import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import takeawaySvg from '../../assets/takeaway.svg'
import faviconImg from '../../assets/favicon.png'

function sanitizePhone(val) {
  return val.replace(/[^0-9+\-\s()]/g, '').slice(0, 20)
}

function LoginPanel() {
  return (
    <div style={{ position:'relative', height:'100%', minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', overflow:'hidden', background:'#ffffff', padding:'40px 36px' }}>
      <img src={takeawaySvg} alt="Takeaway illustration" style={{ width:'95%', display:'block', objectFit:'contain' }}/>
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError('')
    try {
      const user = await login(phone, password)
      if (from) { navigate(from, { replace: true }); return }
      navigate(user.role === 'driver' ? '/driver' : '/book', { replace: true })
    } catch (err) {
      if (!err.status) {
        setError('Cannot connect to server. Make sure the backend is running on port 4000.')
      } else {
        setError(err.data?.message || 'Incorrect phone or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width:'100%', padding:'14px 16px', borderRadius:12, fontSize:15,
    background:'#ffffff', color:'#1a1a1a', outline:'none',
    border:'1.5px solid rgba(0,0,0,0.12)', transition:'border-color 0.2s',
    fontFamily:'inherit',
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'row-reverse', background:'#ffffff' }}>

      <div className="login-form-panel" style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-start', maxWidth:520 }}>

        <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:48, textDecoration:'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width:38, height:38, objectFit:'contain', display:'block' }} />
          <span style={{ fontStyle:'normal', fontSize:20, letterSpacing:'-0.01em', color:'#1a1a1a' }}>
            <span style={{ fontWeight:500 }}>Feazi</span>
            <span style={{ fontWeight:900 }}>Move</span>
          </span>
        </Link>

        <h1 style={{ fontSize:'clamp(2rem,4vw,2.6rem)', fontWeight:900, color:'#1a1a1a', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:8 }}>
          Welcome back
        </h1>
        <p style={{ color:'#6b7280', fontSize:16, marginBottom:36 }}>
          Sign in to continue your journey
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:20 }}>

          <div>
            <label htmlFor="login-phone" style={{ display:'block', color:'#1a1a1a', fontSize:14, fontWeight:600, marginBottom:6 }}>Phone Number</label>
            <input
              id="login-phone"
              type="tel"
              value={phone}
              onChange={e => { setPhone(sanitizePhone(e.target.value)); setError('') }}
              placeholder="+234 800 000 0000"
              autoComplete="tel"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#ccff00' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}
            />
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <label htmlFor="login-password" style={{ color:'#1a1a1a', fontSize:14, fontWeight:600 }}>Password</label>
              <Link to="/forgot-password" style={{ color:'#1a1a1a', fontSize:13, fontWeight:600, textDecoration:'none' }}>Forgot password?</Link>
            </div>
            <div style={{ position:'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Your password"
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight:48 }}
                onFocus={e => { e.target.style.borderColor = '#ccff00' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', background:'none', border:'none', cursor:'pointer', padding:0 }} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px' }} role="alert">
              <AlertCircle size={16} style={{ color:'#ef4444', flexShrink:0 }}/>
              <p style={{ color:'#ef4444', fontSize:14 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width:'100%', padding:'15px', borderRadius:50, fontSize:15, fontWeight:700, background: loading ? '#555' : '#000000', color:'#ffffff', border:'none', cursor: loading ? 'not-allowed' : 'pointer', transition:'background 0.2s', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
          >
            {loading ? (
              <><span style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign:'center', color:'#6b7280', fontSize:14, marginTop:28 }}>
          New to FeaziMove?{' '}
          <Link to="/register" style={{ color:'#000000', fontWeight:700, textDecoration:'none' }}>Create account</Link>
        </p>
      </div>

      <div className="hidden lg:flex" style={{ flex:1, background:'#0f1200', minHeight:'100vh', flexDirection:'column' }}>
        <LoginPanel />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-form-panel { padding: 60px 140px 48px 40px; }
        @media (max-width: 1023px) { .login-form-panel { padding: 40px 24px 48px; } }
      `}</style>
    </div>
  )
}
