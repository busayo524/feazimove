import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Plus, Ban, CheckCircle2, X, ChevronUp, ChevronDown } from 'lucide-react'

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

  const [reordering, setReordering] = useState(false)
  // Move a stop up/down within its group and persist the new order (stops are
  // arranged by real Lagos geography — the order drivers walk when expanding).
  async function moveStop(list, group, index, dir) {
    const target = index + dir
    if (reordering || target < 0 || target >= list.length) return
    const reordered = [...list]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    setReordering(true)
    try {
      await api.post('/admin/stops/reorder', { group, orderedIds: reordered.map(s => s.id) })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not reorder.')
    } finally { setReordering(false) }
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
        Use the arrows to arrange each side by geography (the order drivers move through when no rider is at the current stop).
        A stop only becomes bookable once a route using it is priced in "Pricing".
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
              <p style={{ fontWeight:800, fontSize:14, color:TEXT, padding:'14px 18px', borderBottom:`1px solid `, background:CARD }}>
                {label} ({list.length})
              </p>
              {list.map((s, i) => (
                <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, padding:'10px 12px 10px 18px', borderBottom:`1px solid #f5f5f5` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                    {/* Reorder up/down — the list order IS the geography order */}
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <button onClick={() => moveStop(list, label.toLowerCase(), i, -1)} disabled={i === 0 || reordering}
                        aria-label="Move up" style={{ background:'none', border:'none', cursor:(i===0||reordering)?'default':'pointer', color:i===0?'#d1d5db':MUTED, padding:0, lineHeight:0 }}>
                        <ChevronUp size={16}/>
                      </button>
                      <button onClick={() => moveStop(list, label.toLowerCase(), i, 1)} disabled={i === list.length-1 || reordering}
                        aria-label="Move down" style={{ background:'none', border:'none', cursor:(i===list.length-1||reordering)?'default':'pointer', color:i===list.length-1?'#d1d5db':MUTED, padding:0, lineHeight:0 }}>
                        <ChevronDown size={16}/>
                      </button>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize:11, color:MUTED }}>#{i + 1}{!s.isActive && ' · Inactive'}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(s)}
                    style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', flexShrink:0,
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
