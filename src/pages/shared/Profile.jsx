import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { User, Phone, Mail, Shield, Bell, ChevronRight, LogOut, Camera, CheckCircle } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

function sanitize(v){return String(v).replace(/[<>"]/g,'').slice(0,100)}

export default function Profile(){
  const {user,logout,updateUser}=useAuth()
  const [editing,setEditing]=useState(false)
  const [saved,setSaved]=useState(false)
  const [form,setForm]=useState({firstName:user?.firstName||'',lastName:user?.lastName||''})
  const [saving,setSaving]=useState(false)

  function set(k,v){setForm(f=>({...f,[k]:sanitize(v)}))}

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
    {icon:<Shield size={17}/>,label:'Privacy & Security',desc:'Change password, 2FA'},
  ]

  return(
    <AppLayout title="Profile">
      {/* Avatar card */}
      <div style={{background:NT,borderRadius:20,padding:24,marginBottom:16,display:'flex',alignItems:'center',gap:20}}>
        <div style={{position:'relative',flexShrink:0}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:NEON,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:NT,fontWeight:900,fontSize:28,letterSpacing:'-0.03em'}}>{initials}</span>
          </div>
          <button style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:'50%',background:NT,border:`1.5px solid rgba(204,255,0,0.4)`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} aria-label="Change photo">
            <Camera size={12} color={NEON}/>
          </button>
        </div>
        <div style={{flex:1}}>
          <p style={{fontWeight:800,fontSize:18,color:NEON,letterSpacing:'-0.02em'}}>{fullName}</p>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2,textTransform:'capitalize'}}>{user?.role||'rider'}</p>
          {saved&&<div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}><CheckCircle size={14} color={NEON}/><span style={{fontSize:13,color:NEON,fontWeight:600}}>Updated!</span></div>}
        </div>
        <button onClick={()=>setEditing(!editing)} style={{padding:'9px 16px',borderRadius:10,background:editing?'rgba(255,255,255,0.08)':NEON,border:`1px solid ${editing?'rgba(255,255,255,0.1)':NEON}`,color:editing?'rgba(255,255,255,0.5)':NT,fontWeight:700,fontSize:13,cursor:'pointer'}}>
          {editing?'Cancel':'Edit'}
        </button>
      </div>

      {/* Edit form */}
      {editing&&(
        <form onSubmit={handleSave} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>Edit Profile</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['First Name','firstName'],['Last Name','lastName']].map(([label,key])=>(
              <div key={key}>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
                <input value={form[key]} onChange={e=>set(key,e.target.value)} style={{width:'100%',padding:'12px 14px',borderRadius:10,fontSize:15,border:`1.5px solid ${BORDER}`,outline:'none',color:TEXT,background:CARD,fontFamily:'inherit',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor=NEON} onBlur={e=>e.target.style.borderColor=BORDER}/>
              </div>
            ))}
          </div>
          <button type="submit" disabled={saving} style={{marginTop:16,width:'100%',padding:'13px',borderRadius:50,background:saving?'#ccc':NT,color:saving?'#fff':NEON,fontWeight:700,fontSize:15,border:'none',cursor:saving?'not-allowed':'pointer'}}>
            {saving?'Saving…':'Save Changes'}
          </button>
        </form>
      )}

      {/* Info */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Account Info</p>
        </div>
        {[{icon:<Phone size={16} color={NT}/>,label:'Phone',value:user?.phone||'—'},
          {icon:<Mail size={16} color={NT}/>,label:'Email',value:user?.email||'Not set'},
          {icon:<User size={16} color={NT}/>,label:'Role',value:user?.role||'rider',cap:true}].map((item,i)=>(
          <div key={item.label} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<2?`1px solid ${BORDER}`:'none'}}>
            <div style={{width:34,height:34,borderRadius:10,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{item.icon}</div>
            <div style={{flex:1}}>
              <p style={{fontSize:12,color:MUTED,fontWeight:500}}>{item.label}</p>
              <p style={{fontSize:14,color:TEXT,fontWeight:600,marginTop:1,textTransform:item.cap?'capitalize':'none'}}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        {MENU.map((item,i)=>(
          <button key={item.label} style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'15px 20px',borderBottom:i<MENU.length-1?`1px solid ${BORDER}`:'none',background:CARD,border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background=NL} onMouseLeave={e=>e.currentTarget.style.background=CARD}>
            <div style={{width:34,height:34,borderRadius:10,background:NT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:NEON}}>{item.icon}</div>
            <div style={{flex:1}}>
              <p style={{fontSize:14,fontWeight:600,color:TEXT}}>{item.label}</p>
              <p style={{fontSize:12,color:MUTED,marginTop:1}}>{item.desc}</p>
            </div>
            <ChevronRight size={16} color={MUTED}/>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button onClick={logout} style={{width:'100%',padding:'14px',borderRadius:14,background:'#fef2f2',border:'1.5px solid #fca5a5',color:'#ef4444',fontWeight:700,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
        <LogOut size={18}/>Sign Out
      </button>
    </AppLayout>
  )
}
