import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { Search, Eye, ChevronDown, AlertCircle, UserPlus, CheckCircle2, X } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const GREEN = '#2a6048', NEON = '#ccff00', OLIVE = '#243800'

// Lighter shade of the brand lime — pale wash, olive-green text, hairline ring
const LIME_PILL = { bg:'#f3fbd3', fg:'#3f6212', bd:'#dff0a8' }

const STATUS_MAP = {
  pending:   { label: 'Pending',   bg: '#fef9c3', fg: '#854d0e' },
  approved:  { label: 'Approved',  ...LIME_PILL },
  suspended: { label: 'Suspended', bg: '#fef2f2', fg: '#dc2626' },
}

const ROLE_BADGE = {
  admin:  { ...LIME_PILL },
  driver: { ...LIME_PILL },
  rider:  { ...LIME_PILL },
}

function userStatus(u) {
  if (u.isPending) return 'pending'
  if (u.isActive)  return 'approved'
  return 'suspended'
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
    <div style={{ width:36, height:36, borderRadius:'50%', background:NEON, color:OLIVE,
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
      fontWeight:700, fontSize:13, flexShrink:0 }}>
      {src
        ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : initials}
    </div>
  )
}

const FILTERS = ['All', 'Pending', 'Approved', 'Suspended']
const ROLES   = ['All Roles', 'Riders', 'Drivers', 'Admins']

export default function AdminUserManagement() {
  const navigate = useNavigate()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('All')
  const [role,    setRole]    = useState('All Roles')
  const [roleOpen,setRoleOpen]= useState(false)
  const [showAdd, setShowAdd] = useState(false)

  function load() {
    api.get('/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(err => setError(err.data?.message || 'Could not load users.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function toggleStatus(u) {
    try {
      await api.patch(`/admin/users/${u.id}/status`, { isActive: !u.isActive })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not update status.')
    }
  }

  const filtered = useMemo(() => {
    return users.filter(u => {
      const st = userStatus(u)
      const q  = search.toLowerCase()

      if (filter !== 'All' && st !== filter.toLowerCase()) return false
      if (role === 'Riders'  && u.role !== 'rider')        return false
      if (role === 'Drivers' && u.role !== 'driver')       return false
      if (role === 'Admins'  && u.role !== 'admin')        return false
      if (q && !u.name?.toLowerCase().includes(q) &&
               !(u.email || '').toLowerCase().includes(q) &&
               !(u.phone || '').includes(q))               return false
      return true
    })
  }, [users, search, filter, role])

  return (
    <AdminLayout title="User Management">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <p style={{ margin:0, color:MUTED, fontSize:14 }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, background:NEON, border:'none',
            color:OLIVE, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          <UserPlus size={15}/> Add User
        </button>
      </div>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {showAdd && <AddUserPanel onClose={() => setShowAdd(false)} onCreated={load}/>}

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
                background: filter === f ? NEON : BG,
                color: filter === f ? OLIVE : MUTED,
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
              <tr style={{ background:CARD, textAlign:'left' }}>
                {['User','Role','Joined','Status',''].map(h => (
                  <th key={h} style={{ padding:'12px 16px', fontSize:11, color:MUTED, fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:MUTED }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:MUTED }}>No users found.</td></tr>
              ) : filtered.map(u => {
                const st    = userStatus(u)
                const s     = STATUS_MAP[st]
                const badge = ROLE_BADGE[u.role] || ROLE_BADGE.rider
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

                    {/* Role */}
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:badge.bg, color:badge.fg,
                        border:`1px solid ${badge.bd || badge.fg + '22'}`, textTransform:'capitalize' }}>
                        {u.role}
                      </span>
                    </td>
                    {/* Joined */}
                    <td style={{ padding:'12px 16px', color:MUTED, fontSize:13, whiteSpace:'nowrap' }}>
                      {new Date(u.joinedAt).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:20,
                        background:s.bg, color:s.fg, border:`1px solid ${s.bd || s.fg + '33'}`, whiteSpace:'nowrap' }}>
                        {s.label}
                      </span>
                    </td>

                    {/* Actions — suspending happens on the detail page; the row only offers reactivation */}
                    <td style={{ padding:'12px 16px', textAlign:'right', whiteSpace:'nowrap' }}>
                      {u.role !== 'admin' && !u.isPending && !u.isActive && (
                        <button onClick={() => toggleStatus(u)}
                          style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
                            color:'#15803d', fontWeight:600, fontSize:12, fontFamily:'inherit', marginRight:10 }}>
                          <CheckCircle2 size={13}/> Reactivate
                        </button>
                      )}
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

// Inline add-user panel — a row of fields under the page header (not a modal)
function AddUserPanel({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('rider')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.post('/admin/users', { name, email, role })
      setCreated(res.data)
      onCreated()
    } catch (err) {
      setError(err.data?.message || 'Could not create user.')
    } finally { setBusy(false) }
  }

  const label = { display:'block', fontSize:13, fontWeight:700, color:TEXT, marginBottom:8 }
  const field = { width:'100%', padding:'10px 12px', borderRadius:8, border:`1.5px solid ${BORDER}`,
    fontSize:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT, outline:'none' }

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:'18px 20px',
      marginBottom:16, boxShadow:'0 1px 2px rgba(16,24,40,0.04)' }}>
      {created ? (
        <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 300px', minWidth:0 }}>
            <p style={{ fontSize:13, color: created.emailSent ? '#15803d' : '#b54708', margin:'0 0 6px', fontWeight:700 }}>
              {created.emailSent
                ? `✓ Welcome email with login details sent to ${created.user.email}`
                : '⚠ Welcome email could not be sent — share these credentials manually'}
            </p>
            <p style={{ fontSize:13, color:MUTED, margin:0 }}>
              Temporary password (shown once): <strong style={{ color:TEXT, fontFamily:'monospace' }}>{created.temporaryPassword}</strong>
            </p>
          </div>
          <button onClick={onClose}
            style={{ padding:'10px 24px', borderRadius:8, background:NEON, color:OLIVE, border:'none',
              fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ flex:'2 1 200px', minWidth:170 }}>
              <label style={label}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" style={field}/>
            </div>
            <div style={{ flex:'2 1 220px', minWidth:190 }}>
              <label style={label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@example.com" style={field}/>
            </div>
            <div style={{ flex:'1 1 140px', minWidth:120 }}>
              <label style={label}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={field}>
                <option value="rider">Rider</option>
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={busy}
              style={{ padding:'10px 22px', borderRadius:8, background:NEON, color:OLIVE, border:'none', fontWeight:700,
                fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1, flexShrink:0, whiteSpace:'nowrap' }}>
              {busy ? 'Sending…' : 'Send Invite'}
            </button>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:'10px 4px', flexShrink:0 }}>
              <X size={18}/>
            </button>
          </div>
          <p style={{ fontSize:12, color:MUTED, margin:'12px 0 0', lineHeight:1.5 }}>
            A welcome email with their login details and a temporary password will be sent — they'll set a new password on first sign-in.
          </p>
          {error && <p style={{ fontSize:13, color:'#ef4444', margin:'10px 0 0' }}>{error}</p>}
        </form>
      )}
    </div>
  )
}
