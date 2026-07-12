import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'
import { api } from '../../services/api'
import {
  Users, Car, Navigation, TrendingUp, AlertCircle, AlertTriangle,
  BarChart3, PieChart, Clock, ArrowRight,
} from 'lucide-react'

const CARD = '#ffffff', BORDER = '#e9ecef', TEXT = '#1a1a1a', MUTED = '#6b7280'
const GRID = '#eef0ea', AXIS = '#d1d5db'
const GREEN = '#008300' // single-series mark color (validated on white)

// Ride-status colors — donut + pills (palette validated: CVD ΔE 40.5, amber
// relies on the always-visible legend labels for contrast relief)
const STATUS_COLORS = { completed:'#0ca30c', ongoing:'#2a78d6', pending:'#eda100', cancelled:'#d03b3b' }
const STATUS_LABELS = { completed:'Completed', ongoing:'Ongoing', pending:'Pending', cancelled:'Cancelled' }

const naira  = n => `₦${(n ?? 0).toLocaleString('en-NG')}`
const compact = n => {
  if (n >= 1e9) return `₦${(n / 1e9).toFixed(1).replace(/\.0$/,'')}B`
  if (n >= 1e6) return `₦${(n / 1e6).toFixed(1).replace(/\.0$/,'')}M`
  if (n >= 1e3) return `₦${(n / 1e3).toFixed(1).replace(/\.0$/,'')}K`
  return `₦${n}`
}
// Round a max up to a clean tick ceiling (1/2/2.5/5 × 10^k)
function niceMax(v) {
  if (v <= 0) return 4
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p
  return 10 * p
}

function rideStatusPill(status) {
  const bucket = status === 'completed' ? 'completed'
    : status === 'pending' ? 'pending'
    : ['driver_assigned','arrived_pickup','in_transit'].includes(status) ? 'ongoing'
    : 'cancelled'
  const tints = {
    completed: { bg:'#ecfdf3', fg:'#027a48', bd:'#abefc6' },
    ongoing:   { bg:'#eff8ff', fg:'#175cd3', bd:'#b2ddff' },
    pending:   { bg:'#fffaeb', fg:'#b54708', bd:'#fedf89' },
    cancelled: { bg:'#fef3f2', fg:'#b42318', bd:'#fecdca' },
  }
  return { label: STATUS_LABELS[bucket], ...tints[bucket] }
}

function Card({ children, style }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:20,
      boxShadow:'0 1px 2px rgba(16,24,40,0.04)', minWidth:0, ...style }}>
      {children}
    </div>
  )
}

function CardHeader({ title, sub, icon, viewAll }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
      <div>
        <p style={{ fontSize:15, fontWeight:700, color:TEXT, margin:0 }}>{title}</p>
        {sub && <p style={{ fontSize:12, color:MUTED, margin:'3px 0 0' }}>{sub}</p>}
      </div>
      {viewAll ? (
        <Link to={viewAll} style={{ display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600,
          color:GREEN, textDecoration:'none', flexShrink:0 }}>
          View all <ArrowRight size={14}/>
        </Link>
      ) : icon ? (
        <div style={{ width:32, height:32, borderRadius:9, background:'#f3fbd3', display:'flex',
          alignItems:'center', justifyContent:'center', color:'#3f6212', flexShrink:0 }}>{icon}</div>
      ) : null}
    </div>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <Card style={{ padding:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <p style={{ fontSize:13, color:MUTED, fontWeight:600, margin:0 }}>{label}</p>
        <div style={{ width:32, height:32, borderRadius:9, background:'#f3fbd3', display:'flex',
          alignItems:'center', justifyContent:'center', color:'#3f6212' }}>{icon}</div>
      </div>
      <p style={{ fontWeight:800, fontSize:26, color:TEXT, letterSpacing:'-0.02em', margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:MUTED, marginTop:5, marginBottom:0 }}>{sub}</p>}
    </Card>
  )
}

// Shared tooltip — absolutely positioned inside a position:relative chart box
function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div style={{ position:'absolute', left:tip.x, top:tip.y, transform:'translate(-50%, -110%)',
      background:'#1a1a1a', color:'#fff', borderRadius:8, padding:'7px 10px', fontSize:12,
      pointerEvents:'none', whiteSpace:'nowrap', zIndex:5, boxShadow:'0 4px 12px rgba(0,0,0,0.2)' }}>
      {tip.lines.map((l, i) => (
        <div key={i} style={{ fontWeight: i === 0 ? 700 : 400, opacity: i === 0 ? 1 : 0.85 }}>{l}</div>
      ))}
    </div>
  )
}

// ── Area trend chart (single series, smooth) ─────────────────────────────────
function AreaTrend({ data }) {
  const boxRef = useRef(null)
  const [tip, setTip] = useState(null)
  const [hoverI, setHoverI] = useState(null)
  const W = 640, H = 240, PL = 56, PR = 16, PT = 12, PB = 26
  const plotW = W - PL - PR, plotH = H - PT - PB

  const max = niceMax(Math.max(...data.map(d => d.revenue), 0))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * max)
  const px = i => PL + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2)
  const py = v => PT + plotH - (v / max) * plotH

  const pts = data.map((d, i) => [px(i), py(d.revenue)])
  let line = ''
  pts.forEach(([x, y], i) => {
    if (i === 0) { line = `M ${x} ${y}`; return }
    const [x0, y0] = pts[i - 1]
    const cx = (x0 + x) / 2 // horizontal-tangent cubic → smooth, no overshoot
    line += ` C ${cx} ${y0}, ${cx} ${y}, ${x} ${y}`
  })
  const area = `${line} L ${pts[pts.length - 1][0]} ${PT + plotH} L ${pts[0][0]} ${PT + plotH} Z`

  function onMove(e) {
    const box = boxRef.current.getBoundingClientRect()
    const relX = ((e.clientX - box.left) / box.width) * W
    let best = 0
    pts.forEach(([x], i) => { if (Math.abs(x - relX) < Math.abs(pts[best][0] - relX)) best = i })
    setHoverI(best)
    setTip({
      x: (pts[best][0] / W) * box.width,
      y: (pts[best][1] / H) * box.height,
      lines: [data[best].label, `Revenue: ${naira(data[best].revenue)}`, `${data[best].trips} completed trip${data[best].trips === 1 ? '' : 's'}`],
    })
  }

  return (
    <div ref={boxRef} style={{ position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}
        onMouseMove={onMove} onMouseLeave={() => { setTip(null); setHoverI(null) }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.14"/>
            <stop offset="100%" stopColor={GREEN} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={py(t)} y2={py(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth="1"/>
            <text x={PL - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fill={MUTED}
              style={{ fontVariantNumeric:'tabular-nums' }}>{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{d.label}</text>
        ))}
        <path d={area} fill="url(#trendFill)"/>
        <path d={line} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {hoverI != null && (
          <>
            <line x1={pts[hoverI][0]} x2={pts[hoverI][0]} y1={PT} y2={PT + plotH} stroke={AXIS} strokeWidth="1"/>
            <circle cx={pts[hoverI][0]} cy={pts[hoverI][1]} r="5" fill={GREEN} stroke={CARD} strokeWidth="2"/>
          </>
        )}
      </svg>
      <Tooltip tip={tip}/>
    </div>
  )
}

// ── Donut: ride status distribution ──────────────────────────────────────────
function StatusDonut({ data }) {
  const [tip, setTip] = useState(null)
  const boxRef = useRef(null)
  const size = 200, cx = size / 2, cy = size / 2, R = 82, r = 52
  const total = data.reduce((s, d) => s + d.count, 0)

  function arcPath(a0, a1) {
    const p = (rad, ang) => [cx + rad * Math.sin(ang), cy - rad * Math.cos(ang)]
    const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0)
    const big = a1 - a0 > Math.PI ? 1 : 0
    return `M ${x0} ${y0} A ${R} ${R} 0 ${big} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${big} 0 ${x3} ${y3} Z`
  }

  let angle = 0
  const segs = data.filter(d => d.count > 0).map(d => {
    const a0 = angle, a1 = angle + (d.count / total) * Math.PI * 2
    angle = a1
    return { ...d, a0, a1 }
  })

  function showTip(e, d) {
    const box = boxRef.current.getBoundingClientRect()
    setTip({
      x: e.clientX - box.left, y: e.clientY - box.top,
      lines: [STATUS_LABELS[d.status], `${d.count} ride${d.count === 1 ? '' : 's'} · ${Math.round((d.count / total) * 100)}%`],
    })
  }

  return (
    <div ref={boxRef} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
      {total === 0 ? (
        <p style={{ fontSize:13, color:MUTED, padding:'60px 0' }}>No rides yet</p>
      ) : (
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width:180, height:180 }}>
          {segs.length === 1 ? (
            <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none"
              stroke={STATUS_COLORS[segs[0].status]} strokeWidth={R - r}
              onMouseMove={e => showTip(e, segs[0])} onMouseLeave={() => setTip(null)}/>
          ) : segs.map(s => (
            <path key={s.status} d={arcPath(s.a0, s.a1)} fill={STATUS_COLORS[s.status]}
              stroke={CARD} strokeWidth="2"
              onMouseMove={e => showTip(e, s)} onMouseLeave={() => setTip(null)}/>
          ))}
        </svg>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'6px 16px' }}>
        {data.map(d => (
          <div key={d.status} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:10, height:10, borderRadius:3, background:STATUS_COLORS[d.status], flexShrink:0 }}/>
            <span style={{ fontSize:12, color:MUTED }}>{STATUS_LABELS[d.status]}</span>
            <span style={{ fontSize:12, fontWeight:700, color:TEXT }}>{d.count}</span>
          </div>
        ))}
      </div>
      <Tooltip tip={tip}/>
    </div>
  )
}

// ── Columns: rides per day, last 7 days ──────────────────────────────────────
function DailyColumns({ data }) {
  const boxRef = useRef(null)
  const [tip, setTip] = useState(null)
  const W = 520, H = 220, PL = 36, PR = 12, PT = 12, PB = 26
  const plotW = W - PL - PR, plotH = H - PT - PB
  const max = niceMax(Math.max(...data.map(d => d.trips), 0))
  const ticks = [0, 0.5, 1].map(f => Math.round(f * max))
  const band = plotW / data.length
  const barW = Math.min(24, band * 0.5)
  const py = v => PT + plotH - (v / max) * plotH

  function showTip(e, d, x, y) {
    const box = boxRef.current.getBoundingClientRect()
    setTip({ x:(x / W) * box.width, y:(y / H) * box.height,
      lines:[d.label, `${d.trips} trip${d.trips === 1 ? '' : 's'}`] })
  }

  return (
    <div ref={boxRef} style={{ position:'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={py(t)} y2={py(t)} stroke={t === 0 ? AXIS : GRID} strokeWidth="1"/>
            <text x={PL - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fill={MUTED}
              style={{ fontVariantNumeric:'tabular-nums' }}>{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PL + i * band + (band - barW) / 2
          const y = py(d.trips), h = PT + plotH - y
          return (
            <g key={i}>
              {/* wide invisible hit target per band */}
              <rect x={PL + i * band} y={PT} width={band} height={plotH} fill="transparent"
                onMouseMove={e => showTip(e, d, x + barW / 2, y)} onMouseLeave={() => setTip(null)}/>
              {d.trips > 0 && (
                <path d={`M ${x} ${PT + plotH} L ${x} ${y + 4} Q ${x} ${y} ${x + 4} ${y} L ${x + barW - 4} ${y} Q ${x + barW} ${y} ${x + barW} ${y + 4} L ${x + barW} ${PT + plotH} Z`}
                  fill={GREEN} style={{ pointerEvents:'none' }}/>
              )}
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{d.label}</text>
            </g>
          )
        })}
      </svg>
      <Tooltip tip={tip}/>
    </div>
  )
}

// ── Horizontal bars: top routes by trip count ────────────────────────────────
function RouteBars({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  if (data.length === 0) return <p style={{ fontSize:13, color:MUTED, padding:'40px 0', textAlign:'center' }}>No rides yet</p>
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, paddingTop:4 }}>
      {data.map(d => (
        <div key={d.route}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, gap:10 }}>
            <span style={{ fontSize:12.5, color:TEXT, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.route}</span>
            <span style={{ fontSize:12.5, color:MUTED, fontWeight:600, flexShrink:0, fontVariantNumeric:'tabular-nums' }}>{d.count}</span>
          </div>
          <div style={{ height:8, borderRadius:4, background:'#f1f3ee', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(d.count / max) * 100}%`, borderRadius:4, background:GREEN }}/>
          </div>
        </div>
      ))}
    </div>
  )
}

const CATEGORY_TAGS = { ride:'Ride', user:'User', payment:'Payment', route:'Route', admin:'Admin' }

// Flatten the /admin/alerts payload into uniform rows for the Issues card
function alertRows(alerts) {
  if (!alerts) return []
  const timeOf = ts => new Date(ts).toLocaleTimeString('en-NG', { hour:'numeric', minute:'2-digit' })
  return [
    ...alerts.delayedRides.map(r => ({
      key: `d-${r.id}`, title: `${r.pickup} → ${r.destination}`,
      sub: [r.riderName, r.driverName].filter(Boolean).join(' · ') + ` · since ${timeOf(r.since)}`,
      tag: 'Delayed ride', bg:'#fef3f2', fg:'#b42318', bd:'#fecdca',
    })),
    ...alerts.unmatchedRequests.map(r => ({
      key: `u-${r.id}`, title: `${r.pickup} → ${r.destination}`,
      sub: `No driver matched · waiting since ${timeOf(r.since)}`,
      tag: 'Unmatched', bg:'#fffaeb', fg:'#b54708', bd:'#fedf89',
    })),
    ...alerts.lowBalanceRiders.map(u => ({
      key: `l-${u.id}`, title: u.name,
      sub: `Wallet balance ${naira(u.walletBalance)}`,
      tag: 'Low balance', bg:'#fffaeb', fg:'#b54708', bd:'#fedf89',
    })),
  ]
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [error, setError] = useState('')

  const loadedRef = useRef(false)

  useEffect(() => {
    let alive = true
    function load() {
      api.get('/admin/dashboard')
        .then(res => { if (alive) { loadedRef.current = true; setData(res.data); setError('') } })
        .catch(err => { if (alive && !loadedRef.current) setError(err.data?.message || 'Could not load dashboard.') })
      api.get('/admin/alerts')
        .then(res => { if (alive) setAlerts(res.data) })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 30000) // keep "Recent Activity" fresh
    return () => { alive = false; clearInterval(t) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const two = { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16, marginBottom:16 }

  return (
    <AdminLayout title="Dashboard">
      <p style={{ color:MUTED, fontSize:14, marginBottom:20 }}>Ride analytics and activity overview.</p>

      {error && (
        <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:20 }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:13, color:'#ef4444', margin:0 }}>{error}</p>
        </div>
      )}

      {!data ? (
        !error && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
            <div style={{ width:26, height:26, border:'3px solid #ccff00', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )
      ) : (
        <>
          {/* ── Overview stat cards ─────────────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:16, marginBottom:16 }} className="dash-stat-grid">
            <StatCard icon={<TrendingUp size={16}/>} label="Total Revenue" value={naira(data.stats.totalRevenue)}
              sub={`${data.stats.completedTrips} completed trip${data.stats.completedTrips === 1 ? '' : 's'}`}/>
            <StatCard icon={<Users size={16}/>} label="Active Riders" value={data.stats.activeRiders}
              sub={`${data.stats.pendingApprovals} pending approval`}/>
            <StatCard icon={<Car size={16}/>} label="Active Drivers" value={data.stats.activeDrivers}
              sub={`${data.stats.driversOnline} online now`}/>
            <StatCard icon={<Navigation size={16}/>} label="Trips Today" value={data.stats.tripsToday}
              sub={`${data.stats.ongoingTrips} ongoing · ${data.stats.pendingRequests} pending`}/>
          </div>

          {alertRows(alerts).length > 0 && (
            <Card style={{ marginBottom:16, border:'1px solid #fecdca' }}>
              <CardHeader
                title={<span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                  <AlertTriangle size={16} color="#dc2626"/>
                  {alertRows(alerts).length} issue{alertRows(alerts).length !== 1 ? 's' : ''} need attention
                </span>}
                viewAll="/admin/alerts"/>
              {alertRows(alerts).slice(0, 6).map((a, i) => (
                <div key={a.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0',
                  borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13.5, fontWeight:700, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {a.title}
                    </p>
                    <p style={{ fontSize:12, color:MUTED, margin:'3px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.sub}</p>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:50,
                    background:a.bg, color:a.fg, border:`1px solid ${a.bd}`, flexShrink:0 }}>{a.tag}</span>
                </div>
              ))}
              {alertRows(alerts).length > 6 && (
                <p style={{ fontSize:12, color:MUTED, margin:'10px 0 0' }}>
                  +{alertRows(alerts).length - 6} more — see Alerts for the full list
                </p>
              )}
            </Card>
          )}

          {/* ── Trend + status distribution ────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 2fr) minmax(280px, 1fr)', gap:16, marginBottom:16 }}
            className="dash-trend-row">
            <Card>
              <CardHeader title="Revenue Trend" sub="Completed-ride fares · last 6 months" icon={<BarChart3 size={15}/>}/>
              <AreaTrend data={data.revenueTrend}/>
            </Card>
            <Card>
              <CardHeader title="Ride Status" sub="Distribution by status" icon={<PieChart size={15}/>}/>
              <StatusDonut data={data.statusDist}/>
            </Card>
          </div>

          {/* ── Weekly volume + top routes ─────────────────────────────── */}
          <div style={two}>
            <Card>
              <CardHeader title="Rides This Week" sub="Trips per day · last 7 days" icon={<BarChart3 size={15}/>}/>
              <DailyColumns data={data.ridesPerDay}/>
            </Card>
            <Card>
              <CardHeader title="Top Routes" sub="Most-ridden pickup → destination" icon={<Navigation size={15}/>}/>
              <RouteBars data={data.topRoutes}/>
            </Card>
          </div>

          {/* ── Recent rides + top drivers ─────────────────────────────── */}
          <div style={two}>
            <Card>
              <CardHeader title="Recent Rides" viewAll="/admin/rides"/>
              {data.recentRides.length === 0 ? (
                <p style={{ fontSize:13, color:MUTED, padding:'30px 0', textAlign:'center' }}>No rides yet</p>
              ) : data.recentRides.map((r, i) => {
                const pill = rideStatusPill(r.status)
                return (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0',
                    borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13.5, fontWeight:700, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.pickup} → {r.destination}
                      </p>
                      <p style={{ fontSize:12, color:MUTED, margin:'3px 0 0' }}>
                        {r.riderName || 'Unknown rider'}{r.fare ? ` · ${naira(r.fare)}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:50,
                      background:pill.bg, color:pill.fg, border:`1px solid ${pill.bd}`, flexShrink:0 }}>{pill.label}</span>
                  </div>
                )
              })}
            </Card>
            <Card>
              <CardHeader title="Drivers" viewAll="/admin/drivers"/>
              {data.topDrivers.length === 0 ? (
                <p style={{ fontSize:13, color:MUTED, padding:'30px 0', textAlign:'center' }}>No drivers yet</p>
              ) : data.topDrivers.map((d, i) => (
                <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0',
                  borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#ccff00', color:'#243800',
                    display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, flexShrink:0 }}>
                    {(d.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13.5, fontWeight:700, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</p>
                    <p style={{ fontSize:12, color:MUTED, margin:'3px 0 0' }}>
                      {d.vehicle || 'No vehicle on file'} · {d.trips} trip{d.trips === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 10px', borderRadius:50, flexShrink:0,
                    background: d.isOnline ? '#ecfdf3' : '#f3f4f6',
                    color: d.isOnline ? '#027a48' : MUTED,
                    border: `1px solid ${d.isOnline ? '#abefc6' : BORDER}` }}>
                    {d.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </Card>
          </div>

          {/* ── Recent activity ────────────────────────────────────────── */}
          <Card>
            <CardHeader title="Recent Activity" sub="Latest events across the platform"/>
            {data.recentActivity.length === 0 ? (
              <p style={{ fontSize:13, color:MUTED, padding:'30px 0', textAlign:'center' }}>No activity yet</p>
            ) : data.recentActivity.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 0',
                borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}>
                <Clock size={16} color={MUTED} style={{ flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:700, color:TEXT, margin:0 }}>{a.action}</p>
                  <p style={{ fontSize:12, color:MUTED, margin:'3px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {a.actor}{a.detail ? ` · ${a.detail}` : ''} · {new Date(a.at).toLocaleString('en-NG')}
                  </p>
                </div>
                <span style={{ fontSize:11.5, fontWeight:600, padding:'3px 10px', borderRadius:50,
                  background:'#f3f4f6', color:MUTED, border:`1px solid ${BORDER}`, flexShrink:0 }}>
                  {CATEGORY_TAGS[a.category] || a.category}
                </span>
              </div>
            ))}
          </Card>

          <style>{`
            @media (max-width: 900px) { .dash-trend-row { grid-template-columns: 1fr !important; } }
            @media (max-width: 520px) { .dash-stat-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </>
      )}
    </AdminLayout>
  )
}
