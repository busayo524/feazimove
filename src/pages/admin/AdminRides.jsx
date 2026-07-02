import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, MapPin } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

const STATUS_STYLE = {
  pending:         { bg:'#fef9c3', fg:'#854d0e', label:'Pending' },
  driver_assigned: { bg:'#dbeafe', fg:'#1e40af', label:'Driver Assigned' },
  arrived_pickup:  { bg:'#e0e7ff', fg:'#3730a3', label:'Arrived Pickup' },
  in_transit:      { bg:'#fae8ff', fg:'#86198f', label:'En Route' },
  completed:        { bg:'#dcfce7', fg:'#15803d', label:'Completed' },
  cancelled:        { bg:'#fef2f2', fg:'#ef4444', label:'Cancelled' },
}

export default function AdminRides() {
  const [liveOnly, setLiveOnly] = useState(true)
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    api.get(`/admin/rides?live=${liveOnly}`)
      .then(res => setRides(res.data.rides))
      .catch(err => setError(err.data?.message || 'Could not load rides.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000) // light polling — this is the "live" view
    return () => clearInterval(id)
  }, [liveOnly])

  return (
    <AdminLayout title="Rides">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>{rides.length} ride{rides.length !== 1 ? 's' : ''}{liveOnly ? ' in progress' : ' total'}</p>
        <div style={{ display:'flex', gap:6, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:4 }}>
          {[[true,'Live'],[false,'All Rides']].map(([val,label]) => (
            <button key={label} onClick={() => setLiveOnly(val)}
              style={{ padding:'7px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                background: liveOnly===val ? NEON : 'transparent', color: liveOnly===val ? OLIVE : MUTED }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:CARD, textAlign:'left' }}>
              {['Route','Rider','Driver','Fare','Status','Started'].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:12, color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:30, textAlign:'center', color:MUTED }}>Loading…</td></tr>
            ) : rides.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:30, textAlign:'center', color:MUTED }}>{liveOnly ? 'No trips in progress right now.' : 'No rides yet.'}</td></tr>
            ) : rides.map(r => {
              const s = STATUS_STYLE[r.status] || { bg:'#f3f4f6', fg:MUTED, label:r.status }
              return (
                <tr key={r.id} style={{ borderTop:`1px solid ${BORDER}` }}>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:6, color:TEXT, fontWeight:600 }}>
                      <MapPin size={13} color={MUTED}/> {r.pickup} → {r.destination}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', color:TEXT }}>{r.riderName || '—'}</td>
                  <td style={{ padding:'12px 16px', color:TEXT }}>{r.driverName || '—'}</td>
                  <td style={{ padding:'12px 16px', color:TEXT }}>₦{r.fare.toLocaleString()}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.fg }}>{s.label}</span>
                  </td>
                  <td style={{ padding:'12px 16px', color:MUTED, fontSize:13 }}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  )
}
