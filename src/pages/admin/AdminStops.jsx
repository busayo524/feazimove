import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Plus, Ban, CheckCircle2, X, ChevronUp, ChevronDown, GripVertical, Pencil, Trash2, FolderInput } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

export default function AdminStops() {
  const [zones, setZones] = useState(null)
  const [stops, setStops] = useState(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [busy, setBusy] = useState(false)

  // Drag state — a stop being dragged and where it would land right now
  const [drag, setDrag] = useState(null)        // { stopId, fromZoneId, side }
  const [dropAt, setDropAt] = useState(null)    // { zoneId, index }
  // "Move to…" menu fallback for touch devices (HTML5 drag needs a mouse)
  const [moveMenuFor, setMoveMenuFor] = useState(null)

  function load() {
    // `|| []` guards the deploy window where the backend doesn't send zones
    // yet — stops then show under "Unassigned" instead of loading forever.
    return api.get('/admin/stops')
      .then(res => { setZones(res.data.zones || []); setStops(res.data.stops) })
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

  // stops arrive ordered (zone position, walk order) so per-zone filtering
  // preserves the display order everywhere below
  const stopsOf = zoneId => (stops || []).filter(s => s.zoneId === zoneId)

  async function persistArrange(zonesPayload) {
    if (busy) return
    setBusy(true)
    try {
      await api.post('/admin/stops/arrange', { zones: zonesPayload })
    } catch (err) {
      alert(err.data?.message || 'Could not move stop.')
    } finally {
      // Stay busy until the fresh order is on screen — otherwise a fast second
      // click computes its move from the stale pre-reload list.
      await load()
      setBusy(false)
    }
  }

  // Arrow reorder — within one zone
  function nudge(zone, index, dir) {
    const list = stopsOf(zone.id).map(s => s.id)
    const target = index + dir
    if (target < 0 || target >= list.length) return
    const [item] = list.splice(index, 1)
    list.splice(target, 0, item)
    persistArrange([{ zoneId: zone.id, orderedIds: list }])
  }

  // Drop — same zone reorder or cross-zone move, one API call either way
  function handleDrop(toZone) {
    if (!drag || !dropAt || dropAt.zoneId !== toZone.id) { setDrag(null); setDropAt(null); return }
    const from = stopsOf(drag.fromZoneId).map(s => s.id)
    if (drag.fromZoneId === toZone.id) {
      const oldIndex = from.indexOf(drag.stopId)
      let index = dropAt.index
      if (oldIndex < index) index-- // removing first shifts the target up
      from.splice(oldIndex, 1)
      from.splice(Math.min(index, from.length), 0, drag.stopId)
      persistArrange([{ zoneId: toZone.id, orderedIds: from }])
    } else {
      const to = stopsOf(toZone.id).map(s => s.id)
      from.splice(from.indexOf(drag.stopId), 1)
      to.splice(Math.min(dropAt.index, to.length), 0, drag.stopId)
      persistArrange([
        { zoneId: drag.fromZoneId, orderedIds: from },
        { zoneId: toZone.id, orderedIds: to },
      ])
    }
    setDrag(null); setDropAt(null)
  }

  // "Move to…" tap fallback — appends the stop at the end of the chosen zone.
  // An unassigned (orphan) stop has no source zone to send — membership comes
  // entirely from the target zone's list.
  function moveToZone(stop, toZone) {
    setMoveMenuFor(null)
    const payload = []
    if (stop.zoneId) {
      payload.push({ zoneId: stop.zoneId, orderedIds: stopsOf(stop.zoneId).map(s => s.id).filter(id => id !== stop.id) })
    }
    payload.push({ zoneId: toZone.id, orderedIds: [...stopsOf(toZone.id).map(s => s.id), stop.id] })
    persistArrange(payload)
  }

  async function addZone(side) {
    const existing = (zones || []).filter(z => z.side === side)
    const label = side === 'mainland' ? 'Mainland' : 'Island'
    const name = window.prompt(`Name for the new ${label} category:`, `${label} ${existing.length + 1}`)
    if (!name || !name.trim()) return
    try {
      await api.post('/admin/zones', { side, name: name.trim() })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not create category.')
    }
  }

  async function renameZone(zone) {
    const name = window.prompt('Rename category:', zone.name)
    if (!name || !name.trim() || name.trim() === zone.name) return
    try {
      await api.patch(`/admin/zones/${zone.id}`, { name: name.trim() })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not rename category.')
    }
  }

  async function deleteZone(zone) {
    if (!window.confirm(`Delete "${zone.name}"? (Only possible while it has no stops.)`)) return
    try {
      await api.delete(`/admin/zones/${zone.id}`)
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not delete category.')
    }
  }

  const loaded = zones && stops
  const sides = [['mainland', 'Mainland'], ['island', 'Island']]
  // Safety net: stops whose zone vanished still need to be visible/draggable
  const orphans = side => (stops || []).filter(s => s.group === side && !(zones || []).some(z => z.id === s.zoneId))

  return (
    <AdminLayout title="Stops">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>The catalog of named locations riders and drivers can select, organised into categories.</p>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, background:NEON, border:'none',
            color:OLIVE, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          <Plus size={15}/> Add Stop
        </button>
      </div>
      <p style={{ color:MUTED, fontSize:12, marginBottom:20 }}>
        Drag stops between categories (or use the arrows / move button). Within a category, the order is the geography
        drivers move through when no rider is at the current stop. A stop only becomes bookable once a route using it is priced in "Pricing".
      </p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {!loaded ? (
        <p style={{ color:MUTED }}>Loading…</p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:16, alignItems:'start' }} className="admin-stops-grid">
          {sides.map(([side, label]) => (
            <div key={side} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ fontWeight:800, fontSize:15, color:TEXT }}>
                {label} ({(stops || []).filter(s => s.group === side).length})
              </p>

              {zones.filter(z => z.side === side).map(zone => {
                const list = stopsOf(zone.id)
                const isTarget = drag && drag.side === side
                return (
                  <div key={zone.id}
                    onDragOver={e => { if (isTarget) { e.preventDefault(); if (dropAt?.zoneId !== zone.id || dropAt.index !== list.length) setDropAt({ zoneId: zone.id, index: list.length }) } }}
                    onDrop={e => { e.preventDefault(); handleDrop(zone) }}
                    style={{ background:CARD, border:`1.5px ${isTarget && dropAt?.zoneId === zone.id ? `dashed ${OLIVE}` : `solid ${BORDER}`}`, borderRadius:14, overflow:'hidden' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px 12px 18px', borderBottom:`1px solid ${BORDER}`, background:BG }}>
                      <p style={{ fontWeight:800, fontSize:13.5, color:TEXT, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {zone.name} <span style={{ fontWeight:600, color:MUTED }}>({list.length})</span>
                      </p>
                      <button onClick={() => renameZone(zone)} title="Rename category"
                        style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:4, lineHeight:0 }}>
                        <Pencil size={13}/>
                      </button>
                      {list.length === 0 && (
                        <button onClick={() => deleteZone(zone)} title="Delete empty category"
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:4, lineHeight:0 }}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>

                    {list.length === 0 && (
                      <p style={{ padding:'14px 18px', fontSize:12, color:MUTED }}>No stops yet — drag one here.</p>
                    )}

                    {list.map((s, i) => (
                      <div key={s.id} draggable={!busy}
                        onDragStart={() => setDrag({ stopId: s.id, fromZoneId: zone.id, side })}
                        onDragEnd={() => { setDrag(null); setDropAt(null) }}
                        onDragOver={e => { if (isTarget) { e.preventDefault(); e.stopPropagation(); setDropAt({ zoneId: zone.id, index: i }) } }}
                        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, padding:'10px 12px 10px 10px',
                          borderBottom:'1px solid #f5f5f5', cursor:'grab', opacity: drag?.stopId === s.id ? 0.4 : 1,
                          borderTop: (isTarget && dropAt?.zoneId === zone.id && dropAt.index === i) ? `2px solid ${OLIVE}` : '2px solid transparent' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
                          <GripVertical size={14} color="#d1d5db" style={{ flexShrink:0 }}/>
                          <div style={{ display:'flex', flexDirection:'column' }}>
                            <button onClick={() => nudge(zone, i, -1)} disabled={i === 0 || busy}
                              aria-label="Move up" style={{ background:'none', border:'none', cursor:(i===0||busy)?'default':'pointer', color:i===0?'#e5e7eb':MUTED, padding:0, lineHeight:0 }}>
                              <ChevronUp size={15}/>
                            </button>
                            <button onClick={() => nudge(zone, i, 1)} disabled={i === list.length-1 || busy}
                              aria-label="Move down" style={{ background:'none', border:'none', cursor:(i===list.length-1||busy)?'default':'pointer', color:i===list.length-1?'#e5e7eb':MUTED, padding:0, lineHeight:0 }}>
                              <ChevronDown size={15}/>
                            </button>
                          </div>
                          <div style={{ minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:600, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</p>
                            <p style={{ fontSize:11, color:MUTED }}>#{i + 1}{!s.isActive && ' · Inactive'}</p>
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0, position:'relative' }}>
                          <button onClick={() => setMoveMenuFor(moveMenuFor === s.id ? null : s.id)} title="Move to another category"
                            style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:4, lineHeight:0 }}>
                            <FolderInput size={14}/>
                          </button>
                          {moveMenuFor === s.id && (
                            <div style={{ position:'absolute', right:0, top:'100%', zIndex:20, background:CARD, border:`1px solid ${BORDER}`,
                              borderRadius:10, boxShadow:'0 8px 20px rgba(0,0,0,0.12)', minWidth:150, overflow:'hidden' }}>
                              <p style={{ fontSize:11, fontWeight:700, color:MUTED, padding:'8px 12px 4px' }}>Move to…</p>
                              {zones.filter(z => z.side === side && z.id !== zone.id).map(z => (
                                <button key={z.id} onClick={() => moveToZone(s, z)}
                                  style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', background:'none', border:'none',
                                    cursor:'pointer', fontSize:13, color:TEXT, fontFamily:'inherit' }}>
                                  {z.name}
                                </button>
                              ))}
                              {zones.filter(z => z.side === side && z.id !== zone.id).length === 0 && (
                                <p style={{ fontSize:12, color:MUTED, padding:'8px 12px' }}>No other category yet.</p>
                              )}
                            </div>
                          )}
                          <button onClick={() => toggleActive(s)}
                            style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer',
                              color: s.isActive ? '#ef4444' : '#15803d', fontWeight:600, fontSize:11, fontFamily:'inherit' }}>
                            {s.isActive ? <><Ban size={12}/> Deactivate</> : <><CheckCircle2 size={12}/> Activate</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}

              {orphans(side).length > 0 && (
                <div style={{ background:CARD, border:`1.5px dashed #f59e0b`, borderRadius:14, overflow:'hidden' }}>
                  <p style={{ fontWeight:800, fontSize:13.5, color:'#b45309', padding:'12px 18px', borderBottom:`1px solid ${BORDER}`, background:'#fffbeb' }}>
                    Unassigned ({orphans(side).length}) — use "Move to…" to file these
                  </p>
                  {orphans(side).map(s => (
                    <div key={s.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, padding:'10px 14px 10px 18px', borderBottom:'1px solid #f5f5f5', position:'relative' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{s.name}{!s.isActive && <span style={{ color:MUTED, fontWeight:400 }}> · Inactive</span>}</p>
                      <button onClick={() => setMoveMenuFor(moveMenuFor === s.id ? null : s.id)}
                        style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', color:OLIVE, fontWeight:600, fontSize:11, fontFamily:'inherit' }}>
                        <FolderInput size={13}/> Move to…
                      </button>
                      {moveMenuFor === s.id && (
                        <div style={{ position:'absolute', right:10, top:'100%', zIndex:20, background:CARD, border:`1px solid ${BORDER}`,
                          borderRadius:10, boxShadow:'0 8px 20px rgba(0,0,0,0.12)', minWidth:150, overflow:'hidden' }}>
                          {zones.filter(z => z.side === side).map(z => (
                            <button key={z.id} onClick={() => moveToZone(s, z)}
                              style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', background:'none', border:'none',
                                cursor:'pointer', fontSize:13, color:TEXT, fontFamily:'inherit' }}>
                              {z.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => addZone(side)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px', borderRadius:12,
                  background:'none', border:`1.5px dashed ${BORDER}`, color:MUTED, fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'inherit' }}>
                <Plus size={14}/> Add {label} category
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddStopModal zones={zones || []} onClose={() => setShowAdd(false)} onCreated={load}/>}

      <style>{`@media (max-width:860px){ .admin-stops-grid{ grid-template-columns:1fr !important; } }`}</style>
    </AdminLayout>
  )
}

function AddStopModal({ zones, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [zoneId, setZoneId] = useState(zones.find(z => z.side === 'mainland')?.id || zones[0]?.id || '')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await api.post('/admin/stops', { name, zoneId, lat: lat || undefined, lng: lng || undefined })
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

          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Category</label>
          <select value={zoneId} onChange={e => setZoneId(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}>
            <optgroup label="Mainland">
              {zones.filter(z => z.side === 'mainland').map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </optgroup>
            <optgroup label="Island">
              {zones.filter(z => z.side === 'island').map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </optgroup>
          </select>
          <p style={{ fontSize:11.5, color:MUTED, marginTop:-8, marginBottom:14 }}>The stop is added at the end of the category — drag it into position afterwards.</p>

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

          <button type="submit" disabled={busy || !zoneId}
            style={{ width:'100%', padding:'11px', borderRadius:10, background:NEON, color:OLIVE, border:'none', fontWeight:700, fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
            {busy ? 'Creating…' : 'Create Stop'}
          </button>
        </form>
      </div>
    </div>
  )
}
