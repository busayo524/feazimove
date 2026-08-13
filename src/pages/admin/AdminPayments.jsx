import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, NEON, ACCENT as OLIVE, DANGER_SOFT, ON_NEON, ACCENT_FILL, ON_ACCENT_FILL, INFO_SOFT, INFO_TEXT, OK_SOFT_2, OK_TEXT, DANGER_TEXT } from '../../theme/palette'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Ban, Download } from 'lucide-react'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18 }}>
      <p style={{ fontSize:15.5, color:MUTED, fontWeight:600, marginBottom:8 }}>{label}</p>
      <p style={{ fontWeight:900, fontSize:24, color: accent || TEXT, letterSpacing:'-0.02em' }}>₦{value.toLocaleString()}</p>
    </div>
  )
}

const RANGES = [
  { key:'all',   label:'All time' },
  { key:'today', label:'Today' },
  { key:'week',  label:'This Week' },
  { key:'month', label:'This Month' },
  { key:'year',  label:'This Year' },
]

// A payout row links to the rider or driver page depending on who asked.
function detailPath(userId, role) {
  return `/admin/${role === 'driver' ? 'drivers' : 'riders'}/${userId}`
}

function RoleTag({ role }) {
  if (!role) return null
  const isDriver = role === 'driver'
  return (
    <span style={{ marginLeft:8, padding:'2px 8px', borderRadius:50, fontSize:15, fontWeight:800,
      textTransform:'uppercase', letterSpacing:'0.04em',
      background: isDriver ? '#e0edff' : '#f0f7dd', color: isDriver ? '#1d4ed8' : '#3f6212' }}>
      {isDriver ? 'Driver' : 'Rider'}
    </span>
  )
}

export default function AdminPayments() {
  const [data, setData] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [range, setRange] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [mismatch, setMismatch] = useState(null) // sandbox name-check override prompt

  function load(r = range) {
    Promise.all([
      api.get(`/admin/payments?range=${r}`),
      api.get('/admin/payouts?status=pending'),
    ]).then(([pay, payouts]) => {
      setData(pay.data)
      setPayouts(payouts.data.payouts)
    }).catch(err => setError(err.data?.message || 'Could not load payments.'))
  }
  useEffect(() => { load(range) }, [range])

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await api.getBlob(`/admin/export/transactions?range=${range}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feazimove-transactions-${range}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not export transactions.')
    } finally { setExporting(false) }
  }

  async function handlePayout(id, action, body) {
    setBusyId(id)
    try {
      await api.post(`/admin/payouts/${id}/${action}`, body)
      load()
    } catch (err) {
      // A name mismatch is only overridable while the rails are sandbox, where
      // Anchor returns a different random account name on every lookup. On live
      // keys the server refuses and there is nothing to offer here.
      if (err.data?.nameMismatch && err.data?.overridable) {
        setMismatch({ id, ...err.data })
      } else {
        alert(err.data?.message || 'Could not process this request.')
      }
    } finally { setBusyId(null) }
  }

  return (
    <AdminLayout title="Payments">
      <p style={{ color:MUTED, fontSize:15.5, marginBottom:20 }}>Wallet balances, driver payouts, and platform revenue.</p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:16, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {!data ? (
        <p style={{ color:MUTED }}>Loading…</p>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(180px,100%),1fr))', gap:16, marginBottom:24 }}>
            <StatCard label="Total Wallet Balance (Users)" value={data.totalWalletBalance}/>
            <StatCard label="Pending Payouts" value={data.pendingPayouts} accent="#b45309"/>
            <StatCard label="FeaziMove Revenue (est.)" value={data.platformRevenue} accent="#15803d"/>
          </div>

          {/* Pending payouts */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:24 }}>
            <p style={{ fontWeight:800, fontSize:16, color:TEXT, padding:'16px 18px' }}>Pending Payouts</p>
            {payouts.length === 0 ? (
              <p style={{ color:MUTED, fontSize:16, padding:'0 18px 18px' }}>No pending withdrawal requests.</p>
            ) : payouts.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:`1px solid ${BORDER}` }}>
                <div>
                  <span style={{ display:'inline-flex', alignItems:'center' }}>
                    {p.userId ? (
                      <Link to={detailPath(p.userId, p.userRole)} style={{ color:TEXT, fontWeight:700, fontSize:15.5, textDecoration:'none' }}>{p.userName}</Link>
                    ) : (
                      <span style={{ color:TEXT, fontWeight:700, fontSize:15.5 }}>{p.userName}</span>
                    )}
                    <RoleTag role={p.userRole}/>
                  </span>
                  <p style={{ fontSize:15.5, color:MUTED }}>Requested {new Date(p.requestedAt).toLocaleString('en-NG', { timeZone:'Africa/Lagos' })}</p>
                  {/* Approval refuses anything without a valid 10-digit account, so
                      say so here rather than let an admin click into that error. */}
                  {/^\d{10}$/.test(p.accountNumber || '') && p.bankName
                    ? <p style={{ fontSize:15, color:MUTED }}>{p.bankName} · {p.accountNumber}</p>
                    : <p style={{ fontSize:15, fontWeight:700, color:DANGER_TEXT }}>
                        No bank details on file — ask them to add these in Profile → Edit before approving
                      </p>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>₦{p.amount.toLocaleString()}</p>
                    {p.fee > 0 && (
                      <p style={{ fontSize:15, color:MUTED }}>less ₦{p.fee.toLocaleString()} fees → pays ₦{p.net.toLocaleString()}</p>
                    )}
                  </div>
                  <button onClick={() => handlePayout(p.id, 'approve')}
                    disabled={busyId===p.id || !(p.bankName && /^\d{10}$/.test(p.accountNumber || ''))}
                    title={p.bankName && /^\d{10}$/.test(p.accountNumber || '') ? 'Approve payout' : 'Bank details required first'}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'none',
                      background: p.bankName && /^\d{10}$/.test(p.accountNumber || '') ? NEON : BORDER,
                      color: p.bankName && /^\d{10}$/.test(p.accountNumber || '') ? ON_NEON : MUTED,
                      fontWeight:700, fontSize:15.5,
                      cursor: p.bankName && /^\d{10}$/.test(p.accountNumber || '') ? 'pointer' : 'not-allowed',
                      fontFamily:'inherit' }}>
                    <CheckCircle2 size={13}/> Approve
                  </button>
                  <button onClick={() => handlePayout(p.id, 'reject')} disabled={busyId===p.id}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'1px solid #fca5a5', background:'#fff', color:'#ef4444', fontWeight:700, fontSize:15.5, cursor:'pointer', fontFamily:'inherit' }}>
                    <Ban size={13}/> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'16px 18px', flexWrap:'wrap' }}>
              <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>Transactions</p>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                {RANGES.map(r => (
                  <button key={r.key} onClick={() => setRange(r.key)}
                    style={{ padding:'6px 12px', borderRadius:50, fontSize:15.5, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
                      border:`1.5px solid ${range===r.key ? ACCENT_FILL : BORDER}`, background: range===r.key ? ACCENT_FILL : CARD, color: range===r.key ? ON_ACCENT_FILL : MUTED }}>
                    {r.label}
                  </button>
                ))}
                <button onClick={handleExport} disabled={exporting}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'none', background:NEON, color:ON_NEON, fontWeight:800, fontSize:15.5, cursor: exporting?'wait':'pointer', fontFamily:'inherit' }}>
                  <Download size={13}/> {exporting ? 'Exporting…' : 'Export to Excel'}
                </button>
              </div>
            </div>
            {data.transactions.length === 0 ? (
              <p style={{ color:MUTED, fontSize:16, padding:'0 18px 18px' }}>
                No transactions in this period.
              </p>
            ) : data.transactions.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', borderTop:`1px solid ${BORDER}` }}>
                <div style={{ width:32, height:32, borderRadius:9, background: t.type==='credit' ? OK_SOFT_2 : DANGER_SOFT, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {t.type === 'credit' ? <ArrowDownLeft size={15} color="#15803d"/> : <ArrowUpRight size={15} color="#ef4444"/>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:16, fontWeight:600, color:TEXT }}>{t.description}</p>
                  <p style={{ fontSize:15.5, color:MUTED }}>
                    {t.userName}
                    {/* The account is gone but the money still moved — say so
                        rather than showing a name that leads nowhere. */}
                    {t.userDeleted && <span style={{ color:INFO_TEXT, fontWeight:600 }}> · account deleted</span>}
                    {' · '}{new Date(t.date).toLocaleString('en-NG', { timeZone:'Africa/Lagos' })}
                  </p>
                </div>
                <p style={{ fontWeight:700, fontSize:15.5, color: t.type==='credit' ? OK_TEXT : '#ef4444' }}>
                  {t.type==='credit' ? '+' : '-'}₦{t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {mismatch && (
        <NameMismatchModal
          data={mismatch}
          busy={busyId === mismatch.id}
          onClose={() => setMismatch(null)}
          onConfirm={reason => {
            const id = mismatch.id
            setMismatch(null)
            handlePayout(id, 'approve', { overrideNameCheck: true, overrideReason: reason })
          }}
        />
      )}
    </AdminLayout>
  )
}

/* Offered ONLY when the server says the mismatch is overridable, which it only
   is while the rails are Anchor sandbox — there, name enquiry returns a fresh
   random name on every call, so a genuine match is impossible. On live keys
   this never appears and the payout stays blocked. */
function NameMismatchModal({ data, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, width:'100%', maxWidth:460 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
          <AlertCircle size={17} color="#b45309"/>
          <p style={{ margin:0, fontWeight:800, fontSize:16, color:TEXT }}>Account name doesn’t match</p>
        </div>
        <p style={{ fontSize:16, color:MUTED, lineHeight:1.55, marginBottom:12 }}>
          The bank reports this account as <strong style={{ color:TEXT }}>{data.bankAccountName}</strong>,
          but the registered holder is <strong style={{ color:TEXT }}>{data.registeredName}</strong>.
        </p>
        <div style={{ background:INFO_SOFT, border:'1px solid #fcd34d', borderRadius:10, padding:'10px 13px', marginBottom:14 }}>
          <p style={{ fontSize:15.5, color:INFO_TEXT, lineHeight:1.5 }}>
            You’re on Anchor <strong>sandbox</strong>, which invents a new random account name on every
            lookup — so this check can never pass here. Overriding is safe for testing. It will not be
            offered once live keys are in place.
          </p>
        </div>
        <label style={{ display:'block', fontSize:15.5, fontWeight:700, color:TEXT, marginBottom:6 }}>
          Reason (recorded in the audit log)
        </label>
        <input value={reason} onChange={e => setReason(e.target.value.slice(0, 200))}
          placeholder="e.g. sandbox test payout"
          style={{ width:'100%', padding:'11px 13px', borderRadius:10, fontSize:15.5, border:`1.5px solid ${BORDER}`,
            marginBottom:14, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}/>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => onConfirm(reason.trim())} disabled={busy || reason.trim().length < 3}
            style={{ flex:1, padding:'11px', borderRadius:10, border:'none', fontWeight:800, fontSize:16, fontFamily:'inherit',
              background:(busy || reason.trim().length < 3) ? BORDER : INFO_TEXT,
              color:(busy || reason.trim().length < 3) ? MUTED : '#fff',
              cursor:(busy || reason.trim().length < 3) ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Approving…' : 'Override & approve'}
          </button>
          <button onClick={onClose}
            style={{ padding:'11px 16px', borderRadius:10, background:'none', border:`1.5px solid ${BORDER}`,
              color:MUTED, fontWeight:700, fontSize:16, cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
