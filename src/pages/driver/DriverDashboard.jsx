import React, { useState, useRef, useEffect } from 'react'
import {
  MapPin, Users, Clock,
  Sun, Moon, ChevronDown, ArrowRight, Check,
  Wifi, ChevronRight, AlertCircle, UserCheck,
  Phone, MessageSquare, CheckCircle,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import RouteMap from '../../components/RouteMap'
import ActiveRideMap from '../../components/ActiveRideMap'
import ChatModal from '../../components/ChatModal'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900', BG='#f0f5e0'

// ── Route data ────────────────────────────────────────────────────────────────
const MORNING_SLOTS = [
  '5:00 AM','5:30 AM','6:00 AM','6:30 AM','7:00 AM',
  '7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM',
]
const EVENING_SLOTS = [
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM',
  '5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM',
]


// ── Active-ride stage mapping (mirrors the old standalone ActiveRide page) ────
const STAGES = ['Heading to pickup','Arrived at pickup','Trip in progress','Trip completed']
const STATUS_TO_STAGE = {
  pending:         0,
  driver_assigned: 0,
  arrived_pickup:  1,
  in_transit:      2,
  completed:       3,
}
const NEXT_STATUS = ['arrived_pickup', 'in_transit', 'completed']

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCountdown(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2,'0')}`
}

// ── Reusable Dropdown ─────────────────────────────────────────────────────────
function Dropdown({ options, value, onChange, placeholder, icon }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function outside(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12,
          border:`1.5px solid ${open ? NEON : BORDER}`, background:CARD, cursor:'pointer',
          textAlign:'left', fontFamily:'inherit', transition:'border-color 0.2s' }}>
        {icon && <span style={{ color:MUTED, flexShrink:0 }}>{icon}</span>}
        <span style={{ flex:1, fontSize:14, color:value ? TEXT : MUTED, fontWeight:value ? 600 : 400 }}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} color={MUTED} style={{ transform:open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:CARD,
          border:`1.5px solid ${BORDER}`, borderRadius:12, boxShadow:'0 8px 24px rgba(36,56,0,0.12)',
          zIndex:200, maxHeight:220, overflowY:'auto' }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 14px', border:'none', background:'transparent', cursor:'pointer',
                fontSize:14, color:TEXT, fontWeight:value===opt ? 700 : 400, textAlign:'left',
                fontFamily:'inherit', transition:'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = BG}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {opt}
              {value===opt && <Check size={14} color={MOSS}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Rider match card ──────────────────────────────────────────────────────────
function RiderCard({ rider }) {
  const initials = (rider.riderName||'R').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
      background:BG, borderRadius:12, border:`1.5px solid ${BORDER}`, marginBottom:8 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', background:NEON, display:'flex',
        alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontWeight:800, fontSize:15, color:OLIVE }}>{initials}</span>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:700, fontSize:14, color:TEXT }}>{rider.riderName}</p>
        <p style={{ fontSize:12, color:MUTED, marginTop:2 }}>
          {rider.pickup} → {rider.dropoff} · waiting since {rider.waitingSince}
        </p>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontSize:12, color:MUTED }}>⭐ {rider.riderRating.toFixed(1)}</p>
        <span style={{ fontSize:11, fontWeight:700, background:NEON, color:OLIVE, padding:'2px 8px', borderRadius:20 }}>
          {rider.service}
        </span>
      </div>
    </div>
  )
}

// ── Online/offline toggle — shown in place of the page title ──────────────────
function OnlineToggle({ online, busy, onToggle }) {
  return (
    <button onClick={onToggle} disabled={busy} aria-pressed={online}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 14px 5px 6px', borderRadius:50,
        border:'none', cursor:busy ? 'not-allowed' : 'pointer', fontFamily:'inherit',
        background:online ? NEON : '#e5e7eb', color:online ? OLIVE : '#374151',
        fontWeight:800, fontSize:13, transition:'background 0.2s', opacity:busy ? 0.7 : 1 }}>
      <span style={{ position:'relative', width:34, height:18, borderRadius:20, flexShrink:0,
        background:online ? OLIVE : '#9ca3af', transition:'background 0.2s' }}>
        <span style={{ position:'absolute', top:2, left:online ? 18 : 2, width:14, height:14,
          borderRadius:'50%', background:'#fff', transition:'left 0.2s',
          boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
      </span>
      {busy ? 'Updating…' : online ? "You're Online" : 'Go Online'}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DriverDashboard() {
  const { user } = useAuth()

  // Online status — drivers are only matchable with riders while online
  const [online, setOnline]   = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [onlineError, setOnlineError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    api.get('/driver/status')
      .then(res => setOnline(res.data.online))
      .catch(err => setOnlineError(err.data?.message || 'Could not load your online status.'))
  }, [])

  async function handleToggleOnline() {
    if (togglingOnline) return
    const next = !online
    setTogglingOnline(true)
    setOnlineError('')
    try {
      await api.patch('/driver/status', { online: next })
      setOnline(next)
      // Going offline ends any live route on the backend — mirror that locally
      if (!next) {
        setMatchPhase('idle')
        setAvailabilityId(null)
        setCurrentPickup('')
        setMatchedRiders([])
      }
    } catch (err) {
      setOnlineError(err.data?.message || 'Could not update your status. Please try again.')
    } finally { setTogglingOnline(false) }
  }

  // Route form
  const [period, setPeriod]   = useState('morning')
  const [timeSlot, setTimeSlot] = useState('')
  const [pickup, setPickup]   = useState('')
  const [dropoff, setDropoff] = useState('')
  const [seats, setSeats]     = useState('')

  // Active, priced routes for the selected period — replaces the old hardcoded
  // location arrays. Pickup/dropoff dropdowns are derived from this.
  const [routes, setRoutes] = useState([])
  const [routesLoading, setRoutesLoading] = useState(true)

  useEffect(() => {
    setRoutesLoading(true)
    api.get(`/routes?period=${period}`)
      .then(res => setRoutes(res.data.routes))
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false))
  }, [period])

  // If the chosen pickup no longer offers the currently-selected dropoff,
  // clear it (e.g. period switched, or that pair isn't priced).
  useEffect(() => {
    const validDropoffs = routes.filter(r => !pickup || r.pickup === pickup).map(r => r.dropoff)
    if (dropoff && !validDropoffs.includes(dropoff)) setDropoff('')
  }, [pickup, routes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Matching state machine: 'idle' | 'matching' | 'no-riders' | 'matched'
  const [matchPhase, setMatchPhase]       = useState('idle')
  const [availabilityId, setAvailabilityId] = useState(null)
  const [currentPickup, setCurrentPickup] = useState('')
  const [matchedRiders, setMatchedRiders] = useState([])
  const [countdown, setCountdown]         = useState(180)
  const [goLiveError, setGoLiveError]     = useState(null)
  const [isGoingLive, setIsGoingLive]     = useState(false)
  const [confirming, setConfirming]       = useState(false)

  // Active ride — once a route is confirmed, this page turns into the active-ride view
  const [activeRideId, setActiveRideId] = useState(undefined) // undefined = checking, null = none
  const [ride, setRide] = useState(null)
  const [rideLoading, setRideLoading] = useState(false)
  const [rideError, setRideError] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const [showRideChat, setShowRideChat] = useState(false)

  // Resolve any ride already in progress (e.g. on page reload mid-trip)
  useEffect(() => {
    api.get('/rides/me/active')
      .then(res => setActiveRideId(res.data.rideId))
      .catch(() => setActiveRideId(null))
  }, [])

  async function loadActiveRide(id) {
    setRideLoading(true)
    try {
      const res = await api.get(`/rides/${id}`)
      setRide(res.data.ride)
      setRideError('')
    } catch (err) {
      setRideError(err.data?.message || 'Could not load this ride.')
    } finally {
      setRideLoading(false)
    }
  }

  useEffect(() => {
    if (activeRideId) loadActiveRide(activeRideId)
  }, [activeRideId])

  const stage = ride ? (STATUS_TO_STAGE[ride.status] ?? 0) : 0
  const tripDone = ride?.status === 'completed'

  async function advanceRide() {
    if (!ride || advancing || stage >= NEXT_STATUS.length) return
    setAdvancing(true)
    try {
      await api.patch(`/rides/${activeRideId}/status`, { status: NEXT_STATUS[stage] })
      await loadActiveRide(activeRideId)
    } catch (err) {
      setRideError(err.data?.message || 'Could not update ride status.')
    } finally {
      setAdvancing(false)
    }
  }

  // Trip's over (or driver backs out) — return to the default Daily Drive view
  function backToDailyDrive() {
    setActiveRideId(null)
    setRide(null)
    setRideError('')
    setMatchPhase('idle')
    setAvailabilityId(null)
    setCurrentPickup('')
    setMatchedRiders([])
    setPickup('')
    setDropoff('')
    setSeats('')
    setTimeSlot('')
  }

  const slots         = period === 'morning' ? MORNING_SLOTS : EVENING_SLOTS
  const pickupOptions = [...new Set(routes.map(r => r.pickup))].sort()
  const dropoffOptions = [...new Set(
    routes.filter(r => !pickup || r.pickup === pickup).map(r => r.dropoff)
  )].sort()
  const canGoLive     = timeSlot && pickup && dropoff && seats

  // "Next stop in the chain" is now computed server-side (single source of
  // truth) — peek at it here just to show the preview in the no-riders UI.
  const [nextPickupPreview, setNextPickupPreview] = useState(null)
  useEffect(() => {
    if (matchPhase !== 'no-riders' || !availabilityId) { setNextPickupPreview(null); return }
    api.get(`/driver/next-pickup?availabilityId=${availabilityId}`)
      .then(res => setNextPickupPreview(res.data.newPickup))
      .catch(() => setNextPickupPreview(null))
  }, [matchPhase, availabilityId])

  // ── Polling effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (matchPhase !== 'matching' || !availabilityId) return

    let cancelled = false

    async function poll() {
      if (cancelled) return
      try {
        const res = await api.get(`/driver/matches?availabilityId=${availabilityId}`)
        if (!cancelled && res.data.count > 0) {
          setMatchedRiders(res.data.matches)
          setMatchPhase('matched')
        }
      } catch { /* silently continue polling */ }
    }

    poll() // immediate first check
    const pollId = setInterval(poll, 8000)

    // Countdown tick
    const cntId = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)

    // 3-minute timeout → no-riders
    const timerId = setTimeout(() => {
      if (!cancelled) setMatchPhase('no-riders')
    }, 180_000)

    return () => {
      cancelled = true
      clearInterval(pollId)
      clearInterval(cntId)
      clearTimeout(timerId)
    }
  }, [matchPhase, availabilityId])

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleGoLive() {
    if (!canGoLive || isGoingLive) return
    setGoLiveError(null)
    setIsGoingLive(true)
    try {
      const res = await api.post('/driver/go-live', {
        period, timeSlot, pickup, dropoff, seats: parseInt(seats, 10),
      })
      setAvailabilityId(res.data.availabilityId)
      setCurrentPickup(pickup)
      setCountdown(180)
      setMatchPhase('matching')
    } catch (err) {
      setGoLiveError(err.data?.message || 'Could not go live. Check your connection.')
    } finally {
      setIsGoingLive(false)
    }
  }

  async function handleExpand() {
    try {
      const res = await api.post('/driver/expand-pickup', { availabilityId })
      if (!res.data.newPickup) { handleGoOffline(); return }
      setCurrentPickup(res.data.newPickup)
      setCountdown(180)
      setMatchPhase('matching')
    } catch {
      setGoLiveError('Could not expand pickup. Please try again.')
    }
  }

  async function handleConfirmRoute() {
    if (confirming) return
    setConfirming(true)
    setGoLiveError(null)
    try {
      const res = await api.post('/driver/confirm-route', { availabilityId })
      // Turn this same page into the active-ride view instead of navigating away
      setActiveRideId(res.data.rideId)
    } catch (err) {
      setGoLiveError(err.data?.message || 'Could not start this route. The rider may no longer be available.')
      setConfirming(false)
    }
  }

  async function handleGoOffline() {
    if (availabilityId) {
      try { await api.post('/driver/go-offline', { availabilityId }) } catch {}
    }
    setMatchPhase('idle')
    setAvailabilityId(null)
    setCurrentPickup('')
    setMatchedRiders([])
    setPickup('')
    setDropoff('')
    setSeats('')
    setTimeSlot('')
  }

  // ── Render: matching phase ────────────────────────────────────────────────
  function renderMatching() {
    const nextPickup = nextPickupPreview
    const pct = Math.round((countdown / 180) * 100)

    if (matchPhase === 'matching') {
      return (
        <div style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:16, padding:24,
          marginBottom:16, boxShadow:'0 4px 16px rgba(36,56,0,0.08)', textAlign:'center' }}>
          {/* Animated ring */}
          <div style={{ position:'relative', width:88, height:88, margin:'0 auto 16px' }}>
            <svg width="88" height="88" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
              <circle cx="44" cy="44" r="38" fill="none" stroke={BORDER} strokeWidth="5"/>
              <circle cx="44" cy="44" r="38" fill="none" stroke={NEON} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - pct / 100)}`}
                strokeLinecap="round"
                style={{ transition:'stroke-dashoffset 1s linear' }}/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontWeight:900, fontSize:16, color:OLIVE, letterSpacing:'-0.02em' }}>
                {fmtCountdown(countdown)}
              </span>
            </div>
          </div>

          {/* Pulsing dot */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:NEON,
              animation:'feazi-pulse 1.2s ease-in-out infinite' }}/>
            <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>Matching you with riders…</p>
          </div>
          <p style={{ fontSize:13, color:MUTED, marginBottom:16 }}>
            Finding riders on <strong style={{ color:OLIVE }}>{currentPickup} → {dropoff}</strong> at <strong style={{ color:OLIVE }}>{timeSlot}</strong>
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14,
            padding:'10px 14px', background:CARD, borderRadius:10, border:`1px solid ${BORDER}`, marginBottom:16, fontSize:13 }}>
            <span style={{ color:MUTED }}>{seats} seat{seats==='1'?'':'s'} available</span>
            <span style={{ color:BORDER }}>·</span>
            <span style={{ color:MUTED }}>{period === 'morning' ? '☀️ Morning' : 'Evening'}</span>
          </div>
          <button onClick={() => setShowCancelConfirm(true)}
            style={{ padding:'10px 24px', borderRadius:10, border:`1.5px solid ${BORDER}`,
              background:CARD, color:MUTED, fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            Cancel Search
          </button>
        </div>
      )
    }

    if (matchPhase === 'no-riders') {
      return (
        <div style={{ background:CARD, border:`1.5px solid #fca5a5`, borderRadius:16, padding:24,
          marginBottom:16, boxShadow:'0 4px 16px rgba(239,68,68,0.08)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#fef2f2',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <AlertCircle size={20} color="#ef4444"/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:4 }}>
                No riders found at {currentPickup}
              </p>
              <p style={{ fontSize:13, color:MUTED }}>
                No one is waiting at this stop for <strong>{timeSlot}</strong> on the <strong>{currentPickup} → {dropoff}</strong> route.
              </p>
            </div>
          </div>

          {nextPickup ? (
            <>
              <div style={{ background:BG, border:`1.5px solid ${BORDER}`, borderRadius:12,
                padding:'14px 16px', marginBottom:14 }}>
                <p style={{ fontSize:12, color:MUTED, fontWeight:600, textTransform:'uppercase',
                  letterSpacing:'0.05em', marginBottom:6 }}>Next Available Stop</p>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <MapPin size={15} color={MOSS}/>
                  <span style={{ fontWeight:700, fontSize:15, color:OLIVE }}>{nextPickup}</span>
                  <ChevronRight size={14} color={MUTED}/>
                  <span style={{ fontSize:13, color:MUTED }}>{dropoff}</span>
                </div>
              </div>
              <p style={{ fontSize:13, color:MUTED, marginBottom:14 }}>
                Would you like to pick up riders from <strong style={{ color:OLIVE }}>{nextPickup}</strong> instead?
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={handleExpand}
                  style={{ flex:2, padding:'12px', borderRadius:12, background:NEON, color:OLIVE,
                    fontWeight:800, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit',
                    boxShadow:'0 4px 12px rgba(204,255,0,0.3)' }}>
                  Yes, try {nextPickup}
                </button>
                <button onClick={handleGoOffline}
                  style={{ flex:1, padding:'12px', borderRadius:12, background:CARD,
                    border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:600, fontSize:14,
                    cursor:'pointer', fontFamily:'inherit' }}>
                  Stop for today
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize:13, color:MUTED, marginBottom:14 }}>
                No riders found on this route today. You've reached the end of the route chain.
              </p>
              <button onClick={handleGoOffline}
                style={{ width:'100%', padding:'12px', borderRadius:12, background:CARD,
                  border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:600, fontSize:14,
                  cursor:'pointer', fontFamily:'inherit' }}>
                Go Offline
              </button>
            </>
          )}
        </div>
      )
    }

    if (matchPhase === 'matched') {
      return (
        <div style={{ background:CARD, border:`1.5px solid ${NEON}`, borderRadius:16, padding:20,
          marginBottom:16, boxShadow:'0 4px 16px rgba(204,255,0,0.2)' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:NEON,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <UserCheck size={18} color={OLIVE}/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:TEXT }}>
                {matchedRiders.length} rider{matchedRiders.length !== 1 ? 's' : ''} matched!
              </p>
              <p style={{ fontSize:12, color:MUTED }}>
                {currentPickup} → {dropoff} · {timeSlot}
              </p>
            </div>
            <button onClick={handleGoOffline}
              style={{ marginLeft:'auto', fontSize:12, fontWeight:600, color:MUTED,
                background:'none', border:`1px solid ${BORDER}`, borderRadius:8,
                padding:'4px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>

          {matchedRiders.map(r => <RiderCard key={r.id} rider={r}/>)}

          {goLiveError && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2',
              border:'1px solid #fca5a5', borderRadius:10, marginBottom:12 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:13, color:'#ef4444' }}>{goLiveError}</p>
            </div>
          )}

          <button onClick={handleConfirmRoute} disabled={confirming}
            style={{ width:'100%', marginTop:6, padding:'13px', borderRadius:12, background:OLIVE,
              color:NEON, fontWeight:800, fontSize:14, border:'none', cursor:confirming?'not-allowed':'pointer',
              fontFamily:'inherit', opacity:confirming?0.7:1 }}>
            {confirming ? 'Starting route…' : 'Confirm & Start Route'}
          </button>
        </div>
      )
    }

    return null
  }

  // ── Render: active ride (route confirmed — trip in progress) ──────────────
  function renderActiveRide() {
    if (rideLoading && !ride) {
      return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        </div>
      )
    }

    if (rideError && !ride) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', padding:24 }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom:12 }}/>
          <p style={{ color:TEXT, fontWeight:700, marginBottom:6 }}>{rideError}</p>
          <button onClick={backToDailyDrive}
            style={{ marginTop:14, padding:'10px 22px', borderRadius:50, background:NT, color:NEON,
              fontWeight:700, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            Back to Daily Drive
          </button>
        </div>
      )
    }

    if (!ride) return null
    const rider = ride.rider || { name: 'Rider', phone: '' }

    if (tripDone) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, textAlign:'center', padding:24 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:NT, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
            <CheckCircle size={40} color={NEON}/>
          </div>
          <h2 style={{ fontSize:24, fontWeight:900, color:TEXT, marginBottom:8, letterSpacing:'-0.02em' }}>Trip Completed!</h2>
          <p style={{ color:MUTED, fontSize:15, marginBottom:8 }}>Fare collected</p>
          <p style={{ fontSize:36, fontWeight:900, color:NT, letterSpacing:'-0.03em', marginBottom:32, background:NEON, display:'inline-block', padding:'4px 24px', borderRadius:14 }}>
            ₦{ride.fare.toLocaleString()}
          </p>
          <button onClick={backToDailyDrive}
            style={{ padding:'13px 32px', borderRadius:50, background:NT, color:NEON, fontWeight:700, fontSize:15, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            Back to Daily Drive
          </button>
        </div>
      )
    }

    return (
      <>
        {showRideChat && (
          <ChatModal rideId={activeRideId} title={rider.name} onClose={() => setShowRideChat(false)}/>
        )}

        <ActiveRideMap pickup={ride.pickup} dropoff={ride.destination}/>

        {rideError && (
          <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:13, color:'#ef4444' }}>{rideError}</p>
          </div>
        )}

        {/* Stage indicator */}
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:'16px 20px', marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <p style={{ fontWeight:700, fontSize:14, color:TEXT }}>Current Stage</p>
            <p style={{ fontSize:13, fontWeight:700, color:NT, background:NEON, padding:'2px 10px', borderRadius:20 }}>{stage+1} / {STAGES.length}</p>
          </div>
          <div style={{ height:6, borderRadius:6, background:BORDER, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', background:NEON, borderRadius:6, width:`${((stage+1)/STAGES.length)*100}%`, transition:'width 0.4s ease' }}/>
          </div>
          <p style={{ color:TEXT, fontWeight:700, fontSize:15 }}>{STAGES[stage]}</p>
        </div>

        {/* Rider card */}
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div style={{ width:48, height:48, borderRadius:12, background:NT, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:NEON, fontWeight:800, fontSize:20 }}>{rider.name[0]}</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ color:TEXT, fontWeight:700, fontSize:15 }}>{rider.name}</p>
              <p style={{ fontSize:13, color:MUTED, marginTop:2 }}>{ride.pickup} → {ride.destination}</p>
            </div>
            <p style={{ fontWeight:900, fontSize:18, color:NT, background:NEON, padding:'4px 12px', borderRadius:10 }}>₦{ride.fare.toLocaleString()}</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <a href={rider.phone ? `tel:${rider.phone}` : undefined} aria-disabled={!rider.phone}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, background:NT, color:NEON, fontWeight:700, fontSize:14, textDecoration:'none', opacity:rider.phone?1:0.5, pointerEvents:rider.phone?'auto':'none' }}>
              <Phone size={15}/> Call
            </a>
            <button onClick={() => setShowRideChat(true)}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px', borderRadius:12, background:CARD, border:`1.5px solid ${BORDER}`, color:TEXT, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              <MessageSquare size={15}/> Chat
            </button>
          </div>
        </div>

        <button onClick={advanceRide} disabled={advancing}
          style={{ width:'100%', padding:'15px', borderRadius:50, background:NT, color:NEON, fontWeight:700, fontSize:15, border:'none', cursor:advancing?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:advancing?0.7:1 }}>
          {advancing ? 'Updating…' : stage<STAGES.length-1 ? `✓ ${STAGES[stage+1]}` : 'Complete Trip & Collect Fare'}
        </button>
      </>
    )
  }

  const isActiveRide = !!activeRideId

  return (
    <AppLayout title={isActiveRide ? 'Active Ride' : <OnlineToggle online={online} busy={togglingOnline} onToggle={handleToggleOnline}/>}>

      {isActiveRide ? renderActiveRide() : (
        <>
          {showCancelConfirm && (
            <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
              onClick={() => setShowCancelConfirm(false)}>
              <div onClick={e => e.stopPropagation()}
                style={{ background:CARD, borderRadius:16, padding:24, maxWidth:340, width:'100%',
                  boxShadow:'0 12px 32px rgba(0,0,0,0.2)', textAlign:'center' }}>
                <p style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:8 }}>Cancel search?</p>
                <p style={{ fontSize:13, color:MUTED, marginBottom:20, lineHeight:1.5 }}>
                  Are you sure you want to cancel the search? You'll stop matching with riders on this route.
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setShowCancelConfirm(false)}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${BORDER}`,
                      background:CARD, color:TEXT, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                    No
                  </button>
                  <button onClick={() => { setShowCancelConfirm(false); handleGoOffline() }}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:'none',
                      background:OLIVE, color:NEON, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}

          <RouteMap pickup={pickup} dropoff={dropoff}/>

          {onlineError && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2',
              border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:13, color:'#ef4444' }}>{onlineError}</p>
            </div>
          )}

          {/* ── Matching states or route form — only while online ── */}
          {!online ? (
            <div style={{ background:BG, border:`1.5px dashed ${BORDER}`, borderRadius:16, padding:24,
              textAlign:'center', marginBottom:16 }}>
              <Wifi size={28} color={BORDER} style={{ marginBottom:10 }}/>
              <p style={{ fontWeight:700, fontSize:14, color:TEXT, marginBottom:4 }}>You're offline</p>
              <p style={{ fontSize:13, color:MUTED }}>Go online above to set your route and start receiving bookings.</p>
            </div>
          ) : matchPhase !== 'idle'
            ? renderMatching()
            : (
                <div style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:16, padding:20,
                  marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>

                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <div style={{ width:4, height:20, borderRadius:2, background:NEON }}/>
                    <p style={{ fontWeight:800, fontSize:14, color:OLIVE, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      Set Departure & Route
                    </p>
                  </div>

                  {/* Morning / Evening */}
                  <p style={{ fontSize:12, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                    Departure Time
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                    {[
                      { val:'morning', icon:<Sun size={16}/>,  label:'Morning', range:'5 AM – 10 AM' },
                      { val:'evening', icon:<Moon size={16}/>, label:'Evening', range:'3 PM – 8 PM' },
                    ].map(({ val, icon, label, range }) => (
                      <button key={val}
                        onClick={() => { setPeriod(val); setTimeSlot(''); setPickup(''); setDropoff('') }}
                        style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12,
                          border:`1.5px solid ${period===val ? NEON : BORDER}`,
                          background:period===val ? NEON : CARD,
                          cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.2s' }}>
                        <span style={{ color:period===val ? OLIVE : MUTED }}>{icon}</span>
                        <div>
                          <p style={{ fontWeight:800, fontSize:14, color:period===val ? OLIVE : TEXT }}>{label}</p>
                          <p style={{ fontSize:11, color:period===val ? 'rgba(36,56,0,0.55)' : MUTED, marginTop:1 }}>{range}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Time slot */}
                  <div style={{ marginBottom:14 }}>
                    <Dropdown options={slots} value={timeSlot} onChange={setTimeSlot}
                      placeholder="Select a time slot" icon={<Clock size={15}/>}/>
                  </div>

                  {/* Available seats */}
                  <p style={{ fontSize:12, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                    Available Seats
                  </p>
                  <div style={{ marginBottom:14 }}>
                    <Dropdown options={['1','2','3','4','5','6','7','8']} value={seats} onChange={setSeats}
                      placeholder="How many seats are available?" icon={<Users size={15}/>}/>
                  </div>

                  {/* Route */}
                  <p style={{ fontSize:12, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                    Your Route
                  </p>

                  <p style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Pickup Location</p>
                  <div style={{ marginBottom:10 }}>
                    <Dropdown options={pickupOptions} value={pickup} onChange={setPickup}
                      placeholder={routesLoading ? 'Loading…' : 'Select pickup location'} icon={<MapPin size={15}/>}/>
                  </div>

                  <p style={{ fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>Drop-off Location</p>
                  <div style={{ marginBottom:16 }}>
                    <Dropdown options={dropoffOptions} value={dropoff} onChange={setDropoff}
                      placeholder={routesLoading ? 'Loading…' : 'Select drop-off location'} icon={<MapPin size={15}/>}/>
                  </div>

                  {/* Preview pill */}
                  {pickup && dropoff && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                      background:BG, border:`1px solid ${BORDER}`, borderRadius:10, marginBottom:14 }}>
                      <MapPin size={13} color={MUTED}/>
                      <span style={{ fontSize:13, fontWeight:600, color:TEXT }}>{pickup}</span>
                      <ArrowRight size={13} color={MUTED}/>
                      <MapPin size={13} color={MOSS}/>
                      <span style={{ fontSize:13, fontWeight:700, color:OLIVE }}>{dropoff}</span>
                    </div>
                  )}

                  {goLiveError && (
                    <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2',
                      border:'1px solid #fca5a5', borderRadius:10, marginBottom:12 }}>
                      <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
                      <p style={{ fontSize:13, color:'#ef4444' }}>{goLiveError}</p>
                    </div>
                  )}

                  <button onClick={handleGoLive} disabled={!canGoLive || isGoingLive}
                    style={{ width:'100%', padding:'13px', borderRadius:12,
                      background:canGoLive ? NEON : BORDER,
                      color:canGoLive ? OLIVE : MUTED,
                      fontWeight:800, fontSize:14, border:'none',
                      cursor:canGoLive ? 'pointer' : 'not-allowed',
                      fontFamily:'inherit', transition:'all 0.2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      boxShadow:canGoLive ? '0 4px 12px rgba(204,255,0,0.3)' : 'none' }}>
                    {isGoingLive
                      ? <><span style={{ width:16, height:16, border:'2px solid rgba(36,56,0,0.3)', borderTopColor:OLIVE, borderRadius:'50%', animation:'feazi-spin 0.8s linear infinite', display:'inline-block' }}/> Going live…</>
                      : <><Wifi size={16}/>Go Live on This Route</>
                    }
                  </button>
              </div>
            )}
        </>
      )}

      <style>{`
        @keyframes feazi-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(1.5); }
        }
        @keyframes feazi-spin {
          to { transform:rotate(360deg); }
        }
        @keyframes spin {
          to { transform:rotate(360deg); }
        }
      `}</style>
    </AppLayout>
  )
}
