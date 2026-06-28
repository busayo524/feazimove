import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { MapPin, Star, ChevronRight, Package } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900', BG='#f0f5e0'

const TRIPS=[
  {id:'t1',type:'ride',from:'Ikeja GRA',to:'Victoria Island',date:'Today, 9:14 AM',amount:1800,status:'completed',rating:5,driver:'Adewale O.'},
  {id:'t2',type:'package',from:'Surulere',to:'Lekki Phase 1',date:'Yesterday, 2:30 PM',amount:2400,status:'completed',rating:4,driver:'Chidi N.'},
  {id:'t3',type:'ride',from:'Ojodu Berger',to:'CMS',date:'Jun 8, 7:15 AM',amount:2100,status:'completed',rating:5,driver:'Emeka T.'},
  {id:'t4',type:'ride',from:'Gbagada',to:'Yaba',date:'Jun 5, 4:40 PM',amount:900,status:'cancelled',rating:null,driver:'Seun F.'},
  {id:'t5',type:'ride',from:'Magodo',to:'Ikeja',date:'Jun 2, 8:00 AM',amount:1200,status:'completed',rating:4,driver:'Bayo K.'},
]
const FILTERS=['All','Rides','Packages','Cancelled']

export default function TripHistory(){
  const [filter,setFilter]=useState('All')

  const filtered=TRIPS.filter(t=>{
    if(filter==='All')return true
    if(filter==='Rides')return t.type==='ride'&&t.status!=='cancelled'
    if(filter==='Packages')return t.type==='package'
    if(filter==='Cancelled')return t.status==='cancelled'
    return true
  })

  const completed=TRIPS.filter(t=>t.status==='completed')
  const total=completed.reduce((s,t)=>s+t.amount,0)

  return(
    <AppLayout title="Trip History">
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[['Total Trips',completed.length],['Cancelled',TRIPS.filter(t=>t.status==='cancelled').length],['Spent','₦'+total.toLocaleString()]].map(([l,v])=>(
          <div key={l} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:'18px 12px',textAlign:'center',boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
            <p style={{fontWeight:900,fontSize:'clamp(1.2rem,3vw,1.6rem)',color:OLIVE,letterSpacing:'-0.03em'}}>{v}</p>
            <p style={{fontSize:11,color:'rgba(36,56,0,0.6)',fontWeight:600,marginTop:2}}>{l}</p>
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
        {filtered.map((trip,i)=>(
          <div key={trip.id}
            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:i<filtered.length-1?`1px solid ${BORDER}`:'none',cursor:'pointer',transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background=BG}
            onMouseLeave={e=>e.currentTarget.style.background=CARD}>
            <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:trip.status==='cancelled'?'#fef2f2':NEON,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {trip.type==='package'
                ?<Package size={18} color={trip.status==='cancelled'?'#ef4444':OLIVE}/>
                :<MapPin size={18} color={trip.status==='cancelled'?'#ef4444':OLIVE}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:TEXT,fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{trip.from} → {trip.to}</p>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                <span style={{fontSize:12,color:MUTED}}>{trip.date}</span>
                {trip.rating&&<><span style={{color:MUTED,fontSize:12}}>·</span><Star size={11} color='#f59e0b' fill='#f59e0b'/><span style={{fontSize:12,color:MUTED}}>{trip.rating}</span></>}
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <p style={{fontWeight:800,fontSize:14,color:trip.status==='cancelled'?'#ef4444':TEXT}}>₦{trip.amount.toLocaleString()}</p>
              <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,marginTop:2,display:'inline-block',background:trip.status==='cancelled'?'#fef2f2':BG,color:trip.status==='cancelled'?'#ef4444':MOSS,border:`1px solid ${trip.status==='cancelled'?'#fca5a5':BORDER}`,textTransform:'uppercase',letterSpacing:'0.04em'}}>{trip.status}</span>
            </div>
            <ChevronRight size={16} color={MUTED}/>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
