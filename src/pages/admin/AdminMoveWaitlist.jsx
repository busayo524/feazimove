import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, PackageOpen, Users, Sparkles, Download, Search, Mail, Phone } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280'
const NEON = '#ccff00'

function fmtDate(d) {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatTile({ icon, label, value, accent }) {
  return (
    <div style={{ flex:1, minWidth:180, background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:42, height:42, borderRadius:12, background:accent ? NEON : '#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize:24, fontWeight:800, color:TEXT, lineHeight:1.1 }}>{value}</p>
        <p style={{ fontSize:12, color:MUTED, fontWeight:600 }}>{label}</p>
      </div>
    </div>
  )
}

export default function AdminMoveWaitlist() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  function load() {
    api.get('/admin/move-waitlist')
      .then(res => setData(res.data))
      .catch(err => setError(err.data?.message || 'Could not load the waitlist.'))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return data.entries
    return data.entries.filter(e =>
      [e.name, e.email, e.phone, e.city, e.area].some(v => v && v.toLowerCase().includes(needle))
    )
  }, [data, q])

  function exportCsv() {
    const rows = [
      ['Name', 'Email', 'Phone', 'City', 'Area', 'Also a Driver', 'Joined At'],
      ...filtered.map(e => [e.name, e.email || '', e.phone || '', e.city || '', e.area || '', e.isDriver ? 'Yes' : 'No', fmtDate(e.joinedAt)]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'move-waitlist.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <AdminLayout title="Move Waitlist">
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      </AdminLayout>
    )
  }
  if (!data) return <AdminLayout title="Move Waitlist"><p style={{ color:MUTED }}>Loading…</p></AdminLayout>

  return (
    <AdminLayout title="Move Waitlist">
      <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>
        Everyone who tapped <strong>Join the Waitlist</strong> on the "Move an Item" launch page — your day-one customers when the service goes live. Refreshes every 30 seconds.
      </p>

      {/* Stats */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:20 }}>
        <StatTile icon={<Users size={20} color="#1a2400"/>} label="Total on waitlist" value={data.total} accent/>
        <StatTile icon={<Sparkles size={20} color="#6b7280"/>} label="Joined today" value={data.joinedToday}/>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
        <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:380 }}>
          <Search size={14} color={MUTED} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, email, phone, location…"
            style={{ width:'100%', padding:'10px 12px 10px 34px', borderRadius:10, border:`1px solid ${BORDER}`, fontSize:13, outline:'none', background:CARD, color:TEXT, boxSizing:'border-box', fontFamily:'inherit' }}
          />
        </div>
        <button onClick={exportCsv} disabled={filtered.length === 0}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:10,
            background: filtered.length === 0 ? '#f3f4f6' : '#1a2400', color: filtered.length === 0 ? MUTED : NEON,
            border:'none', fontWeight:700, fontSize:13, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
          <Download size={14}/> Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding:'46px 20px', textAlign:'center' }}>
            <PackageOpen size={34} color="#d1d5db" style={{ marginBottom:10 }}/>
            <p style={{ fontSize:14, fontWeight:700, color:TEXT, marginBottom:4 }}>
              {q ? 'No matches for your search.' : 'No one has joined yet.'}
            </p>
            <p style={{ fontSize:13, color:MUTED }}>
              {q ? 'Try a different name, email, or phone number.' : 'Entries appear here the moment a rider taps "Join the Waitlist" on the Move an Item page.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f9fafb', textAlign:'left' }}>
                  {['#','Name','Contact','Location','Also a Driver','Joined'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', fontSize:11, fontWeight:800, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e.id} style={{ borderTop:`1px solid #f3f4f6` }}>
                    <td style={{ padding:'12px 16px', color:MUTED, fontWeight:600 }}>{i + 1}</td>
                    <td style={{ padding:'12px 16px', fontWeight:700, color:TEXT, whiteSpace:'nowrap' }}>{e.name}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {e.email && <p style={{ display:'flex', alignItems:'center', gap:6, color:TEXT, margin:0 }}><Mail size={12} color={MUTED}/>{e.email}</p>}
                      {e.phone && <p style={{ display:'flex', alignItems:'center', gap:6, color:MUTED, margin:'3px 0 0' }}><Phone size={12} color={MUTED}/>{e.phone}</p>}
                      {!e.email && !e.phone && <span style={{ color:MUTED }}>—</span>}
                    </td>
                    <td style={{ padding:'12px 16px', color:MUTED, whiteSpace:'nowrap' }}>
                      {[e.area, e.city].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {e.isDriver
                        ? <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20, background:'#ecfccb', color:'#3f6212' }}>Driver</span>
                        : <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:'#f3f4f6', color:MUTED }}>Rider</span>}
                    </td>
                    <td style={{ padding:'12px 16px', color:MUTED, whiteSpace:'nowrap' }}>{fmtDate(e.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
