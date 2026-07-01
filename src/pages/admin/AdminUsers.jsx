import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { Search, Eye, Star, ChevronDown, AlertCircle } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const GREEN = '#2a6048', NEON = '#ccff00', OLIVE = '#243800'

const STATUS_MAP = {
  pending:  { label: 'Pending',  bg: '#fef9c3', fg: '#854d0e' },
  approved: { label: 'Approved', bg: '#dcfce7', fg: '#15803d' },
  rejected: { label: 'Rejected', bg: '#fef2f2', fg: '#dc2626' },
}

function userStatus(u) {
  if (u.isPending) return 'pending'
  if (u.isActive)  return 'approved'
  return 'rejected'
}

function accountType(u) {
  if (u.role === 'admin')  return 'Admin'
  if (u.role === 'driver') return 'Driver'
  return 'Rider'
}

function memberId(id) {
  const seg = id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `USR-${seg.slice(0,2)}-${seg.slice(2,6)}`
}

function StarRating({ value }) {
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13}
          color={i <= Math.round(value || 0) ? '#f59e0b' : '#d1d5db'}
          fill={i <= Math.round(value || 0) ? '#f59e0b' : 'none'}/>
      ))}
    </div>
  )
}

function Avatar({ name, userId, hasAvatar }) {
  const [src, setSrc] = React.useState(null)
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'U'

  React.useEffect(() => {
    if (!hasAvatar) return
    let url
    let cancelled = false
    api.getBlob(`/admin/avatar/${userId}`)
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {})
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [userId, hasAvatar])

  return (
    <div style={{ width:36, height:36, borderRadius:'50%', background:GREEN, color:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
      fontWeight:700, fontSize:13, flexShrink:0 }}>
      {src
        ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : initials}
    </div>
  )
}

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected']
const ROLES   = ['All Roles', 'Riders', 'Drivers', 'Admins']

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('All')
  const [role,    setRole]    = useState('All Roles')
  const [roleOpen,setRoleOpen]= useState(false)

  useEffect(() => {
    api.get('/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(err => setError(err.data?.message || 'Could not load users.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return users.filter(u => {
      const st  = userStatus(u)
      const ac  = accountType(u)
      const q   = search.toLowerCase()

      if (filter !== 'All' && st !== filter.toLowerCase()) return false
      if (role === 'Riders'  && u.role !== 'rider')         return false
      if (role === 'Drivers' && u.role !== 'driver')        return false
      if (role === 'Admins'  && u.role !== 'admin')         return false
      if (q && !u.name?.toLowerCase().includes(q) &&
               !(u.email || '').toLowerCase().includes(q) &&
               !(u.phone || '').includes(q))                return false
      return true
    })
  }, [users, search, filter, role])

  return (
    <AdminLayout title="Users">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontWeight:800, fontSize:22, color:TEXT }}>Users</h2>
          <p style={{ margin:'4px 0 0', color:MUTED, fontSize:14 }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        </div>
      </div>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:'1 1 200px', minWidth:180 }}>
          <Search size={15} color={MUTED} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:8, border:`1.5px solid ${BORDER}`,
              fontSize:14, fontFamily:'inherit', background:CARD, color:TEXT, boxSizing:'border-box', outline:'none' }}/>
        </div>

        {/* Status tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'7px 16px', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer', border:'none',
                background: filter === f ? GREEN : BG,
                color: filter === f ? '#fff' : MUTED,
                transition:'all 0.15s', fontFamily:'inherit' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Role dropdown */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setRoleOpen(o => !o)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:8,
              border:`1.5px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:600, fontSize:13,
              cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            {role} <ChevronDown size={14} color={MUTED}/>
          </button>
          {roleOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:CARD,
              border:`1px solid ${BORDER}`, borderRadius:10, boxShadow:'0 4px 16px rgba(0,0,0,0.10)',
              zIndex:20, minWidth:140, overflow:'hidden' }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => { setRole(r); setRoleOpen(false) }}
                  style={{ display:'block', width:'100%', padding:'10px 16px', textAlign:'left',
                    background: role === r ? BG : CARD, color: role === r ? GREEN : TEXT,
                    fontWeight: role === r ? 700 : 400, fontSize:14, border:'none',
                    cursor:'pointer', fontFamily:'inherit' }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr style={{ background:BG, textAlign:'left' }}>
                {['User','Account Type','Trips','Status','Rating','Member ID',''].map(h => (
                  <th key={h} style={{ padding:'12px 16px', fontSize:11, color:MUTED, fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:MUTED }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:MUTED }}>No users found.</td></tr>
              ) : filtered.map(u => {
                const st  = userStatus(u)
                const s   = STATUS_MAP[st]
                const mid = memberId(u.id)
                return (
                  <tr key={u.id} style={{ borderTop:`1px solid ${BORDER}` }}>
                    {/* User */}
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Avatar name={u.name} userId={u.id} hasAvatar={u.hasAvatar}/>
                        <div>
                          <p style={{ fontWeight:700, color:TEXT, margin:0 }}>{u.name}</p>
                          <p style={{ fontSize:12, color:MUTED, margin:0 }}>{u.email || u.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Account Type */}
                    <td style={{ padding:'12px 16px', color:TEXT, fontSize:13 }}>{accountType(u)}</td>

                    {/* Trips */}
                    <td style={{ padding:'12px 16px', color:MUTED, fontSize:13 }}>{u.tripCount}</td>

                    {/* Status */}
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
                        background:s.bg, color:s.fg, border:`1px solid ${s.fg}33` }}>
                        {s.label}
                      </span>
                    </td>

                    {/* Rating */}
                    <td style={{ padding:'12px 16px' }}>
                      <StarRating value={u.rating}/>
                    </td>

                    {/* Member ID */}
                    <td style={{ padding:'12px 16px', color:MUTED, fontSize:12, fontFamily:'monospace', whiteSpace:'nowrap' }}>
                      {mid}
                    </td>

                    {/* Eye */}
                    <td style={{ padding:'12px 16px', textAlign:'right' }}>
                      <button onClick={() => navigate(`/admin/users/${u.id}`)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:4,
                          display:'inline-flex', alignItems:'center', borderRadius:6, transition:'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = GREEN}
                        onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                        <Eye size={17}/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
