import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Package, Clock, TrendingUp, Star, CheckCircle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

const MOCK_REQUESTS=[
  {id:'r1',type:'pool',from:'Ikeja GRA',to:'Victoria Island',riders:2,fare:3600,dist:'28 km',eta:'32 min'},
  {id:'r2',type:'send',from:'Surulere',to:'Lekki Phase 1',riders:1,fare:2800,dist:'18 km',eta:'22 min'},
]
const MOCK_STATS={today:{trips:4,earned:12400,hours:6},week:{trips:22,earned:68000,hours:34},rating:4.9,acceptance:87}
const MOCK_RECENT=[
  {id:'t1',from:'Ikeja',to:'VI',fare:3200,time:'9:10 AM',status:'completed'},
  {id:'t2',from:'Yaba',to:'Lekki',fare:2900,time:'11:45 AM',status:'completed'},
  {id:'t3',from:'Ajah',to:'CMS',fare:4100,time:'2:00 PM',status:'completed'},
  {id:'t4',from:'GRA',to:'Apapa',fare:3600,time:'4:30 PM',status:'cancelled'},
]

export default function DriverDashboard(){
  const {user}=useAuth()
  const navigate=useNavigate()
  const [online,setOnline]=useState(true)
  const [accepted,setAccepted]=useState(null)
  const [statPeriod,setStatPeriod]=useState('today')

  const stats=MOCK_STATS[statPeriod]||MOCK_STATS.today

  return(
    <AppLayout title="Driver Dashboard">
      {/* Online toggle */}
      <div style={{background:online?NT:CARD,border:`2px solid ${online?NEON:BORDER}`,borderRadius:20,padding:'18px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',transition:'all 0.3s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div>
          <p style={{fontWeight:800,fontSize:16,color:online?NEON:TEXT}}>
            {online?'🟢 You\'re Online':'⚫ You\'re Offline'}
          </p>
          <p style={{fontSize:13,color:online?'rgba(204,255,0,0.6)':MUTED,marginTop:2}}>
            {online?'Accepting ride requests':'Go online to receive requests'}
          </p>
        </div>
        <button onClick={()=>setOnline(!online)} style={{position:'relative',width:52,height:28,borderRadius:20,background:online?NEON:'#d1d5db',border:'none',cursor:'pointer',transition:'background 0.3s',flexShrink:0}} aria-label="Toggle online status">
          <span style={{position:'absolute',top:3,left:online?26:3,width:22,height:22,borderRadius:'50%',background:online?NT:CARD,transition:'left 0.3s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
        </button>
      </div>

      {/* Stats */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',gap:8,marginBottom:16,background:BG,borderRadius:10,padding:4}}>
          {['today','week'].map(p=>(
            <button key={p} onClick={()=>setStatPeriod(p)} style={{flex:1,padding:'8px',borderRadius:8,border:'none',background:statPeriod===p?NT:BG,color:statPeriod===p?NEON:MUTED,fontWeight:700,fontSize:13,cursor:'pointer',textTransform:'capitalize',transition:'all 0.2s'}}>
              {p}
            </button>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[['Trips',stats.trips],['Earned','₦'+stats.earned.toLocaleString()],['Hours',stats.hours+'h']].map(([l,v])=>(
            <div key={l} style={{textAlign:'center',padding:'12px 8px',background:BG,borderRadius:12}}>
              <p style={{fontWeight:900,fontSize:'clamp(1.1rem,3vw,1.5rem)',color:NT,letterSpacing:'-0.03em'}}>{v}</p>
              <p style={{fontSize:11,color:MUTED,fontWeight:600,marginTop:2}}>{l}</p>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:12,marginTop:12}}>
          <div style={{flex:1,background:NL,border:`1px solid ${NB}`,borderRadius:12,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
            <Star size={15} color='#f59e0b' fill='#f59e0b'/>
            <span style={{fontWeight:800,fontSize:14,color:TEXT}}>{MOCK_STATS.rating}</span>
            <span style={{fontSize:12,color:MUTED}}>Rating</span>
          </div>
          <div style={{flex:1,background:NL,border:`1px solid ${NB}`,borderRadius:12,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
            <CheckCircle size={15} color={NT}/>
            <span style={{fontWeight:800,fontSize:14,color:TEXT}}>{MOCK_STATS.acceptance}%</span>
            <span style={{fontSize:12,color:MUTED}}>Acceptance</span>
          </div>
        </div>
      </div>

      {/* Ride requests */}
      {online&&MOCK_REQUESTS.length>0&&(
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>Incoming Requests</p>
          {MOCK_REQUESTS.map(req=>(
            <div key={req.id} style={{background:BG,borderRadius:14,padding:'14px 16px',marginBottom:10,border:`1.5px solid ${accepted===req.id?NEON:BORDER}`,transition:'border-color 0.2s'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:700,background:req.type==='pool'?NT:'#dbeafe',color:req.type==='pool'?NEON:'#1d4ed8',padding:'2px 8px',borderRadius:20,textTransform:'uppercase',letterSpacing:'0.05em'}}>
                      {req.type==='pool'?'Pool':'Package'}
                    </span>
                    {req.type==='pool'&&<span style={{fontSize:12,color:MUTED}}><Users size={12} style={{display:'inline',verticalAlign:'middle'}}/> {req.riders} riders</span>}
                  </div>
                  <p style={{fontWeight:700,fontSize:14,color:TEXT}}>{req.from} → {req.to}</p>
                  <p style={{fontSize:12,color:MUTED,marginTop:2}}>{req.dist} · {req.eta}</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{fontWeight:900,fontSize:18,color:NT}}>₦{req.fare.toLocaleString()}</p>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>{setAccepted(req.id);setTimeout(()=>navigate('/driver/ride/'+req.id),400)}} style={{flex:2,padding:'11px',borderRadius:12,background:NT,color:NEON,fontWeight:700,fontSize:14,border:'none',cursor:'pointer'}}>
                  Accept
                </button>
                <button style={{flex:1,padding:'11px',borderRadius:12,background:CARD,border:`1.5px solid ${BORDER}`,color:MUTED,fontWeight:600,fontSize:14,cursor:'pointer'}}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent trips */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Recent Trips</p>
        </div>
        {MOCK_RECENT.map((t,i)=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:i<MOCK_RECENT.length-1?`1px solid ${BORDER}`:'none'}}>
            <div style={{width:36,height:36,borderRadius:10,background:t.status==='cancelled'?'#fef2f2':NT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <MapPin size={16} color={t.status==='cancelled'?'#ef4444':NEON}/>
            </div>
            <div style={{flex:1}}>
              <p style={{color:TEXT,fontWeight:600,fontSize:14}}>{t.from} → {t.to}</p>
              <p style={{color:MUTED,fontSize:12,marginTop:1}}>{t.time}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontWeight:800,fontSize:14,color:t.status==='cancelled'?'#ef4444':TEXT}}>₦{t.fare.toLocaleString()}</p>
              <p style={{fontSize:11,fontWeight:600,color:t.status==='cancelled'?'#ef4444':NT,textTransform:'uppercase',marginTop:1}}>{t.status}</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
