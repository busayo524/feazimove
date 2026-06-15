import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { MapPin, Phone, MessageSquare, CheckCircle, Navigation } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

const STAGES=['Heading to pickup','Arrived at pickup','Trip in progress','Trip completed']

export default function ActiveRide(){
  const [stage,setStage]=useState(0)
  const [done,setDone]=useState(false)
  const rider={name:'Funmi Adeyemi',phone:'+234 803 456 7890',from:'Ikeja GRA',to:'Victoria Island',fare:2800}

  function advance(){
    if(stage<STAGES.length-1)setStage(s=>s+1)
    else setDone(true)
  }

  if(done){
    return(
      <AppLayout title="Active Ride">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,textAlign:'center',padding:24}}>
          <div style={{width:80,height:80,borderRadius:'50%',background:NT,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
            <CheckCircle size={40} color={NEON}/>
          </div>
          <h2 style={{fontSize:24,fontWeight:900,color:TEXT,marginBottom:8,letterSpacing:'-0.02em'}}>Trip Completed!</h2>
          <p style={{color:MUTED,fontSize:15,marginBottom:8}}>Fare collected</p>
          <p style={{fontSize:36,fontWeight:900,color:NT,letterSpacing:'-0.03em',marginBottom:32,background:NEON,display:'inline-block',padding:'4px 24px',borderRadius:14}}>₦{rider.fare.toLocaleString()}</p>
          <button onClick={()=>{setStage(0);setDone(false)}} style={{padding:'13px 32px',borderRadius:50,background:NT,color:NEON,fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
            Ready for Next Ride
          </button>
        </div>
      </AppLayout>
    )
  }

  return(
    <AppLayout title="Active Ride">
      {/* Map */}
      <div style={{background:NT,borderRadius:20,height:200,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,opacity:0.06,backgroundImage:`linear-gradient(${NEON} 1px,transparent 1px),linear-gradient(90deg,${NEON} 1px,transparent 1px)`,backgroundSize:'36px 36px'}}/>
        <div style={{position:'absolute',top:14,left:14,background:'rgba(204,255,0,0.12)',border:`1px solid rgba(204,255,0,0.3)`,backdropFilter:'blur(8px)',borderRadius:10,padding:'8px 14px',display:'flex',alignItems:'center',gap:6}}>
          <Navigation size={13} color={NEON}/>
          <span style={{fontSize:13,fontWeight:700,color:NEON}}>Live Navigation</span>
        </div>
        <div style={{width:40,height:40,borderRadius:'50%',background:NEON,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <MapPin size={20} color={NT}/>
        </div>
        <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',background:'rgba(204,255,0,0.1)',border:`1px solid rgba(204,255,0,0.25)`,color:NEON,borderRadius:20,padding:'5px 14px',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}>
          GPS integration coming soon
        </div>
      </div>

      {/* Stage indicator */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:'16px 20px',marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Current Stage</p>
          <p style={{fontSize:13,fontWeight:700,color:NT,background:NEON,padding:'2px 10px',borderRadius:20}}>{stage+1} / {STAGES.length}</p>
        </div>
        <div style={{height:6,borderRadius:6,background:BORDER,overflow:'hidden',marginBottom:12}}>
          <div style={{height:'100%',background:NEON,borderRadius:6,width:`${((stage+1)/STAGES.length)*100}%`,transition:'width 0.4s ease'}}/>
        </div>
        <p style={{color:TEXT,fontWeight:700,fontSize:15}}>{STAGES[stage]}</p>
      </div>

      {/* Rider card */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
          <div style={{width:48,height:48,borderRadius:12,background:NT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:NEON,fontWeight:800,fontSize:20}}>{rider.name[0]}</span>
          </div>
          <div style={{flex:1}}>
            <p style={{color:TEXT,fontWeight:700,fontSize:15}}>{rider.name}</p>
            <p style={{fontSize:13,color:MUTED,marginTop:2}}>{rider.from} → {rider.to}</p>
          </div>
          <p style={{fontWeight:900,fontSize:18,color:NT,background:NEON,padding:'4px 12px',borderRadius:10}}>₦{rider.fare.toLocaleString()}</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <a href={`tel:${rider.phone}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px',borderRadius:12,background:NT,color:NEON,fontWeight:700,fontSize:14,textDecoration:'none'}}>
            <Phone size={15}/> Call
          </a>
          <button style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'11px',borderRadius:12,background:CARD,border:`1.5px solid ${BORDER}`,color:TEXT,fontWeight:700,fontSize:14,cursor:'pointer'}}>
            <MessageSquare size={15}/> Chat
          </button>
        </div>
      </div>

      <button onClick={advance} style={{width:'100%',padding:'15px',borderRadius:50,background:NT,color:NEON,fontWeight:700,fontSize:15,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
        {stage<STAGES.length-1?`✓ ${STAGES[stage+1]}`:'Complete Trip & Collect Fare'}
      </button>
    </AppLayout>
  )
}
