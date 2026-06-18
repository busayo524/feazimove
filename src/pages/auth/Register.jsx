import React, { useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Eye, EyeOff, Upload, Check, ArrowRight, ChevronLeft,
  User, FileText, Shield, Car, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import faviconImg from '../../assets/favicon.png'

/* ── helpers ──────────────────────────────────────────────────────────── */
function validatePhone(p) { return /^(\+?234|0)[789][01]\d{8}$/.test(p.replace(/\s/g, '')) }
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) }
function validatePassword(p) { return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) }
function clean(v) { return v.replace(/[<>"']/g, '').trim() }

/* ── theme ────────────────────────────────────────────────────────────── */
const G     = '#2a6048'   // dark green — used for completed steps & accents
const NEON  = '#ccff00'   // lime — used for the CURRENT (active) step
const G_BG  = '#eef6f1'   // light green tint

/* ── sub-components ───────────────────────────────────────────────────── */
function UploadBox({ label, required, file, onFile, error }) {
  const ref = useRef()
  return (
    <div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
        {label}{required && <span style={{ color: '#e53935' }}> *</span>}
      </p>
      <div
        onClick={() => ref.current.click()}
        style={{
          border: `2px dashed ${file ? G : error ? '#e53935' : '#d0d0d0'}`,
          borderRadius: 10, padding: '28px 16px', textAlign: 'center',
          cursor: 'pointer', background: file ? G_BG : '#fafafa',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0] || null)}
        />
        {file ? (
          <>
            <Check size={22} style={{ color: G, margin: '0 auto 6px', display: 'block' }} />
            <p style={{ fontSize: 13, color: G, fontWeight: 600, wordBreak: 'break-all', margin: 0 }}>{file.name}</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Click to replace</p>
          </>
        ) : (
          <>
            <Upload size={22} style={{ color: '#9ca3af', margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 13, color: '#555', margin: 0 }}>Click to upload</p>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>PDF, JPG, PNG up to 10MB</p>
          </>
        )}
      </div>
      {error && <p style={{ color: '#e53935', fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  )
}

function Stepper({ steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {steps.map((s, i) => {
        const done   = current > s.id
        const active = current === s.id
        const Icon   = s.icon
        return (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: done || active ? NEON : 'transparent',
                border: `2px solid ${done || active ? NEON : '#ccc'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done
                  ? <Check size={16} color="#0a0a0a" />
                  : <Icon size={16} color={active ? '#0a0a0a' : '#bbb'} />
                }
              </div>
              <div className="step-label">
                <p style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#1a1a1a' : done ? '#555' : '#aaa', margin: 0, lineHeight: 1.25 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: '#aaa', margin: 0, lineHeight: 1.3 }}>{s.sub}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? NEON : '#e0e0e0', margin: '0 14px', minWidth: 28 }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ── shared style helpers ─────────────────────────────────────────────── */
const inp = (err) => ({
  width: '100%', padding: '11px 14px', borderRadius: 8, fontSize: 14,
  background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
  border: `1.5px solid ${err ? '#e53935' : '#ddd'}`, fontFamily: 'inherit',
  transition: 'border-color 0.2s',
})
const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }
const err = { color: '#e53935', fontSize: 12, marginTop: 3 }
const secHead = { fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 3 }
const secSub  = { fontSize: 13, color: '#777', marginBottom: 18 }

/* ── step definitions ─────────────────────────────────────────────────── */
const RIDER_STEPS = [
  { id: 1, label: 'Personal Details',       sub: 'Name, contact & password',  icon: User     },
  { id: 2, label: 'Identity Verification',  sub: 'Government-issued ID',       icon: FileText },
  { id: 3, label: 'Confirmation',           sub: 'Terms & agreement',          icon: Shield   },
]
const DRIVER_STEPS = [
  { id: 1, label: 'Personal Details',       sub: 'Name, contact & password',  icon: User     },
  { id: 2, label: 'Vehicle & Documents',    sub: 'License & vehicle info',     icon: Car      },
  { id: 3, label: 'Certification',          sub: 'Terms & signature',          icon: Shield   },
]

const CITIES    = ['Lagos','Abuja','Port Harcourt','Kano','Ibadan','Enugu','Benin City','Accra','Nairobi','Cape Town','Dakar']
const ID_TYPES  = ['National ID (NIN)','International Passport',"Driver's License","Voter's Card"]
const VEH_TYPES = ['Car','Motorcycle','Tricycle (Keke)','Minibus','Bus']

const LAGOS_AREAS = [
  // ── Islands & Upscale ──
  'Victoria Island', 'Ikoyi', 'Lekki Phase 1', 'Lekki Phase 2', 'Lekki-Epe Expressway',
  'Ajah', 'Sangotedo', 'Chevron / Idado', 'Ikate', 'Osapa London', 'Abraham Adesanya',
  'Badore', 'Ibeju-Lekki', 'Eleko', 'Epe',
  // ── Mainland — Central ──
  'Yaba', 'Surulere', 'Ojuelegba', 'Ikeja', 'Maryland', 'Gbagada', 'Shomolu', 'Bariga',
  'Ketu', 'Ojota', 'Mile 12', 'Alapere', 'Magodo', 'Oregun', 'Omole', 'Agidingbi', 'Ogudu',
  // ── Mainland — West ──
  'Agege', 'Ogba', 'Ojodu Berger', 'Ifako-Ijaiye', 'Dopemu', 'Iyana Ipaja', 'Ipaja',
  'Egbeda', 'Idimu', 'Alimosho', 'Akowonjo', 'Isheri', 'Abule Egba', 'Meiran',
  // ── Mainland — East ──
  'Mushin', 'Oshodi', 'Isolo', 'Ejigbo', 'Ikotun', 'Mile 2', 'Amuwo-Odofin',
  'Festac Town', 'Satellite Town', 'Okota', 'Ilasamaja',
  // ── Lagos Island ──
  'Lagos Island', 'Lagos Mainland', 'Apapa', 'Badia', 'Ajegunle',
  // ── Outskirts ──
  'Badagry', 'Ikorodu', 'Ojo', 'Ijede', 'Agbowa',
].sort()

/* ══════════════════════════════════════════════════════════════════════ */
export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const { role: urlRole } = useParams()
  const role  = urlRole === 'driver' ? 'driver' : 'rider'
  const steps = role === 'driver' ? DRIVER_STEPS : RIDER_STEPS

  const [step,    setStep]    = useState(1)
  const [showPw,  setShowPw]  = useState(false)
  const [errors,  setErrors]  = useState({})
  const [apiError,setApiError]= useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    // step 1
    name:'', email:'', phone:'', city:'', area:'', password:'', confirm:'',
    // step 2 rider
    idType:'', idNumber:'',
    // step 2 driver
    vehicleType:'', vehicleMake:'', vehicleModel:'', plateNumber:'', vehicleYear:'',
    // step 3
    agreeTerms: false, agreeBackground: false,
  })
  const [files, setFiles] = useState({
    idDoc: null, selfie: null,
    driverLicense: null, vehicleReg: null, insurance: null, profilePhoto: null,
    carFront: null, carSide: null, roadworthiness: null, utilityBill: null,
  })

  function f(field, val) {
    setForm(p => ({ ...p, [field]: typeof val === 'string' ? clean(val) : val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }
  function setFile(field, val) { setFiles(p => ({ ...p, [field]: val })) }

  /* ── validation ─────────────────────────────────────────────────────── */
  function v1() {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Enter your full name.'
    if (!validateEmail(form.email))         e.email = 'Enter a valid email address.'
    if (!validatePhone(form.phone))         e.phone = 'Enter a valid Nigerian phone number.'
    if (!form.city)                         e.city  = 'Select your city.'
    if (!form.area) e.area = form.city === 'Lagos' ? 'Select your area in Lagos.' : 'Enter your area / neighbourhood.'
    if (!validatePassword(form.password))   e.password = 'Min 8 chars, 1 uppercase, 1 number.'
    if (form.password !== form.confirm)     e.confirm = 'Passwords do not match.'
    setErrors(e); return !Object.keys(e).length
  }
  function v2Rider() {
    const e = {}
    if (!form.idType)                          e.idType   = 'Select an ID type.'
    if (!form.idNumber || form.idNumber.length < 5) e.idNumber = 'Enter a valid ID number.'
    if (!files.idDoc)                          e.idDoc    = 'Upload your ID document.'
    setErrors(e); return !Object.keys(e).length
  }
  function v2Driver() {
    const e = {}
    if (!form.vehicleType)  e.vehicleType  = 'Select vehicle type.'
    if (!form.vehicleMake)  e.vehicleMake  = 'Enter vehicle make / brand.'
    if (!form.vehicleModel) e.vehicleModel = 'Enter vehicle model.'
    if (!form.plateNumber)  e.plateNumber  = 'Enter plate number.'
    if (!form.vehicleYear)  e.vehicleYear  = 'Enter year of manufacture.'
    if (!files.driverLicense)   e.driverLicense   = "Upload your driver's license."
    if (!files.carFront)        e.carFront        = 'Upload a front-view photo of your car.'
    if (!files.profilePhoto)    e.profilePhoto    = 'Upload a clear profile / headshot photo.'
    setErrors(e); return !Object.keys(e).length
  }
  function v3() {
    const e = {}
    if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms.'
    if (role === 'driver' && !form.agreeBackground) e.agreeBackground = 'You must consent to a background check.'
    setErrors(e); return !Object.keys(e).length
  }

  function nextStep() {
    let ok = false
    if (step === 1) ok = v1()
    if (step === 2) ok = role === 'rider' ? v2Rider() : v2Driver()
    if (!ok) return
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  async function submit() {
    if (!v3()) return
    setLoading(true); setApiError('')
    try {
      const user = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password, role })
      navigate(user.role === 'driver' ? '/driver' : '/book')
    } catch (e) {
      setApiError(!e.status
        ? 'Cannot connect to server. Make sure the backend is running on port 4000.'
        : e.data?.message || 'Registration failed. Please try again.'
      )
    } finally { setLoading(false) }
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f4', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '14px clamp(20px,5vw,60px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 38, height: 38, objectFit: 'contain' }} />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.15 }}>FeaziMove</p>
            <p style={{ margin: 0, fontSize: 11, color: '#888', lineHeight: 1.15 }}>
              {role === 'driver' ? 'Driver Registration Portal' : 'Rider Registration Portal'}
            </p>
          </div>
        </Link>
        <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: '#555', textDecoration: 'none' }}>
          Already have an account?{' '}
          <span style={{ color: G, textDecoration: 'underline' }}>Log in</span>
        </Link>
      </div>

      {/* ── Stepper bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '18px clamp(20px,5vw,60px) 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Stepper steps={steps} current={step} />
          <p style={{ textAlign: 'right', fontSize: 12, color: '#999', margin: '12px 0 0', paddingBottom: 16 }}>
            Step {step} of {steps.length}
          </p>
        </div>
      </div>

      {/* ── Form card ── */}
      <div style={{ flex: 1, padding: 'clamp(24px,4vw,48px) clamp(20px,5vw,60px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.07)', padding: 'clamp(28px,4vw,48px)' }}>

            {/* ════ STEP 1 — Personal Details ════ */}
            {step === 1 && <>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Personal Details</h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>Fill in your name, contact information, and create a secure password.</p>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28 }}>
                <p style={secHead}>Basic Information</p>
                <p style={secSub}>Your full name and contact details.</p>

                {/* Full name — full width */}
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>Full Name <Req /></label>
                  <input type="text" value={form.name} onChange={e => f('name', e.target.value)}
                    placeholder="Adaeze Okonkwo" autoComplete="name" style={inp(!!errors.name)} />
                  {errors.name && <p style={err}>{errors.name}</p>}
                </div>

                <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={lbl}>Telephone <Req /></label>
                    <input type="tel" value={form.phone} onChange={e => f('phone', e.target.value)}
                      placeholder="+234 800 000 0000" autoComplete="tel" style={inp(!!errors.phone)} />
                    {errors.phone && <p style={err}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Email Address <Req /></label>
                    <input type="email" value={form.email} onChange={e => f('email', e.target.value)}
                      placeholder="you@example.com" autoComplete="email" style={inp(!!errors.email)} />
                    {errors.email && <p style={err}>{errors.email}</p>}
                  </div>
                  <div>
                    <label style={lbl}>City <Req /></label>
                    <select value={form.city} onChange={e => { f('city', e.target.value); f('area', '') }} style={{ ...inp(!!errors.city), cursor: 'pointer' }}>
                      <option value="">Select city</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <p style={err}>{errors.city}</p>}
                  </div>

                  {/* Area — always visible */}
                  <div>
                    <label style={lbl}>Area <Req /></label>
                    {form.city === 'Lagos' ? (
                      <select value={form.area} onChange={e => f('area', e.target.value)} style={{ ...inp(!!errors.area), cursor: 'pointer' }}>
                        <option value="">Select area in Lagos</option>
                        {LAGOS_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={form.area} onChange={e => f('area', e.target.value)}
                        placeholder="Enter your area / neighbourhood"
                        style={inp(!!errors.area)} />
                    )}
                    {errors.area && <p style={err}>{errors.area}</p>}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24, marginBottom: 4 }}>
                  <p style={secHead}>Security</p>
                  <p style={secSub}>Create a strong password for your account.</p>
                  <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={lbl}>Password <Req /></label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPw ? 'text' : 'password'} value={form.password}
                          onChange={e => f('password', e.target.value)}
                          placeholder="Min 8 chars, 1 uppercase, 1 number" autoComplete="new-password"
                          style={{ ...inp(!!errors.password), paddingRight: 44 }} />
                        <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password"
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {errors.password && <p style={err}>{errors.password}</p>}
                    </div>
                    <div>
                      <label style={lbl}>Confirm Password <Req /></label>
                      <input type={showPw ? 'text' : 'password'} value={form.confirm}
                        onChange={e => f('confirm', e.target.value)}
                        placeholder="Repeat password" autoComplete="new-password"
                        style={inp(!!errors.confirm)} />
                      {errors.confirm && <p style={err}>{errors.confirm}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </>}

            {/* ════ STEP 2 — RIDER: Identity Verification ════ */}
            {step === 2 && role === 'rider' && <>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Identity Verification</h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>Provide your government-issued ID to verify your identity.</p>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28 }}>
                <p style={secHead}>ID Information</p>
                <p style={secSub}>Select your ID type and enter the ID number.</p>
                <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                  <div>
                    <label style={lbl}>ID Type <Req /></label>
                    <select value={form.idType} onChange={e => f('idType', e.target.value)} style={{ ...inp(!!errors.idType), cursor: 'pointer' }}>
                      <option value="">Select ID type</option>
                      {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.idType && <p style={err}>{errors.idType}</p>}
                  </div>
                  <div>
                    <label style={lbl}>ID Number <Req /></label>
                    <input type="text" value={form.idNumber} onChange={e => f('idNumber', e.target.value)}
                      placeholder="Enter your ID number" style={inp(!!errors.idNumber)} />
                    {errors.idNumber && <p style={err}>{errors.idNumber}</p>}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
                  <p style={secHead}>Required Documents</p>
                  <p style={secSub}>ID document is mandatory. Selfie with ID is optional but recommended.</p>
                  <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <UploadBox label="ID Document" required file={files.idDoc} onFile={v => setFile('idDoc', v)} error={errors.idDoc} />
                    <UploadBox label="Selfie with ID (Optional)" file={files.selfie} onFile={v => setFile('selfie', v)} />
                  </div>
                </div>
              </div>
            </>}

            {/* ════ STEP 2 — DRIVER: Vehicle & Documents ════ */}
            {step === 2 && role === 'driver' && <>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Vehicle &amp; Documents</h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>Provide your vehicle information and upload the required documents.</p>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28 }}>
                <p style={secHead}>Vehicle Information</p>
                <p style={secSub}>Details about the vehicle you will be driving.</p>
                <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                  <div>
                    <label style={lbl}>Type of Vehicle <Req /></label>
                    <select value={form.vehicleType} onChange={e => f('vehicleType', e.target.value)} style={{ ...inp(!!errors.vehicleType), cursor: 'pointer' }}>
                      <option value="">Select type</option>
                      {VEH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.vehicleType && <p style={err}>{errors.vehicleType}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Vehicle Make / Brand <Req /></label>
                    <input type="text" value={form.vehicleMake} onChange={e => f('vehicleMake', e.target.value)}
                      placeholder="e.g. Toyota" style={inp(!!errors.vehicleMake)} />
                    {errors.vehicleMake && <p style={err}>{errors.vehicleMake}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Vehicle Model <Req /></label>
                    <input type="text" value={form.vehicleModel} onChange={e => f('vehicleModel', e.target.value)}
                      placeholder="e.g. Corolla" style={inp(!!errors.vehicleModel)} />
                    {errors.vehicleModel && <p style={err}>{errors.vehicleModel}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Plate Number <Req /></label>
                    <input type="text" value={form.plateNumber} onChange={e => f('plateNumber', e.target.value)}
                      placeholder="e.g. LAG-123-AB" style={inp(!!errors.plateNumber)} />
                    {errors.plateNumber && <p style={err}>{errors.plateNumber}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Year of Manufacture <Req /></label>
                    <input type="number" value={form.vehicleYear} onChange={e => f('vehicleYear', e.target.value)}
                      placeholder="e.g. 2019" min="2000" max="2026" style={inp(!!errors.vehicleYear)} />
                    {errors.vehicleYear && <p style={err}>{errors.vehicleYear}</p>}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
                  <p style={secHead}>Required Documents</p>
                  <p style={secSub}>Driver's License, Vehicle Registration, Roadworthiness Certificate, car photos, and profile photo are mandatory. Insurance Certificate and Utility Bill are optional.</p>

                  {/* Row 1 — License & Registration */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>License &amp; Registration</p>
                  <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                    <UploadBox label="Driver's License" required file={files.driverLicense} onFile={v => setFile('driverLicense', v)} error={errors.driverLicense} />
                    <UploadBox label="Vehicle Registration (Optional)" file={files.vehicleReg} onFile={v => setFile('vehicleReg', v)} />
                  </div>

                  {/* Row 2 — Car Photos */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Vehicle Photos</p>
                  <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                    <UploadBox label="Car Image — Front View" required file={files.carFront} onFile={v => setFile('carFront', v)} error={errors.carFront} />
                    <UploadBox label="Car Image — Side View (Optional)" file={files.carSide} onFile={v => setFile('carSide', v)} />
                  </div>

                  {/* Row 3 — Compliance */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Compliance &amp; Identity</p>
                  <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <UploadBox label="Roadworthiness Certificate (Optional)" file={files.roadworthiness} onFile={v => setFile('roadworthiness', v)} />
                    <UploadBox label="Profile / Headshot Photo" required file={files.profilePhoto} onFile={v => setFile('profilePhoto', v)} error={errors.profilePhoto} />
                  </div>
                </div>
              </div>
            </>}

            {/* ════ STEP 3 — Confirmation / Certification ════ */}
            {step === 3 && <>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>
                {role === 'driver' ? 'Certification' : 'Confirmation'}
              </h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>
                {role === 'driver'
                  ? 'Review and certify your application to become a FeaziMove driver.'
                  : 'Review your details and agree to our terms to complete your registration.'}
              </p>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28 }}>
                {/* Summary */}
                <div style={{ background: 'rgba(204,255,0,0.18)', border: '1.5px solid #ccff00', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b8000', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Application Summary</p>
                  <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
                    {[
                      ['Full Name',    form.name],
                      ['Email',        form.email],
                      ['Phone',        form.phone],
                      ['City',         form.city],
                      ['Account Type', role === 'driver' ? 'Driver' : 'Rider'],
                      ...(role === 'rider'
                        ? [['ID Type', form.idType]]
                        : [['Vehicle', `${form.vehicleMake} ${form.vehicleModel} (${form.vehicleType})`]]),
                    ].filter(([,v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <p style={{ fontSize: 11, color: '#888', margin: 0 }}>{k}</p>
                        <p style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 600, margin: '2px 0 0', wordBreak: 'break-word' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkboxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.agreeTerms} onChange={e => f('agreeTerms', e.target.checked)}
                        style={{ marginTop: 2, accentColor: NEON, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                      <span style={{ fontSize: 13, color: '#444', lineHeight: 1.65 }}>
                        I agree to FeaziMove's{' '}
                        <Link to="/policies" style={{ color: G, fontWeight: 600 }}>Terms of Service</Link> and{' '}
                        <Link to="/policies" style={{ color: G, fontWeight: 600 }}>Privacy Policy</Link>.
                        I confirm that all information provided is accurate and truthful.
                      </span>
                    </label>
                    {errors.agreeTerms && <p style={{ ...err, marginLeft: 28 }}>{errors.agreeTerms}</p>}
                  </div>

                  {role === 'driver' && (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.agreeBackground} onChange={e => f('agreeBackground', e.target.checked)}
                          style={{ marginTop: 2, accentColor: NEON, width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, color: '#444', lineHeight: 1.65 }}>
                          I consent to a background check and vehicle verification as part of the FeaziMove driver onboarding process.
                        </span>
                      </label>
                      {errors.agreeBackground && <p style={{ ...err, marginLeft: 28 }}>{errors.agreeBackground}</p>}
                    </div>
                  )}
                </div>

                {/* API error */}
                {apiError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginTop: 20 }} role="alert">
                    <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{apiError}</p>
                  </div>
                )}
              </div>
            </>}

            {/* ── Nav buttons ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 36, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>

              {/* Back / Change Role */}
              {step > 1 ? (
                <button type="button" onClick={() => { setStep(s => s - 1); window.scrollTo(0, 0) }}
                  style={backBtn}>
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <Link to="/register" style={{ ...backBtn, textDecoration: 'none' }}>
                  <ChevronLeft size={16} /> Change Role
                </Link>
              )}

              {/* Next / Submit */}
              {step < 3 ? (
                <button type="button" onClick={nextStep} style={nextBtn(false)}>
                  Next: {steps[step].label} <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={loading} style={nextBtn(loading)}>
                  {loading ? (
                    <><Spinner /> Creating account…</>
                  ) : (
                    <>{role === 'driver' ? 'Submit Driver Application' : 'Create Rider Account'} <ArrowRight size={16} /></>
                  )}
                </button>
              )}
            </div>

          </div>

          <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: G, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .reg-grid  { grid-template-columns: 1fr !important; }
          .step-label { display: none; }
        }
      `}</style>
    </div>
  )
}

/* ── tiny helpers ─────────────────────────────────────────────────────── */
function Req() { return <span style={{ color: '#e53935' }}> *</span> }
function Spinner() {
  return <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', display: 'inline-block', marginRight: 4 }} />
}
const backBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 22px', borderRadius: 50,
  border: '1.5px solid #ddd', background: '#fff',
  color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const nextBtn = (disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 28px', borderRadius: 50, border: 'none',
  background: disabled ? '#888' : NEON,
  color: disabled ? '#fff' : '#0a0a0a', fontSize: 14, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
})
