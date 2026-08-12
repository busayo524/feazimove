import { ADMIN_CARD as CARD, ADMIN_BORDER as BORDER, ADMIN_TEXT as TEXT, ADMIN_MUTED as MUTED, ADMIN_BG as BG, NEON, ACCENT as OLIVE, ON_NEON, DANGER_SOFT, ACCENT_FILL, ON_ACCENT_FILL } from '../../theme/palette'
import React, { useEffect, useState, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, ShieldAlert, Radio, Users2, Banknote, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react'
import ScrollX from '../../components/ScrollX'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

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
    { label: 'Events (24h)', value: overview.webhookEvents24h, icon: <Radio size={15}/> },
    { label: 'Collections', value: `₦${(overview.collections?.totalNaira || 0).toLocaleString()}`, sub: `${overview.collections?.count || 0} payments`, icon: <Banknote size={15}/> },
    { label: 'Open AML Flags', value: overview.openAmlFlags, icon: <ShieldAlert size={15}/>, alert: overview.openAmlFlags > 0 },
  ] : []

  return (
    <AdminLayout title="Back Office">
      <p style={{ color: MUTED, fontSize: 15.5, marginBottom: 6 }}>
        Payment rails monitoring — transactions, customers, and AML compliance.
      </p>
      <p style={{ fontSize: 15.5, color: overview?.configured ? '#15803d' : '#d97706', fontWeight: 600, marginBottom: 18 }}>
        {overview == null ? '' : overview.configured
          ? `● Anchor connected · last event ${fmtTime(overview.lastEventAt)}`
          : '● Anchor API key not configured'}
      </p>

      {/* Which rails the money is really on. Previously answerable only by
          reading AppSail logs — too easy to misjudge during a launch. */}
      {overview?.rails && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', padding:'10px 14px',
          borderRadius:10, marginBottom:12,
          background: overview.rails.live ? '#fffbeb' : '#f5f7f2',
          border: `1px solid ${overview.rails.live ? '#fcd34d' : BORDER}` }}>
          <span style={{ padding:'3px 10px', borderRadius:50, fontSize:15, fontWeight:800, letterSpacing:'0.04em',
            background: overview.rails.live ? '#b45309' : '#6b7280', color:'#fff' }}>
            {overview.rails.live ? 'LIVE — REAL MONEY' : 'SANDBOX — NO REAL MONEY'}
          </span>
          <span style={{ fontSize:15.5, color: TEXT }}>
            {overview.rails.restricted
              ? `Payments restricted to ${overview.rails.allowlistCount} test account${overview.rails.allowlistCount === 1 ? '' : 's'}`
              : 'Payments open to all users'}
          </span>
        </div>
      )}

      {/* A fallback account means Anchor refused the reserved-account request:
          the rider holds an account in OUR company name and their BVN was
          never verified. The setup log reads like a success, so without this
          the gap is invisible. */}
      {overview?.kyc?.onFallbackAccount > 0 && (
        <div style={{ display:'flex', gap:9, padding:'11px 14px', background:DANGER_SOFT,
          border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
          <ShieldAlert size={15} color="#b91c1c" style={{ flexShrink:0, marginTop:1 }}/>
          <div>
            <p style={{ fontSize:16, color:'#b91c1c', fontWeight:700 }}>
              {overview.kyc.onFallbackAccount} user{overview.kyc.onFallbackAccount === 1 ? '' : 's'} on a fallback funding account — no BVN verification
            </p>
            <p style={{ fontSize:15.5, color:'#7f1d1d', lineHeight:1.55, marginTop:3 }}>
              Anchor refused the reserved-account request, so these accounts are in FeaziMove's
              name rather than the customer's and no CBN identity check was performed. Ask Anchor
              to enable reserved accounts, and make sure the deposit account can cover the
              per-account fee. {overview.kyc.verified} user{overview.kyc.verified === 1 ? ' has' : 's have'} a verified identity.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: DANGER_SOFT, border: '1px solid #fca5a5', borderRadius: 10, marginBottom: 16 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }}/>
          <p style={{ fontSize: 16, color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px,100%), 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${s.alert ? '#fca5a5' : BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.alert ? '#dc2626' : MUTED, marginBottom: 6 }}>
              {s.icon}<span style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.alert ? '#dc2626' : TEXT }}>{s.value}</p>
            {s.sub && <p style={{ fontSize: 15, color: MUTED }}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['events', 'Transaction Monitor'], ['customers', 'Customers'], ['aml', 'AML Flags']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '9px 18px', borderRadius: 50, fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
              border: `1.5px solid ${tab === key ? NEON : BORDER}`, background: tab === key ? NEON : CARD, color:tab === key ? ON_NEON : MUTED }}>
            {label}
          </button>
        ))}
      </div>

      {/* Transaction / event monitor */}
      {tab === 'events' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
          <ScrollX>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
              <thead>
                <tr style={{ background: BG, textAlign: 'left' }}>
                  {['Time', 'Event', 'Resource', 'Origin', 'Processed'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 15, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!events ? (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: MUTED }}>Loading…</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: MUTED }}>
                    No events yet — wallet setups and KYC submissions appear here as they happen,
                    alongside every webhook Anchor sends.
                  </td></tr>
                ) : events.map(e => (
                  <tr key={e.id} style={{ borderTop: `1px solid #f5f5f5` }}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: MUTED }}>{fmtTime(e.at)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: TEXT }}>
                      {e.type}
                      {e.detail && <p style={{ fontWeight: 400, fontSize: 15, color: MUTED, marginTop: 2 }}>{e.detail}</p>}
                    </td>
                    <td style={{ padding: '10px 14px', color: MUTED, fontFamily: 'monospace', fontSize: 15.5 }}>{e.resourceId || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {/* Internal rows are steps WE initiated (wallet setup, KYC
                          submission) — there is no signature to judge them by. */}
                      {e.internal
                        ? <span style={{ color: MUTED, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><ArrowUpRight size={13}/> FeaziMove</span>
                        : e.signatureValid
                          ? <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><CheckCircle2 size={13}/> Anchor · signed</span>
                          : <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><XCircle size={13}/> Anchor · UNSIGNED</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{e.processed ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        </div>
      )}

      {/* Customer registry */}
      {tab === 'customers' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
          <ScrollX>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
              <thead>
                <tr style={{ background: BG, textAlign: 'left' }}>
                  {['Name', 'Contact', 'Role', 'Anchor Customer ID', 'KYC', 'Funding Account', 'Payout Beneficiary'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 15, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
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
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 15.5, color: MUTED }}>{c.anchorCustomerId}</td>
                    <td style={{ padding: '10px 14px' }}>{c.kycStatus || '—'}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {c.reservedAccount ? `${c.reservedAccount.number} · ${c.reservedAccount.bank}` : '—'}
                    </td>
                    {/* The bank account the user saved in their own profile —
                        where a withdrawal actually lands. */}
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      {c.payoutBeneficiary ? (
                        <>
                          <span style={{ fontWeight: 700, color: TEXT }}>{c.payoutBeneficiary.accountNumber}</span>
                          {c.payoutBeneficiary.bank && <span style={{ color: MUTED }}> · {c.payoutBeneficiary.bank}</span>}
                          {c.payoutBeneficiary.registered && (
                            <p style={{ fontSize: 15, color: '#15803d', fontWeight: 600, marginTop: 2 }}>
                              Registered with Anchor
                            </p>
                          )}
                        </>
                      ) : <span style={{ color: MUTED }}>Not added</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        </div>
      )}

      {/* AML flags */}
      {tab === 'aml' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {['open', 'reviewed', 'dismissed', 'all'].map(s => (
              <button key={s} onClick={() => setFlagFilter(s)}
                style={{ padding: '6px 14px', borderRadius: 50, fontSize: 15.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textTransform: 'capitalize',
                  border: `1.5px solid ${flagFilter === s ? ACCENT_FILL : BORDER}`, background: flagFilter === s ? ACCENT_FILL : CARD, color: flagFilter === s ? ON_ACCENT_FILL : MUTED }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!flags ? (
              <p style={{ color: MUTED, padding: 12 }}>Loading…</p>
            ) : flags.length === 0 ? (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, textAlign: 'center', color: MUTED, fontSize: 16 }}>
                No {flagFilter !== 'all' ? flagFilter : ''} flags. Rules watching: large single top-ups, rapid repeated
                funding, high 7-day volume, and fund-then-withdraw patterns.
              </div>
            ) : flags.map(f => (
              <div key={f.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${SEV[f.severity] || MUTED}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>
                    {f.rule} <span style={{ color: SEV[f.severity], fontSize: 15, textTransform: 'uppercase' }}>· {f.severity}</span>
                  </p>
                  <p style={{ fontSize: 16, color: TEXT, margin: '3px 0' }}>{f.detail}</p>
                  {/* Who moved the money. Flags raised before identity was
                      snapshotted, on an account since deleted, have nothing
                      left to show — say that rather than "Unknown user". */}
                  <p style={{ fontSize: 15, color: MUTED }}>
                    <span style={{ fontWeight: 700, color: f.userName ? TEXT : MUTED }}>
                      {f.userName || 'Identity not recorded'}
                    </span>
                    {f.userEmail && ` · ${f.userEmail}`}
                    {f.userRole && ` · ${f.userRole}`}
                    {f.subjectDeleted && (
                      <span style={{ color: '#b45309', fontWeight: 600 }}> · account deleted</span>
                    )}
                    {' · '}{fmtTime(f.createdAt)}
                    {f.status !== 'open' && ` · ${f.status} by ${f.reviewerName || '—'} ${fmtTime(f.reviewedAt)}`}
                  </p>
                </div>
                {f.status === 'open' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => reviewFlag(f.id, 'reviewed')}
                      style={{ padding: '8px 14px', borderRadius: 8, background:ACCENT_FILL, color:ON_ACCENT_FILL, border: 'none', fontWeight: 700, fontSize: 15.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Mark Reviewed
                    </button>
                    <button onClick={() => reviewFlag(f.id, 'dismissed')}
                      style={{ padding: '8px 14px', borderRadius: 8, background: 'none', color: MUTED, border: `1.5px solid ${BORDER}`, fontWeight: 700, fontSize: 15.5, cursor: 'pointer', fontFamily: 'inherit' }}>
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
