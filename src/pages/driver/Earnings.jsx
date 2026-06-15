import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { ArrowDownLeft, Wallet } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

const WEEKLY=[
  {day:'Mon',amount:8400},{day:'Tue',amount:12200},{day:'Wed',amount:9600},
  {day:'Thu',amount:15800},{day:'Fri',amount:18400},{day:'Sat',amount:21000},{day:'Sun',amount:6200},
]
const max=Math.max(...WEEKLY.map(d=>d.amount))

const TXNS=[
  {id:'e1',label:'Trip: Ikeja → VI',amount:2800,time:'Today 9:14 AM'},
  {id:'e2',label:'Trip: Gbagada → CMS',amount:1900,time:'Today 7:30 AM'},
  {id:'e3',label:'Trip: Ojodu → Ikeja GRA',amount:1200,time:'Yesterday 5:00 PM'},
  {id:'e4',label:'Package delivery',amount:2400,time:'Yesterday 2:30 PM'},
  {id:'e5',label:'Trip: Magodo → VI',amount:3200,time:'Jun 8, 8:00 AM'},
]

export default function Earnings(){
  const [period,setPeriod]=useState('week')
  const todayEarnings=TXNS.filter(t=>t.time.startsWith('Today')).reduce((s,t)=>s+t.amount,0)
  const weekEarnings=WEEKLY.reduce((s,d)=>s+d.amount,0)
  const displayed=period==='today'?todayEarnings:period==='week'?weekEarnings:weekEarnings*4

  return(
    <AppLayout title="Earnings">
      {/* Period tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20,background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:5}}>
        {['today','week','month'].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{flex:1,padding:'9px',borderRadius:9,fontSize:13,fontWeight:700,border:'none',background:period===p?NT:CARD,color:period===p?NEON:MUTED,cursor:'pointer',textTransform:'capitalize',transition:'all 0.2s'}}>
            {p.charAt(0).toUpperCase()+p.slice(1)}
          </button>
        ))}
      </div>

      {/* Hero */}
      <div style={{background:NT,borderRadius:20,padding:'24px 24px',marginBottom:20,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:'rgba(204,255,0,0.06)'}}/>
        <p style={{color:'rgba(204,255,0,0.6)',fontSize:13,fontWeight:600,marginBottom:4}}>
          {period==='today'?'Today\'s Earnings':period==='week'?'This Week':'This Month'}
        </p>
        <p style={{color:NEON,fontWeight:900,fontSize:'clamp(2rem,5vw,2.8rem)',letterSpacing:'-0.03em',lineHeight:1}}>
          ₦{displayed.toLocaleString()}
        </p>
        <div style={{display:'flex',gap:20,marginTop:14}}>
          <div><p style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>Trips</p><p style={{color:'#fff',fontWeight:700,fontSize:15}}>{period==='today'?TXNS.filter(t=>t.time.startsWith('Today')).length:period==='week'?TXNS.length:TXNS.length*4}</p></div>
          <div><p style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>Avg/trip</p><p style={{color:'#fff',fontWeight:700,fontSize:15}}>₦{Math.round(displayed/(TXNS.length||1)).toLocaleString()}</p></div>
          <div><p style={{color:'rgba(255,255,255,0.4)',fontSize:12}}>Rating</p><p style={{color:'#fff',fontWeight:700,fontSize:15}}>⭐ 4.8</p></div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Weekly Breakdown</p>
          <p style={{fontSize:13,color:MUTED}}>₦{weekEarnings.toLocaleString()}</p>
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:8,height:90}}>
          {WEEKLY.map(d=>{
            const h=Math.round((d.amount/max)*80)+10
            const isToday=d.day==='Fri'
            return(
              <div key={d.day} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div style={{width:'100%',height:h,borderRadius:'6px 6px 4px 4px',background:isToday?NEON:`${NEON}25`,transition:'height 0.4s ease'}}/>
                <span style={{fontSize:11,color:isToday?NT:MUTED,fontWeight:isToday?700:500,background:isToday?NEON:'transparent',padding:isToday?'1px 5px':'0',borderRadius:4}}>{d.day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Withdraw */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:14}}>
        <div style={{flex:1}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Available for Withdrawal</p>
          <p style={{fontSize:22,fontWeight:900,color:NT,letterSpacing:'-0.03em',marginTop:4}}>₦{weekEarnings.toLocaleString()}</p>
        </div>
        <button style={{padding:'12px 20px',borderRadius:12,background:NT,color:NEON,fontWeight:700,fontSize:14,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
          <Wallet size={16}/>Withdraw
        </button>
      </div>

      {/* Recent */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Recent Earnings</p>
        </div>
        {TXNS.map((t,i)=>(
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 20px',borderBottom:i<TXNS.length-1?`1px solid ${BORDER}`:'none'}}>
            <div style={{width:36,height:36,borderRadius:10,background:NT,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <ArrowDownLeft size={16} color={NEON}/>
            </div>
            <div style={{flex:1}}>
              <p style={{color:TEXT,fontWeight:600,fontSize:14}}>{t.label}</p>
              <p style={{color:MUTED,fontSize:12,marginTop:2}}>{t.time}</p>
            </div>
            <p style={{fontWeight:800,fontSize:14,color:NT,background:NEON,padding:'3px 10px',borderRadius:20}}>+₦{t.amount.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
