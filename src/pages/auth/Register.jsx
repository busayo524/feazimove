import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import {
  Eye, EyeOff, Upload, Check, ArrowRight, ChevronLeft,
  User, FileText, Shield, Car, AlertCircle, Lock, Camera, RefreshCw, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import faviconImg from '../../assets/favicon.png'
import PhoneInput from '../../components/PhoneInput'

/* ── helpers ──────────────────────────────────────────────────────────── */
function validatePhone(p) {
  const cleaned = p.replace(/[\s\-()]/g, '')
  if (/^\+\d{6,15}$/.test(cleaned)) return true
  return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned)
}

// Per-ID-type format validation
const ID_FORMATS = {
  'National ID (NIN)':  { regex: /^\d{11}$/, hint: '11 digits (e.g. 12345678901)' },
  "Driver's License":   { regex: /^[A-Z0-9\-]{8,15}$/i, hint: '8–15 alphanumeric characters (e.g. LAG290184543)' },
  "Voter's Card":       { regex: /^[A-Z0-9]{19}$/i, hint: '19 alphanumeric characters (VIN)' },
}
function validateIdNumber(idType, idNumber) {
  const fmt = ID_FORMATS[idType]
  if (!fmt) return false
  return fmt.regex.test(idNumber.replace(/\s/g, ''))
}
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

function Stepper({ steps, current, minDone = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {steps.map((s, i) => {
        const done   = current > s.id || s.id <= minDone
        const active = current === s.id && s.id > minDone
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
const ID_TYPES  = ['National ID (NIN)',"Driver's License","Voter's Card"]
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

/* ── Webcam Capture Modal ─────────────────────────────────────────────── */
function CameraModal({ onCapture, onClose }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [ready,    setReady]    = useState(false)
  const [error,    setError]    = useState(null)
  const [flash,    setFlash]    = useState(false)
  const [devices,  setDevices]  = useState([])
  const [deviceId, setDeviceId] = useState(null)

  function isVirtualCamera(label='') {
    return /virtual|obs|snap|ManyCam|XSplit|splitcam/i.test(label)
  }

  async function loadDevices() {
    try {
      const all  = await navigator.mediaDevices.enumerateDevices()
      const cams = all.filter(d => d.kind === 'videoinput')
      setDevices(cams)
      return cams
    } catch { return [] }
  }

  async function tryStream(deviceId) {
    const constraints = {
      video: deviceId
        ? { deviceId:{ exact:deviceId }, width:{ideal:1280}, height:{ideal:720} }
        : { width:{ideal:1280}, height:{ideal:720} },
      audio: false,
    }
    return navigator.mediaDevices.getUserMedia(constraints)
  }

  function attachStream(stream, cams) {
    streamRef.current = stream
    const label  = stream.getVideoTracks()[0]?.label || ''
    const active = cams.find(d => d.label === label)
    if (active) setDeviceId(active.deviceId)
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => setReady(true)
    }
  }

  const startCamera = useCallback(async (preferredId = null) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setReady(false); setError(null)
    try {
      const stream = await tryStream(preferredId)
      const cams   = await loadDevices()
      attachStream(stream, cams)
    } catch(firstErr) {
      const cams = await loadDevices()
      if (firstErr.name === 'NotReadableError' || firstErr.name === 'AbortError') {
        // Auto-try real cameras, skipping virtual ones
        const realCams = cams.filter(d => !isVirtualCamera(d.label) && d.deviceId !== preferredId)
        for (const cam of realCams) {
          try {
            const stream = await tryStream(cam.deviceId)
            attachStream(stream, cams)
            return
          } catch { /* try next */ }
        }
        setError('notreadable')
      } else if (firstErr.name === 'NotAllowedError') {
        setError('permission')
      } else if (firstErr.name === 'NotFoundError') {
        setError('notfound')
      } else {
        setError('other:' + firstErr.message)
      }
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, [startCamera])

  function capture() {
    if (!videoRef.current || !canvasRef.current || !ready) return
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d')
    ctx.translate(c.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0)
    setFlash(true); setTimeout(() => setFlash(false), 200)
    streamRef.current?.getTracks().forEach(t => t.stop())
    onCapture(c.toDataURL('image/jpeg', 0.92))
  }

  function renderError() {
    const msg = {
      permission:   'Camera permission denied. Click the camera icon in your browser\'s address bar and allow access.',
      notfound:     'No camera detected on this device.',
      notreadable:  'This camera couldn\'t start — it may be in use by another app, or it\'s a virtual camera (like OBS) that isn\'t active.',
    }[error] || (error?.startsWith('other:') ? error.replace('other:','') : 'Could not access camera.')
    return (
      <div style={{ padding:'20px 20px 0', textAlign:'center' }}>
        <Camera size={34} color="rgba(255,255,255,0.25)" style={{ marginBottom:10 }}/>
        <p style={{ color:'rgba(255,255,255,0.75)', fontSize:13, lineHeight:1.6, marginBottom:14 }}>{msg}</p>
        {devices.length > 1 && (
          <div style={{ marginBottom:12, textAlign:'left' }}>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>
              Try a different camera:
            </p>
            <select value={deviceId||''} onChange={e=>{setDeviceId(e.target.value);startCamera(e.target.value)}}
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.08)',
                border:'1px solid rgba(255,255,255,0.15)', color:'#fff', fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>
              {devices.map(d=>(
                <option key={d.deviceId} value={d.deviceId} style={{ background:'#222', color:'#fff' }}>
                  {d.label || `Camera ${d.deviceId.slice(0,8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <button onClick={() => startCamera(deviceId||null)}
          style={{ padding:'8px 18px', borderRadius:8, background:'rgba(204,255,0,0.12)', border:'1px solid rgba(204,255,0,0.3)',
            color:'#ccff00', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:4 }}>
          ↺ Try again
        </button>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#111', borderRadius:24, overflow:'hidden', maxWidth:440, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:16 }}>Take a Selfie</span>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
            <X size={16}/>
          </button>
        </div>
        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scaleX(-1)', display: (!error && ready) ? 'block' : 'none' }}/>
          {!error && !ready && <div style={{ color:'rgba(255,255,255,0.5)', fontSize:14 }}>Starting camera…</div>}
          {flash && <div style={{ position:'absolute', inset:0, background:'#fff', opacity:0.6, pointerEvents:'none' }}/>}
        </div>
        {error && renderError()}
        <canvas ref={canvasRef} style={{ display:'none' }}/>
        <div style={{ padding:'16px 20px 20px', display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
          <button type="button" onClick={onClose}
            style={{ padding:'11px 22px', borderRadius:50, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          {!error && (
            <button type="button" onClick={capture} disabled={!ready}
              style={{ padding:'11px 28px', borderRadius:50, background: ready ? '#ccff00' : 'rgba(204,255,0,0.25)', border:'none', color: ready ? '#243800' : 'rgba(36,56,0,0.4)', fontWeight:800, fontSize:14, cursor: ready ? 'pointer' : 'not-allowed', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
              <Camera size={15}/> Capture
            </button>
          )}
          {!error && ready && devices.length > 1 && (
            <select value={deviceId||''} onChange={e=>{setDeviceId(e.target.value);startCamera(e.target.value)}}
              style={{ padding:'8px 10px', borderRadius:50, background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:12, fontFamily:'inherit', cursor:'pointer', maxWidth:130 }}>
              {devices.map(d=>(
                <option key={d.deviceId} value={d.deviceId} style={{ background:'#222', color:'#fff' }}>
                  {(d.label||'Camera').slice(0,22)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function Register() {
  const { register, addRole, user: currentUser } = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const { role: urlRole } = useParams()
  const [searchParams]    = useSearchParams()
  const role  = urlRole === 'driver' ? 'driver' : 'rider'
  // ?add=true means an existing logged-in user is adding a second role
  const isAddingRole = searchParams.get('add') === 'true' && !!currentUser
  const steps = role === 'driver' ? DRIVER_STEPS : RIDER_STEPS

  // ── Prefill + token from OTP signup flow (navigation state) ──────────
  // When coming from Signup.jsx → VerifyOtp, navigation state contains:
  //   { registrationToken, prefill: { name, email, phone, password, confirm } }
  const navState      = location.state || {}
  const navToken      = navState.registrationToken || null

  // ── Legacy: token in URL query param (from email link) ───────────────
  const urlToken = searchParams.get('token')

  // Combined token — nav state takes priority (direct OTP flow)
  const regToken = navToken || urlToken

  // Token validation (only needed for URL-based tokens from old email-link flow)
  const [tokenState, setTokenState] = useState(
    navToken ? 'valid'                    // came from OTP — already verified
    : urlToken ? 'validating'             // came from email link — need to validate
    : 'none'
  )
  // Prefill fetched from the server when arriving via the email link (no nav state available)
  const [linkPrefill, setLinkPrefill] = useState(null)
  const prefill = navState.prefill || linkPrefill || {}

  useEffect(() => {
    if (!urlToken || navToken) return     // skip if using nav-state token
    api.get(`/auth/validate-reg-token?token=${encodeURIComponent(urlToken)}`)
      .then(res => {
        if (res.data.valid) {
          setLinkPrefill({ name: res.data.name, email: res.data.email, phone: res.data.phone })
          setTokenState('valid')
        } else {
          setTokenState('invalid')
        }
      })
      .catch(() => setTokenState('invalid'))
  }, [urlToken, navToken])

  // ── Always start at step 1 — name is now entered in the wizard ──────
  const startStep = 1

  const [step,    setStep]    = useState(startStep)
  const [showPw,  setShowPw]  = useState(false)
  const [errors,  setErrors]  = useState({})
  const [apiError,setApiError]= useState('')
  const [loading, setLoading] = useState(false)

  // Selfie
  const selfieInputRef   = useRef(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  // File upload is offered alongside the camera only for desktop/laptop —
  // phones/tablets already have a fast native camera, so we keep that flow simple.
  const isDesktop = !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  function handleSelfieDataUrl(dataUrl) {
    setSelfiePreview(dataUrl)
    setShowCamera(false)
    // Convert dataUrl to a File-like blob for any backend upload
    fetch(dataUrl).then(r => r.blob()).then(blob => {
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      setFile('selfie', file)
    })
  }

  function handleSelfie(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => handleSelfieDataUrl(e.target.result)
    reader.readAsDataURL(file)
  }

  // ID format check — updates live as user types
  const [idVerified, setIdVerified] = useState(false)

  function fId(field, val) {
    f(field, val)
    const nextType   = field === 'idType'   ? val : form.idType
    const nextNumber = field === 'idNumber' ? val : form.idNumber
    setIdVerified(!!(nextType && nextNumber && validateIdNumber(nextType, nextNumber)))
  }

  const [form, setForm] = useState({
    // step 1 — pre-filled from signup if coming from OTP flow
    firstName: prefill.name ? prefill.name.split(' ')[0] : '',
    lastName:  prefill.name ? prefill.name.split(' ').slice(1).join(' ') : '',
    email:   prefill.email   || '',
    phone:   prefill.phone   || '',
    city:    '',
    area:    '',
    dobDay:  '', dobMonth: '', dobYear: '',
    gender:  '',
    password: prefill.password || '',
    confirm:  prefill.confirm  || '',
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

  // linkPrefill resolves asynchronously (after the email-link token validates),
  // so the form's initial state above is empty — fill it in once it arrives.
  useEffect(() => {
    if (!linkPrefill) return
    setForm(p => ({
      ...p,
      firstName: linkPrefill.name ? linkPrefill.name.split(' ')[0] : p.firstName,
      lastName:  linkPrefill.name ? linkPrefill.name.split(' ').slice(1).join(' ') : p.lastName,
      email: linkPrefill.email || p.email,
      phone: linkPrefill.phone || p.phone,
    }))
  }, [linkPrefill])

  function f(field, val) {
    setForm(p => ({ ...p, [field]: typeof val === 'string' ? clean(val) : val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }
  function setFile(field, val) { setFiles(p => ({ ...p, [field]: val })) }

  /* ── validation ─────────────────────────────────────────────────────── */
  function v1() {
    const e = {}
    // When prefill is present (from OTP flow), name/email/phone/password were already validated at signup
    if (!prefill.name) {
      if (!form.firstName || form.firstName.length < 2) e.firstName = 'Enter your first name.'
      if (!form.lastName  || form.lastName.length  < 2) e.lastName  = 'Enter your last name.'
      if (!validateEmail(form.email))                   e.email     = 'Enter a valid email address.'
      if (!validatePhone(form.phone))                   e.phone     = 'Enter a valid phone number.'
      if (!validatePassword(form.password))             e.password  = 'Min 8 chars, 1 uppercase, 1 number.'
      if (form.password !== form.confirm)               e.confirm   = 'Passwords do not match.'
    }
    // Date of birth
    if (!form.dobDay || !form.dobMonth || !form.dobYear) {
      e.dob = 'Please enter your complete date of birth.'
    } else {
      const dob = new Date(+form.dobYear, +form.dobMonth - 1, +form.dobDay)
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (isNaN(dob.getTime())) e.dob = 'Invalid date of birth.'
      else if (age < 18) e.dob = 'You must be at least 18 years old to register.'
      else if (age > 100) e.dob = 'Please enter a valid date of birth.'
    }
    if (!form.gender) e.gender = 'Select your gender.'
    // City and area always required
    if (!form.city)  e.city = 'Select your city.'
    if (!form.area)  e.area = form.city === 'Lagos' ? 'Select your area in Lagos.' : 'Enter your area / neighbourhood.'
    setErrors(e); return !Object.keys(e).length
  }
  function v2Rider() {
    const e = {}
    if (!selfiePreview) e.selfie = 'Please take a selfie photo to use as your profile picture.'
    if (!form.idType) e.idType = 'Select an ID type.'
    if (!form.idNumber) {
      e.idNumber = 'Enter your ID number.'
    } else if (form.idType && !validateIdNumber(form.idType, form.idNumber)) {
      e.idNumber = `Invalid format. ${ID_FORMATS[form.idType]?.hint || ''}`
    }
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
      let user
      if (isAddingRole) {
        // Existing user adding a second role — no new account, just unlock the role
        user = await addRole(role)
      } else {
        // New account registration — multipart so uploaded documents go along with it
        const formData = new FormData()
        formData.append('registrationToken', regToken || '')
        formData.append('role', role)
        formData.append('name', [form.firstName, form.lastName].filter(Boolean).join(' '))
        if (role === 'rider') {
          if (form.idType)   formData.append('idType', form.idType)
          if (form.idNumber) formData.append('idNumber', form.idNumber)
        } else {
          if (form.vehicleType)  formData.append('vehicleType', form.vehicleType)
          if (form.vehicleMake)  formData.append('vehicleMake', form.vehicleMake)
          if (form.vehicleModel) formData.append('vehicleModel', form.vehicleModel)
          if (form.plateNumber)  formData.append('plateNumber', form.plateNumber)
          if (form.vehicleYear)  formData.append('vehicleYear', form.vehicleYear)
        }
        Object.entries(files).forEach(([field, file]) => {
          if (file) formData.append(field, file)
        })
        user = await register(formData)
      }
      // Save selfie as profile avatar to localStorage
      if (selfiePreview && user?.id) {
        localStorage.setItem(`feazi_avatar_${user.id}`, selfiePreview)
      }
      navigate(user.role === 'driver' ? '/driver' : '/book')
    } catch (e) {
      setApiError(!e.status
        ? 'Cannot connect to server. Make sure the backend is running on port 4000.'
        : e.data?.message || 'Registration failed. Please try again.'
      )
    } finally { setLoading(false) }
  }

  /* ── Token gate screens ─────────────────────────────────────────────── */
  if (tokenState === 'validating') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f3f4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #ccff00', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#666', fontSize: 14 }}>Verifying your registration link…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (tokenState === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2f3f4', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', borderRadius: 20, padding: 48, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏱</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 800, color: '#1a1a1a' }}>Link expired or invalid</h2>
          <p style={{ color: '#666', fontSize: 14, lineHeight: 1.7, margin: '0 0 28px' }}>
            Your registration link has expired or is no longer valid. Registration links are only valid for 24 hours.
          </p>
          <Link to="/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 50,
            background: '#ccff00', color: '#0a1f15',
            fontSize: 14, fontWeight: 800, textDecoration: 'none',
          }}>
            Start a new registration →
          </Link>
        </div>
      </div>
    )
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
          {/* When starting at step 2 (prefill from OTP), treat step 1 as already done */}
          <Stepper steps={steps} current={step} minDone={startStep > 1 ? 1 : 0} />
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
              <p style={{ fontSize: 14, color: '#666', marginBottom: prefill.name ? 16 : 28 }}>Fill in your name, contact information, and create a secure password.</p>
              {/* Pre-fill banner — shown when arriving from OTP flow */}
              {prefill.name && (
                <div style={{ background: 'rgba(204,255,0,0.18)', border: '1.5px solid #ccff00', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <p style={{ margin: 0, fontSize: 13, color: '#2a6048', fontWeight: 600 }}>
                    {prefill.password
                      ? 'Email, phone and password pre-filled from your signup. Add your name, city and area below.'
                      : 'Email and phone pre-filled from your signup. Your password is already set — add your name, city and area below.'}
                  </p>
                </div>
              )}

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28 }}>
                <p style={secHead}>Basic Information</p>
                <p style={secSub}>Your full name and contact details.</p>

                {/* First + Last name side by side */}
                <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 18 }}>
                  <div>
                    <label style={lbl}>First Name <Req /></label>
                    <input type="text" value={form.firstName} onChange={e => f('firstName', e.target.value)}
                      placeholder="Adaeze" autoComplete="given-name" style={inp(!!errors.firstName)} />
                    {errors.firstName && <p style={err}>{errors.firstName}</p>}
                  </div>
                  <div>
                    <label style={lbl}>Last Name <Req /></label>
                    <input type="text" value={form.lastName} onChange={e => f('lastName', e.target.value)}
                      placeholder="Okonkwo" autoComplete="family-name" style={inp(!!errors.lastName)} />
                    {errors.lastName && <p style={err}>{errors.lastName}</p>}
                  </div>
                </div>

                <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={lbl}>Telephone <Req /></label>
                    <PhoneInput
                      value={form.phone}
                      onChange={v => { setForm(p => ({ ...p, phone: v })); setErrors(p => ({ ...p, phone: '' })) }}
                      error={!!errors.phone}
                      disabled={!!prefill.phone}
                    />
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

                {/* Date of Birth + Gender */}
                <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <label style={lbl}>Date of Birth <Req /></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1.2fr', gap: 8 }}>
                      {/* Day */}
                      <select value={form.dobDay} onChange={e => f('dobDay', e.target.value)}
                        style={{ ...inp(!!errors.dob), cursor: 'pointer' }}>
                        <option value="">DD</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                        ))}
                      </select>
                      {/* Month */}
                      <select value={form.dobMonth} onChange={e => f('dobMonth', e.target.value)}
                        style={{ ...inp(!!errors.dob), cursor: 'pointer' }}>
                        <option value="">Month</option>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      {/* Year */}
                      <select value={form.dobYear} onChange={e => f('dobYear', e.target.value)}
                        style={{ ...inp(!!errors.dob), cursor: 'pointer' }}>
                        <option value="">YYYY</option>
                        {Array.from({ length: 82 }, (_, i) => new Date().getFullYear() - 17 - i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    {errors.dob && <p style={err}>{errors.dob}</p>}
                  </div>

                  <div>
                    <label style={lbl}>Gender <Req /></label>
                    <select value={form.gender} onChange={e => f('gender', e.target.value)}
                      style={{ ...inp(!!errors.gender), cursor: 'pointer' }}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                    {errors.gender && <p style={err}>{errors.gender}</p>}
                  </div>
                </div>

                {/* Password was already set during the initial signup step — only show
                    these fields when we actually have the plaintext value to confirm
                    (i.e. came via in-app nav state, not the email link). */}
                {!prefill.name || prefill.password ? (
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
                ) : null}
              </div>
            </>}

            {/* ════ STEP 2 — RIDER: Identity Verification ════ */}
            {step === 2 && role === 'rider' && <>
              <h2 style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Identity Verification</h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>Provide your government-issued ID to verify your identity.</p>

              {/* ── Selfie / Profile Photo ── */}
              {showCamera && <CameraModal onCapture={handleSelfieDataUrl} onClose={() => setShowCamera(false)}/>}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28, marginBottom: 28 }}>
                <p style={secHead}>Profile Photo</p>
                <p style={secSub}>Take a clear selfie — this will be your profile picture on FeaziMove.</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  {/* Circle preview / camera trigger */}
                  <div
                    onClick={() => setShowCamera(true)}
                    style={{
                      width: 110, height: 110, borderRadius: '50%', flexShrink: 0,
                      background: selfiePreview ? 'transparent' : '#f8f8f8',
                      border: `2.5px dashed ${selfiePreview ? '#22c55e' : errors.selfie ? '#e53935' : '#d1d5db'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {selfiePreview ? (
                      <img src={selfiePreview} alt="Selfie preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 8 }}>
                        <Camera size={30} color={errors.selfie ? '#e53935' : '#aaa'} />
                        <p style={{ fontSize: 11, color: errors.selfie ? '#e53935' : '#aaa', margin: '6px 0 0', lineHeight: 1.3 }}>Tap to open<br/>camera</p>
                      </div>
                    )}
                  </div>

                  {/* Hidden file input — fallback for retake from files */}
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleSelfie(e.target.files[0])}
                  />

                  <div style={{ flex: 1, minWidth: 200 }}>
                    {selfiePreview ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={13} color="#fff" strokeWidth={3}/>
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>Photo uploaded!</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 1.5 }}>
                          This will be your profile picture. Make sure your face is clearly visible.
                        </p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button type="button"
                            onClick={() => setShowCamera(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#243800', border: 'none', color: '#ccff00', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Camera size={13}/> Retake with camera
                          </button>
                          {isDesktop && (
                            <button type="button"
                              onClick={() => selfieInputRef.current?.click()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#fff', border: '1.5px solid #ddd', color: '#444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Upload size={13}/> Upload photo
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Take your selfie</p>
                        <p style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
                          Opens your live camera — works on both <strong>desktop</strong> and mobile.<br/>
                          The image is mirrored so it looks natural.
                        </p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <button type="button"
                            onClick={() => setShowCamera(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#243800', border: 'none', color: '#ccff00', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(36,56,0,0.2)' }}>
                            <Camera size={15}/> Open Camera
                          </button>
                          {isDesktop && (
                            <button type="button"
                              onClick={() => selfieInputRef.current?.click()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#fff', border: '1.5px solid #ddd', color: '#444', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Upload size={15}/> Upload Photo
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {errors.selfie && (
                  <p style={{ ...err, marginTop: 10 }}>{errors.selfie}</p>
                )}
              </div>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28 }}>
                <p style={secHead}>ID Information</p>
                <p style={secSub}>Select your ID type and enter the number.</p>

                {/* ID Type */}
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>ID Type <Req /></label>
                  <select value={form.idType} onChange={e => fId('idType', e.target.value)} style={{ ...inp(!!errors.idType), cursor: 'pointer' }}>
                    <option value="">Select ID type</option>
                    {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {form.idType && (
                    <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      Format: {ID_FORMATS[form.idType]?.hint}
                    </p>
                  )}
                  {errors.idType && <p style={err}>{errors.idType}</p>}
                </div>

                {/* ID Number — live format check with green tick */}
                <div style={{ marginBottom: 18 }}>
                  <label style={lbl}>ID Number <Req /></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={form.idNumber}
                      onChange={e => fId('idNumber', e.target.value)}
                      placeholder={
                        form.idType === 'National ID (NIN)' ? '12345678901' :
                        form.idType === "Driver's License"   ? 'LAG290184543' :
                        form.idType === "Voter's Card"       ? '9876GH7654321098765' :
                        'Enter your ID number'
                      }
                      style={{
                        ...inp(!!errors.idNumber && !idVerified),
                        paddingRight: idVerified ? 44 : 14,
                        borderColor: idVerified ? '#22c55e' : errors.idNumber ? '#e53935' : '#ddd',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    {idVerified && (
                      <span style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        width: 24, height: 24, borderRadius: '50%', background: '#22c55e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(34,197,94,0.35)',
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </div>
                  {errors.idNumber && !idVerified && <p style={err}>{errors.idNumber}</p>}
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
                      ['Full Name',    [form.firstName, form.lastName].filter(Boolean).join(' ')],
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
                        <a href="/policies?tab=terms&from=register" target="_blank" rel="noopener noreferrer" style={{ color: G, fontWeight: 600 }}>Terms of Service</a> and{' '}
                        <a href="/policies?tab=privacy&from=register" target="_blank" rel="noopener noreferrer" style={{ color: G, fontWeight: 600 }}>Privacy Policy</a>.
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
              {step > startStep ? (
                <button type="button" onClick={() => { setStep(s => s - 1); window.scrollTo(0, 0) }}
                  style={backBtn}>
                  <ChevronLeft size={16} /> Back
                </button>
              ) : startStep > 1 ? (
                <Link to="/signup" style={{ ...backBtn, textDecoration: 'none' }}>
                  <ChevronLeft size={16} /> Back to Signup
                </Link>
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
