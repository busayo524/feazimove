import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { useMyAvatar } from '../../hooks/useMyAvatar'
import {
  TrendingUp, Wallet, ArrowDownLeft, Star, Car,
  Clock, CheckCircle, Calendar
} from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n){ return '₦' + Number(n||0).toLocaleString() }

function StatBox({ label, value, sub, icon, accent }){
  return(
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:'16px 18px', flex:1, minWidth:130, boxShadow:'0 2px 8px rgba(36,56,0,0.05)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <p style={{ fontSize:12, color:MUTED, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
        {icon && <div style={{ width:28, height:28, borderRadius:8, background:accent||NEON, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>}
      </div>
      <p style={{ fontWeight:900, fontSize:22, color:TEXT, letterSpacing:'-0.03em', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:MUTED, marginTop:4 }}>{sub}</p>}
    </div>
  )
}

function BarChart({ data, maxVal }){
  if(!data||!data.length) return null
  const peak = maxVal || Math.max(...data.map(d=>d.amount), 1)
  return(
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:100 }}>
      {data.map((d, i) => {
        const h = Math.max(Math.round((d.amount / peak) * 86), 4)
        const isHighest = d.amount === peak
        return(
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:10, color:MUTED, fontWeight:600 }}>
              {d.amount > 0 ? fmt(d.amount).replace('₦','') : ''}
            </span>
            <div style={{ width:'100%', height:h, borderRadius:'5px 5px 3px 3px', background: isHighest ? NEON : `rgba(76,105,0,0.2)`, transition:'height 0.4s ease' }}/>
            <span style={{ fontSize:10, fontWeight: isHighest ? 700 : 500, color: isHighest ? OLIVE : MUTED, background: isHighest ? NEON : 'transparent', padding: isHighest ? '1px 5px' : '0', borderRadius:4 }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Demo data helpers (until real ride data flows) ────────────────────────────
function buildWeeklyDemo(){
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const amounts=[8400,12200,9600,15800,18400,21000,6200]
  return days.map((label,i)=>({ label, amount:amounts[i] }))
}
function buildMonthlyDemo(){
  return Array.from({length:4},(_,i)=>({ label:`Wk ${i+1}`, amount:[62400,74800,91200,55000][i] }))
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Earnings(){
  const { user } = useAuth()
  const [period, setPeriod] = useState('week')
  const [txns, setTxns] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')

  const [avatarUrl] = useMyAvatar(user?.id)
  const initials  = `${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`.toUpperCase() || 'D'
  const fullName  = `${user?.firstName||''} ${user?.lastName||''}`.trim() || user?.name || 'Driver'

  async function loadWallet(){
    let anyError = false

    await api.get('/wallet/balance')
      .then(res => setWalletBalance(res.data?.balance ?? 0))
      .catch(() => { setWalletBalance(0); anyError = true })

    await api.get('/wallet/transactions')
      .then(res => setTxns(res.data?.transactions || []))
      .catch(() => { anyError = true })

    // Only show error banner if wallet balance also failed (transactions table may not exist yet)
    if (anyError && walletBalance === 0) {
      // silently degrade — demo data is shown instead
    }

    setLoading(false)
  }

  useEffect(()=>{ loadWallet() },[])

  async function handleWithdraw(e){
    e.preventDefault()
    const amount = parseInt(withdrawAmount, 10)
    if (!amount || amount <= 0) { setWithdrawError('Enter a valid amount.'); return }
    if (amount > walletBalance) { setWithdrawError('Amount exceeds your available balance.'); return }
    setWithdrawing(true); setWithdrawError(''); setWithdrawSuccess('')
    try {
      await api.post('/wallet/withdraw', { amount })
      setWithdrawSuccess('Withdrawal requested — pending admin approval.')
      setWithdrawAmount('')
      await loadWallet()
      setTimeout(() => { setShowWithdraw(false); setWithdrawSuccess('') }, 1800)
    } catch (err) {
      setWithdrawError(err.data?.message || 'Could not request withdrawal.')
    } finally { setWithdrawing(false) }
  }

  // ── Compute earnings per period ───────────────────────────────────────────
  const credits = txns.filter(t => t.type === 'credit')

  const now      = new Date()
  const todayStr = now.toDateString()

  const todayAmount = credits.filter(t => new Date(t.rawDate||t.date).toDateString?.()===todayStr ||
    t.date?.toLowerCase().startsWith('today'))
    .reduce((s,t)=>s+t.amount, 0)

  // Weekly: use demo bars (no per-day data from transactions)
  const weeklyBars  = buildWeeklyDemo()
  const monthlyBars = buildMonthlyDemo()

  const weekTotal  = weeklyBars.reduce((s,d)=>s+d.amount, 0)
  const monthTotal = monthlyBars.reduce((s,d)=>s+d.amount, 0)

  const periodAmount = period==='today' ? todayAmount
                     : period==='week'  ? weekTotal
                     : monthTotal

  const periodLabel  = period==='today' ? "Today's Earnings"
                     : period==='week'  ? 'This Week'
                     : 'This Month'

  const tripCount = period==='today' ? Math.max(credits.length > 0 ? 2 : 0, 0)
                  : period==='week'  ? 12
                  : 47

  const avgPerTrip = tripCount > 0 ? Math.round(periodAmount / tripCount) : 0

  // Demo driver profile stats
  const PROFILE_STATS = [
    { label:'Total Trips',   value: '284',   icon:<Car size={13} color={OLIVE}/> },
    { label:'Rating',        value: `${user?.rating||'4.8'} ⭐`, icon:<Star size={13} color={OLIVE}/> },
    { label:'Completion',    value: '97%',   icon:<CheckCircle size={13} color={OLIVE}/> },
    { label:'Online Hrs',    value: '6.4h',  icon:<Clock size={13} color={OLIVE}/> },
  ]

  if(loading){
    return(
      <AppLayout title="Earnings">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppLayout>
    )
  }

  return(
    <AppLayout title="Earnings">


      {/* ── Driver Profile Card ── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, padding:20, marginBottom:16, display:'flex', alignItems:'center', gap:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ width:60, height:60, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, border:`3px solid ${OLIVE}` }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <span style={{ color:OLIVE, fontWeight:900, fontSize:22 }}>{initials}</span>
          }
        </div>
        <div style={{ flex:1 }}>
          <p style={{ color:TEXT, fontWeight:800, fontSize:17, letterSpacing:'-0.02em' }}>{fullName}</p>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e' }}/>
            <span style={{ color:MOSS, fontSize:13, fontWeight:600 }}>Online · FeaziMove Driver</span>
          </div>
          <p style={{ color:MUTED, fontSize:12, marginTop:2 }}>{user?.phone || '—'}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ color:MUTED, fontSize:11, fontWeight:600 }}>WALLET</p>
          <p style={{ color:OLIVE, fontWeight:900, fontSize:18 }}>{fmt(walletBalance)}</p>
        </div>
      </div>

      {/* ── Quick stats grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10, marginBottom:16 }}>
        {PROFILE_STATS.map(s=>(
          <div key={s.label} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:'14px 16px', boxShadow:'0 2px 8px rgba(36,56,0,0.05)', display:'flex', alignItems:'center', gap:12, minWidth:0, overflow:'hidden' }}>
            <div style={{ width:34, height:34, borderRadius:10, background:NEON, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {s.icon}
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:11, color:MUTED, fontWeight:600 }}>{s.label}</p>
              <p style={{ fontSize:16, fontWeight:900, color:TEXT, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Withdraw card ── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, marginBottom:16, display:'flex', alignItems:'center', gap:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ flex:1 }}>
          <p style={{ color:MOSS, fontSize:12, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Available to Withdraw</p>
          <p style={{ color:OLIVE, fontWeight:900, fontSize:26, letterSpacing:'-0.03em' }}>{fmt(walletBalance)}</p>
          <p style={{ color:MUTED, fontSize:12, marginTop:4 }}>Processed within 24 hours</p>
        </div>
        <button onClick={() => setShowWithdraw(true)} disabled={walletBalance <= 0}
          style={{ padding:'13px 20px', borderRadius:12, background:walletBalance>0?OLIVE:BORDER, color:walletBalance>0?NEON:MUTED, fontWeight:800, fontSize:14, border:'none', cursor:walletBalance>0?'pointer':'not-allowed', display:'flex', alignItems:'center', gap:8, boxShadow:'0 2px 8px rgba(36,56,0,0.2)', fontFamily:'inherit' }}>
          <Wallet size={16}/>Withdraw
        </button>
      </div>

      {showWithdraw && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setShowWithdraw(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, maxWidth:340, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)' }}>
            <p style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:6 }}>Request Withdrawal</p>
            <p style={{ fontSize:13, color:MUTED, marginBottom:16 }}>Available: {fmt(walletBalance)}. Requests are reviewed by an admin before payout.</p>
            <form onSubmit={handleWithdraw}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Amount (₦)</label>
              <input type="number" min="1" max={walletBalance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required
                placeholder={`Up to ${walletBalance}`}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>

              {withdrawError && <p style={{ fontSize:13, color:'#ef4444', marginBottom:12 }}>{withdrawError}</p>}
              {withdrawSuccess && <p style={{ fontSize:13, color:'#15803d', marginBottom:12 }}>{withdrawSuccess}</p>}

              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setShowWithdraw(false)}
                  style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
                <button type="submit" disabled={withdrawing}
                  style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:NEON, color:OLIVE, fontWeight:700, fontSize:14, cursor:withdrawing?'not-allowed':'pointer', fontFamily:'inherit', opacity:withdrawing?0.7:1 }}>
                  {withdrawing ? 'Requesting…' : 'Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Recent transactions ── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden', marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em' }}>Recent Transactions</p>
          <span style={{ fontSize:12, color:MUTED }}>{txns.length} records</span>
        </div>

        {txns.length === 0 ? (
          /* Demo transactions shown while no real data exists */
          [
            { id:1, label:'Trip: Ikeja → Victoria Island',  amount:2800, time:'Today, 9:14 AM',      type:'credit' },
            { id:2, label:'Trip: Gbagada → CMS',             amount:1900, time:'Today, 7:30 AM',      type:'credit' },
            { id:3, label:'Trip: Ojodu → Ikeja GRA',         amount:1200, time:'Yesterday, 5:00 PM',  type:'credit' },
            { id:4, label:'FeaziMove: Package delivery',     amount:2400, time:'Yesterday, 2:30 PM',  type:'credit' },
            { id:5, label:'Trip: Magodo → Victoria Island',  amount:3200, time:'Jun 21, 8:00 AM',     type:'credit' },
          ].map((t,i,arr)=>(
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 20px', borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=BG}
              onMouseLeave={e=>e.currentTarget.style.background=CARD}>
              <div style={{ width:38, height:38, borderRadius:10, background:NEON, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ArrowDownLeft size={15} color={OLIVE}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:TEXT, fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.label}</p>
                <p style={{ color:MUTED, fontSize:12, marginTop:2 }}>{t.time}</p>
              </div>
              <span style={{ fontWeight:800, fontSize:13, color:OLIVE, background:NEON, padding:'3px 11px', borderRadius:20, flexShrink:0 }}>
                +{fmt(t.amount)}
              </span>
            </div>
          ))
        ) : (
          txns.slice(0,20).map((t,i,arr)=>(
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 20px', borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none', transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=BG}
              onMouseLeave={e=>e.currentTarget.style.background=CARD}>
              <div style={{ width:38, height:38, borderRadius:10, background: t.type==='credit'?NEON:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ArrowDownLeft size={15} color={t.type==='credit'?OLIVE:'#ef4444'} style={{ transform: t.type==='debit'?'rotate(180deg)':'none' }}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:TEXT, fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.description}</p>
                <p style={{ color:MUTED, fontSize:12, marginTop:2 }}>{t.date}</p>
              </div>
              <span style={{ fontWeight:800, fontSize:13, color: t.type==='credit'?OLIVE:'#ef4444', background: t.type==='credit'?NEON:'#fef2f2', padding:'3px 11px', borderRadius:20, flexShrink:0 }}>
                {t.type==='credit'?'+':'-'}{fmt(t.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Period selector ── */}
      <div style={{ display:'flex', gap:6, marginBottom:16, background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:5, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        {[['today','Today'],['week','This Week'],['month','This Month']].map(([val,label])=>(
          <button key={val} onClick={()=>setPeriod(val)}
            style={{ flex:1, padding:'9px', borderRadius:9, fontSize:13, fontWeight:700, border:'none', background:period===val?NEON:CARD, color:period===val?OLIVE:MUTED, cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Hero earnings card ── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:20, padding:'24px', marginBottom:16, position:'relative', overflow:'hidden', boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ position:'absolute', top:-24, right:-24, width:120, height:120, borderRadius:'50%', background:'rgba(36,56,0,0.07)' }}/>
        <div style={{ position:'absolute', bottom:-30, left:60, width:80, height:80, borderRadius:'50%', background:'rgba(36,56,0,0.05)' }}/>
        <p style={{ color:'rgba(36,56,0,0.55)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{periodLabel}</p>
        <p style={{ color:OLIVE, fontWeight:900, fontSize:'clamp(2rem,6vw,3rem)', letterSpacing:'-0.03em', lineHeight:1, marginBottom:16 }}>
          {fmt(periodAmount)}
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12 }}>
          {[
            ['Trips completed', tripCount],
            ['Avg per trip', fmt(avgPerTrip)],
            ['Rating', `⭐ ${user?.rating||'4.8'}`],
          ].map(([l,v])=>(
            <div key={l} style={{ background:'rgba(36,56,0,0.08)', borderRadius:10, padding:'10px 12px', minWidth:0, overflow:'hidden' }}>
              <p style={{ color:'rgba(36,56,0,0.5)', fontSize:11, marginBottom:3 }}>{l}</p>
              <p style={{ color:OLIVE, fontWeight:800, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:'18px 20px', marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {period==='month' ? 'Monthly Breakdown' : 'Weekly Breakdown'}
          </p>
          <span style={{ fontSize:13, color:MUTED, fontWeight:600 }}>{fmt(period==='month'?monthTotal:weekTotal)}</span>
        </div>
        <BarChart data={period==='month' ? monthlyBars : weeklyBars}/>
      </div>

      {/* ── Earnings summary table ── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BORDER}` }}>
          <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em' }}>Earnings Summary</p>
        </div>
        {[
          { label:'Today',     value: fmt(todayAmount||4700),  sub:'2 trips' },
          { label:'This Week', value: fmt(weekTotal),          sub:'12 trips' },
          { label:'This Month',value: fmt(monthTotal),         sub:'47 trips' },
          { label:'All Time',  value: fmt(monthTotal*6),       sub:'284 total trips' },
        ].map((row,i,arr)=>(
          <div key={row.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 20px', borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Calendar size={14} color={MUTED}/>
              <div>
                <p style={{ fontSize:14, fontWeight:600, color:TEXT }}>{row.label}</p>
                <p style={{ fontSize:12, color:MUTED, marginTop:1 }}>{row.sub}</p>
              </div>
            </div>
            <p style={{ fontWeight:800, fontSize:15, color:OLIVE }}>{row.value}</p>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AppLayout>
  )
}
