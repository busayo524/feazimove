import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Users, Car, AlertCircle, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import cityDriverSvg from '../../assets/city-driver.svg'
import faviconImg from '../../assets/favicon.png'

function validatePhone(phone) {
  return /^(\+?234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ''))
}
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
function validatePassword(pw) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)
}
function sanitizeText(val) {
  return val.replace(/[<>"']/g, '').trim()
}

function RegisterPanel() {
  const cities = ['🇳🇬 Lagos', '🇬🇭 Accra', '🇰🇪 Nairobi', '🇿🇦 Cape Town', '🇸🇳 Dakar']
  const [cityIdx, setCityIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setCityIdx(i => (i + 1) % cities.length), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ position:'relative', height:'100%', minHeight:'100vh', padding:'40px 36px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', alignItems:'center' }}>
        <img src={cityDriverSvg} alt="City driver illustration" style={{ width:'95%', display:'block', borderRadius:20, objectFit:'contain', margin:'0 auto' }}/>
      </div>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState('rider')
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', confirm:'' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: sanitizeText(val) }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Enter your full name.'
    if (!validateEmail(form.email)) e.email = 'Enter a valid email address.'
    if (!validatePhone(form.phone)) e.phone = 'Enter a valid Nigerian phone number.'
    if (!validatePassword(form.password)) e.password = 'Min 8 chars, one uppercase, one number.'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      const user = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role })
      navigate(user.role === 'driver' ? '/driver' : '/book')
    } catch (err) {
      if (!err.status) {
        setApiError('Cannot connect to server. Make sure the backend is running on port 4000.')
      } else {
        setApiError(err.data?.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError) => ({
    width:'100%', padding:'12px 14px', borderRadius:11, fontSize:14,
    background:'#ffffff', color:'#1a1a1a', outline:'none',
    border:`1.5px solid ${hasError ? '#f87171' : 'rgba(0,0,0,0.12)'}`,
    transition:'border-color 0.2s', fontFamily:'inherit', boxSizing:'border-box',
  })

  const NEON = '#ccff00'

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'#ffffff' }}>

      {/* Form — left panel, shifted right with left padding */}
      <div className="register-form-panel" style={{
        flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-start',
        maxWidth:560, overflowY:'auto',
      }}>

        <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:28, textDecoration:'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width:34, height:34, objectFit:'contain', display:'block' }} />
          <span style={{ fontStyle:'italic', fontSize:19, letterSpacing:'-0.01em', color:'#1a1a1a' }}>
            <span style={{ fontWeight:500 }}>Feazi</span>
            <span style={{ fontWeight:900 }}>Move</span>
          </span>
        </Link>

        <h1 style={{ fontSize:'clamp(1.6rem,3.5vw,2.1rem)', fontWeight:900, color:'#1a1a1a', letterSpacing:'-0.03em', lineHeight:1.1, marginBottom:4 }}>
          Create your account
        </h1>
        <p style={{ color:'#6b7280', fontSize:14, marginBottom:22 }}>
          Join thousands moving the Feazi Way
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Role selector */}
          <div>
            <label style={{ display:'block', color:'#1a1a1a', fontSize:13, fontWeight:600, marginBottom:8 }}>I want to</label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { value:'rider',  Icon:Users, label:'Ride / Send', sub:'Book rides & deliveries' },
                { value:'driver', Icon:Car,   label:'Drive',       sub:'Earn as a driver' },
              ].map(({ value, Icon, label, sub }) => (
                <button key={value} type="button" onClick={() => setRole(value)} style={{
                  padding:'12px', borderRadius:12, textAlign:'left',
                  border:`2px solid ${role === value ? NEON : 'rgba(0,0,0,0.1)'}`,
                  background: role === value ? 'rgba(204,255,0,0.07)' : 'white',
                  cursor:'pointer', transition:'all 0.2s',
                }}>
                  <Icon size={17} style={{ color: role === value ? '#000' : '#9ca3af', marginBottom:6, display:'block' }}/>
                  <div style={{ fontWeight:700, fontSize:13, color: role === value ? '#1a1a1a' : '#6b7280' }}>{label}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="name" style={{ display:'block', color:'#1a1a1a', fontSize:13, fontWeight:600, marginBottom:5 }}>Full Name</label>
            <input id="name" type="text" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Adaeze Okonkwo" autoComplete="name" style={inputStyle(!!errors.name)}
              onFocus={e => { if (!errors.name) e.target.style.borderColor = NEON }}
              onBlur={e  => { if (!errors.name) e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}/>
            {errors.name && <p style={{ color:'#ef4444', fontSize:12, marginTop:3 }}>{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" style={{ display:'block', color:'#1a1a1a', fontSize:13, fontWeight:600, marginBottom:5 }}>Email Address</label>
            <div style={{ position:'relative' }}>
              <Mail size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', pointerEvents:'none' }}/>
              <input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                style={{ ...inputStyle(!!errors.email), paddingLeft:38 }}
                onFocus={e => { if (!errors.email) e.target.style.borderColor = NEON }}
                onBlur={e  => { if (!errors.email) e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}/>
            </div>
            {errors.email && <p style={{ color:'#ef4444', fontSize:12, marginTop:3 }}>{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" style={{ display:'block', color:'#1a1a1a', fontSize:13, fontWeight:600, marginBottom:5 }}>Phone Number</label>
            <input id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+234 800 000 0000" autoComplete="tel" style={inputStyle(!!errors.phone)}
              onFocus={e => { if (!errors.phone) e.target.style.borderColor = NEON }}
              onBlur={e  => { if (!errors.phone) e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}/>
            {errors.phone && <p style={{ color:'#ef4444', fontSize:12, marginTop:3 }}>{errors.phone}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" style={{ display:'block', color:'#1a1a1a', fontSize:13, fontWeight:600, marginBottom:5 }}>Password</label>
            <div style={{ position:'relative' }}>
              <input id="password" type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number" autoComplete="new-password"
                style={{ ...inputStyle(!!errors.password), paddingRight:44 }}
                onFocus={e => { if (!errors.password) e.target.style.borderColor = NEON }}
                onBlur={e  => { if (!errors.password) e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', background:'none', border:'none', cursor:'pointer', padding:0 }}
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {errors.password && <p style={{ color:'#ef4444', fontSize:12, marginTop:3 }}>{errors.password}</p>}
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor="confirm" style={{ display:'block', color:'#1a1a1a', fontSize:13, fontWeight:600, marginBottom:5 }}>Confirm Password</label>
            <input id="confirm" type={showPw ? 'text' : 'password'} value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              placeholder="Repeat password" autoComplete="new-password" style={inputStyle(!!errors.confirm)}
              onFocus={e => { if (!errors.confirm) e.target.style.borderColor = NEON }}
              onBlur={e  => { if (!errors.confirm) e.target.style.borderColor = 'rgba(0,0,0,0.12)' }}/>
            {errors.confirm && <p style={{ color:'#ef4444', fontSize:12, marginTop:3 }}>{errors.confirm}</p>}
          </div>

          {/* API error */}
          {apiError && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'11px 14px' }} role="alert">
              <AlertCircle size={15} style={{ color:'#ef4444', flexShrink:0 }}/>
              <p style={{ color:'#ef4444', fontSize:13 }}>{apiError}</p>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'13px', borderRadius:50, fontSize:14, fontWeight:700,
            background: loading ? '#555' : '#000000', color:'#ffffff',
            border:'none', cursor: loading ? 'not-allowed' : 'pointer',
            transition:'background 0.2s', marginTop:2,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1a1a1a' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#000000' }}>
            {loading ? (
              <><span style={{ width:15, height:15, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', animation:'spin 0.8s linear infinite', display:'inline-block' }}/>Creating account...</>
            ) : 'Create Account'}
          </button>

          <p style={{ textAlign:'center', color:'#9ca3af', fontSize:11, lineHeight:1.6 }}>
            By signing up you agree to our{' '}
            <a href="#" style={{ color:'#000', fontWeight:700, textDecoration:'underline' }}>Terms of Service</a>
            {' '}and{' '}
            <a href="#" style={{ color:'#000', fontWeight:700, textDecoration:'underline' }}>Privacy Policy</a>
          </p>
        </form>

        <p style={{ textAlign:'center', color:'#6b7280', fontSize:13, marginTop:20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#000000', fontWeight:700, textDecoration:'none' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration='none'}>
            Sign in
          </Link>
        </p>
      </div>

      {/* Illustration — right panel */}
      <div className="hidden lg:flex" style={{ flex:1, background:'#ffffff', minHeight:'100vh', flexDirection:'column' }}>
        <RegisterPanel />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .register-form-panel { padding: 36px 40px 48px 100px; }
        @media (max-width: 1023px) { .register-form-panel { padding: 36px 24px 48px; } }
      `}</style>
    </div>
  )
}
