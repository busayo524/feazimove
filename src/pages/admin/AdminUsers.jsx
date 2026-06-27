import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, UserPlus, Ban, CheckCircle2, X } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

const ROLE_BADGE = {
  admin:  { bg:'#ede9fe', fg:'#6d28d9' },
  driver: { bg:'#dbeafe', fg:'#1e40af' },
  rider:  { bg:'#dcfce7', fg:'#15803d' },
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  return (
    <AdminLayout title="User Management">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        <button onClick={() => setShowAdd(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, background:OLIVE, border:'none',
            color:NEON, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          <UserPlus size={15}/> Add Admin User
        </button>
      </div>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:BG, textAlign:'left' }}>
              {['User','Role','Joined','Status',''].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:12, color:MUTED, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding:30, textAlign:'center', color:MUTED }}>Loading…</td></tr>
            ) : users.map(u => {
              const badge = ROLE_BADGE[u.role] || ROLE_BADGE.rider
              return (
                <tr key={u.id} style={{ borderTop:`1px solid ${BORDER}` }}>
                  <td style={{ padding:'12px 16px' }}>
                    <p style={{ fontWeight:700, color:TEXT }}>{u.name}</p>
                    <p style={{ fontSize:12, color:MUTED }}>{u.email || u.phone}</p>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:badge.bg, color:badge.fg, textTransform:'capitalize' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', color:MUTED, fontSize:13 }}>{new Date(u.joinedAt).toLocaleDateString()}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                      background: u.isActive ? '#dcfce7' : '#fef2f2', color: u.isActive ? '#15803d' : '#ef4444' }}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    {u.role !== 'admin' && (
                      <button onClick={() => toggleStatus(u)}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer',
                          color: u.isActive ? '#ef4444' : '#15803d', fontWeight:600, fontSize:12, fontFamily:'inherit' }}>
                        {u.isActive ? <><Ban size={13}/> Suspend</> : <><CheckCircle2 size={13}/> Reactivate</>}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onCreated={load}/>}
    </AdminLayout>
  )
}

function AddUserModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.post('/admin/users', { name, email })
      setCreated(res.data)
      onCreated()
    } catch (err) {
      setError(err.data?.message || 'Could not create user.')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, maxWidth:380, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>{created ? 'Admin User Created' : 'Add Admin User'}</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:MUTED }}><X size={18}/></button>
        </div>

        {created ? (
          <div>
            <p style={{ fontSize:13, color:MUTED, marginBottom:12 }}>Share these credentials securely — the password won't be shown again.</p>
            <div style={{ background:BG, borderRadius:10, padding:14, marginBottom:16 }}>
              <p style={{ fontSize:12, color:MUTED }}>Email</p>
              <p style={{ fontWeight:700, color:TEXT, marginBottom:10 }}>{created.user.email}</p>
              <p style={{ fontSize:12, color:MUTED }}>Temporary Password</p>
              <p style={{ fontWeight:700, color:TEXT, fontFamily:'monospace' }}>{created.temporaryPassword}</p>
            </div>
            <button onClick={onClose} style={{ width:'100%', padding:'11px', borderRadius:10, background:OLIVE, color:NEON, border:'none', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>

            <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>

            {error && <p style={{ fontSize:13, color:'#ef4444', marginBottom:12 }}>{error}</p>}

            <button type="submit" disabled={busy}
              style={{ width:'100%', padding:'11px', borderRadius:10, background:OLIVE, color:NEON, border:'none', fontWeight:700, fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
              {busy ? 'Creating…' : 'Create User'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
