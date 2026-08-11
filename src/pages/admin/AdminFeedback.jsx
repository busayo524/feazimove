import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, ADMIN_BG as BG, NEON, ACCENT as OLIVE, DANGER_SOFT, ON_NEON, ACCENT_FILL, ON_ACCENT_FILL } from '../../theme/palette'
import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Mail, CheckCircle2, Inbox, MailWarning } from 'lucide-react'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'new',     label: 'New' },
  { key: 'read',    label: 'Read' },
  { key: 'handled', label: 'Handled' },
]

const STATUS_STYLE = {
  new:     { bg: '#fef9c3', fg: '#854d0e', label: 'New' },
  read:    { bg: '#e0f2fe', fg: '#075985', label: 'Read' },
  handled: { bg: '#f3fbd3', fg: '#3f6212', label: 'Handled' },
}

function fmtTime(v) {
  return v ? new Date(v).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) : '—'
}

export default function AdminFeedback() {
  const [messages, setMessages] = useState(null)
  const [counts, setCounts] = useState({})
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [open, setOpen] = useState(null)

  function load(f = filter) {
    api.get(`/admin/contact-messages?status=${f}`)
      .then(res => { setMessages(res.data.messages); setCounts(res.data.counts || {}) })
      .catch(err => setError(err.data?.message || 'Could not load messages.'))
  }
  useEffect(() => { load(filter) }, [filter])

  async function setStatus(id, status) {
    setBusyId(id)
    try {
      await api.patch(`/admin/contact-messages/${id}`, { status })
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not update this message.')
    } finally { setBusyId(null) }
  }

  // Opening a message marks it read, so "New" means genuinely unseen.
  function toggle(m) {
    const next = open === m.id ? null : m.id
    setOpen(next)
    if (next && m.status === 'new') setStatus(m.id, 'read')
  }

  return (
    <AdminLayout title="Feedback">
      <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>
        Messages sent through the Contact form on the website.
      </p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:'7px 15px', borderRadius:50, fontSize:12.5, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
              border:`1.5px solid ${filter===f.key ? OLIVE : BORDER}`, background: filter===f.key ? OLIVE : CARD,
              color: filter===f.key ? '#fff' : MUTED }}>
            {f.label}{f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
          </button>
        ))}
      </div>

      {!messages ? (
        <p style={{ color:MUTED }}>Loading…</p>
      ) : messages.length === 0 ? (
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:40, textAlign:'center' }}>
          <Inbox size={30} color={MUTED} style={{ marginBottom:10 }}/>
          <p style={{ color:MUTED, fontSize:13.5 }}>
            No {filter !== 'all' ? filter : ''} messages.
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {messages.map(m => {
            const st = STATUS_STYLE[m.status] || STATUS_STYLE.new
            const isOpen = open === m.id
            return (
              <div key={m.id} style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
                <button onClick={() => toggle(m)}
                  style={{ width:'100%', display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px',
                    background:'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
                      <span style={{ fontWeight:800, fontSize:14, color:TEXT }}>{m.name}</span>
                      <span style={{ padding:'2px 8px', borderRadius:50, fontSize:10.5, fontWeight:800,
                        textTransform:'uppercase', background:st.bg, color:st.fg }}>{st.label}</span>
                      <span style={{ padding:'2px 8px', borderRadius:50, fontSize:10.5, fontWeight:700,
                        background:BG, color:MUTED }}>{m.topic}</span>
                      {/* The message is saved even if the notification email
                          failed — surface that rather than hide it. */}
                      {!m.emailed && (
                        <span title="The notification email to support did not send — the message is still saved here."
                          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:50,
                            fontSize:10.5, fontWeight:700, background:DANGER_SOFT, color:'#b91c1c' }}>
                          <MailWarning size={11}/> Not emailed
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize:12.5, color:MUTED }}>{m.email} · {fmtTime(m.receivedAt)}</p>
                    {!isOpen && (
                      <p style={{ fontSize:13, color:TEXT, marginTop:6, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.message}</p>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding:'0 16px 16px', borderTop:`1px solid ${BORDER}` }}>
                    <p style={{ fontSize:14, color:TEXT, lineHeight:1.7, whiteSpace:'pre-wrap',
                      background:BG, borderRadius:10, padding:'12px 14px', margin:'14px 0' }}>
                      {m.message}
                    </p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'8px 20px', marginBottom:14 }}>
                      {[
                        ['Name', m.name], ['Email', m.email], ['Topic', m.topic],
                        ['Received', fmtTime(m.receivedAt)],
                        ['Emailed to support', m.emailed ? 'Yes' : 'No — send failed'],
                        ['IP address', m.ipAddress || '—'],
                        ['Device', m.userAgent || '—'],
                        ['Handled by', m.handledBy ? `${m.handledBy} · ${fmtTime(m.handledAt)}` : '—'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p style={{ fontSize:11, color:MUTED, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{k}</p>
                          <p style={{ fontSize:13, color:TEXT, fontWeight:600, marginTop:2, wordBreak:'break-word' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic} — FeaziMove`)}`}
                        style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8,
                          background:NEON, color:ON_NEON, fontWeight:700, fontSize:12.5, textDecoration:'none' }}>
                        <Mail size={13}/> Reply by email
                      </a>
                      {m.status !== 'handled' && (
                        <button onClick={() => setStatus(m.id, 'handled')} disabled={busyId === m.id}
                          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8,
                            background:ACCENT_FILL, color:ON_ACCENT_FILL, border:'none', fontWeight:700, fontSize:12.5,
                            cursor:'pointer', fontFamily:'inherit' }}>
                          <CheckCircle2 size={13}/> Mark handled
                        </button>
                      )}
                      {m.status === 'handled' && (
                        <button onClick={() => setStatus(m.id, 'read')} disabled={busyId === m.id}
                          style={{ padding:'8px 14px', borderRadius:8, background:'none', border:`1px solid ${BORDER}`,
                            color:MUTED, fontWeight:700, fontSize:12.5, cursor:'pointer', fontFamily:'inherit' }}>
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AdminLayout>
  )
}
