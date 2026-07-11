import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { useMyAvatar } from '../../hooks/useMyAvatar'
import { dataUrlToFile } from '../../utils/dataUrlToFile'
import { compressImage } from '../../utils/compressImage'
import { User, Phone, Mail, Shield, Bell, ChevronRight, LogOut, Camera, CheckCircle, X, RefreshCw, Car, MapPin, AlertCircle } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

function sanitize(v){return String(v).replace(/[<>"]/g,'').slice(0,100)}

// ── Webcam Modal ──────────────────────────────────────────────────────────────
function CameraModal({ onCapture, onClose }){
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const [ready,    setReady]    = useState(false)
  const [error,    setError]    = useState(null)
  const [flash,    setFlash]    = useState(false)
  const [devices,  setDevices]  = useState([])      // list of video input devices
  const [deviceId, setDeviceId] = useState(null)    // currently selected device

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
        : { width:{ideal:1280}, height:{ideal:720} },   // no facingMode — avoids biasing to OBS
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

  const startCamera = useCallback(async (preferredDeviceId = null) => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setReady(false)
    setError(null)

    try {
      // 1. Try the preferred / default device first
      const stream = await tryStream(preferredDeviceId)
      const cams   = await loadDevices()
      attachStream(stream, cams)
    } catch(firstErr) {
      // Enumerate devices so we can try alternatives
      const cams = await loadDevices()

      // 2. If default failed with NotReadable/Abort, auto-try real (non-virtual) cameras
      if (firstErr.name === 'NotReadableError' || firstErr.name === 'AbortError') {
        const realCams = cams.filter(d => !isVirtualCamera(d.label) && d.deviceId !== preferredDeviceId)
        for (const cam of realCams) {
          try {
            const stream = await tryStream(cam.deviceId)
            attachStream(stream, cams)
            return   // success — stop trying
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

  function capture(){
    if(!videoRef.current || !canvasRef.current || !ready) return
    const v = videoRef.current, c = canvasRef.current
    c.width  = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    ctx.translate(c.width, 0); ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0)
    setFlash(true)
    setTimeout(() => setFlash(false), 200)
    const dataUrl = c.toDataURL('image/jpeg', 0.92)
    streamRef.current?.getTracks().forEach(t => t.stop())
    onCapture(dataUrl)
  }

  // Error message + device picker when camera can't start
  function renderError(){
    const msg = {
      permission: "Camera permission denied. Click the camera icon in your browser's address bar and allow access.",
      notfound:   'No camera detected on this device.',
      notreadable:'This camera couldn\'t start — it may be in use by another app, or it\'s a virtual camera (like OBS) that isn\'t active.',
    }[error] || error?.replace('other:', '') || 'Could not access camera.'

    const isVirtual = error === 'notreadable'
    return (
      <div style={{padding:'20px 20px 0',textAlign:'center'}}>
        <Camera size={36} color='rgba(255,255,255,0.25)' style={{marginBottom:10}}/>
        <p style={{color:'rgba(255,255,255,0.75)',fontSize:13,lineHeight:1.6,marginBottom:14}}>{msg}</p>
        {devices.length > 1 && (
          <div style={{marginBottom:12,textAlign:'left'}}>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>
              {isVirtual ? 'Try a different camera:' : 'Available cameras:'}
            </p>
            <select
              value={deviceId || ''}
              onChange={e => { setDeviceId(e.target.value); startCamera(e.target.value) }}
              style={{width:'100%',padding:'9px 12px',borderRadius:8,background:'rgba(255,255,255,0.08)',
                border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId} style={{background:'#222',color:'#fff'}}>
                  {d.label || `Camera ${d.deviceId.slice(0,8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <button onClick={() => startCamera(deviceId || null)}
          style={{padding:'9px 20px',borderRadius:8,background:'rgba(204,255,0,0.15)',border:'1px solid rgba(204,255,0,0.3)',
            color:NEON,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',marginBottom:4}}>
          ↺ Try again
        </button>
      </div>
    )
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#111',borderRadius:24,overflow:'hidden',maxWidth:480,width:'100%',boxShadow:'0 24px 60px rgba(0,0,0,0.6)'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <span style={{color:'#fff',fontWeight:700,fontSize:16}}>Take a Selfie</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:'50%',width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff'}}>
            <X size={16}/>
          </button>
        </div>

        {/* Video area */}
        <div style={{position:'relative',background:'#000',aspectRatio:'4/3',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
          <video ref={videoRef} autoPlay playsInline muted
            style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:(!error && ready)?'block':'none'}}/>
          {!error && !ready && <div style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>Starting camera…</div>}
          {flash && <div style={{position:'absolute',inset:0,background:'#fff',opacity:0.6,pointerEvents:'none'}}/>}
        </div>

        {/* Error section (outside video area so select is clickable) */}
        {error && renderError()}

        <canvas ref={canvasRef} style={{display:'none'}}/>

        {/* Controls */}
        <div style={{padding:'16px 20px 20px',display:'flex',justifyContent:'center',gap:12}}>
          <button onClick={onClose}
            style={{padding:'11px 22px',borderRadius:50,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
            Cancel
          </button>
          {!error && (
            <button onClick={capture} disabled={!ready}
              style={{padding:'11px 28px',borderRadius:50,background:ready?NEON:'rgba(204,255,0,0.25)',border:'none',color:ready?OLIVE:'rgba(36,56,0,0.4)',fontWeight:800,fontSize:14,cursor:ready?'pointer':'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}>
              <Camera size={15}/>Capture
            </button>
          )}
          {/* Camera switcher when working (more than one camera) */}
          {!error && ready && devices.length > 1 && (
            <select value={deviceId||''} onChange={e=>{setDeviceId(e.target.value);startCamera(e.target.value)}}
              style={{padding:'8px 10px',borderRadius:50,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',fontSize:12,fontFamily:'inherit',cursor:'pointer',maxWidth:130}}>
              {devices.map(d=>(
                <option key={d.deviceId} value={d.deviceId} style={{background:'#222',color:'#fff'}}>
                  {(d.label||`Camera`).slice(0,22)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Photo source picker (webcam or file upload) ───────────────────────────────
function PhotoPicker({ onDone, onClose }){
  const fileInputRef=useRef(null)
  const [mode,setMode]=useState(null) // 'webcam' | 'file'

  if(mode==='webcam') return <CameraModal onCapture={onDone} onClose={onClose}/>

  return(
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:CARD,borderRadius:24,padding:28,maxWidth:340,width:'100%',boxShadow:'0 20px 50px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <p style={{fontWeight:800,fontSize:17,color:TEXT}}>Update Photo</p>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,padding:4}}><X size={18}/></button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <button onClick={()=>setMode('webcam')}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',borderRadius:14,border:`1.5px solid ${BORDER}`,background:BG,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'border-color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=MOSS}
            onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
            <div style={{width:40,height:40,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Camera size={18} color={OLIVE}/>
            </div>
            <div>
              <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Take a selfie</p>
              <p style={{fontSize:12,color:MUTED,marginTop:2}}>Use your webcam or front camera</p>
            </div>
          </button>
          <button onClick={()=>fileInputRef.current?.click()}
            style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',borderRadius:14,border:`1.5px solid ${BORDER}`,background:BG,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'border-color 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=MOSS}
            onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
            <div style={{width:40,height:40,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <RefreshCw size={18} color={OLIVE}/>
            </div>
            <div>
              <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Upload from device</p>
              <p style={{fontSize:12,color:MUTED,marginTop:2}}>Choose an image from your files</p>
            </div>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}}
          onChange={async e=>{
            const file=e.target.files[0]
            if(!file)return
            // Shrink before making a data URL — keeps the upload small and
            // stops full-size photos from blowing the localStorage quota
            const small=await compressImage(file)
            const reader=new FileReader()
            reader.onload=ev=>onDone(ev.target.result)
            reader.readAsDataURL(small)
          }}/>
      </div>
    </div>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }){
  const [currentPassword,setCurrentPassword]=useState('')
  const [newPassword,setNewPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [error,setError]=useState('')
  const [success,setSuccess]=useState(false)
  const [busy,setBusy]=useState(false)

  async function handleSubmit(e){
    e.preventDefault()
    setError('')
    if(newPassword!==confirm){setError('Passwords do not match.');return}
    setBusy(true)
    try{
      await api.post('/auth/change-password',{currentPassword,newPassword})
      setSuccess(true)
      setCurrentPassword('');setNewPassword('');setConfirm('')
    }catch(err){
      setError(err.data?.message||'Could not update password.')
    }finally{setBusy(false)}
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:CARD,borderRadius:24,padding:28,maxWidth:380,width:'100%',boxShadow:'0 20px 50px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
          <p style={{fontWeight:800,fontSize:17,color:TEXT}}>Change Password</p>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,padding:4}}><X size={18}/></button>
        </div>
        <p style={{fontSize:12,color:MUTED,marginBottom:18}}>Use at least 8 characters, one uppercase letter, and one number.</p>

        <form onSubmit={handleSubmit}>
          <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Current Password</label>
          <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required
            style={{width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${BORDER}`,fontSize:14,marginBottom:14,fontFamily:'inherit',boxSizing:'border-box',background:CARD,color:TEXT}}/>

          <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>New Password</label>
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required
            style={{width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${BORDER}`,fontSize:14,marginBottom:14,fontFamily:'inherit',boxSizing:'border-box',background:CARD,color:TEXT}}/>

          <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Confirm New Password</label>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required
            style={{width:'100%',padding:'10px 12px',borderRadius:10,border:`1.5px solid ${BORDER}`,fontSize:14,marginBottom:16,fontFamily:'inherit',boxSizing:'border-box',background:CARD,color:TEXT}}/>

          {error&&(
            <div style={{display:'flex',gap:8,padding:'10px 14px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:10,marginBottom:14}}>
              <AlertCircle size={14} color="#ef4444" style={{flexShrink:0,marginTop:1}}/>
              <p style={{fontSize:13,color:'#ef4444'}}>{error}</p>
            </div>
          )}
          {success&&(
            <div style={{display:'flex',gap:8,padding:'10px 14px',background:'#dcfce7',border:'1px solid #86efac',borderRadius:10,marginBottom:14}}>
              <CheckCircle size={14} color="#15803d" style={{flexShrink:0,marginTop:1}}/>
              <p style={{fontSize:13,color:'#15803d'}}>Password updated.</p>
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{width:'100%',padding:'13px',borderRadius:50,background:busy?BORDER:NEON,color:busy?MUTED:OLIVE,fontWeight:800,fontSize:15,border:'none',cursor:busy?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {busy?'Updating…':'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Profile Component ────────────────────────────────────────────────────
export default function Profile(){
  const {user,logout,updateUser,addRole,switchRole}=useAuth()
  const navigate=useNavigate()
  const [editing,setEditing]=useState(false)
  const [saved,setSaved]=useState(false)
  const [form,setForm]=useState({firstName:user?.firstName||'',lastName:user?.lastName||''})
  const [saving,setSaving]=useState(false)
  const [avatarUrl,setAvatarUrl]=useMyAvatar(user?.id)
  const [showPicker,setShowPicker]=useState(false)
  const [showPasswordModal,setShowPasswordModal]=useState(false)

  function set(k,v){setForm(f=>({...f,[k]:sanitize(v)}))}

  async function handleAvatarDone(dataUrl){
    if(!user?.id)return
    localStorage.setItem(`feazi_avatar_${user.id}`,dataUrl)
    setAvatarUrl(dataUrl)
    setShowPicker(false)
    // Also persist it server-side — this is what makes it visible to other
    // riders/drivers, unlike the localStorage copy above which only ever
    // showed up on this same browser.
    try {
      const formData = new FormData()
      formData.append('avatar', dataUrlToFile(dataUrl, 'avatar.jpg'))
      await api.post('/auth/avatar', formData)
    } catch {}
  }

  async function handleSave(e){
    e.preventDefault()
    if(!form.firstName.trim())return
    setSaving(true)
    try{await updateUser(form);setSaved(true);setEditing(false);setTimeout(()=>setSaved(false),2500)}
    catch{}finally{setSaving(false)}
  }

  const initials=`${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`.toUpperCase()||'U'
  const fullName=`${user?.firstName||''} ${user?.lastName||''}`.trim()||'User'
  const MENU=[
    {icon:<Bell size={17}/>,label:'Notifications',desc:'Push & SMS preferences'},
    {icon:<Shield size={17}/>,label:'Privacy & Security',desc:'Change password, 2FA',onClick:()=>setShowPasswordModal(true)},
  ]

  return(
    <AppLayout title="Profile">
      {showPicker&&<PhotoPicker onDone={handleAvatarDone} onClose={()=>setShowPicker(false)}/>}
      {showPasswordModal&&<ChangePasswordModal onClose={()=>setShowPasswordModal(false)}/>}

      {/* Avatar card */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:20,padding:24,marginBottom:16,display:'flex',alignItems:'center',gap:20,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <div style={{position:'relative',flexShrink:0}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:NEON,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {avatarUrl
              ?<img src={avatarUrl} alt="Profile" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              :<span style={{color:OLIVE,fontWeight:900,fontSize:28,letterSpacing:'-0.03em'}}>{initials}</span>
            }
          </div>
          <button onClick={()=>setShowPicker(true)}
            style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:'50%',background:NEON,border:`1.5px solid ${CARD}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} aria-label="Change photo">
            <Camera size={12} color={OLIVE}/>
          </button>
        </div>
        <div style={{flex:1}}>
          <p style={{fontWeight:800,fontSize:18,color:TEXT,letterSpacing:'-0.02em'}}>{fullName}</p>
          {saved&&<div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}><CheckCircle size={14} color={MOSS}/><span style={{fontSize:13,color:MOSS,fontWeight:600}}>Updated!</span></div>}
        </div>
        <button onClick={()=>setEditing(!editing)}
          style={{padding:'9px 16px',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',background:editing?BG:OLIVE,border:`1px solid ${editing?BORDER:OLIVE}`,color:editing?OLIVE:'#fff'}}>
          {editing?'Cancel':'Edit'}
        </button>
      </div>

      {/* Edit form */}
      {editing&&(
        <form onSubmit={handleSave} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Edit Profile</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['First Name','firstName'],['Last Name','lastName']].map(([label,key])=>(
              <div key={key}>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
                <input value={form[key]} onChange={e=>set(key,e.target.value)}
                  style={{width:'100%',padding:'12px 14px',borderRadius:10,fontSize:15,border:`1.5px solid ${BORDER}`,outline:'none',color:TEXT,background:CARD,fontFamily:'inherit',boxSizing:'border-box'}}
                  onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER}/>
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving}
            style={{marginTop:16,width:'100%',padding:'13px',borderRadius:50,background:saving?BORDER:NEON,color:saving?MUTED:OLIVE,fontWeight:800,fontSize:15,border:'none',cursor:saving?'not-allowed':'pointer',fontFamily:'inherit'}}>
            {saving?'Saving…':'Save Changes'}
          </button>
        </form>
      )}

      {/* Info */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>Account Info</p>
        </div>
        {[{icon:<Phone size={16} color={OLIVE}/>,label:'Phone',value:user?.phone||'—'},
          {icon:<Mail size={16} color={OLIVE}/>,label:'Email',value:user?.email||'—'},
          {icon:<User size={16} color={OLIVE}/>,label:'Role',value:user?.role||'rider',cap:true}].map((item,i)=>(
          <div key={item.label} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<2?`1px solid ${BORDER}`:'none',transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background=BG}
            onMouseLeave={e=>e.currentTarget.style.background=CARD}>
            <div style={{width:36,height:36,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1}}>
              <p style={{fontSize:12,color:MUTED,fontWeight:500}}>{item.label}</p>
              <p style={{fontSize:14,color:TEXT,fontWeight:600,marginTop:1,textTransform:item.cap?'capitalize':'none'}}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        {MENU.map((item,i)=>(
          <button key={item.label} onClick={item.onClick}
            style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'15px 20px',borderBottom:i<MENU.length-1?`1px solid ${BORDER}`:'none',background:CARD,border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.15s',fontFamily:'inherit'}}
            onMouseEnter={e=>e.currentTarget.style.background=BG}
            onMouseLeave={e=>e.currentTarget.style.background=CARD}>
            <div style={{width:36,height:36,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:OLIVE}}>{item.icon}</div>
            <div style={{flex:1}}>
              <p style={{fontSize:14,fontWeight:600,color:TEXT}}>{item.label}</p>
              <p style={{fontSize:12,color:MUTED,marginTop:1}}>{item.desc}</p>
            </div>
            <ChevronRight size={16} color={MUTED}/>
          </button>
        ))}
      </div>

      {/* Dual-role card */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>My Roles</p>
        </div>
        {/* Rider row */}
        <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <div style={{width:36,height:36,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <MapPin size={16} color={OLIVE}/>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,color:TEXT,fontWeight:600}}>Rider</p>
            <p style={{fontSize:12,color:MUTED,marginTop:1}}>{user?.canRide?'Active — you can book rides':'Not registered'}</p>
          </div>
          {user?.canRide&&user?.role==='rider'&&<span style={{fontSize:11,fontWeight:700,color:OLIVE,background:NEON,padding:'3px 10px',borderRadius:50}}>Active</span>}
          {user?.canRide&&user?.role!=='rider'&&(
            <button onClick={async()=>{await switchRole('rider');navigate('/book',{replace:true})}}
              style={{fontSize:12,fontWeight:700,color:OLIVE,background:NEON,padding:'5px 12px',borderRadius:50,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Switch
            </button>
          )}
        </div>
        {/* Driver row */}
        <div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px'}}>
          <div style={{width:36,height:36,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Car size={16} color={OLIVE}/>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:14,color:TEXT,fontWeight:600}}>Driver</p>
            <p style={{fontSize:12,color:MUTED,marginTop:1}}>{user?.canDrive?'Active — you can accept rides':'Not registered yet'}</p>
          </div>
          {user?.canDrive&&user?.role==='driver'&&<span style={{fontSize:11,fontWeight:700,color:OLIVE,background:NEON,padding:'3px 10px',borderRadius:50}}>Active</span>}
          {user?.canDrive&&user?.role!=='driver'&&(
            <button onClick={async()=>{await switchRole('driver');navigate('/driver',{replace:true})}}
              style={{fontSize:12,fontWeight:700,color:OLIVE,background:NEON,padding:'5px 12px',borderRadius:50,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Switch
            </button>
          )}
          {!user?.canDrive&&(
            <button onClick={()=>navigate('/register/driver?add=true')}
              style={{fontSize:12,fontWeight:700,color:'#fff',background:OLIVE,padding:'5px 12px',borderRadius:50,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Logout */}
      <button onClick={logout}
        style={{width:'100%',padding:'14px',borderRadius:14,background:'#fef2f2',border:'1.5px solid #fca5a5',color:'#ef4444',fontWeight:700,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:'inherit'}}>
        <LogOut size={18}/>Sign Out
      </button>
    </AppLayout>
  )
}
