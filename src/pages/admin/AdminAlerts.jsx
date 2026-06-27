import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Clock, UserX, Wallet } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280'

function timeAgo(date) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 60) return `${mins} min ago`
  return `${Math.round(mins / 60)} hr ago`
}

function Section({ icon, title, color, count, children }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom: count > 0 ? `1px solid ${BORDER}` : 'none' }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }}/>
        {icon}
        <p style={{ fontWeight:800, fontSize:14, color:TEXT }}>{title}</p>
        <span style={{ marginLeft:'auto', fontSize:12, fontWeight:700, color:MUTED }}>{count}</span>
      </div>
      {count === 0 ? (
        <p style={{ color:MUTED, fontSize:13, padding:'14px 18px' }}>Nothing to flag here. ✅</p>
      ) : children}
    </div>
  )
}

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState('')

  function load() {
    api.get('/admin/alerts')
      .then(res => setAlerts(res.data))
      .catch(err => setError(err.data?.message || 'Could not load alerts.'))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  if (error) {
    return (
      <AdminLayout title="Alerts">
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      </AdminLayout>
    )
  }
  if (!alerts) return <AdminLayout title="Alerts"><p style={{ color:MUTED }}>Loading…</p></AdminLayout>

  return (
    <AdminLayout title="Alerts">
      <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>Operational issues detected automatically — refreshes every 30 seconds.</p>

      <Section icon={<Clock size={15} color="#dc2626"/>} title="Delayed Trips (in progress &gt; 10 min)" color="#dc2626" count={alerts.delayedRides.length}>
        {alerts.delayedRides.map(r => (
          <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:`1px solid #f5f5f5` }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{r.pickup} → {r.destination}</p>
              <p style={{ fontSize:12, color:MUTED }}>
                {r.driverName || 'Unassigned'} · {r.riderName || '—'} · {r.status.replace('_',' ')} · {timeAgo(r.since)}
              </p>
            </div>
            <Link to="/admin/rides" style={{ fontSize:12, fontWeight:700, color:'#2563eb', textDecoration:'none' }}>View →</Link>
          </div>
        ))}
      </Section>

      <Section icon={<UserX size={15} color="#d97706"/>} title="Unmatched Ride Requests (&gt; 5 min)" color="#d97706" count={alerts.unmatchedRequests.length}>
        {alerts.unmatchedRequests.map(r => (
          <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:`1px solid #f5f5f5` }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{r.pickup} → {r.destination}</p>
              <p style={{ fontSize:12, color:MUTED }}>Waiting {timeAgo(r.since)}</p>
            </div>
            <Link to="/admin/rides" style={{ fontSize:12, fontWeight:700, color:'#2563eb', textDecoration:'none' }}>View →</Link>
          </div>
        ))}
      </Section>

      <Section icon={<Wallet size={15} color="#854d0e"/>} title="Low / Negative Balance Riders" color="#854d0e" count={alerts.lowBalanceRiders.length}>
        {alerts.lowBalanceRiders.map(u => (
          <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:`1px solid #f5f5f5` }}>
            <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{u.name}</p>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <p style={{ fontSize:13, fontWeight:700, color: u.walletBalance < 0 ? '#ef4444' : MUTED }}>₦{u.walletBalance.toLocaleString()}</p>
              <Link to={`/admin/riders/${u.id}`} style={{ fontSize:12, fontWeight:700, color:'#2563eb', textDecoration:'none' }}>View →</Link>
            </div>
          </div>
        ))}
      </Section>
    </AdminLayout>
  )
}
