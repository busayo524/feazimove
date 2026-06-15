import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', NL='#f9ffe0', NB='#e8ff80'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280'

const MOCK_TXN=[
  {id:'x1',type:'credit',label:'Wallet top-up',amount:5000,date:'Today, 9:02 AM',method:'Card •••• 4521'},
  {id:'x2',type:'debit',label:'Trip: Ikeja → VI',amount:1800,date:'Today, 9:14 AM',method:'Wallet'},
  {id:'x3',type:'debit',label:'Package: Surulere → Lekki',amount:2400,date:'Yesterday, 2:30 PM',method:'Wallet'},
  {id:'x4',type:'credit',label:'Wallet top-up',amount:10000,date:'Jun 8, 10:00 AM',method:'Bank Transfer'},
  {id:'x5',type:'debit',label:'Trip: Ikeja GRA → Eko Hotel',amount:2100,date:'Jun 8, 6:15 PM',method:'Wallet'},
]
const QUICK=[1000,2000,5000,10000]

export default function Wallet(){
  const {user}=useAuth()
  const [amount,setAmount]=useState('')
  const [funding,setFunding]=useState(false)
  const [success,setSuccess]=useState(false)
  const balance=user?.walletBalance??4700

  function sanitize(val){return val.replace(/[^0-9]/g,'')}
  function handleFund(e){
    e.preventDefault()
    const num=parseInt(amount,10)
    if(!num||num<100){alert('Minimum top-up is ₦100');return}
    setFunding(true)
    setTimeout(()=>{setFunding(false);setSuccess(true);setTimeout(()=>setSuccess(false),3000)},1400)
  }

  return(
    <AppLayout title="Wallet">
      {/* Balance card */}
      <div style={{background:NT,borderRadius:20,padding:'28px 24px',marginBottom:24,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-20,right:-20,width:120,height:120,borderRadius:'50%',background:'rgba(204,255,0,0.06)'}}/>
        <div style={{position:'absolute',bottom:-30,right:40,width:80,height:80,borderRadius:'50%',background:'rgba(204,255,0,0.04)'}}/>
        <p style={{color:'rgba(204,255,0,0.6)',fontSize:13,fontWeight:600,marginBottom:4}}>Available Balance</p>
        <p style={{color:NEON,fontWeight:900,fontSize:'clamp(2rem,5vw,3rem)',letterSpacing:'-0.03em',lineHeight:1}}>₦{balance.toLocaleString()}</p>
        <p style={{color:'rgba(255,255,255,0.35)',fontSize:13,marginTop:8}}>{user?.phone||'••• ••• ••••'}</p>
      </div>

      {/* Top up */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <p style={{fontWeight:700,fontSize:14,color:TEXT,marginBottom:14}}>Top Up Wallet</p>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>setAmount(String(q))} style={{padding:'8px 16px',borderRadius:50,fontSize:13,fontWeight:600,border:`1.5px solid ${amount===String(q)?NEON:BORDER}`,background:amount===String(q)?NT:CARD,color:amount===String(q)?NEON:MUTED,cursor:'pointer',transition:'all 0.15s'}}>
              ₦{q.toLocaleString()}
            </button>
          ))}
        </div>
        <form onSubmit={handleFund} style={{display:'flex',gap:10}}>
          <input value={amount} onChange={e=>setAmount(sanitize(e.target.value))} placeholder="Enter amount (₦)" style={{flex:1,padding:'12px 16px',borderRadius:10,fontSize:15,border:`1.5px solid ${BORDER}`,outline:'none',background:CARD,color:TEXT,fontFamily:'inherit'}} onFocus={e=>e.target.style.borderColor=NEON} onBlur={e=>e.target.style.borderColor=BORDER}/>
          <button type="submit" disabled={funding} style={{padding:'12px 20px',borderRadius:10,background:funding?'#ccc':NT,color:funding?'#fff':NEON,border:'none',fontWeight:700,fontSize:14,cursor:funding?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:6}}>
            <Plus size={16}/>{funding?'…':'Add'}
          </button>
        </form>
        {success&&<p style={{color:NT,background:NEON,fontSize:13,fontWeight:700,marginTop:10,padding:'8px 14px',borderRadius:8,display:'inline-block'}}>✓ Wallet topped up!</p>}
      </div>

      {/* Transactions */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontWeight:700,fontSize:14,color:TEXT}}>Transaction History</p>
        </div>
        {MOCK_TXN.map((txn,i)=>{
          const isCredit=txn.type==='credit'
          return(
            <div key={txn.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<MOCK_TXN.length-1?`1px solid ${BORDER}`:'none'}}>
              <div style={{width:38,height:38,borderRadius:10,flexShrink:0,background:isCredit?NT:'#fef2f2',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {isCredit?<ArrowDownLeft size={17} color={NEON}/>:<ArrowUpRight size={17} color='#ef4444'/>}
              </div>
              <div style={{flex:1}}>
                <p style={{color:TEXT,fontWeight:600,fontSize:14}}>{txn.label}</p>
                <div style={{display:'flex',gap:8,marginTop:2}}>
                  <span style={{color:MUTED,fontSize:12}}>{txn.date}</span>
                  <span style={{color:MUTED,fontSize:12}}>·</span>
                  <span style={{color:MUTED,fontSize:12}}>{txn.method}</span>
                </div>
              </div>
              <p style={{fontWeight:800,fontSize:15,color:isCredit?NT:'#ef4444',flexShrink:0,background:isCredit?NEON:'transparent',padding:isCredit?'3px 10px':'0',borderRadius:isCredit?20:0}}>
                {isCredit?'+':'-'}₦{txn.amount.toLocaleString()}
              </p>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
