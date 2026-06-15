import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { Star, CheckCircle } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280'

const TAGS=['Great conversation','Safe driving','Clean vehicle','Punctual','Smooth ride','Professional']

export default function RateRide(){
  const [stars,setStars]=useState(0)
  const [hover,setHover]=useState(0)
  const [tags,setTags]=useState([])
  const [comment,setComment]=useState('')
  const [submitted,setSubmitted]=useState(false)
  const [submitting,setSubmitting]=useState(false)

  function toggleTag(t){setTags(ts=>ts.includes(t)?ts.filter(x=>x!==t):[...ts,t])}
  function sanitize(v){return v.replace(/[<>"]/g,'').slice(0,300)}

  function handleSubmit(e){
    e.preventDefault()
    if(!stars)return
    setSubmitting(true)
    setTimeout(()=>{setSubmitting(false);setSubmitted(true)},1200)
  }

  if(submitted){
    return(
      <AppLayout title="Rate Ride">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,textAlign:'center',padding:24}}>
          <div style={{width:80,height:80,borderRadius:'50%',background:NT,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
            <CheckCircle size={40} color={NEON}/>
          </div>
          <h2 style={{fontSize:24,fontWeight:900,color:TEXT,letterSpacing:'-0.02em',marginBottom:8}}>Thanks for your feedback!</h2>
          <p style={{color:MUTED,fontSize:15,marginBottom:10}}>You rated your trip</p>
          <div style={{display:'flex',gap:4,justifyContent:'center',marginBottom:32}}>
            {[1,2,3,4,5].map(s=><Star key={s} size={28} fill={s<=stars?'#f59e0b':'none'} color={s<=stars?'#f59e0b':BORDER}/>)}
          </div>
          <button onClick={()=>{setSubmitted(false);setStars(0);setTags([]);setComment('')}} style={{padding:'13px 32px',borderRadius:50,background:NT,color:NEON,fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
            Done
          </button>
        </div>
      </AppLayout>
    )
  }

  const driver={name:'Adewale Okafor',from:'Ikeja GRA',to:'Victoria Island',amount:2800,date:'Today, 9:14 AM'}

  return(
    <AppLayout title="Rate Ride">
      {/* Trip summary */}
      <div style={{background:NT,borderRadius:16,padding:20,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:52,height:52,borderRadius:14,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:NT,fontWeight:800,fontSize:22}}>{driver.name[0]}</span>
          </div>
          <div style={{flex:1}}>
            <p style={{fontWeight:700,fontSize:15,color:'#fff'}}>{driver.name}</p>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:2}}>{driver.from} → {driver.to}</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:1}}>{driver.date}</p>
          </div>
          <p style={{fontWeight:900,fontSize:18,color:NT,background:NEON,padding:'4px 12px',borderRadius:10}}>₦{driver.amount.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Stars */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center'}}>
          <p style={{fontWeight:700,fontSize:15,color:TEXT,marginBottom:6}}>How was your ride?</p>
          <p style={{fontSize:13,color:MUTED,marginBottom:20}}>Tap a star to rate</p>
          <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:12}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} type="button" onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setStars(s)} style={{background:'none',border:'none',cursor:'pointer',padding:4,transition:'transform 0.1s',transform:(hover||stars)>=s?'scale(1.15)':'scale(1)'}}>
                <Star size={40} fill={(hover||stars)>=s?'#f59e0b':'none'} color={(hover||stars)>=s?'#f59e0b':BORDER} strokeWidth={1.5}/>
              </button>
            ))}
          </div>
          {stars>0&&<p style={{fontWeight:700,fontSize:15,color:NT,background:NEON,display:'inline-block',padding:'4px 16px',borderRadius:20}}>{['','Poor','Fair','Good','Great','Excellent!'][stars]}</p>}
        </div>

        {/* Tags */}
        {stars>=4&&(
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>What stood out?</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {TAGS.map(t=>(
                <button key={t} type="button" onClick={()=>toggleTag(t)} style={{padding:'8px 14px',borderRadius:50,fontSize:13,fontWeight:600,border:`1.5px solid ${tags.includes(t)?NEON:BORDER}`,background:tags.includes(t)?NT:CARD,color:tags.includes(t)?NEON:MUTED,cursor:'pointer',transition:'all 0.15s'}}>
                  {tags.includes(t)?'✓ ':''}{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <label style={{display:'block',fontWeight:700,fontSize:14,color:TEXT,marginBottom:10}}>Additional comments (optional)</label>
          <textarea value={comment} onChange={e=>setComment(sanitize(e.target.value))} placeholder="Share more about your experience…" rows={4} style={{width:'100%',padding:'12px 14px',borderRadius:12,fontSize:14,border:`1.5px solid ${BORDER}`,outline:'none',color:TEXT,background:CARD,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor=NEON} onBlur={e=>e.target.style.borderColor=BORDER}/>
        </div>

        <button type="submit" disabled={!stars||submitting} style={{width:'100%',padding:'15px',borderRadius:50,background:!stars?'#e5e7eb':submitting?'#ccc':NT,color:!stars?MUTED:NEON,fontWeight:700,fontSize:15,border:'none',cursor:!stars||submitting?'not-allowed':'pointer',transition:'background 0.2s'}}>
          {submitting?'Submitting…':'Submit Rating'}
        </button>
      </form>
    </AppLayout>
  )
}
