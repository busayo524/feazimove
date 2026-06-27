import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import { AlertCircle, Download, TrendingUp } from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e5e7eb', TEXT = '#1a1a1a', MUTED = '#6b7280'
const NEON = '#ccff00', OLIVE = '#243800'

function StatCard({ label, value }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18 }}>
      <p style={{ fontSize:12, color:MUTED, fontWeight:600, marginBottom:8 }}>{label}</p>
      <p style={{ fontWeight:900, fontSize:24, color:TEXT, letterSpacing:'-0.02em' }}>₦{value.toLocaleString()}</p>
    </div>
  )
}

function BarChart({ data }) {
  if (!data.length) return <p style={{ color:MUTED, fontSize:13 }}>No revenue recorded in the last 14 days.</p>
  const peak = Math.max(...data.map(d => d.amount), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120 }}>
      {data.map((d, i) => {
        const h = Math.max(Math.round((d.amount / peak) * 100), 3)
        return (
          <div key={i} title={`${new Date(d.day).toLocaleDateString()}: ₦${d.amount.toLocaleString()}`}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <div style={{ width:'100%', height:h, borderRadius:'4px 4px 2px 2px', background: NEON }}/>
            <span style={{ fontSize:9, color:MUTED }}>{new Date(d.day).toLocaleDateString('en-NG',{ day:'2-digit', month:'short' })}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminReports() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(null)

  useEffect(() => {
    api.get('/admin/reports')
      .then(res => setData(res.data))
      .catch(err => setError(err.data?.message || 'Could not load reports.'))
  }, [])

  async function handleExport(type) {
    setExporting(type)
    try {
      const blob = await api.getBlob(`/admin/export/${type}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feazimove-${type}-export.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not export data.')
    } finally { setExporting(null) }
  }

  return (
    <AdminLayout title="Reports & Analytics">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <p style={{ color:MUTED, fontSize:14 }}>Revenue trends, demand, and retention.</p>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => handleExport('rides')} disabled={exporting==='rides'}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:`1px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            <Download size={13}/> {exporting==='rides' ? 'Exporting…' : 'Export Rides'}
          </button>
          <button onClick={() => handleExport('transactions')} disabled={exporting==='transactions'}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:`1px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            <Download size={13}/> {exporting==='transactions' ? 'Exporting…' : 'Export Transactions'}
          </button>
        </div>
      </div>

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
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:20 }}>
            <StatCard label="Revenue Today (est.)" value={data.dailyRevenue}/>
            <StatCard label="Revenue This Week (est.)" value={data.weeklyRevenue}/>
            <StatCard label="Revenue This Month (est.)" value={data.monthlyRevenue}/>
          </div>

          <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18, marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <TrendingUp size={15} color={MUTED}/>
              <p style={{ fontWeight:800, fontSize:14, color:TEXT }}>Revenue — Last 14 Days</p>
            </div>
            <BarChart data={data.dailySeries}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }} className="admin-reports-grid">
            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, overflow:'hidden' }}>
              <p style={{ fontWeight:800, fontSize:14, color:TEXT, padding:'16px 18px' }}>Top Routes by Demand</p>
              {data.topRoutes.length === 0 ? (
                <p style={{ color:MUTED, fontSize:13, padding:'0 18px 18px' }}>No rides yet.</p>
              ) : data.topRoutes.map((r, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:`1px solid ${BORDER}` }}>
                  <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>{r.pickup} → {r.destination}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:12, color:MUTED }}>{r.count} trip{r.count!==1?'s':''}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:OLIVE, background:'#eef6e0', padding:'2px 8px', borderRadius:20 }}>{r.sharePct}%</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:14, padding:18 }}>
              <p style={{ fontWeight:800, fontSize:14, color:TEXT, marginBottom:14 }}>Rider Retention</p>
              <p style={{ fontWeight:900, fontSize:32, color:TEXT, letterSpacing:'-0.02em' }}>{data.retention.pct}%</p>
              <p style={{ fontSize:12, color:MUTED, marginTop:4 }}>
                {data.retention.repeatRiders} of {data.retention.totalRiders} riders with a completed trip have ridden more than once.
              </p>
            </div>
          </div>
        </>
      )}

      <style>{`@media (max-width:860px){ .admin-reports-grid{ grid-template-columns:1fr !important; } }`}</style>
    </AdminLayout>
  )
}
