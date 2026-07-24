import React, { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, ShieldAlert, Radio, Users2, Banknote, CheckCircle2, XCircle } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

const SEV = { high: '#dc2626', medium: '#d97706', low: '#6b7280' }

/* Back Office — the operations & compliance console for the Anchor rails:
   live transaction/webhook monitoring, the customer registry, and AML flag
   review. This page is what gets shown at the Anchor pre-go-live demo. */
export default function AdminBackOffice() {
  const [overview, setOverview] = useState(null)
  const [tab, setTab] = useState('events') // events | customers | aml
  const [events, setEvents] = useState(null)
  const [customers, setCustomers] = useState(null)
  const [flags, setFlags] = useState(null)
  const [flagFilter, setFlagFilter] = useState('open')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.get('/admin/anchor/overview').then(r => setOverview(r.data)).catch(() => {})
    api.get('/admin/anchor/events')
      .then(r => { setEvents(r.data.events); setError('') }) // clear stale banner on recovery
      .catch(err => setError(err.data?.message || 'Could not load.'))
    api.get('/admin/anchor/customers').then(r => setCustomers(r.data.customers)).catch(() => {})
    api.get(`/admin/aml/flags?status=${flagFilter}`).then(r => setFlags(r.data.flags)).catch(() => {})
  }, [flagFilter])
  useEffect(() => { setFlags(null); load() }, [load]) // reset so the old filter's rows never show under the new tab
  // The monitor is live — refresh every 15s while the page is open
  useEffect(() => { const id = setInterval(load, 15000); return () => clearInterval(id) }, [load])

  async function reviewFlag(id, outcome) {
    try {
      await api.post(`/admin/aml/flags/${id}/review`, { outcome })
      load()
    } catch (err) { alert(err.data?.message || 'Could not update the flag.') }
  }

  const fmtTime = t => t ? new Date(t).toLocaleString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '—'

  const stats = overview ? [
    { label: 'Anchor Customers', value: overview.customers, icon: <Users2 size={15}/> },
    { label: 'Webhook Events (24h)', value: overview.webhookEvents24h, icon: <Radio size={15}/> },
    { label: 'Collections', value: `₦${(overview.collections?.totalNaira || 0).toLocaleString()}`, sub: `${overview.collections?.count || 0} payments`, icon: <Banknote size={15}/> },
    { label: 'Open AML Flags', value: overview.openAmlFlags, icon: <ShieldAlert size={15}/>, alert: overview.openAmlFlags > 0 },
  ] : []

  return (
    <AdminLayout title="Back Office">
      <p style={{ color: MUTED, fontSize: 14, marginBottom: 6 }}>
        Payment rails monitoring — transactions, customers, and AML compliance.
      </p>
      <p style={{ fontSize: 12, color: overview?.configured ? '#15803d' : '#d97706', fontWeight: 600, marginBottom: 18 }}>
        {overview == null ? '' : overview.configured
          ? `● Anchor connected · last event ${fmtTime(overview.lastEventAt)}`
          : '● Anchor API key not configured'}
      </p>

      {error && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, marginBottom: 16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }}/>
          <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${s.alert ? '#fca5a5' : BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.alert ? '#dc2626' : MUTED, marginBottom: 6 }}>
              {s.icon}<span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.alert ? '#dc2626' : TEXT }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 11.5, color: MUTED }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['events', 'Transaction Monitor'], ['customers', 'Customers'], ['aml', 'AML Flags']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '9px 18px', borderRadius: 50, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              border: `1.5px solid ${tab === key ? NEON : BORDER}`, background: tab === key ? NEON : CARD, color: tab === key ? OLIVE : MUTED }}>
            {label}
          </button>
        ))}
      </div>

      {/* Transaction / event monitor */}
      {tab === 'events' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: BG, textAlign: 'left' }}>
                  {['Time', 'Event', 'Resource', 'Signature', 'Processed'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!events ? (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: MUTED }}>Loading…</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: MUTED }}>
                    No events yet — they appear here the moment Anchor sends the first webhook.
                  </td></tr>
                ) : events.map(e => (
                  <tr key={e.id} style={{ borderTop: `1px solid #f5f5f5` }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: MUTED }}>{fmtTime(e.at)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: TEXT }}>{e.type}</td>
                    <td style={{ padding: '10px 14px', color: MUTED, fontFamily: 'monospace', fontSize: 12 }}>{e.resourceId || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {e.signatureValid
                        ? <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><CheckCircle2 size={13}/> valid</span>
                        : <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><XCircle size={13}/> INVALID</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{e.processed ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer registry */}
      {tab === 'customers' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: BG, textAlign: 'left' }}>
                  {['Name', 'Contact', 'Role', 'Anchor Customer ID', 'KYC', 'Funding Account', 'Payout Beneficiary'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11.5, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!customers ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: MUTED }}>Loading…</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: MUTED }}>
                    No Anchor customers yet — a user is onboarded automatically the first time they fund or get paid.
                  </td></tr>
                ) : customers.map(c => (
                  <tr key={c.id} style={{ borderTop: `1px solid #f5f5f5` }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: TEXT, whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', color: MUTED }}>{c.email}<br/>{c.phone}</td>
                    <td style={{ padding: '10px 14px', textTransform: 'capitalize' }}>{c.role}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: MUTED }}>{c.anchorCustomerId}</td>
                    <td style={{ padding: '10px 14px' }}>{c.kycStatus || '—'}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {c.reservedAccount ? `${c.reservedAccount.number} · ${c.reservedAccount.bank}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{c.hasPayoutBeneficiary ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AML flags */}
      {tab === 'aml' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['open', 'reviewed', 'dismissed', 'all'].map(s => (
              <button key={s} onClick={() => setFlagFilter(s)}
                style={{ padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textTransform: 'capitalize',
                  border: `1.5px solid ${flagFilter === s ? OLIVE : BORDER}`, background: flagFilter === s ? OLIVE : CARD, color: flagFilter === s ? '#fff' : MUTED }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!flags ? (
              <p style={{ color: MUTED, padding: 12 }}>Loading…</p>
            ) : flags.length === 0 ? (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, textAlign: 'center', color: MUTED, fontSize: 13.5 }}>
                No {flagFilter !== 'all' ? flagFilter : ''} flags. Rules watching: large single top-ups, rapid repeated
                funding, high 7-day volume, and fund-then-withdraw patterns.
              </div>
            ) : flags.map(f => (
              <div key={f.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${SEV[f.severity] || MUTED}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>
                    {f.rule} <span style={{ color: SEV[f.severity], fontSize: 11, textTransform: 'uppercase' }}>· {f.severity}</span>
                  </p>
                  <p style={{ fontSize: 13, color: TEXT, margin: '3px 0' }}>{f.detail}</p>
                  <p style={{ fontSize: 11.5, color: MUTED }}>
                    {f.userName || 'Unknown user'} ({f.userRole || '—'}) · {fmtTime(f.createdAt)}
                    {f.status !== 'open' && ` · ${f.status} by ${f.reviewerName || '—'} ${fmtTime(f.reviewedAt)}`}
                  </p>
                </div>
                {f.status === 'open' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => reviewFlag(f.id, 'reviewed')}
                      style={{ padding: '8px 14px', borderRadius: 8, background: OLIVE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Mark Reviewed
                    </button>
                    <button onClick={() => reviewFlag(f.id, 'dismissed')}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'none', color: MUTED, border: `1.5px solid ${BORDER}`, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
