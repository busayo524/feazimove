import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Plus, X, Check } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

function fmt(kobo) { return `₦${Math.round(kobo / 100).toLocaleString()}` }

function FareCell({ route, field, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(route[field] != null ? Math.round(route[field] / 100) : '')
  const [saving, setSaving] = useState(false)
  const unpriced = route[field] == null

  async function save() {
    const kobo = parseInt(value, 10) * 100
    if (!kobo || kobo === route[field]) { setEditing(false); return }
    setSaving(true)
    await onSave(route.id, { [field]: kobo })
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        style={{ background:unpriced?'#fef3c7':'none', border:unpriced?'1px dashed #d97706':'none', padding:'4px 8px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13, color:unpriced?'#b45309':TEXT, fontFamily:'inherit' }}
        onMouseEnter={e => { if(!unpriced) e.currentTarget.style.background = BG }}
        onMouseLeave={e => { if(!unpriced) e.currentTarget.style.background = 'none' }}>
        {unpriced ? 'Set price' : fmt(route[field])}
      </button>
    )
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <span style={{ fontSize:12, color:MUTED }}>₦</span>
      <input autoFocus type="number" min="0" value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width:70, padding:'4px 6px', borderRadius:6, border:`1.5px solid ${OLIVE}`, fontSize:13, fontFamily:'inherit', background:CARD, color:TEXT }}/>
      <button onClick={save} disabled={saving} aria-label="Save" style={{ background:'none', border:'none', cursor:'pointer', color:'#15803d' }}>
        <Check size={14}/>
      </button>
    </div>
  )
}

function PlatformFeeControl() {
  const [feePercent, setFeePercent] = useState(null)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/platform-fee')
      .then(res => { setFeePercent(res.data.feePercent); setValue(String(res.data.feePercent)) })
      .catch(() => setError('Could not load fee.'))
  }, [])

  async function save() {
    const num = parseFloat(value)
    if (Number.isNaN(num) || num < 0 || num > 100 || num === feePercent) return
    setSaving(true); setError(''); setSaved(false)
    try {
      await api.patch('/admin/platform-fee', { feePercent: num })
      setFeePercent(num)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.data?.message || 'Could not update fee.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
      <span style={{ fontSize:12, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.04em' }}>Platform Fee</span>
      <div style={{ display:'flex', alignItems:'center', gap:4, background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'6px 10px' }}>
        <input type="number" min="0" max="100" step="0.5" value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save() }}
          style={{ width:48, border:'none', outline:'none', fontSize:14, fontWeight:700, color:TEXT, fontFamily:'inherit', background:'transparent' }}/>
        <span style={{ fontSize:13, color:MUTED }}>%</span>
      </div>
      <button onClick={save} disabled={saving || feePercent === null}
        style={{ padding:'8px 14px', borderRadius:10, background:NEON, border:'none', color:OLIVE, fontWeight:700, fontSize:13, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', opacity:saving?0.7:1 }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {saved && <Check size={16} color="#15803d"/>}
      {error && <span style={{ fontSize:12, color:'#ef4444' }}>{error}</span>}
    </div>
  )
}

export default function AdminPricing() {
  const [period, setPeriod] = useState('morning')
  const [routes, setRoutes] = useState(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function load() {
    api.get(`/admin/routes-pricing?period=${period}`)
      .then(res => setRoutes(res.data.routes))
      .catch(err => setError(err.data?.message || 'Could not load routes.'))
  }
  useEffect(() => { load() }, [period])

  async function handleSave(id, patch) {
    try {
      await api.patch(`/admin/routes-pricing/${id}`, patch)
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not update price.')
    }
  }

  async function toggleActive(route) {
    try {
      await api.patch(`/admin/routes-pricing/${route.id}`, { isActive: !route.isActive })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not update route.')
    }
  }

  return (
    <AdminLayout title="Pricing">
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <PlatformFeeControl/>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>Click a fare to edit it. Changes apply to new bookings only — fares already quoted to a rider are locked in.</p>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, background:NEON, border:'none',
            color:OLIVE, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
          <Plus size={15}/> Add Route
        </button>
      </div>

      <div style={{ display:'flex', gap:6, background:CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {['morning', 'evening'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding:'7px 18px', borderRadius:8, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize',
              background: period===p ? NEON : 'transparent', color: period===p ? OLIVE : MUTED }}>
            {p}
          </button>
        ))}
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
              {['Route','FeaziRide Fare','Last Updated','Status',''].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:12, color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!routes ? (
              <tr><td colSpan={5} style={{ padding:30, textAlign:'center', color:MUTED }}>Loading…</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:30, textAlign:'center', color:MUTED }}>No routes for this period yet.</td></tr>
            ) : routes.map(r => (
              <tr key={r.id} style={{ borderTop:`1px solid ${BORDER}`, opacity: r.isActive ? 1 : 0.5 }}>
                <td style={{ padding:'12px 16px', fontWeight:600, color:TEXT }}>{r.pickup} → {r.dropoff}</td>
                <td style={{ padding:'8px 16px' }}><FareCell route={r} field="poolFareKobo" onSave={handleSave}/></td>
                <td style={{ padding:'12px 16px', color:MUTED, fontSize:12 }}>
                  {r.updatedAt ? `${r.updatedByName || 'Admin'} · ${new Date(r.updatedAt).toLocaleDateString()}` : '—'}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                    background: r.isActive ? '#dcfce7' : '#f3f4f6', color: r.isActive ? '#15803d' : MUTED }}>
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding:'12px 16px', textAlign:'right' }}>
                  <button onClick={() => toggleActive(r)}
                    style={{ background:'none', border:'none', cursor:'pointer', color: r.isActive ? '#ef4444' : '#15803d', fontWeight:600, fontSize:12, fontFamily:'inherit' }}>
                    {r.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showAdd && <AddRouteModal period={period} onClose={() => setShowAdd(false)} onCreated={load}/>}
    </AdminLayout>
  )
}

const NEW_STOP = '__new__'

function AddRouteModal({ period, onClose, onCreated }) {
  const [stops, setStops] = useState([])
  const [pickup, setPickup] = useState('')          // existing stop name or NEW_STOP
  const [dropoff, setDropoff] = useState('')
  const [newPickupName, setNewPickupName] = useState('')
  const [newPickupGroup, setNewPickupGroup] = useState('mainland')
  const [selectedDropoffs, setSelectedDropoffs] = useState([]) // fan-out: stop names
  const [newDropoffName, setNewDropoffName] = useState('')      // fan-out: hand-typed new destination
  const [newDropoffChecked, setNewDropoffChecked] = useState(false)
  const [poolFareKobo, setPoolFareKobo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/stops').then(res => setStops(res.data.stops.filter(s => s.isActive))).catch(() => {})
  }, [])

  const isFanOut = pickup === NEW_STOP
  // Opposite side of the new pickup: mainland pickup → island dropoffs, etc.
  const oppositeGroup = newPickupGroup === 'mainland' ? 'island' : 'mainland'
  const oppositeStops = stops.filter(s => s.group === oppositeGroup)
  const allSelected = oppositeStops.length > 0 && selectedDropoffs.length === oppositeStops.length

  function toggleDropoff(name) {
    setSelectedDropoffs(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      if (isFanOut) {
        if (!newPickupName.trim()) throw { data: { message: 'Enter the new pickup name.' } }
        // Existing ticked stops + a hand-typed new destination (if ticked & named)
        const dropoffNames = [...selectedDropoffs]
        if (newDropoffChecked && newDropoffName.trim() && !dropoffNames.includes(newDropoffName.trim())) {
          dropoffNames.push(newDropoffName.trim())
        }
        if (!dropoffNames.length) throw { data: { message: 'Select or add at least one destination.' } }
        const res = await api.post('/admin/routes-bulk', {
          pickupName: newPickupName.trim(), pickupGroup: newPickupGroup, dropoffNames,
        })
        if (res.data.created === 0) throw { data: { message: 'Those routes already exist.' } }
      } else {
        // Single route between two existing stops — pricing optional.
        await api.post('/admin/routes-pricing', {
          period, pickup, dropoff,
          poolFareKobo: poolFareKobo ? parseInt(poolFareKobo, 10) * 100 : null,
          packageFareKobo: null,
        })
      }
      onCreated(); onClose()
    } catch (err) {
      setError(err.data?.message || 'Could not create route.')
    } finally { setBusy(false) }
  }

  const fld = { width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, maxWidth:400, width:'100%', maxHeight:'88vh', overflowY:'auto', boxShadow:'0 12px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>Add Route</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:MUTED }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Pickup</label>
          <select value={pickup} onChange={e => { setPickup(e.target.value); setDropoff(''); setSelectedDropoffs([]) }} required
            style={{ ...fld, marginBottom:14 }}>
            <option value="">Select…</option>
            {stops.map(s => <option key={s.id} value={s.name}>{s.name} ({s.group})</option>)}
            <option value={NEW_STOP}>+ Add new location…</option>
          </select>

          {isFanOut ? (
            <>
              {/* New pickup name + which side of the lagoon it's on */}
              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                <input value={newPickupName} onChange={e => setNewPickupName(e.target.value)} placeholder="New pickup name"
                  style={{ ...fld, flex:2 }}/>
                <select value={newPickupGroup} onChange={e => { setNewPickupGroup(e.target.value); setSelectedDropoffs([]); setNewDropoffName(''); setNewDropoffChecked(false) }}
                  style={{ ...fld, flex:1 }}>
                  <option value="mainland">Mainland</option>
                  <option value="island">Island</option>
                </select>
              </div>

              {/* Fan-out: match this new pickup to any/all opposite-side stops */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <label style={{ fontSize:13, fontWeight:600, color:TEXT }}>
                  Route to {oppositeGroup} stops
                </label>
                <button type="button" onClick={() => setSelectedDropoffs(allSelected ? [] : oppositeStops.map(s => s.name))}
                  style={{ background:'none', border:'none', color:OLIVE, fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'inherit' }}>
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div style={{ border:`1.5px solid ${BORDER}`, borderRadius:10, maxHeight:240, overflowY:'auto', marginBottom:8 }}>
                {oppositeStops.map(s => (
                  <label key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderBottom:`1px solid ${BG}`, cursor:'pointer', fontSize:14, color:TEXT }}>
                    <input type="checkbox" checked={selectedDropoffs.includes(s.name)} onChange={() => toggleDropoff(s.name)}
                      style={{ width:16, height:16, accentColor:OLIVE }}/>
                    {s.name}
                  </label>
                ))}
                {/* Hand-code a brand-new destination — its checkbox includes it in the fan-out */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#fafcf5' }}>
                  <input type="checkbox" checked={newDropoffChecked} onChange={e => setNewDropoffChecked(e.target.checked)}
                    style={{ width:16, height:16, accentColor:OLIVE, flexShrink:0 }}/>
                  <input value={newDropoffName}
                    onChange={e => { setNewDropoffName(e.target.value); if (e.target.value.trim()) setNewDropoffChecked(true) }}
                    placeholder={`+ New ${oppositeGroup} location`}
                    style={{ flex:1, padding:'6px 10px', borderRadius:8, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>
                </div>
              </div>
              {(() => {
                const count = selectedDropoffs.length + (newDropoffChecked && newDropoffName.trim() ? 1 : 0)
                return (
                  <p style={{ fontSize:12, color:MUTED, marginBottom:14, lineHeight:1.5 }}>
                    Creates {count || 'the selected'} route{count === 1 ? '' : 's'} unpriced — set each fare afterwards on this page.
                  </p>
                )
              })()}
            </>
          ) : (
            <>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Dropoff</label>
              <select value={dropoff} onChange={e => setDropoff(e.target.value)} required style={{ ...fld, marginBottom:14 }}>
                <option value="">Select…</option>
                {stops.map(s => <option key={s.id} value={s.name}>{s.name} ({s.group})</option>)}
              </select>

              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>FeaziRide Fare (₦)</label>
              <input type="number" min="0" value={poolFareKobo} onChange={e => setPoolFareKobo(e.target.value)} placeholder="Optional" style={{ ...fld, marginBottom:6 }}/>
              <p style={{ fontSize:12, color:MUTED, marginBottom:14, lineHeight:1.5 }}>
                Leave the fare blank to create the route unpriced — it stays hidden from riders until you set a fare.
              </p>
            </>
          )}

          {error && <p style={{ fontSize:13, color:'#ef4444', marginBottom:12 }}>{error}</p>}

          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:'11px', borderRadius:10, background:NEON, color:OLIVE, border:'none', fontWeight:700, fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
            {busy ? 'Creating…' : isFanOut ? (() => { const n = selectedDropoffs.length + (newDropoffChecked && newDropoffName.trim() ? 1 : 0); return `Create ${n || ''} Route${n === 1 ? '' : 's'}` })() : 'Create Route'}
          </button>
        </form>
      </div>
    </div>
  )
}
