import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, DANGER_SOFT, INFO_TEXT, OK_TEXT } from '../../theme/palette'
import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Sun, Moon } from 'lucide-react'
import ScrollX from '../../components/ScrollX'

/* palette: themed tokens — see src/theme/palette.js */

export default function AdminRoutes() {
  const [routes, setRoutes] = useState(null)
  const [error, setError] = useState('')

  function load() {
    api.get('/admin/routes')
      .then(res => setRoutes(res.data.routes))
      .catch(err => setError(err.data?.message || 'Could not load route demand.'))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [])

  return (
    <AdminLayout title="Routes & Scheduling">
      <p style={{ color:MUTED, fontSize:15.5, marginBottom:8 }}>
        Live demand per route and time slot — riders waiting vs. drivers currently live on that slot.
      </p>
      <p style={{ color:MUTED, fontSize:15.5, marginBottom:20 }}>
        Pickup/dropoff options, time slots, and pricing are fixed in the app for now — this view is read-only.
      </p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:16, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <ScrollX>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:15.5 }}>
          <thead>
            <tr style={{ background:CARD, textAlign:'left' }}>
              {['Period','Time Slot','Route','Riders Waiting','Drivers Live','Seats Available'].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:15.5, color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!routes ? (
              <tr><td colSpan={6} style={{ padding:30, textAlign:'center', color:MUTED }}>Loading…</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:30, textAlign:'center', color:MUTED }}>No active demand right now — no riders waiting and no drivers live.</td></tr>
            ) : routes.map((r, i) => (
              <tr key={i} style={{ borderTop:`1px solid ${BORDER}` }}>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:6, color:TEXT, fontWeight:600, textTransform:'capitalize' }}>
                    {r.period === 'morning' ? <Sun size={13} color={MUTED}/> : <Moon size={13} color={MUTED}/>} {r.period}
                  </span>
                </td>
                <td style={{ padding:'12px 16px', color:TEXT }}>{r.timeSlot}</td>
                <td style={{ padding:'12px 16px', color:TEXT, fontWeight:600 }}>{r.pickup} → {r.dropoff}</td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ fontWeight:700, color: r.waitingRiders > 0 ? INFO_TEXT : MUTED }}>{r.waitingRiders}</span>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ fontWeight:700, color: r.liveDrivers > 0 ? OK_TEXT : MUTED }}>{r.liveDrivers}</span>
                </td>
                <td style={{ padding:'12px 16px', color:TEXT }}>{r.seatsAvailable}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </ScrollX>
      </div>
    </AdminLayout>
  )
}
