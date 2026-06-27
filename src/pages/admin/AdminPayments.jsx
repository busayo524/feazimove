import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Ban } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280', BG = '#f5f7f2'
const NEON = '#ccff00', OLIVE = '#243800'

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18 }}>
      <p style={{ fontSize:12, color:MUTED, fontWeight:600, marginBottom:8 }}>{label}</p>
      <p style={{ fontWeight:900, fontSize:24, color: accent || TEXT, letterSpacing:'-0.02em' }}>₦{value.toLocaleString()}</p>
    </div>
  )
}

export default function AdminPayments() {
  const [data, setData] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  function load() {
    Promise.all([
      api.get('/admin/payments'),
      api.get('/admin/payouts?status=pending'),
    ]).then(([pay, payouts]) => {
      setData(pay.data)
      setPayouts(payouts.data.payouts)
    }).catch(err => setError(err.data?.message || 'Could not load payments.'))
  }
  useEffect(() => { load() }, [])

  async function handlePayout(id, action) {
    setBusyId(id)
    try {
      await api.post(`/admin/payouts/${id}/${action}`)
      load()
    } catch (err) {
      alert(err.data?.message || 'Could not process this request.')
    } finally { setBusyId(null) }
  }

  return (
    <AdminLayout title="Payments">
      <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>Wallet balances, driver payouts, and platform revenue.</p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
        </div>
      )}

      {!data ? (
        <p style={{ color:MUTED }}>Loading…</p>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
            <StatCard label="Total Wallet Balance (Users)" value={data.totalWalletBalance}/>
            <StatCard label="Pending Driver Payouts" value={data.pendingPayouts} accent="#b45309"/>
            <StatCard label="FeaziMove Revenue (est.)" value={data.platformRevenue} accent="#15803d"/>
          </div>

          {/* Pending payouts */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden', marginBottom:24 }}>
            <p style={{ fontWeight:800, fontSize:15, color:TEXT, padding:'16px 18px' }}>Pending Driver Payouts</p>
            {payouts.length === 0 ? (
              <p style={{ color:MUTED, fontSize:13, padding:'0 18px 18px' }}>No pending withdrawal requests.</p>
            ) : payouts.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:`1px solid ${BORDER}` }}>
                <div>
                  <Link to={`/admin/drivers/${p.driverId}`} style={{ color:TEXT, fontWeight:700, fontSize:14, textDecoration:'none' }}>{p.driverName}</Link>
                  <p style={{ fontSize:12, color:MUTED }}>Requested {new Date(p.requestedAt).toLocaleString()}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <p style={{ fontWeight:800, fontSize:15, color:TEXT }}>₦{p.amount.toLocaleString()}</p>
                  <button onClick={() => handlePayout(p.id, 'approve')} disabled={busyId===p.id}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'none', background:OLIVE, color:NEON, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    <CheckCircle2 size={13}/> Approve
                  </button>
                  <button onClick={() => handlePayout(p.id, 'reject')} disabled={busyId===p.id}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'1px solid #fca5a5', background:'#fff', color:'#ef4444', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                    <Ban size={13}/> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
            <p style={{ fontWeight:800, fontSize:15, color:TEXT, padding:'16px 18px' }}>Recent Transactions</p>
            {data.transactions.length === 0 ? (
              <p style={{ color:MUTED, fontSize:13, padding:'0 18px 18px' }}>No transactions yet.</p>
            ) : data.transactions.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 18px', borderTop:`1px solid ${BORDER}` }}>
                <div style={{ width:32, height:32, borderRadius:9, background: t.type==='credit' ? '#dcfce7' : '#fef2f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {t.type === 'credit' ? <ArrowDownLeft size={15} color="#15803d"/> : <ArrowUpRight size={15} color="#ef4444"/>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{t.description}</p>
                  <p style={{ fontSize:12, color:MUTED }}>{t.userName} · {new Date(t.date).toLocaleString()}</p>
                </div>
                <p style={{ fontWeight:700, fontSize:14, color: t.type==='credit' ? '#15803d' : '#ef4444' }}>
                  {t.type==='credit' ? '+' : '-'}₦{t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
