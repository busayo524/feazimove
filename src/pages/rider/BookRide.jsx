import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { MapPin, ArrowRight, Users, Package, Navigation } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

const SERVICES=[
  { id:'pool',  icon:<Users size={20}/>,     label:'Pool Ride',    desc:'Share route, split cost' },
  { id:'solo',  icon:<Navigation size={20}/>, label:'Solo Ride',    desc:'Private, direct route' },
  { id:'send',  icon:<Package size={20}/>,   label:'Send Package', desc:'Deliver items fast' },
]
const ROUTES=[
  { from:'Ikeja',    to:'Victoria Island',  est:'₦1,400–₦2,200',dur:'35 min' },
  { from:'Lekki',    to:'CMS',              est:'₦1,200–₦1,900',dur:'28 min' },
  { from:'Gbagada',  to:'Surulere',         est:'₦800–₦1,300',  dur:'22 min' },
  { from:'Ajah',     to:'Ikeja',            est:'₦2,000–₦3,200',dur:'55 min' },
]

const INPUT={width:'100%',padding:'13px 16px',borderRadius:12,fontSize:15,border:`1.5px solid ${BORDER}`,outline:'none',background:CARD,color:TEXT,fontFamily:'inherit',boxSizing:'border-box'}

export default function BookRide(){
  const [service,setService]=useState('pool')
  const [pickup,setPickup]=useState('')
  const [dropoff,setDropoff]=useState('')
  const [searching,setSearching]=useState(false)

  function sanitize(v){return v.replace(/[<>"]/g,'').slice(0,200)}

  function handleSearch(e){
    e.preventDefault()
    if(!pickup||!dropoff)return
    setSearching(true)
    setTimeout(()=>setSearching(false),2000)
  }

  return(
    <AppLayout title="Book a Ride">
      {/* Service selector */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>What do you need?</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {SERVICES.map(s=>{
            const active=service===s.id
            return(
              <button key={s.id} onClick={()=>setService(s.id)} style={{padding:'14px 10px',borderRadius:14,border:`2px solid ${active?NEON:BORDER}`,background:active?NT:CARD,cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:6,color:active?NEON:MUTED}}>{s.icon}</div>
                <p style={{fontWeight:700,fontSize:13,color:active?NEON:TEXT,marginBottom:2}}>{s.label}</p>
                <p style={{fontSize:11,color:active?'rgba(204,255,0,0.7)':MUTED,lineHeight:1.3}}>{s.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Route form */}
      <form onSubmit={handleSearch}>
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>Your Route</p>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['Pickup Location','pickup',pickup,setPickup,'e.g. 12 Allen Avenue, Ikeja'],
              ['Drop-off Location','dropoff',dropoff,setDropoff,'e.g. 5 Admiralty Way, Lekki']].map(([label,id,val,setter,ph])=>(
              <div key={id}>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
                <div style={{position:'relative'}}>
                  <MapPin size={15} style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:MUTED}}/>
                  <input value={val} onChange={e=>setter(sanitize(e.target.value))} placeholder={ph} style={{...INPUT,paddingLeft:40}}
                    onFocus={e=>e.target.style.borderColor=NEON} onBlur={e=>e.target.style.borderColor=BORDER} required/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={searching} style={{width:'100%',padding:'15px',borderRadius:50,background:searching?'#ccc':NT,color:searching?'#fff':NEON,fontWeight:700,fontSize:15,border:'none',cursor:searching?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:20,transition:'background 0.2s'}}>
          {searching?'Finding rides…':'Find Rides'}<ArrowRight size={18}/>
        </button>
      </form>

      {/* Popular routes */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>Popular Routes</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
          {ROUTES.map((r,i)=>(
            <button key={i} onClick={()=>{setPickup(r.from);setDropoff(r.to)}} style={{padding:'14px',borderRadius:14,border:`1.5px solid ${BORDER}`,background:CARD,cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=NEON;e.currentTarget.style.background=NL}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=BORDER;e.currentTarget.style.background=CARD}}>
              <p style={{fontWeight:700,fontSize:13,color:TEXT,marginBottom:4}}>{r.from} → {r.to}</p>
              <p style={{fontSize:11,color:MUTED}}>{r.est}</p>
              <p style={{fontSize:11,color:MUTED,marginTop:1}}>~{r.dur}</p>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
