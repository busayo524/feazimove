import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Plus, Ban, CheckCircle2, X } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

export default function AdminStops() {
  const [stops, setStops] = useState(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function load() {
    api.get('/admin/stops')
      .then(res => setStops(res.data.stops))
      .catch(err => setError(err.data?.message || 'Could not load stops.'))
  }
  useEffect(() => { load() }, [])

  async function toggleActive(stop) {
    try {
      await api.patch(`/admin/stops/${stop.id}`, { isActive: !stop.isActive })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not update stop.')
    }
  }

  const mainland = stops?.filter(s => s.group === 'mainland') || []
  const island = stops?.filter(s => s.group === 'island') || []

  return (
    <AdminLayout title="Stops">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>The catalog of named locations riders and drivers can select.</p>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, background:NEON, border:'none',
            color:OLIVE, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          <Plus size={15}/> Add Stop
        </button>
      </div>
      <p style={{ color:MUTED, fontSize:12, marginBottom:20 }}>
        Adding a stop here doesn't make it bookable on its own — price at least one route using it in "Pricing" first.
      </p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {!stops ? (
        <p style={{ color:MUTED }}>Loading…</p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:16 }} className="admin-stops-grid">
          {[['Mainland', mainland], ['Island', island]].map(([label, list]) => (
            <div key={label} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
              <p style={{ fontWeight:800, fontSize:14, color:TEXT, padding:'14px 18px', borderBottom:`1px solid ${BORDER}`, background:BG }}>
                {label} ({list.length})
              </p>
              {list.map(s => (
                <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 18px', borderBottom:`1px solid #f5f5f5` }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{s.name}</p>
                    <p style={{ fontSize:11, color:MUTED }}>Chain position {s.chainPosition}{!s.isActive && ' · Inactive'}</p>
                  </div>
                  <button onClick={() => toggleActive(s)}
                    style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer',
                      color: s.isActive ? '#ef4444' : '#15803d', fontWeight:600, fontSize:11, fontFamily:'inherit' }}>
                    {s.isActive ? <><Ban size={12}/> Deactivate</> : <><CheckCircle2 size={12}/> Activate</>}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddStopModal onClose={() => setShowAdd(false)} onCreated={load}/>}

      <style>{`@media (max-width:860px){ .admin-stops-grid{ grid-template-columns:1fr !important; } }`}</style>
    </AdminLayout>
  )
}

function AddStopModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [group, setGroup] = useState('mainland')
  const [chainPosition, setChainPosition] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api.post('/admin/stops', {
        name, group, chainPosition: parseInt(chainPosition, 10),
        lat: lat || undefined, lng: lng || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.data?.message || 'Could not create stop.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, maxWidth:380, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>Add Stop</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:MUTED }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Yaba"
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Group</label>
          <select value={group} onChange={e => setGroup(e.target.value)}
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}>
            <option value="mainland">Mainland</option>
            <option value="island">Island</option>
          </select>

          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Chain Position (order for "try next stop")</label>
          <input type="number" min="0" value={chainPosition} onChange={e => setChainPosition(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10, marginBottom:14 }}>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Latitude</label>
              <input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} placeholder="optional"
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Longitude</label>
              <input type="number" step="0.0001" value={lng} onChange={e => setLng(e.target.value)} placeholder="optional"
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>
            </div>
          </div>

          {error && <p style={{ fontSize:13, color:'#ef4444', marginBottom:12 }}>{error}</p>}

          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:'11px', borderRadius:10, background:NEON, color:OLIVE, border:'none', fontWeight:700, fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
            {busy ? 'Creating…' : 'Create Stop'}
          </button>
        </form>
      </div>
    </div>
  )
}
