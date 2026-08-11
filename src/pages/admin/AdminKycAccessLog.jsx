import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, ADMIN_BG as BG, NEON, ACCENT as OLIVE, DANGER_SOFT, ON_NEON } from '../../theme/palette'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Download, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

const ACTIONS = [
  { key: '',                      label: 'All events' },
  { key: 'KYC Revealed',          label: 'Revealed' },
  { key: 'KYC Reveal Denied',     label: 'Denied' },
  { key: 'Authenticator Enabled', label: 'Authenticator on' },
  { key: 'Authenticator Removed', label: 'Authenticator off' },
]

const ICON = {
  'KYC Revealed':          { icon: <Eye size={14}/>,        bg:'#fef3c7', fg:'#92400e' },
  'KYC Reveal Denied':     { icon: <EyeOff size={14}/>,     bg:DANGER_SOFT, fg:'#b91c1c' },
  'Authenticator Enabled': { icon: <ShieldCheck size={14}/>,bg:'#f3fbd3', fg:'#3f6212' },
  'Authenticator Removed': { icon: <KeyRound size={14}/>,   bg:'#f5f7f2', fg:'#6b7280' },
}

export default function AdminKycAccessLog() {
  const [entries, setEntries] = useState(null)
  const [action, setAction] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api.get(`/admin/kyc-access-log${action ? `?action=${encodeURIComponent(action)}` : ''}`)
      .then(res => setEntries(res.data.entries))
      .catch(err => setError(err.data?.message || 'Could not load the access log.'))
  }, [action])

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await api.getBlob('/admin/kyc-access-log/export')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'feazimove-kyc-access-log.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not export the access log.')
    } finally { setExporting(false) }
  }

  return (
    <AdminLayout title="KYC Access Log">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap', marginBottom:20 }}>
        <p style={{ color:MUTED, fontSize:14, maxWidth:640, lineHeight:1.6 }}>
          Every time an admin views a user's full KYC — and every failed attempt. Kept permanently
          and recorded against the person whose record was opened, so it survives either account
          being deleted.
        </p>
        <button onClick={handleExport} disabled={exporting}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'none',
            background:NEON, color:ON_NEON, fontWeight:800, fontSize:12.5, cursor: exporting?'wait':'pointer', fontFamily:'inherit' }}>
          <Download size={14}/> {exporting ? 'Exporting…' : 'Export to Excel'}
        </button>
      </div>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {ACTIONS.map(a => (
          <button key={a.key || 'all'} onClick={() => setAction(a.key)}
            style={{ padding:'7px 15px', borderRadius:50, fontSize:12.5, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
              border:`1.5px solid ${action===a.key ? OLIVE : BORDER}`, background: action===a.key ? OLIVE : CARD,
              color: action===a.key ? '#fff' : MUTED }}>
            {a.label}
          </button>
        ))}
      </div>

      {!entries ? (
        <p style={{ color:MUTED }}>Loading…</p>
      ) : entries.length === 0 ? (
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:40, textAlign:'center' }}>
          <ShieldCheck size={30} color={MUTED} style={{ marginBottom:10 }}/>
          <p style={{ color:MUTED, fontSize:13.5 }}>No KYC access recorded yet.</p>
        </div>
      ) : (
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:BG, textAlign:'left' }}>
                  {['When', 'Event', 'Admin', 'Whose record', 'From'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', fontSize:11.5, color:MUTED, textTransform:'uppercase',
                      letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const ic = ICON[e.action] || { icon:<ShieldCheck size={14}/>, bg:BG, fg:MUTED }
                  return (
                    <tr key={e.id} style={{ borderTop:'1px solid #f5f5f5' }}>
                      <td style={{ padding:'11px 14px', color:MUTED, whiteSpace:'nowrap' }}>
                        {new Date(e.at).toLocaleString('en-NG', { timeZone:'Africa/Lagos' })}
                      </td>
                      <td style={{ padding:'11px 14px', whiteSpace:'nowrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px',
                          borderRadius:50, background:ic.bg, color:ic.fg, fontWeight:700, fontSize:11.5 }}>
                          {ic.icon}{e.action.replace('KYC ', '')}
                        </span>
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontWeight:700, color:TEXT }}>{e.actorName || 'Unknown'}</span>
                        {e.actorEmail && e.actorEmail !== e.actorName && (
                          <p style={{ fontSize:11.5, color:MUTED }}>{e.actorEmail}</p>
                        )}
                        {/* The snapshot is why this still names someone after
                            the admin account itself has been removed. */}
                        {e.actorDeleted && (
                          <p style={{ fontSize:11, color:'#b45309', fontWeight:600 }}>account deleted</p>
                        )}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        {e.targetUserId ? (
                          <Link to={`/admin/users/${e.targetUserId}`}
                            style={{ fontWeight:700, color:OLIVE, textDecoration:'none' }}>
                            {e.targetName || e.targetEmail || '—'}
                          </Link>
                        ) : (
                          <span style={{ fontWeight:700, color:TEXT }}>{e.targetName || e.targetEmail || '—'}</span>
                        )}
                        {e.targetEmail && e.targetName && (
                          <p style={{ fontSize:11.5, color:MUTED }}>{e.targetEmail}</p>
                        )}
                        {e.targetDeleted && (
                          <p style={{ fontSize:11, color:'#b45309', fontWeight:600 }}>account deleted</p>
                        )}
                      </td>
                      <td style={{ padding:'11px 14px', color:MUTED, fontSize:12 }}>
                        <span style={{ fontFamily:'monospace' }}>{e.ipAddress || '—'}</span>
                        {e.userAgent && (
                          <p style={{ fontSize:11, maxWidth:260, overflow:'hidden', textOverflow:'ellipsis',
                            whiteSpace:'nowrap' }} title={e.userAgent}>{e.userAgent}</p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
