import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, FileText, Ban, CheckCircle2 } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280'

const DOC_LABELS = {
  selfie: 'Selfie / Profile Photo', idDoc: 'ID Document',
  driverLicense: "Driver's License", vehicleReg: 'Vehicle Registration', insurance: 'Insurance Certificate',
  profilePhoto: 'Profile Photo', carFront: 'Car — Front View', carSide: 'Car — Side View',
  roadworthiness: 'Roadworthiness Certificate', utilityBill: 'Utility Bill',
}

export default function AdminDriverDetail() {
  const { id } = useParams()
  const [driver, setDriver] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function load() {
    api.get(`/admin/drivers/${id}`)
      .then(res => setDriver(res.data.driver))
      .catch(err => setError(err.data?.message || 'Could not load this driver.'))
  }
  useEffect(() => { load() }, [id])

  async function viewDocument(docId) {
    try {
      const blob = await api.getBlob(`/admin/documents/${docId}`)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      alert('Could not load that file.')
    }
  }

  async function toggleStatus() {
    if (!driver || busy) return
    setBusy(true)
    try {
      await api.patch(`/admin/users/${id}/status`, { isActive: !driver.isActive })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not update status.')
    } finally { setBusy(false) }
  }

  if (error) {
    return (
      <AdminLayout title="Driver">
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      </AdminLayout>
    )
  }
  if (!driver) return <AdminLayout title="Driver"><p style={{ color:MUTED }}>Loading…</p></AdminLayout>

  const completedRides = driver.rides.filter(r => r.status === 'completed')

  return (
    <AdminLayout title={driver.name}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <p style={{ color:MUTED, fontSize:13 }}>Driver ID: {driver.id}</p>
          <div style={{ display:'flex', gap:8, marginTop:6 }}>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
              background: driver.isActive ? '#dcfce7' : '#fef2f2', color: driver.isActive ? '#15803d' : '#ef4444' }}>
              {driver.isActive ? 'Active' : 'Suspended'}
            </span>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color: driver.isOnline ? '#15803d' : MUTED }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background: driver.isOnline ? '#22c55e' : '#9ca3af' }}/>
              {driver.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <button onClick={toggleStatus} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:10, border:'1px solid #fca5a5',
            background:'#fff', color:'#ef4444', fontWeight:700, fontSize:13, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
          {driver.isActive ? <><Ban size={15}/> Suspend Driver</> : <><CheckCircle2 size={15}/> Reactivate Driver</>}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:20 }}>
        {[['Completed Trips', completedRides.length], ['Wallet Balance', `₦${driver.walletBalance.toLocaleString()}`], ['Rating', driver.rating ? `⭐ ${driver.rating}` : '—']].map(([l,v]) => (
          <div key={l} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:16 }}>
            <p style={{ fontSize:12, color:MUTED, fontWeight:600, marginBottom:6 }}>{l}</p>
            <p style={{ fontWeight:900, fontSize:20, color:TEXT }}>{v}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }} className="admin-detail-grid">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Info */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18 }}>
            <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:14 }}>Driver Information</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, fontSize:13 }}>
              <Info label="Email" value={driver.email}/>
              <Info label="Phone" value={driver.phone}/>
              <Info label="Joined" value={new Date(driver.joinedAt).toLocaleDateString()}/>
            </div>
          </div>

          {/* Vehicle */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18 }}>
            <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:14 }}>Vehicle</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, fontSize:13 }}>
              <Info label="Type" value={driver.vehicleType}/>
              <Info label="Make / Model" value={[driver.vehicleMake, driver.vehicleModel].filter(Boolean).join(' ')}/>
              <Info label="Plate Number" value={driver.plateNumber}/>
              <Info label="Year" value={driver.vehicleYear}/>
            </div>
          </div>

          {/* Recent rides */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
            <p style={{ fontWeight:800, fontSize:15, color:TEXT, padding:'16px 18px 0' }}>Recent Trips</p>
            {driver.rides.length === 0 ? (
              <p style={{ color:MUTED, fontSize:13, padding:18 }}>No trips yet.</p>
            ) : driver.rides.map((r, i) => (
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
        </div>

        {/* Documents */}
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18, alignSelf:'start' }}>
          <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:14 }}>Documents</p>
          {driver.documents.length === 0 ? (
            <p style={{ color:MUTED, fontSize:13 }}>No documents uploaded.</p>
          ) : driver.documents.map(d => (
            <div key={d.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5' }}>
              <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:TEXT }}>
                <FileText size={14} color={MUTED}/> {DOC_LABELS[d.type] || d.type}
              </span>
              <button onClick={() => viewDocument(d.id)} style={{ background:'none', border:'none', color:'#2563eb', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`@media (max-width:860px){ .admin-detail-grid{ grid-template-columns:1fr !important; } }`}</style>
    </AdminLayout>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p style={{ color:MUTED, fontSize:11, marginBottom:2 }}>{label}</p>
      <p style={{ color:TEXT, fontWeight:600 }}>{value || '—'}</p>
    </div>
  )
}
