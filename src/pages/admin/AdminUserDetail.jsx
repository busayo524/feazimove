import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { ArrowLeft, Ban, CheckCircle2, XCircle, FileText, AlertCircle, Car, Trash2 } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const GREEN = '#2a6048', NEON = '#ccff00', OLIVE = '#243800'

const DOC_LABELS = {
  selfie:         'Selfie / Profile Photo',
  idDoc:          'National ID (NIN)',
  otherIdDoc:     'Other Valid ID Document',
  driverLicense:  "Driver's License",
  vehicleReg:     'Vehicle Registration',
  insurance:      'Insurance Certificate',
  profilePhoto:   'Profile Photo',
  carFront:       'Car — Front View',
  carSide:        'Car — Side View',
  roadworthiness: 'Roadworthiness Certificate',
  utilityBill:    'Utility Bill',
}

function userStatus(u) {
  if (u.isPending) return 'pending'
  if (u.isActive)  return 'approved'
  return 'rejected'
}

const STATUS_MAP = {
  pending:  { label:'Pending', bg:'#fef9c3', fg:'#854d0e' },
  approved: { label:'Approved',       bg:'#dcfce7', fg:'#15803d' },
  rejected: { label:'Rejected',       bg:'#fef2f2', fg:'#dc2626' },
}

function Section({ title, children }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14,
      overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:20 }}>
      <div style={{ padding:'13px 20px', borderBottom:`1px solid ${BORDER}`, background:BG }}>
        <p style={{ margin:0, fontWeight:700, fontSize:12, color:MUTED, textTransform:'uppercase', letterSpacing:'0.06em' }}>{title}</p>
      </div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  )
}

function InfoGrid({ rows }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'14px 24px' }}>
      {rows.filter(([,v]) => v != null && v !== '').map(([label, value]) => (
        <div key={label}>
          <p style={{ margin:'0 0 3px', fontSize:11, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:TEXT }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

function ProfilePhoto({ userId, hasAvatar, initials }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
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
    <div style={{ width:72, height:72, borderRadius:'50%', background:NEON, color:OLIVE,
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'hidden', fontWeight:800, fontSize:26, flexShrink:0 }}>
      {src
        ? <img src={src} alt="Profile" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : initials}
    </div>
  )
}

export default function AdminUserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser]   = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const [action, setAction] = useState('')

  function load() {
    api.get(`/admin/users/${id}`)
      .then(res => setUser(res.data.user))
      .catch(err => setError(err.data?.message || 'Could not load this user.'))
  }
  useEffect(() => { load() }, [id])

  async function approve() {
    setBusy(true); setAction('approve')
    try {
      await api.patch(`/admin/users/${id}/approve`)
      load()
    } catch (err) { alert(err.data?.message || 'Could not approve user.') }
    finally { setBusy(false); setAction('') }
  }

  async function reject() {
    if (!window.confirm('Are you sure you want to reject this registration?')) return
    setBusy(true); setAction('reject')
    try {
      await api.patch(`/admin/users/${id}/reject`)
      load()
    } catch (err) { alert(err.data?.message || 'Could not reject user.') }
    finally { setBusy(false); setAction('') }
  }

  async function toggleSuspend() {
    setBusy(true); setAction('suspend')
    try {
      await api.patch(`/admin/users/${id}/status`, { isActive: !user.isActive })
      load()
    } catch (err) { alert(err.data?.message || 'Could not update status.') }
    finally { setBusy(false); setAction('') }
  }

  async function deleteUser() {
    if (!window.confirm(`Permanently delete ${user.name} and all their data? This cannot be undone.`)) return
    setBusy(true); setAction('delete')
    try {
      await api.delete(`/admin/users/${id}`)
      navigate('/admin/user-management', { replace: true })
    } catch (err) {
      alert(err.data?.message || 'Could not delete user.')
      setBusy(false); setAction('')
    }
  }

  async function viewDocument(docId) {
    try {
      const blob = await api.getBlob(`/admin/documents/${docId}`)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { alert('Could not load that file.') }
  }

  if (error) return (
    <AdminLayout title="User Detail">
      <div style={{ display:'flex', gap:8, padding:'12px 16px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10 }}>
        <AlertCircle size={15} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ fontSize:14, color:'#ef4444' }}>{error}</p>
      </div>
    </AdminLayout>
  )

  if (!user) return (
    <AdminLayout title="User Detail">
      <p style={{ color:MUTED, fontSize:14 }}>Loading…</p>
    </AdminLayout>
  )

  const st = userStatus(user)
  const s  = STATUS_MAP[st]
  const initials = user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'U'
  const isDriver = user.role === 'driver' || user.canDrive

  return (
    <AdminLayout title="User Detail">
      {/* Back */}
      <button onClick={() => navigate('/admin/user-management')}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none',
          cursor:'pointer', color:MUTED, fontWeight:600, fontSize:14, fontFamily:'inherit', padding:0, marginBottom:20 }}>
        <ArrowLeft size={16}/> Back to User Management
      </button>

      {/* Profile card + action buttons */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:24,
        marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
          {/* Avatar with View button */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0 }}>
            <ProfilePhoto userId={user.id} hasAvatar={user.hasAvatar} initials={initials}/>
            {user.hasAvatar && (
              <button onClick={async () => {
                  try {
                    const blob = await api.getBlob(`/admin/avatar/${user.id}`)
                    window.open(URL.createObjectURL(blob), '_blank')
                  } catch { alert('Could not load photo.') }
                }}
                style={{ fontSize:11, fontWeight:700, color:GREEN, background:'none', border:`1px solid ${GREEN}`,
                  borderRadius:6, padding:'3px 10px', cursor:'pointer', fontFamily:'inherit' }}>
                View Photo
              </button>
            )}
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:20, color:TEXT }}>{user.name}</p>
            <p style={{ margin:0, fontSize:14, color:MUTED }}>{user.email || user.phone}</p>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:20,
                background:s.bg, color:s.fg, border:`1px solid ${s.fg}33` }}>{s.label}</span>
              <span style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:'capitalize' }}>{user.role}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {/* Pending: show Approve + Reject */}
            {st === 'pending' && user.role !== 'admin' && <>
              <button onClick={approve} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:'#dcfce7', color:'#15803d', border:'1.5px solid #86efac',
                  fontWeight:700, fontSize:13, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy&&action==='approve'?0.6:1 }}>
                <CheckCircle2 size={15}/>{busy&&action==='approve'?'Approving…':'Approve'}
              </button>
              <button onClick={reject} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:'#fef2f2', color:'#dc2626', border:'1.5px solid #fca5a5',
                  fontWeight:700, fontSize:13, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy&&action==='reject'?0.6:1 }}>
                <XCircle size={15}/>{busy&&action==='reject'?'Rejecting…':'Reject'}
              </button>
            </>}
            {/* Approved: show Suspend */}
            {st === 'approved' && user.role !== 'admin' && (
              <button onClick={toggleSuspend} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:'#fef2f2', color:'#dc2626', border:'1.5px solid #fca5a5',
                  fontWeight:700, fontSize:13, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
                <Ban size={15}/>Suspend User
              </button>
            )}
            {/* Rejected/suspended: show Reactivate */}
            {st === 'rejected' && user.role !== 'admin' && (
              <button onClick={approve} disabled={busy}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10,
                  background:'#dcfce7', color:'#15803d', border:'1.5px solid #86efac',
                  fontWeight:700, fontSize:13, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit' }}>
                <CheckCircle2 size={15}/>Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <Section title="Personal Information">
        <InfoGrid rows={[
          ['Full Name',    user.name],
          ['Email',        user.email],
          ['Phone',        user.phone],
          ['Role',         user.role?.charAt(0).toUpperCase() + user.role?.slice(1)],
          ['City',         user.city || '—'],
          ['Area',         user.area || '—'],
          ['Date of Birth', user.dateOfBirth
            ? new Date(user.dateOfBirth).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })
            : '—'],
          ['Gender',       user.gender ? user.gender.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '—'],
          ['Bank Name',      user.bankName || '—'],
          ['Account Number', user.bankAccountNumber || '—'],
          ['Date Joined',  new Date(user.joinedAt).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })],
          ['Wallet Balance', `₦${(user.walletBalance||0).toLocaleString()}`],
        ]}/>
      </Section>

      {/* Identity info (riders) */}
      {!isDriver && (user.idType || user.idNumber) && (
        <Section title="Identity Verification">
          <InfoGrid rows={[
            ['ID Type',   user.idType],
            ['ID Number', user.idNumber],
          ]}/>
        </Section>
      )}

      {/* Vehicle info (drivers) */}
      {isDriver && (
        <Section title={<span style={{display:'flex',alignItems:'center',gap:6}}><Car size={13}/>Vehicle Information</span>}>
          <InfoGrid rows={[
            ['Vehicle Type',  user.vehicleType],
            ['Make',          user.vehicleMake],
            ['Model',         user.vehicleModel],
            ['Year',          user.vehicleYear],
            ['Color',         user.vehicleColor],
            ['Plate Number',  user.plateNumber],
          ]}/>
        </Section>
      )}

      {/* Documents */}
      <Section title={`Uploaded Documents (${user.documents?.length || 0})`}>
        {!user.documents?.length ? (
          <p style={{ color:MUTED, fontSize:14, margin:0 }}>No documents uploaded.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {user.documents.map(doc => (
              <div key={doc.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 16px', borderRadius:10, border:`1px solid ${BORDER}`, background:BG }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'#f3fbd3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><FileText size={15} color="#3f6212"/></div>
                  <div>
                    <p style={{ margin:0, fontWeight:600, fontSize:14, color:TEXT }}>
                      {DOC_LABELS[doc.doc_type] || doc.doc_type}
                    </p>
                    <p style={{ margin:0, fontSize:12, color:MUTED }}>
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => viewDocument(doc.id)}
                  style={{ padding:'7px 16px', borderRadius:8, background:NEON, color:OLIVE,
                    border:'none', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Danger zone — permanent deletion */}
      <div style={{ background:'#fef2f2', border:'1px solid #fecdca', borderRadius:14, padding:'20px 24px',
        marginTop:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div style={{ flex:'1 1 300px', minWidth:0 }}>
          <p style={{ margin:'0 0 4px', fontWeight:800, fontSize:14, color:'#b42318' }}>Delete this user</p>
          <p style={{ margin:0, fontSize:13, color:'#912018', lineHeight:1.6 }}>
            Permanently removes {user.name} and all their data — wallet, documents, messages and bookings are
            erased; ride history is anonymized. This cannot be undone.
          </p>
        </div>
        <button onClick={deleteUser} disabled={busy}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10,
            background:'#d92d20', color:'#fff', border:'none', fontWeight:700, fontSize:13,
            cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1, flexShrink:0 }}>
          <Trash2 size={15}/> {action === 'delete' ? 'Deleting…' : 'Delete User'}
        </button>
      </div>

    </AdminLayout>
  )
}
