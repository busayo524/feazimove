import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { Search, Eye, AlertCircle } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'

export default function AdminRiders() {
  const [riders, setRiders] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load(q) {
    api.get(`/admin/riders${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(res => setRiders(res.data.riders))
      .catch(err => setError(err.data?.message || 'Could not load riders.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load('') }, [])

  function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    load(search)
  }

  return (
    <AdminLayout title="Riders">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>{riders.length} rider{riders.length !== 1 ? 's' : ''} registered</p>
        <form onSubmit={handleSearch} style={{ display:'flex', gap:8 }}>
          <div style={{ position:'relative' }}>
            <Search size={15} color={MUTED} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone…"
              style={{ padding:'9px 14px 9px 34px', borderRadius:10, border:`1px solid ${BORDER}`, fontSize:13, width:240, fontFamily:'inherit', outline:'none', background:CARD, color:TEXT }}/>
          </div>
        </form>
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
              {['Rider','Trips','Wallet','Rating','Status','Last Ride',''].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:12, color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:30, textAlign:'center', color:MUTED }}>Loading…</td></tr>
            ) : riders.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:30, textAlign:'center', color:MUTED }}>No riders found.</td></tr>
            ) : riders.map(r => (
              <tr key={r.id} style={{ borderTop:`1px solid ${BORDER}` }}>
                <td style={{ padding:'12px 16px' }}>
                  <p style={{ fontWeight:700, color:TEXT }}>{r.name}</p>
                  <p style={{ fontSize:12, color:MUTED }}>{r.email || r.phone}</p>
                </td>
                <td style={{ padding:'12px 16px', color:TEXT }}>{r.tripCount}</td>
                <td style={{ padding:'12px 16px', color:TEXT }}>₦{r.walletBalance.toLocaleString()}</td>
                <td style={{ padding:'12px 16px', color:TEXT }}>{r.rating ? `⭐ ${r.rating}` : '—'}</td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                    background: r.isActive ? '#dcfce7' : '#fef2f2', color: r.isActive ? '#15803d' : '#ef4444' }}>
                    {r.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td style={{ padding:'12px 16px', color:MUTED, fontSize:13 }}>
                  {r.lastRide ? new Date(r.lastRide).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding:'12px 16px', textAlign:'right' }}>
                  <Link to={`/admin/riders/${r.id}`} style={{ color:MUTED }} aria-label="View rider"><Eye size={16}/></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </AdminLayout>
  )
}
