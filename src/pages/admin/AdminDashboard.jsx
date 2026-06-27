import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import {
  Users, Car, Navigation, Clock, Wifi, AlertCircle, CheckCircle, Wallet, AlertTriangle,
} from 'lucide-react'

const NEON = '#ccff00', OLIVE = '#243800'
const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280'

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:13, color:MUTED, fontWeight:600 }}>{label}</p>
        <div style={{ width:32, height:32, borderRadius:9, background: accent || '#eef6e0', display:'flex', alignItems:'center', justifyContent:'center', color:OLIVE }}>
          {icon}
        </div>
      </div>
      <p style={{ fontWeight:900, fontSize:26, color:TEXT, letterSpacing:'-0.02em' }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:MUTED, marginTop:4 }}>{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [alertCount, setAlertCount] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(err => setError(err.data?.message || 'Could not load dashboard stats.'))
    api.get('/admin/alerts')
      .then(res => setAlertCount(res.data.delayedRides.length + res.data.unmatchedRequests.length + res.data.lowBalanceRiders.length))
      .catch(() => {})
  }, [])

  return (
    <AdminLayout title="Dashboard">
      <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>Real-time overview of riders, drivers, and trips.</p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {!stats ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <div style={{ width:26, height:26, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:16 }}>
            <StatCard icon={<Users size={16}/>} label="Active Riders" value={stats.activeRiders}/>
            <StatCard icon={<Car size={16}/>}   label="Active Drivers" value={stats.activeDrivers} sub={`${stats.driversOnline} online now`}/>
            <StatCard icon={<Navigation size={16}/>} label="Trips Today" value={stats.tripsToday}/>
            <StatCard icon={<Clock size={16}/>} label="Ongoing Trips" value={stats.ongoingTrips}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
            <StatCard icon={<Wifi size={16}/>} label="Drivers Online" value={stats.driversOnline} accent="#e0f2fe"/>
            <StatCard icon={<AlertCircle size={16}/>} label="Pending Requests" value={stats.pendingRequests} accent="#fef9c3"/>
            <StatCard icon={<CheckCircle size={16}/>} label="Completed Trips" value={stats.completedTrips} accent="#dcfce7"/>
            <StatCard icon={<Wallet size={16}/>} label="Total Wallet Balance" value={`₦${stats.totalWalletBalance.toLocaleString()}`} accent="#f3e8ff"/>
          </div>

          {alertCount > 0 && (
            <Link to="/admin/alerts" style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderRadius:14,
              background:'#fef2f2', border:'1px solid #fca5a5', marginBottom:20, textDecoration:'none' }}>
              <AlertTriangle size={18} color="#dc2626"/>
              <p style={{ fontSize:13, fontWeight:700, color:'#991b1b', flex:1 }}>
                {alertCount} issue{alertCount !== 1 ? 's' : ''} need attention
              </p>
              <span style={{ fontSize:13, fontWeight:700, color:'#dc2626' }}>View All →</span>
            </Link>
          )}

          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Link to="/admin/riders" style={{ padding:'10px 18px', borderRadius:50, background:CARD, border:`1px solid ${BORDER}`, color:TEXT, fontWeight:600, fontSize:13, textDecoration:'none' }}>View Riders →</Link>
            <Link to="/admin/drivers" style={{ padding:'10px 18px', borderRadius:50, background:CARD, border:`1px solid ${BORDER}`, color:TEXT, fontWeight:600, fontSize:13, textDecoration:'none' }}>View Drivers →</Link>
            <Link to="/admin/rides" style={{ padding:'10px 18px', borderRadius:50, background:OLIVE, border:'none', color:NEON, fontWeight:700, fontSize:13, textDecoration:'none' }}>View Live Rides →</Link>
            <Link to="/admin/payments" style={{ padding:'10px 18px', borderRadius:50, background:CARD, border:`1px solid ${BORDER}`, color:TEXT, fontWeight:600, fontSize:13, textDecoration:'none' }}>View Payments →</Link>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
