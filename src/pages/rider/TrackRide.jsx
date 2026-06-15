import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { Phone, MessageSquare, Star, MapPin, Navigation } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

const STEPS=['Driver assigned','Driver en route','Driver arrived','Trip in progress','Trip completed']

export default function TrackRide(){
  const [step,setStep]=useState(1)
  const [eta,setEta]=useState(7)

  useEffect(()=>{
    if(step>=4)return
    const t=setTimeout(()=>{setStep(s=>Math.min(s+1,4));setEta(e=>Math.max(0,e-2))},4000)
    return()=>clearTimeout(t)
  },[step])

  const driver={name:'Adewale Okafor',phone:'+234 812 345 6789',rating:4.8,trips:1240,plate:'ABC 123 XY',car:'Toyota Camry (White)'}

  return(
    <AppLayout title="Track Ride">
      {/* Map placeholder */}
      <div style={{background:NT,borderRadius:20,height:220,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        {/* Neon grid lines */}
        <div style={{position:'absolute',inset:0,opacity:0.07,backgroundImage:`linear-gradient(${NEON} 1px,transparent 1px),linear-gradient(90deg,${NEON} 1px,transparent 1px)`,backgroundSize:'40px 40px'}}/>
        <div style={{position:'absolute',top:14,left:14,background:'rgba(255,255,255,0.08)',backdropFilter:'blur(8px)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:6,border:`1px solid rgba(204,255,0,0.3)`}}>
          <Navigation size={14} color={NEON}/>
          <span style={{fontSize:13,fontWeight:700,color:NEON}}>ETA: {eta} min</span>
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:60,height:60,borderRadius:'50%',background:`${NEON}20`,animation:'ping 1.5s ease-in-out infinite',position:'absolute'}}/>
          <div style={{width:38,height:38,borderRadius:'50%',background:NEON,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:1}}>
            <MapPin size={18} color={NT}/>
          </div>
        </div>
        <div style={{position:'absolute',bottom:14,left:'50%',transform:'translateX(-50%)',background:'rgba(204,255,0,0.15)',border:`1px solid rgba(204,255,0,0.3)`,color:NEON,borderRadius:20,padding:'6px 14px',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>
          Live map — real GPS coming soon
        </div>
      </div>

      {/* Progress */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <p style={{fontWeight:700,color:TEXT,fontSize:14,marginBottom:16}}>Ride Progress</p>
        {STEPS.map((s,i)=>{
          const done=i<step,active=i===step
          return(
            <div key={s} style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:i<STEPS.length-1?4:0}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:done?NT:active?NEON:BORDER,border:`2px solid ${done?NT:active?NEON:BORDER}`,flexShrink:0,transition:'all 0.3s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {done&&<span style={{color:NEON,fontSize:11,fontWeight:800}}>✓</span>}
                  {active&&<div style={{width:8,height:8,borderRadius:'50%',background:NT}}/>}
                </div>
                {i<STEPS.length-1&&<div style={{width:2,height:22,background:done?NT:BORDER,marginTop:2}}/>}
              </div>
              <p style={{fontSize:14,fontWeight:active?700:done?600:400,color:active?NT:done?TEXT:MUTED,paddingTop:2,transition:'color 0.3s'}}>{s}</p>
            </div>
          )
        })}
      </div>

      {/* Driver card */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
          <div style={{width:52,height:52,borderRadius:14,background:NT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:NEON,fontWeight:800,fontSize:20}}>{driver.name[0]}</span>
          </div>
          <div style={{flex:1}}>
            <p style={{color:TEXT,fontWeight:700,fontSize:15}}>{driver.name}</p>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
              <Star size={13} color='#f59e0b' fill='#f59e0b'/>
              <span style={{fontSize:13,color:MUTED}}>{driver.rating} · {driver.trips.toLocaleString()} trips</span>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:12,color:MUTED}}>{driver.car}</p>
            <p style={{fontSize:13,fontWeight:700,color:TEXT,marginTop:2}}>{driver.plate}</p>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <a href={`tel:${driver.phone}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:12,background:NT,color:NEON,fontWeight:700,fontSize:14,textDecoration:'none'}}>
            <Phone size={16}/> Call
          </a>
          <button style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:12,background:CARD,border:`1.5px solid ${BORDER}`,color:TEXT,fontWeight:700,fontSize:14,cursor:'pointer'}}>
            <MessageSquare size={16}/> Chat
          </button>
        </div>
      </div>
      <style>{`@keyframes ping{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.5);opacity:0.1}}`}</style>
    </AppLayout>
  )
}
