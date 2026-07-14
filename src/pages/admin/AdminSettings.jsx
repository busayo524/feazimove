import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { AlertCircle, CheckCircle, Lock } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280'
const NEON = '#ccff00', OLIVE = '#243800'

export default function AdminSettings() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const forced = !!user?.forcePasswordChange

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      // Server rotates the token (old sessions are invalidated on password
      // change) — swap in the fresh one so this session stays logged in.
      const res = await api.post('/auth/change-password', { currentPassword, newPassword })
      if (res.data?.token) localStorage.setItem('fm_token', res.data.token)
      updateUser({ forcePasswordChange: false })
      setSuccess(true)
      setCurrentPassword(''); setNewPassword(''); setConfirm('')
      if (forced) setTimeout(() => navigate('/admin', { replace: true }), 1200)
    } catch (err) {
      setError(err.data?.message || 'Could not update password.')
    } finally { setBusy(false) }
  }

  const content = (
    <div style={{ maxWidth: 440 }}>
      {forced && (
        <div style={{ display:'flex', gap:10, padding:'12px 16px', background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10, marginBottom:20 }}>
          <Lock size={16} color="#854d0e" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#854d0e' }}>You're using a temporary password. Set a new one to continue.</p>
        </div>
      )}

      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:22 }}>
        <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:4 }}>Change Password</p>
        <p style={{ fontSize:13, color:MUTED, marginBottom:18 }}>Use at least 8 characters, one uppercase letter, and one number.</p>

        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Current Password</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:14, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Confirm New Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
            style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:14, marginBottom:16, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT }}/>

          {error && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:14 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
            </div>
          )}
          {success && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#dcfce7', border:'1px solid #86efac', borderRadius:10, marginBottom:14 }}>
              <CheckCircle size={14} color="#15803d" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:13, color:'#15803d' }}>Password updated.</p>
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{ width:'100%', padding:'12px', borderRadius:10, background:NEON, color:OLIVE, border:'none', fontWeight:700, fontSize:14, cursor:busy?'not-allowed':'pointer', fontFamily:'inherit', opacity:busy?0.7:1 }}>
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )

  // Forced flow: no sidebar, full-screen, can't navigate away until resolved
  if (forced) {
    return (
      <div style={{ minHeight:'100vh', background:'#f5f7f2', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:440 }}>
          <p style={{ fontWeight:900, fontSize:20, color:TEXT, marginBottom:18, textAlign:'center' }}>FeaziMove Admin</p>
          {content}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout title="Settings">
      {content}
    </AdminLayout>
  )
}
