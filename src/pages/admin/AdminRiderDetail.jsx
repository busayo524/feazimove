import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Navigation, Star, Wallet } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e9ecef', TEXT = '#1a1a1a', MUTED = '#6b7280'

const TRIP_STATUS_LABELS = {
  pending: 'Waiting for driver', driver_assigned: 'Driver assigned',
  arrived_pickup: 'Driver at pickup', in_transit: 'In transit',
}

export default function AdminRiderDetail() {
  const { id } = useParams()
  const [rider, setRider] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/admin/riders/${id}`)
      .then(res => setRider(res.data.rider))
      .catch(err => setError(err.data?.message || 'Could not load this rider.'))
  }, [id])

  if (error) {
    return (
      <AdminLayout title="Rider">
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      </AdminLayout>
    )
  }
  if (!rider) return <AdminLayout title="Rider"><p style={{ color:MUTED }}>Loading…</p></AdminLayout>

  const active = rider.activeTrip

  return (
    <AdminLayout title={rider.name}>
      <div style={{ marginBottom:20 }}>
        <p style={{ color:MUTED, fontSize:13 }}>Rider ID: {rider.id}</p>
        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, marginTop:6, display:'inline-block',
          background: rider.isActive ? '#f3fbd3' : '#fef2f2', color: rider.isActive ? '#3f6212' : '#ef4444' }}>
          {rider.isActive ? 'Active' : 'Suspended'}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:20 }}>
        {[['Total Trips', rider.rides.length], ['Wallet Balance', `₦${rider.walletBalance.toLocaleString()}`]].map(([l,v]) => (
          <div key={l} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:16 }}>
            <p style={{ fontSize:12, color:MUTED, fontWeight:600, marginBottom:6 }}>{l}</p>
            <p style={{ fontWeight:900, fontSize:20, color:TEXT }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Active / ongoing trip */}
      <div style={{ background:CARD, border:`1px solid ${active ? '#dff0a8' : BORDER}`, borderRadius:14, padding:18, marginBottom:16 }}>
        <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
          <Navigation size={15} color="#3f6212"/> Active Trip
        </p>
        {!active ? (
          <p style={{ color:MUTED, fontSize:13, margin:0 }}>No active trip right now.</p>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, flexWrap:'wrap' }}>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:700, color:TEXT, margin:0 }}>{active.pickup} → {active.destination}</p>
              <p style={{ fontSize:12, color:MUTED, margin:'4px 0 0' }}>
                {active.driverName ? `Driver: ${active.driverName} · ` : ''}
                Started {new Date(active.startedAt).toLocaleString()}
                {active.fare ? ` · ₦${active.fare.toLocaleString()}` : ''}
              </p>
            </div>
            <span style={{ fontSize:11.5, fontWeight:700, padding:'4px 12px', borderRadius:50, flexShrink:0,
              background:'#f3fbd3', color:'#3f6212', border:'1px solid #dff0a8' }}>
              {TRIP_STATUS_LABELS[active.status] || active.status.replace(/_/g,' ')}
            </span>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:16, marginBottom:16 }} className="admin-detail-grid">
        {/* Wallet history */}
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18, alignSelf:'start' }}>
          <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
            <Wallet size={15} color="#3f6212"/> Wallet History
          </p>
          {!rider.walletTransactions?.length ? (
            <p style={{ color:MUTED, fontSize:13, margin:'8px 0 0' }}>No wallet transactions yet.</p>
          ) : rider.walletTransactions.map((t, i) => (
            <div key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'11px 0',
              borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.description}</p>
                <p style={{ fontSize:12, color:MUTED, margin:'2px 0 0' }}>{new Date(t.date).toLocaleString()}</p>
              </div>
              <span style={{ fontSize:13, fontWeight:800, flexShrink:0, color: t.type === 'credit' ? '#3f6212' : '#b42318' }}>
                {t.type === 'credit' ? '+' : '−'}₦{t.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Rating history */}
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18, alignSelf:'start' }}>
          <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:6, display:'flex', alignItems:'center', gap:8 }}>
            <Star size={15} color="#3f6212"/> Rating History
          </p>
          {!rider.ratings?.length ? (
            <p style={{ color:MUTED, fontSize:13, margin:'8px 0 0' }}>No ratings received yet.</p>
          ) : rider.ratings.map((r, i) => (
            <div key={r.id} style={{ padding:'11px 0', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <span style={{ fontSize:13, color:'#b45309', letterSpacing:1 }}>
                  {'★'.repeat(r.stars)}<span style={{ color:'#e5e7eb' }}>{'★'.repeat(5 - r.stars)}</span>
                </span>
                <span style={{ fontSize:12, color:MUTED, flexShrink:0 }}>{new Date(r.date).toLocaleDateString()}</span>
              </div>
              <p style={{ fontSize:12.5, color:TEXT, margin:'4px 0 0' }}>
                {r.comment || <span style={{ color:MUTED }}>No comment</span>}
                {r.raterName && <span style={{ color:MUTED }}> — {r.raterName}</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent rides */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
        <p style={{ fontWeight:800, fontSize:15, color:TEXT, padding:'16px 18px 0' }}>Recent Trips</p>
        {rider.rides.length === 0 ? (
          <p style={{ color:MUTED, fontSize:13, padding:18 }}>No trips yet.</p>
        ) : rider.rides.map((r, i) => (
          <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'12px 18px',
            borderTop: i === 0 ? '1px solid #f0f0f0' : '1px solid #f5f5f5', marginTop: i===0 ? 14 : 0 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{r.pickup} → {r.destination}</p>
              <p style={{ fontSize:12, color:MUTED }}>{new Date(r.date).toLocaleString()}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:13, fontWeight:700, color:TEXT }}>₦{r.fare.toLocaleString()}</p>
              <p style={{ fontSize:11, color:MUTED, textTransform:'capitalize' }}>{r.status.replace('_',' ')}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`@media (max-width:860px){ .admin-detail-grid{ grid-template-columns:1fr !important; } }`}</style>
    </AdminLayout>
  )
}
