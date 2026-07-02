import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { MapPin, Star } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

const TRIPS=[
  {id:'t1',from:'Ikeja',to:'VI',fare:3200,date:'Today, 9:10 AM',status:'completed',rating:5},
  {id:'t2',from:'Yaba',to:'Lekki',fare:2900,date:'Today, 11:45 AM',status:'completed',rating:4},
  {id:'t3',from:'Ajah',to:'CMS',fare:4100,date:'Today, 2:00 PM',status:'completed',rating:5},
  {id:'t4',from:'GRA',to:'Apapa',fare:3600,date:'Today, 4:30 PM',status:'cancelled',rating:null},
  {id:'t5',from:'Ojodu Berger',to:'Marina',fare:2100,date:'Yesterday, 7:15 AM',status:'completed',rating:5},
  {id:'t6',from:'Gbagada',to:'Yaba',fare:900,date:'Jun 20, 4:40 PM',status:'cancelled',rating:null},
]
const FILTERS=['All','Completed','Cancelled']

export default function DriverTripHistory(){
  const [filter,setFilter]=useState('All')

  const filtered=TRIPS.filter(t=>{
    if(filter==='All')return true
    if(filter==='Completed')return t.status==='completed'
    if(filter==='Cancelled')return t.status==='cancelled'
    return true
  })

  const completed=TRIPS.filter(t=>t.status==='completed')
  const earned=completed.reduce((s,t)=>s+t.fare,0)

  return(
    <AppLayout title="Trip History">
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:20}}>
        {[['Completed',completed.length],['Cancelled',TRIPS.filter(t=>t.status==='cancelled').length],['Earned','₦'+earned.toLocaleString()]].map(([l,v])=>(
          <div key={l} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:'18px 8px',textAlign:'center',boxShadow:'0 2px 8px rgba(36,56,0,0.06)',minWidth:0,overflow:'hidden'}}>
            <p style={{fontWeight:900,fontSize:'clamp(0.9rem,4vw,1.5rem)',color:OLIVE,letterSpacing:'-0.03em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</p>
            <p style={{fontSize:11,color:MUTED,fontWeight:600,marginTop:2}}>{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto',paddingBottom:4}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'8px 18px',borderRadius:50,fontSize:13,fontWeight:700,border:`1.5px solid ${filter===f?NEON:BORDER}`,background:filter===f?NEON:CARD,color:filter===f?OLIVE:MOSS,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all 0.15s'}}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>Trips</p>
          <span style={{fontSize:12,color:MUTED}}>{filtered.length} result{filtered.length!==1?'s':''}</span>
        </div>
        {filtered.length===0&&<div style={{padding:40,textAlign:'center',color:MUTED,fontSize:14}}>No trips found</div>}
        {filtered.map((t,i)=>(
          <div key={t.id}
            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<filtered.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background=BG}
            onMouseLeave={e=>e.currentTarget.style.background=CARD}>
            <div style={{width:38,height:38,borderRadius:10,flexShrink:0,background:t.status==='cancelled'?'#fef2f2':NEON,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MapPin size={16} color={t.status==='cancelled'?'#ef4444':OLIVE}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:TEXT,fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.from} → {t.to}</p>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                <span style={{fontSize:12,color:MUTED}}>{t.date}</span>
                {t.rating&&<><span style={{color:MUTED,fontSize:12}}>·</span><Star size={11} color='#f59e0b' fill='#f59e0b'/><span style={{fontSize:12,color:MUTED}}>{t.rating}</span></>}
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <p style={{fontWeight:800,fontSize:14,color:t.status==='cancelled'?'#ef4444':TEXT}}>₦{t.fare.toLocaleString()}</p>
              <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,marginTop:2,display:'inline-block',background:t.status==='cancelled'?'#fef2f2':BG,color:t.status==='cancelled'?'#ef4444':MOSS,border:`1px solid ${t.status==='cancelled'?'#fca5a5':BORDER}`,textTransform:'uppercase',letterSpacing:'0.04em'}}>{t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
