import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { Package, ArrowRight, CheckCircle } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900', BG='#f0f5e0'

const SIZES=[
  {id:'sm',label:'Small',desc:'Documents, phones, small items',icon:'📦',est:'₦800–₦1,500'},
  {id:'md',label:'Medium',desc:'Clothes, shoes, groceries',icon:'🗃️',est:'₦1,500–₦3,000'},
  {id:'lg',label:'Large',desc:'Electronics, bulky items',icon:'📫',est:'₦3,000–₦6,000'},
]
const INPUT={width:'100%',padding:'13px 16px',borderRadius:10,fontSize:15,border:`1.5px solid ${BORDER}`,outline:'none',background:CARD,color:TEXT,fontFamily:'inherit',boxSizing:'border-box'}

export default function SendPackage(){
  const [size,setSize]=useState('sm')
  const [form,setForm]=useState({pickup:'',dropoff:'',recipient:'',recipientPhone:'',notes:''})
  const [sent,setSent]=useState(false)
  const [submitting,setSubmitting]=useState(false)

  function sanitize(v){return v.replace(/[<>"]/g,'').slice(0,200)}
  function set(k,v){setForm(f=>({...f,[k]:sanitize(v)}))}

  function handleSubmit(e){
    e.preventDefault()
    if(!form.pickup||!form.dropoff||!form.recipient)return
    setSubmitting(true)
    setTimeout(()=>{setSubmitting(false);setSent(true)},1500)
  }

  if(sent){
    return(
      <AppLayout title="Send Package">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:380,textAlign:'center',padding:24}}>
          <div style={{width:88,height:88,borderRadius:'50%',background:OLIVE,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20,boxShadow:'0 8px 24px rgba(36,56,0,0.3)'}}>
            <CheckCircle size={44} color={NEON}/>
          </div>
          <h2 style={{fontSize:22,fontWeight:900,color:TEXT,marginBottom:8,letterSpacing:'-0.02em'}}>Package Booked!</h2>
          <p style={{color:MUTED,fontSize:15,marginBottom:32}}>A driver has been assigned. Your package will be picked up shortly.</p>
          <button onClick={()=>setSent(false)}
            style={{padding:'13px 32px',borderRadius:50,background:NEON,color:OLIVE,fontWeight:800,fontSize:15,border:'none',cursor:'pointer',boxShadow:'0 4px 16px rgba(204,255,0,0.35)'}}>
            Send Another
          </button>
        </div>
      </AppLayout>
    )
  }

  return(
    <AppLayout title="Send Package">
      <form onSubmit={handleSubmit}>
        {/* Size */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Package Size</p>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {SIZES.map(s=>(
              <label key={s.id} style={{
                display:'flex',alignItems:'center',gap:14,padding:'14px 16px',
                borderRadius:12,border:`2px solid ${size===s.id?MOSS:BORDER}`,
                background:size===s.id?OLIVE:CARD,
                cursor:'pointer',transition:'all 0.15s',
                boxShadow:size===s.id?'0 4px 12px rgba(36,56,0,0.2)':'none'
              }}>
                <input type="radio" name="size" value={s.id} checked={size===s.id} onChange={()=>setSize(s.id)} style={{display:'none'}}/>
                <span style={{fontSize:22}}>{s.icon}</span>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,fontSize:14,color:size===s.id?NEON:TEXT}}>{s.label}</p>
                  <p style={{fontSize:12,color:size===s.id?'rgba(204,255,0,0.6)':MUTED,marginTop:2}}>{s.desc}</p>
                </div>
                <span style={{
                  fontSize:13,fontWeight:700,padding:'3px 10px',borderRadius:20,
                  background:size===s.id?'rgba(204,255,0,0.15)':BG,
                  color:size===s.id?NEON:MOSS,
                  border:`1px solid ${size===s.id?'rgba(204,255,0,0.3)':BORDER}`
                }}>{s.est}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Route */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Route</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['Pickup Location','pickup','e.g. 12 Allen Avenue, Ikeja'],['Drop-off Location','dropoff','e.g. 5 Admiralty Way, Lekki']].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
                <input value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph} style={INPUT}
                  onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER} required/>
              </div>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Recipient Details</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['Recipient Name','recipient','text','Full name'],['Recipient Phone','recipientPhone','tel','+234 800 000 0000']].map(([label,key,type,ph])=>(
              <div key={key}>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
                <input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={ph} style={INPUT}
                  onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER} required/>
              </div>
            ))}
            <div>
              <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Notes (optional)</label>
              <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Fragile, handle with care..." rows={3}
                style={{...INPUT,resize:'vertical'}}
                onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER}/>
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting}
          style={{
            width:'100%',padding:'15px',borderRadius:50,
            background:submitting?BORDER:NEON,color:submitting?MUTED:OLIVE,
            fontWeight:800,fontSize:15,border:'none',
            cursor:submitting?'not-allowed':'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            boxShadow:submitting?'none':'0 4px 16px rgba(204,255,0,0.35)',
            transition:'all 0.2s'
          }}>
          <Package size={18}/>{submitting?'Booking…':'Book Pickup'}<ArrowRight size={18}/>
        </button>
      </form>
    </AppLayout>
  )
}
