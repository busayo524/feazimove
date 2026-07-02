import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Plus, X, Check } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

function fmt(kobo) { return `₦${Math.round(kobo / 100).toLocaleString()}` }

function FareCell({ route, field, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(Math.round(route[field] / 100))
  const [saving, setSaving] = useState(false)

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
        style={{ background:'none', border:'none', padding:'4px 8px', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:13, color:TEXT, fontFamily:'inherit' }}
        onMouseEnter={e => e.currentTarget.style.background = BG}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
        {fmt(route[field])}
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
              {['Route','Pool Fare','Package Fare','Last Updated','Status',''].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:12, color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!routes ? (
              <tr><td colSpan={6} style={{ padding:30, textAlign:'center', color:MUTED }}>Loading…</td></tr>
            ) : routes.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:30, textAlign:'center', color:MUTED }}>No routes for this period yet.</td></tr>
            ) : routes.map(r => (
              <tr key={r.id} style={{ borderTop:`1px solid ${BORDER}`, opacity: r.isActive ? 1 : 0.5 }}>
                <td style={{ padding:'12px 16px', fontWeight:600, color:TEXT }}>{r.pickup} → {r.dropoff}</td>
                <td style={{ padding:'8px 16px' }}><FareCell route={r} field="poolFareKobo" onSave={handleSave}/></td>
                <td style={{ padding:'8px 16px' }}><FareCell route={r} field="packageFareKobo" onSave={handleSave}/></td>
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

function NewStopFields({ name, onName, group, onGroup, label }) {
  return (
    <div style={{ display:'flex', gap:8, marginBottom:14 }}>
      <input value={name} onChange={e => onName(e.target.value)} required placeholder={`New ${label} name`}
        style={{ flex:2, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>
      <select value={group} onChange={e => onGroup(e.target.value)}
        style={{ flex:1, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}>
        <option value="mainland">Mainland</option>
        <option value="island">Island</option>
      </select>
    </div>
  )
}

function AddRouteModal({ period, onClose, onCreated }) {
  const [stops, setStops] = useState([])
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [newPickupName, setNewPickupName] = useState('')
  const [newPickupGroup, setNewPickupGroup] = useState('mainland')
  const [newDropoffName, setNewDropoffName] = useState('')
  const [newDropoffGroup, setNewDropoffGroup] = useState('mainland')
  const [poolFareKobo, setPoolFareKobo] = useState('')
  const [packageFareKobo, setPackageFareKobo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/stops').then(res => setStops(res.data.stops.filter(s => s.isActive))).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      // chain_position is unique per group, so track counts locally in case
      // both pickup and dropoff are new stops in the same group this submit.
      const groupCounts = { mainland: stops.filter(s => s.group === 'mainland').length, island: stops.filter(s => s.group === 'island').length }
      async function resolveStop(value, name, group) {
        if (value !== NEW_STOP) return value
        await api.post('/admin/stops', { name: name.trim(), group, chainPosition: groupCounts[group] })
        groupCounts[group] += 1
        return name.trim()
      }
      const finalPickup = await resolveStop(pickup, newPickupName, newPickupGroup)
      const finalDropoff = await resolveStop(dropoff, newDropoffName, newDropoffGroup)
      await api.post('/admin/routes-pricing', {
        period, pickup: finalPickup, dropoff: finalDropoff,
        poolFareKobo: parseInt(poolFareKobo, 10) * 100,
        packageFareKobo: parseInt(packageFareKobo, 10) * 100,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.data?.message || 'Could not create route.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, maxWidth:380, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>Add Route ({period})</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:MUTED }}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Pickup</label>
          <select value={pickup} onChange={e => setPickup(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}>
            <option value="">Select…</option>
            {stops.map(s => <option key={s.id} value={s.name}>{s.name} ({s.group})</option>)}
            <option value={NEW_STOP}>+ Add new location…</option>
          </select>
          {pickup === NEW_STOP && (
            <NewStopFields label="pickup" name={newPickupName} onName={setNewPickupName} group={newPickupGroup} onGroup={setNewPickupGroup}/>
          )}

          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Dropoff</label>
          <select value={dropoff} onChange={e => setDropoff(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}>
            <option value="">Select…</option>
            {stops.map(s => <option key={s.id} value={s.name}>{s.name} ({s.group})</option>)}
            <option value={NEW_STOP}>+ Add new location…</option>
          </select>
          {dropoff === NEW_STOP && (
            <NewStopFields label="dropoff" name={newDropoffName} onName={setNewDropoffName} group={newDropoffGroup} onGroup={setNewDropoffGroup}/>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10, marginBottom:14 }}>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Pool Fare (₦)</label>
              <input type="number" min="0" value={poolFareKobo} onChange={e => setPoolFareKobo(e.target.value)} required
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Package Fare (₦)</label>
              <input type="number" min="0" value={packageFareKobo} onChange={e => setPackageFareKobo(e.target.value)} required
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>
            </div>
          </div>

          {error && <p style={{ fontSize:13, color:'#ef4444', marginBottom:12 }}>{error}</p>}

          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:'11px', borderRadius:10, background:NEON, color:OLIVE, border:'none', fontWeight:700, fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
            {busy ? 'Creating…' : 'Create Route'}
          </button>
        </form>
      </div>
    </div>
  )
}
