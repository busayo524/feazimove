import { CARD, BORDER, TEXT, MUTED, BG, ACCENT as OLIVE, MOSS, NEON, ON_NEON, ON_NEON_HARD, INVERT, DANGER_SOFT, NEON_SOFT } from '../../theme/palette'
import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Users, Clock,
  Sun, ChevronDown, Check,
  Wifi, ChevronRight, AlertCircle, UserCheck,
  Phone, MessageSquare, CheckCircle, X,
  CalendarDays, CalendarCheck, Trash2, Zap,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import ActiveRideMap from '../../components/ActiveRideMap'
import ChatModal from '../../components/ChatModal'
import PersonAvatar from '../../components/PersonAvatar'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { track } from '../../services/analytics'
import { useStopCoords } from '../../hooks/useStopCoords'
import { useUnreadChat } from '../../hooks/useUnreadChat'
import { usePanelPlacement, MERIDIEMS, slotsForMeridiem } from '../../components/RouteDropdowns'
import ScheduleDatePicker, { formatScheduleDate } from '../../components/ScheduleDatePicker'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */


// ── Active-ride stage mapping (mirrors the old standalone ActiveRide page) ────
const STAGES = ['Heading to pickup','Arrived at pickup','Heading to destination','Trip completed']
const STATUS_TO_STAGE = {
  pending:         0,
  driver_assigned: 0,
  arrived_pickup:  1,
  in_transit:      2,
  completed:       3,
}
const NEXT_STATUS = ['arrived_pickup', 'in_transit', 'completed']

// ── One rider row in the active-pool list ─────────────────────────────────────
// Its own component so each rider's unread-chat hook is legal (hooks can't
// run inside a loop in the parent). Stays compact so several riders fit on
// a phone screen without scrolling past the stage button.
function PoolRiderCard({ ride, stage, showRoute, onOpenChat }) {
  const rider = ride.rider || { name: 'Rider', phone: '' }
  const { hasUnread, markSeen } = useUnreadChat(ride.id)
  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:8, marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: stage < 2 ? 8 : 0 }}>
        <PersonAvatar userId={rider.id} name={rider.name} size={32} fontSize={13} radius={9}/>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:TEXT, fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rider.name}</p>
          {showRoute && (
            <p style={{ fontSize:12.5, color:MUTED, marginTop:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ride.pickup} → {ride.destination}</p>
          )}
        </div>
        <p style={{ fontWeight:800, fontSize:14, color:OLIVE, background:CARD, border:`1.5px solid ${BORDER}`, padding:'2px 8px', borderRadius:8, flexShrink:0, whiteSpace:'nowrap' }}>₦{(ride.fare || 0).toLocaleString()}</p>
      </div>

      {/* Once the trip is in progress, the riders are already with the
          driver in person — calling/chatting no longer makes sense. */}
      {stage < 2 && (
        <div style={{ display:'flex', gap:10 }}>
          <a href={rider.phone ? `tel:${rider.phone}` : undefined} aria-disabled={!rider.phone}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:12, background:CARD, border:`1.5px solid ${BORDER}`, color:TEXT, fontWeight:700, fontSize:14.5, textDecoration:'none', opacity:rider.phone?1:0.5, pointerEvents:rider.phone?'auto':'none' }}>
            <Phone size={15}/> Call
          </a>
          <button onClick={() => { onOpenChat(); markSeen() }}
            style={{ position:'relative', flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:12, background:CARD, border:`1.5px solid ${BORDER}`, color:TEXT, fontWeight:700, fontSize:14.5, cursor:'pointer', fontFamily:'inherit' }}>
            <MessageSquare size={15}/> Chat
            {hasUnread && (
              <span style={{ position:'absolute', top:6, right:'28%', width:9, height:9, borderRadius:'50%', background:'#ef4444', border:'2px solid '+CARD }}/>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCountdown(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2,'0')}`
}
// '5:00 AM' / '6:30 PM' → today's Date at that time (null if unparsable)
function slotToDate(timeSlot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((timeSlot || '').trim())
  if (!m) return null
  let h = parseInt(m[1], 10) % 12
  if (/pm/i.test(m[3])) h += 12
  const d = new Date()
  d.setHours(h, parseInt(m[2], 10), 0, 0)
  return d
}
// Search prompts open 5 minutes before the booked slot and, once dismissed
// with "Continue searching", come back every 5 minutes until seats fill.
const PROMPT_LEAD_MS   = 5 * 60 * 1000
const PROMPT_SNOOZE_MS = 5 * 60 * 1000
function fmtEta(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60))
  if (mins < 60) return `~${mins} min`
  return `~${Math.floor(mins / 60)}h ${mins % 60}min`
}

// ── Reusable Dropdown ─────────────────────────────────────────────────────────
function Dropdown({ options, value, onChange, placeholder, icon, forceUpward }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { openUpward: autoUpward, maxHeight } = usePanelPlacement(open, ref)
  const openUpward = forceUpward || autoUpward
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
        <span style={{ flex:1, fontSize:14.5, color:value ? TEXT : MUTED, fontWeight:value ? 600 : 400 }}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} color={MUTED} style={{ transform:open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:'absolute', ...(openUpward ? { bottom:'calc(100% + 4px)' } : { top:'calc(100% + 4px)' }), left:0, right:0, background:CARD,
          border:`1.5px solid ${BORDER}`, borderRadius:12, boxShadow:'0 8px 24px rgba(36,56,0,0.12)',
          zIndex:200, maxHeight, overflowY:'auto' }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'11px 14px', border:'none', background:'transparent', cursor:'pointer',
                fontSize:14.5, color:TEXT, fontWeight:value===opt ? 700 : 400, textAlign:'left',
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
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
      background:BG, borderRadius:12, border:`1.5px solid ${BORDER}`, marginBottom:8 }}>
      <PersonAvatar userId={rider.riderId} name={rider.riderName}/>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontWeight:700, fontSize:14.5, color:TEXT }}>{rider.riderName}</p>
        <p style={{ fontSize:13.5, color:MUTED, marginTop:2 }}>
          {rider.pickup} → {rider.dropoff} · waiting since {rider.waitingSince}
        </p>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <p style={{ fontSize:13.5, color:MUTED }}>⭐ {rider.riderRating.toFixed(1)}</p>
        <span style={{ fontSize:12.5, fontWeight:700, background:NEON, color:ON_NEON, padding:'2px 8px', borderRadius:20 }}>
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
        background:online ? NEON : '#e5e7eb', color:online ? ON_NEON : '#374151',
        fontWeight:800, fontSize:14, transition:'background 0.2s', opacity:busy ? 0.7 : 1 }}>
      <span style={{ position:'relative', width:34, height:18, borderRadius:20, flexShrink:0,
        background:online ? OLIVE : '#9ca3af', transition:'background 0.2s' }}>
        <span style={{ position:'absolute', top:2, left:online ? 18 : 2, width:14, height:14,
          borderRadius:'50%', background:'#fff', transition:'left 0.2s',
          boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }}/>
      </span>
      {busy ? 'Updating…' : online ? "Online" : 'Go Online'}
    </button>
  )
}

// ── Route preview — a blocking popup before going live; once live it stays
// on the page as a plain (non-blocking) card through matching/matched/no-
// riders, so it's always visible and the cards below it stay clickable ────
function RoutePreviewModal({ pickup, dropoff, timeSlot, seats, poolFareKobo, stopCoords, onClose, onGoLive, goingLive, phase, onCancel, scheduleMode, scheduleDate, onSchedule, schedulingRoute }) {
  const seatCount = parseInt(seats, 10) || 0
  const totalKobo = poolFareKobo != null ? poolFareKobo * seatCount : null
  const pc = stopCoords[pickup]
  const dc = stopCoords[dropoff]
  const token = import.meta.env.VITE_MAPBOX_TOKEN
  const live = phase !== 'idle'

  const outerStyle = live
    ? { marginBottom:16 }
    : { position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }
  const cardStyle = live
    ? { background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:18, width:'100%', overflow:'hidden', boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }
    : { background:CARD, borderRadius:18, maxWidth:380, width:'100%', overflow:'hidden', boxShadow:'0 16px 40px rgba(0,0,0,0.25)', maxHeight:'95vh', display:'flex', flexDirection:'column' }

  return (
    <div style={outerStyle} onClick={live ? undefined : onClose}>
      <div onClick={e => e.stopPropagation()} style={cardStyle}>
        <div style={{ padding:'10px 14px', borderBottom:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontWeight:700, fontSize:13.5, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em' }}>Route Preview</p>
          {!live && (
            <button onClick={onClose} aria-label="Close" style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:2 }}><X size={16}/></button>
          )}
        </div>

        {/* Once live, the static map is dropped to free up screen space for
            rider profiles and route info — it's only useful before going live. */}
        {!live && (
          (!token || token === 'your_mapbox_public_token_here' || !pc || !dc) ? (
            <div style={{ height:100, background:OLIVE, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
              <MapPin size={22} color={NEON}/>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12.5, textAlign:'center', padding:'0 20px' }}>Map preview unavailable for this route</p>
            </div>
          ) : (
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ccff00(${pc.lng},${pc.lat}),pin-l+243800(${dc.lng},${dc.lat})/auto/700x300@2x?access_token=${token}&padding=80,60,60,60&attribution=false&logo=false`}
              alt={`Route from ${pickup} to ${dropoff}`}
              width="100%" height="100" style={{ display:'block', objectFit:'cover' }} loading="lazy"
            />
          )
        )}

        <div style={{ padding:'10px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:MOSS, border:`2px solid ${BORDER}`, flexShrink:0 }}/>
              <div style={{ minWidth:0 }}><p style={{ fontSize:11.5, color:MUTED, fontWeight:500 }}>Takeoff</p><p style={{ fontSize:14, color:TEXT, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pickup}</p></div>
            </div>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:OLIVE, border:`2px solid ${BORDER}`, flexShrink:0 }}/>
              <div style={{ minWidth:0 }}><p style={{ fontSize:11.5, color:MUTED, fontWeight:500 }}>Dropoff</p><p style={{ fontSize:14, color:TEXT, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dropoff}</p></div>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <div style={{ flex:1, background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'8px 10px', display:'flex', alignItems:'center', gap:6 }}>
              <Clock size={13} color={MOSS}/>
              <span style={{ fontSize:13.5, fontWeight:700, color:TEXT }}>{timeSlot}</span>
            </div>
            <div style={{ flex:1, background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'8px 10px', display:'flex', alignItems:'center', gap:6 }}>
              <Users size={13} color={MOSS}/>
              <span style={{ fontSize:13.5, fontWeight:700, color:TEXT }}>{seats} seat{seats==='1'?'':'s'}</span>
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
              <p style={{ fontSize:11.5, color:MUTED, marginBottom:1 }}>Fare per rider</p>
              <span style={{ fontSize:14.5, fontWeight:800, color:OLIVE }}>{poolFareKobo!=null ? `₦${Math.round(poolFareKobo/100).toLocaleString()}` : '—'}</span>
            </div>
            <div style={{ flex:1, background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
              <p style={{ fontSize:11.5, color:MUTED, marginBottom:1 }}>Total ride price</p>
              <span style={{ fontSize:14.5, fontWeight:800, color:OLIVE }}>{totalKobo!=null ? `₦${Math.round(totalKobo/100).toLocaleString()}` : '—'}</span>
            </div>
          </div>

          {/* The day this drive is being committed to — the one field that makes
              it a schedule rather than a route the driver is starting now */}
          {scheduleMode && scheduleDate && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, background:NEON_SOFT,
              border:`1.5px solid ${NEON}`, borderRadius:10, padding:'8px 10px' }}>
              <CalendarDays size={13} color={OLIVE}/>
              <span style={{ fontSize:13.5, fontWeight:800, color:OLIVE }}>{formatScheduleDate(scheduleDate, { long:true })}</span>
            </div>
          )}
        </div>

        <div style={{ padding:'0 14px 12px' }}>
          {live ? (
            <>
              {(phase === 'matching' || phase === 'no-riders') && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'12px 0', marginBottom:8 }}>
                  {phase === 'matching' && (
                    <>
                      <div style={{ width:18, height:18, border:`2.5px solid ${OLIVE}`, borderTopColor:'transparent', borderRadius:'50%', animation:'feazi-spin 0.8s linear infinite' }}/>
                      <span style={{ fontSize:14, fontWeight:700, color:OLIVE }}>Matching you to a rider on your route…</span>
                    </>
                  )}
                  {phase === 'no-riders' && (
                    <span style={{ fontSize:14, fontWeight:700, color:OLIVE }}>No riders found yet on this route</span>
                  )}
                </div>
              )}
              <button onClick={onCancel} style={{
                width:'100%', padding:'11px', borderRadius:50,
                background:'none', border:`1.5px solid ${BORDER}`,
                color:'#ef4444', fontWeight:700, fontSize:14.5,
                cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s'
              }}>
                Cancel Request
              </button>
            </>
          ) : scheduleMode ? (
            <>
            <p style={{fontSize:12.5,fontStyle:'italic',color:MUTED,textAlign:'center',margin:'0 0 8px'}}>
              *You'll start this drive on the day — riders scheduled for it are held for you*
            </p>
            <button onClick={onSchedule} disabled={schedulingRoute} style={{
              width:'100%', padding:'11px', borderRadius:50,
              background:schedulingRoute?BORDER:NEON, color:schedulingRoute?MUTED:ON_NEON,
              fontWeight:800, fontSize:14.5, border:'none',
              cursor:schedulingRoute?'not-allowed':'pointer',
              fontFamily:'inherit', transition:'all 0.2s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:schedulingRoute?'none':'0 4px 12px rgba(204,255,0,0.3)' }}>
              {schedulingRoute
                ? <><span style={{ width:16, height:16, border:'2px solid rgba(36,56,0,0.3)', borderTopColor:OLIVE, borderRadius:'50%', animation:'feazi-spin 0.8s linear infinite', display:'inline-block' }}/> Scheduling…</>
                : <><CalendarCheck size={16}/>Schedule {scheduleDate ? formatScheduleDate(scheduleDate) : 'This Drive'}</>
              }
            </button>
            </>
          ) : (
            <>
            <p style={{fontSize:12.5,fontStyle:'italic',color:MUTED,textAlign:'center',margin:'0 0 8px'}}>*Booking should be within 24hrs*</p>
            <button onClick={onGoLive} disabled={goingLive} style={{
              width:'100%', padding:'11px', borderRadius:50,
              background:goingLive?BORDER:NEON, color:goingLive?MUTED:ON_NEON,
              fontWeight:800, fontSize:14.5, border:'none',
              cursor:goingLive?'not-allowed':'pointer',
              fontFamily:'inherit', transition:'all 0.2s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:goingLive?'none':'0 4px 12px rgba(204,255,0,0.3)' }}>
              {goingLive
                ? <><span style={{ width:16, height:16, border:'2px solid rgba(36,56,0,0.3)', borderTopColor:OLIVE, borderRadius:'50%', animation:'feazi-spin 0.8s linear infinite', display:'inline-block' }}/> Going live…</>
                : <><Wifi size={16}/>Go Live on This Route</>
              }
            </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DriverDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Online status — drivers are only matchable with riders while online
  const [online, setOnline]   = useState(false)
  // True when this page picked an in-flight search back up rather than the
  // driver starting one — drives the "we resumed your search" notice.
  const [resumedSearch, setResumedSearch] = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [onlineError, setOnlineError] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  // On mount, resume a search that is still live server-side. The availability
  // row outlives the browser — riders go on matching against it — so closing the
  // app, losing the tab or hitting a runtime error must not leave the driver
  // looking at an empty form while a rider is already matched to them.
  useEffect(() => {
    api.get('/driver/status')
      .then(res => {
        setOnline(res.data.online)
        const s = res.data.liveSession
        if (!s) return
        setAvailabilityId(s.availabilityId)
        setTimeSlot(s.timeSlot)
        setHalf(String(s.timeSlot||'').endsWith('PM') ? 'PM' : 'AM')
        setPickup(s.originPickup)      // where the chain started
        setCurrentPickup(s.currentPickup) // how far it has been expanded
        setDropoff(s.dropoff)
        setSeats(String(s.seats))
        setCountdown(180)
        // 'matching' is the safe entry point — the poll below promotes it to
        // 'matched' on the next tick if riders are already attached.
        setMatchPhase('matching')
        setResumedSearch(true)
      })
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
  const [timeSlot, setTimeSlot] = useState('')
  const [half, setHalf]         = useState('AM') // which half of the day the time list offers
  // Derived, not chosen. Routes are still priced and matched per period, so it
  // keeps flowing to the API exactly as before — the driver just picks AM/PM
  // and a time instead of being asked for a "period".
  const period = half === 'PM' ? 'evening' : 'morning'
  const [pickup, setPickup]   = useState('')
  const [dropoff, setDropoff] = useState('')
  const [comment, setComment] = useState('')
  const [seats, setSeats]     = useState('')

  // ── Drive now vs schedule for a day this week ─────────────────────────────
  // Same form either way; scheduling just adds the date and parks the route
  // instead of going live with it, so it can be done while offline.
  const [formMode, setFormMode]         = useState('now') // 'now' | 'schedule'
  const [scheduleDate, setScheduleDate] = useState('')
  const [schedules, setSchedules]       = useState([])
  const [schedulingRoute, setSchedulingRoute] = useState(false)
  const [scheduleOk, setScheduleOk]     = useState(null)  // just-saved confirmation
  const [scheduleError, setScheduleError] = useState(null)
  const [cancellingScheduleId, setCancellingScheduleId] = useState(null)
  const [activatingId, setActivatingId] = useState(null)
  const scheduleMode = formMode === 'schedule'

  async function loadSchedules(){
    try {
      const res = await api.get('/driver/schedules')
      setSchedules(res.data.schedules || [])
    } catch { /* supplementary — never block the main dashboard on it */ }
  }
  useEffect(() => { loadSchedules() }, [])

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

  const { coords: stopCoords } = useStopCoords()

  // If the chosen pickup no longer offers the currently-selected dropoff,
  // clear it (e.g. period switched, or that pair isn't priced).
  useEffect(() => {
    const validDropoffs = routes.filter(r => !pickup || r.pickup === pickup).map(r => r.dropoff)
    if (dropoff && !validDropoffs.includes(dropoff)) setDropoff('')
  }, [pickup, routes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Route preview is opened manually via the "Preview Route" button below —
  // not auto-shown — so the driver gets a chance to type a comment first.
  const [showRoutePreview, setShowRoutePreview] = useState(false)
  const canPreviewRoute = !!(pickup && dropoff && timeSlot && seats && (!scheduleMode || scheduleDate))

  const previewRoute = routes.find(r => r.pickup === pickup && r.dropoff === dropoff)

  // Matching state machine: 'idle' | 'matching' | 'no-riders' | 'matched'
  const [matchPhase, setMatchPhase]       = useState('idle')
  const [availabilityId, setAvailabilityId] = useState(null)
  const [currentPickup, setCurrentPickup] = useState('')
  const [matchedRiders, setMatchedRiders] = useState([])
  const [countdown, setCountdown]         = useState(180)

  const [goLiveError, setGoLiveError]     = useState(null)
  const [isGoingLive, setIsGoingLive]     = useState(false)
  const [confirming, setConfirming]       = useState(false)

  // Active rides — once a route is confirmed, this page turns into the
  // active-ride view. A pool trip carries one ride PER matched rider, all
  // moving through the stages together.
  const [activeRideIds, setActiveRideIds] = useState(undefined) // undefined = checking, [] = none
  const [rides, setRides] = useState([])
  const [rideLoading, setRideLoading] = useState(false)
  const [rideError, setRideError] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const [chatRide, setChatRide] = useState(null) // which rider's chat is open
  const [etaSeconds, setEtaSeconds] = useState(null)

  const ride = rides[0] || null // shared route facts (pickup/dropoff/status leg)

  // Resolve any rides already in progress (e.g. on page reload mid-trip)
  useEffect(() => {
    api.get('/rides/me/active')
      .then(res => setActiveRideIds(res.data.rideIds?.length ? res.data.rideIds : (res.data.rideId ? [res.data.rideId] : [])))
      .catch(() => setActiveRideIds([]))
  }, [])

  async function loadActiveRides(ids) {
    setRideLoading(true)
    try {
      const loaded = await Promise.all(
        ids.map(id => api.get(`/rides/${id}`).then(r => r.data.ride).catch(() => null))
      )
      const live = loaded.filter(Boolean).filter(r => r.status !== 'cancelled')
      setRides(live)
      if (live.length) setRideError('')
      else setRideError('This trip is no longer active — the rider(s) cancelled before it started.')
    } catch (err) {
      setRideError(err.data?.message || 'Could not load this ride.')
    } finally {
      setRideLoading(false)
    }
  }

  // Poll while the ride is active so each rider's live location (pushed from
  // their devices) stays fresh on this map, not just on the initial load.
  const allDone = rides.length > 0 && rides.every(r => r.status === 'completed')
  useEffect(() => {
    if (!activeRideIds?.length) return
    loadActiveRides(activeRideIds)
    const id = setInterval(() => {
      if (!allDone) loadActiveRides(activeRideIds)
    }, 8000)
    return () => clearInterval(id)
  }, [activeRideIds, allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // The pool moves in lockstep — the shared stage is the furthest-behind ride
  const stage = rides.length ? Math.min(...rides.map(r => STATUS_TO_STAGE[r.status] ?? 0)) : 0
  const tripDone = allDone

  // ── Exception-based post-trip rating: every unrated rider defaults to 5★;
  // the driver only touches rows that need lowering, then submits once. ──────
  const [unratedRides, setUnratedRides] = useState(null)
  const [rateStars, setRateStars] = useState({})
  const [rateBusy, setRateBusy] = useState(false)
  const [ratingsSubmitted, setRatingsSubmitted] = useState(false)

  useEffect(() => {
    if (!tripDone) return
    api.get('/driver/unrated-rides')
      .then(res => {
        setUnratedRides(res.data.rides)
        setRateStars(Object.fromEntries(res.data.rides.map(r => [r.rideId, 5])))
      })
      .catch(() => setUnratedRides([]))
  }, [tripDone])

  async function submitAllRatings() {
    if (rateBusy || !unratedRides?.length) return
    setRateBusy(true)
    try {
      await api.post('/rides/rate/batch', {
        ratings: unratedRides.map(r => ({ rideId: r.rideId, stars: rateStars[r.rideId] || 5 })),
      })
      setRatingsSubmitted(true)
    } catch (err) {
      alert(err.data?.message || 'Could not submit ratings.')
    } finally { setRateBusy(false) }
  }

  async function advanceRide() {
    if (!rides.length || advancing || stage >= NEXT_STATUS.length) return
    setAdvancing(true)
    try {
      // Advance every ride that's still at the current stage — the whole
      // pool moves together (all riders board at the same stop).
      const toAdvance = rides.filter(r => (STATUS_TO_STAGE[r.status] ?? 0) === stage)
      const results = await Promise.allSettled(
        toAdvance.map(r => api.patch(`/rides/${r.id}/status`, { status: NEXT_STATUS[stage] }))
      )
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length) {
        setRideError(failed[0].reason?.data?.message || 'Could not update every rider — retrying may help.')
      }
      await loadActiveRides(activeRideIds)
    } catch (err) {
      setRideError(err.data?.message || 'Could not update ride status.')
    } finally {
      setAdvancing(false)
    }
  }

  // Driver changed their mind before starting the trip — cancel every
  // un-started ride; the riders' bookings go straight back into the queue.
  const [showTripCancelConfirm, setShowTripCancelConfirm] = useState(false)
  const [cancellingTrip, setCancellingTrip] = useState(false)
  async function cancelActiveTrip() {
    if (cancellingTrip) return
    setCancellingTrip(true)
    try {
      await api.post('/driver/cancel-active')
      setShowTripCancelConfirm(false)
      backToDailyDrive()
    } catch (err) {
      setShowTripCancelConfirm(false)
      setRideError(err.data?.message || 'Could not cancel this trip.')
    } finally {
      setCancellingTrip(false)
    }
  }

  // Trip's over (or driver backs out) — return to the default Daily Drive view
  function backToDailyDrive() {
    setActiveRideIds([])
    setRides([])
    setRideError('')
    setMatchPhase('idle')
    setAvailabilityId(null)
    setResumedSearch(false)
    setCurrentPickup('')
    setMatchedRiders([])
    setPickup('')
    setDropoff('')
    setComment('')
    setSeats('')
    setTimeSlot('')
    setShowRoutePreview(false)
  }

  // AM and PM are separately priced catalogues, so switching resets the rest of
  // the form — the stops offered for one half may not exist in the other, and a
  // route with no fare cannot be published. Same reset the old Morning/Evening
  // buttons did.
  function chooseHalf(h) {
    if (h === half) return
    setHalf(h)
    setTimeSlot('')
    setPickup('')
    setDropoff('')
    setComment('')
  }

  const slots         = slotsForMeridiem(half)
  const pickupOptions = [...new Set(routes.map(r => r.pickup))].sort()
  const dropoffOptions = [...new Set(
    routes.filter(r => !pickup || r.pickup === pickup).map(r => r.dropoff)
  )].sort()
  const canGoLive     = timeSlot && pickup && dropoff && seats

  // "Next stop in the chain" is computed server-side (single source of
  // truth) — peek at it to show the preview in the no-riders UI, and in the
  // matched view once the search has gone quiet with seats still empty.
  const seatsCount = parseInt(seats, 10) || 0
  const [matchIdleExpired, setMatchIdleExpired] = useState(false)
  const [lastNewMatchAt, setLastNewMatchAt] = useState(0)
  const prevMatchCountRef = useRef(0)

  // ── Prompt scheduling: prompts open 5 min before the slot time and recur
  // every 5 min (via snooze) until the seats are full or the driver stops ──
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [promptSnoozedUntil, setPromptSnoozedUntil] = useState(0)
  const promptSnoozedUntilRef = useRef(0)
  const [searchRound, setSearchRound] = useState(0) // bumps re-arm the quiet-search timer

  useEffect(() => { // re-evaluate the time gate twice a minute while live
    if (matchPhase === 'idle') return
    const id = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [matchPhase])

  const slotDate = slotToDate(timeSlot)
  const promptWindowOpen = !slotDate || nowTick >= slotDate.getTime() - PROMPT_LEAD_MS
  const promptsSnoozed = nowTick < promptSnoozedUntil

  function snoozePrompts() {
    const until = Date.now() + PROMPT_SNOOZE_MS
    promptSnoozedUntilRef.current = until
    setPromptSnoozedUntil(until)
    setNowTick(Date.now())
  }

  // "Continue searching" from the no-riders prompt — quiet search for 5 more
  // minutes at the same stop, then the prompt returns if still empty.
  function continueSearching() {
    snoozePrompts()
    setCountdown(180)
    setSearchRound(r => r + 1)
    setMatchPhase('matching')
  }

  const [nextPickupPreview, setNextPickupPreview] = useState(null)
  const wantNextPickup = matchPhase === 'no-riders' ||
    (matchPhase === 'matched' && (matchIdleExpired || promptWindowOpen))
  useEffect(() => {
    if (!wantNextPickup || !availabilityId) { setNextPickupPreview(null); return }
    api.get(`/driver/next-pickup?availabilityId=${availabilityId}`)
      .then(res => setNextPickupPreview(res.data.newPickup))
      .catch(() => setNextPickupPreview(null))
  }, [wantNextPickup, availabilityId])

  // 5 minutes with no NEW rider matched (timer resets on every new match) →
  // surface the "search the next pickup" option in the matched view.
  useEffect(() => {
    setMatchIdleExpired(false)
    if (matchPhase !== 'matched') return
    const t = setTimeout(() => setMatchIdleExpired(true), 300_000)
    return () => clearTimeout(t)
  }, [matchPhase, lastNewMatchAt])

  // ── Polling effect — runs while searching AND after partial matches, so a
  // driver with empty seats keeps collecting riders until they confirm ──────
  useEffect(() => {
    if ((matchPhase !== 'matching' && matchPhase !== 'matched') || !availabilityId) return

    let cancelled = false

    async function poll() {
      if (cancelled) return
      try {
        const res = await api.get(`/driver/matches?availabilityId=${availabilityId}`)
        if (cancelled) return
        const matches = res.data.matches || []
        if (matches.length > prevMatchCountRef.current) setLastNewMatchAt(Date.now())
        prevMatchCountRef.current = matches.length
        setMatchedRiders(matches)
        if (matches.length > 0 && matchPhase === 'matching') setMatchPhase('matched')
        if (matches.length === 0 && matchPhase === 'matched') {
          // every matched rider withdrew — back to open searching
          setCountdown(180)
          setMatchPhase('matching')
        }
      } catch { /* silently continue polling */ }
    }

    poll() // immediate first check
    const pollId = setInterval(poll, 8000)

    // Countdown + no-riders prompt only apply while actively searching. The
    // prompt is time-gated: it can only surface from 5 min before the booked
    // slot onward, and "Continue searching" snoozes it for 5 min — so before
    // the window (or while snoozed) an empty round quietly re-arms instead.
    let cntId, timerId
    if (matchPhase === 'matching') {
      const untilEligible = Math.max(
        slotDate ? slotDate.getTime() - PROMPT_LEAD_MS - Date.now() : 0,
        promptSnoozedUntilRef.current - Date.now(),
        0
      )
      const delay = Math.min(180_000, untilEligible > 0 ? Math.max(untilEligible, 5_000) : 180_000)
      setCountdown(Math.round(delay / 1000))
      cntId = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
      timerId = setTimeout(() => {
        if (cancelled) return
        const sd = slotToDate(timeSlot)
        const windowOpen = !sd || Date.now() >= sd.getTime() - PROMPT_LEAD_MS
        if (windowOpen && Date.now() >= promptSnoozedUntilRef.current) setMatchPhase('no-riders')
        else setSearchRound(r => r + 1) // window not open yet — keep searching quietly
      }, delay)
    }

    return () => {
      cancelled = true
      clearInterval(pollId)
      if (cntId) clearInterval(cntId)
      if (timerId) clearTimeout(timerId)
    }
  }, [matchPhase, availabilityId, searchRound]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleGoLive() {
    if (!canGoLive || isGoingLive) return
    setGoLiveError(null)
    setIsGoingLive(true)
    try {
      const res = await api.post('/driver/go-live', {
        period, timeSlot, pickup, dropoff, seats: parseInt(seats, 10), comment,
      })
      track('Driver Went Live', { period, timeSlot })
      setAvailabilityId(res.data.availabilityId)
      setCurrentPickup(pickup)
      setCountdown(180)
      setMatchPhase('matching')
      loadSchedules() // going live by hand can retire a schedule for today
    } catch (err) {
      setGoLiveError(err.data?.message || 'Could not go live. Check your connection.')
    } finally {
      setIsGoingLive(false)
    }
  }

  // Park this route for a day inside the coming week. Riders who scheduled the
  // same day, slot and route are reserved immediately, up to the seat count.
  async function handleScheduleRoute() {
    if (!canPreviewRoute || schedulingRoute) return
    setScheduleError(null)
    setScheduleOk(null)
    setSchedulingRoute(true)
    try {
      const res = await api.post('/driver/schedule', {
        period, timeSlot, pickup, dropoff, seats: parseInt(seats, 10), comment,
        scheduledDate: scheduleDate,
      })
      track('Driver Scheduled Drive', { period, timeSlot, scheduledDate: scheduleDate })
      setScheduleOk({ date: res.data.scheduledDate, riders: res.data.reservedRiders || [] })
      setShowRoutePreview(false)
      setScheduleDate('')
      setTimeSlot('')
      setPickup('')
      setDropoff('')
      setComment('')
      setSeats('')
      loadSchedules()
    } catch (err) {
      setShowRoutePreview(false)
      setScheduleError(err.data?.message || 'Could not schedule this drive. Please try again.')
    } finally {
      setSchedulingRoute(false)
    }
  }

  // The scheduled day has arrived — turn the parked route into a live session.
  // From here it matches exactly like a route filled in by hand, so riders who
  // booked this slot minutes ago show up alongside the ones reserved in advance.
  async function activateSchedule(s) {
    if (activatingId) return
    setActivatingId(s.availabilityId)
    setScheduleError(null)
    try {
      const res = await api.post('/driver/activate-schedule', { availabilityId: s.availabilityId })
      setAvailabilityId(res.data.availabilityId)
      setTimeSlot(res.data.timeSlot)
      setHalf(String(res.data.timeSlot||'').endsWith('PM') ? 'PM' : 'AM')
      setPickup(res.data.originPickup)
      setCurrentPickup(res.data.currentPickup)
      setDropoff(res.data.dropoff)
      setSeats(String(res.data.seats))
      setFormMode('now')
      setScheduleOk(null)
      setCountdown(180)
      setMatchPhase('matching')
      loadSchedules()
    } catch (err) {
      setScheduleError(err.data?.message || 'Could not start your scheduled drive.')
    } finally {
      setActivatingId(null)
    }
  }

  async function cancelSchedule(availabilityId) {
    if (cancellingScheduleId) return
    setCancellingScheduleId(availabilityId)
    setScheduleError(null)
    try {
      await api.post(`/driver/schedule/${availabilityId}/cancel`)
      setSchedules(list => list.filter(s => s.availabilityId !== availabilityId))
    } catch (err) {
      setScheduleError(err.data?.message || 'Could not cancel that scheduled drive.')
    } finally {
      setCancellingScheduleId(null)
    }
  }

  async function handleExpand() {
    try {
      const res = await api.post('/driver/expand-pickup', { availabilityId })
      if (!res.data.newPickup) { handleGoOffline(); return }
      setCurrentPickup(res.data.newPickup)
      // Matching now spans every stop covered so far, so riders already
      // matched STAY matched — expanding only adds candidates from the new
      // stop. Give the new stop a quiet 5 minutes before prompting again.
      snoozePrompts()
      setSearchRound(r => r + 1)
      if (!matchedRiders.length) {
        setCountdown(180)
        setMatchPhase('matching')
      }
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
      setActiveRideIds(res.data.rideIds?.length ? res.data.rideIds : [res.data.rideId])
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
    setResumedSearch(false)
    setCurrentPickup('')
    setMatchedRiders([])
    setPickup('')
    setDropoff('')
    setComment('')
    setSeats('')
    setTimeSlot('')
    setShowRoutePreview(false)
  }

  // ── Render: matching phase ────────────────────────────────────────────────
  function renderMatching() {
    const nextPickup = nextPickupPreview
    const pct = Math.round((countdown / 180) * 100)

    if (matchPhase === 'matching') {
      // The route preview popup already shows a matching/cancel state for this
      // phase — avoid a redundant second "matching" card underneath it.
      if (showRoutePreview) return null
      return (
        <div style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:16, padding:24,
          marginBottom:16, boxShadow:'0 4px 16px rgba(36,56,0,0.08)', textAlign:'center' }}>
          {resumedSearch && (
            <p style={{ fontSize:14, color:MOSS, background:'#f3fbd3', border:'1px solid #dff0a8',
              borderRadius:10, padding:'8px 12px', marginBottom:14, lineHeight:1.45 }}>
              Your search was still running — we picked it back up where you left off.
            </p>
          )}
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
          <p style={{ fontSize:14, color:MUTED, marginBottom:16 }}>
            Finding riders on <strong style={{ color:OLIVE }}>{currentPickup} → {dropoff}</strong> at <strong style={{ color:OLIVE }}>{timeSlot}</strong>
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14,
            padding:'10px 14px', background:CARD, borderRadius:10, border:`1px solid ${BORDER}`, marginBottom:16, fontSize:14 }}>
            {/* The time itself is already named in the line above, so the old
                Morning/Evening chip only repeated it in vaguer words. */}
            <span style={{ color:MUTED }}>{seats} seat{seats==='1'?'':'s'} available</span>
          </div>
          <button onClick={() => setShowCancelConfirm(true)}
            style={{ padding:'10px 24px', borderRadius:10, border:`1.5px solid ${BORDER}`,
              background:CARD, color:MUTED, fontWeight:600, fontSize:14.5, cursor:'pointer', fontFamily:'inherit' }}>
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
            <div style={{ width:40, height:40, borderRadius:12, background:DANGER_SOFT,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <AlertCircle size={20} color="#ef4444"/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:TEXT, marginBottom:4 }}>
                No riders found at {currentPickup}
              </p>
              <p style={{ fontSize:14, color:MUTED }}>
                No one is waiting at this stop for <strong>{timeSlot}</strong> on the <strong>{currentPickup} → {dropoff}</strong> route.
              </p>
            </div>
          </div>

          {nextPickup ? (
            <>
              <div style={{ background:BG, border:`1.5px solid ${BORDER}`, borderRadius:12,
                padding:'14px 16px', marginBottom:14 }}>
                <p style={{ fontSize:13.5, color:MUTED, fontWeight:600, textTransform:'uppercase',
                  letterSpacing:'0.05em', marginBottom:6 }}>Next Available Stop</p>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <MapPin size={15} color={MOSS}/>
                  <span style={{ fontWeight:700, fontSize:15, color:OLIVE }}>{nextPickup}</span>
                  <ChevronRight size={14} color={MUTED}/>
                  <span style={{ fontSize:14, color:MUTED }}>{dropoff}</span>
                </div>
              </div>
              <p style={{ fontSize:14, color:MUTED, marginBottom:14 }}>
                Do you want to continue searching here, or pick up riders from <strong style={{ color:OLIVE }}>{nextPickup}</strong> instead?
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <button onClick={handleExpand}
                  style={{ padding:'12px', borderRadius:12, background:NEON, color:ON_NEON,
                    fontWeight:800, fontSize:14.5, border:'none', cursor:'pointer', fontFamily:'inherit',
                    boxShadow:'0 4px 12px rgba(204,255,0,0.3)' }}>
                  Yes, try {nextPickup}
                </button>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={continueSearching}
                    style={{ flex:1, padding:'12px', borderRadius:12, background:CARD,
                      border:`1.5px solid ${MOSS}`, color:OLIVE, fontWeight:700, fontSize:14.5,
                      cursor:'pointer', fontFamily:'inherit' }}>
                    Continue searching
                  </button>
                  <button onClick={handleGoOffline}
                    style={{ flex:1, padding:'12px', borderRadius:12, background:CARD,
                      border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:600, fontSize:14.5,
                      cursor:'pointer', fontFamily:'inherit' }}>
                    Stop for today
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize:14, color:MUTED, marginBottom:14 }}>
                No riders found on this route today. You've reached the end of the route chain.
              </p>
              <button onClick={handleGoOffline}
                style={{ width:'100%', padding:'12px', borderRadius:12, background:CARD,
                  border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:600, fontSize:14.5,
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
            <div style={{ width:36, height:36, borderRadius:10, background:CARD, border:`1.5px solid ${BORDER}`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <UserCheck size={18} color={OLIVE}/>
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:15, color:TEXT }}>
                {matchedRiders.length} rider{matchedRiders.length !== 1 ? 's' : ''} matched!
              </p>
              <p style={{ fontSize:13.5, color:MUTED }}>
                {currentPickup} → {dropoff} · {timeSlot}
              </p>
            </div>
            <button onClick={handleGoOffline}
              style={{ marginLeft:'auto', fontSize:13.5, fontWeight:600, color:MUTED,
                background:'none', border:`1px solid ${BORDER}`, borderRadius:8,
                padding:'4px 10px', cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>

          {matchedRiders.map(r => <RiderCard key={r.id} rider={r}/>)}

          {/* Seats still open — the search never stops until the driver
              confirms. New riders appear in the list above automatically. */}
          {matchedRiders.length < seatsCount && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'10px 0 4px' }}>
              <div style={{ width:16, height:16, border:`2.5px solid ${OLIVE}`, borderTopColor:'transparent', borderRadius:'50%', animation:'feazi-spin 0.8s linear infinite' }}/>
              <span style={{ fontSize:14, fontWeight:700, color:OLIVE }}>
                Matching you to more riders on your route… {matchedRiders.length}/{seatsCount} seats filled
              </span>
            </div>
          )}

          {/* Seats still open around the slot time (from 5 min before, then
              every 5 min via snooze) — offer the next stop in the chain.
              Expanding KEEPS the riders already matched and only adds more. */}
          {matchedRiders.length < seatsCount && (matchIdleExpired || promptWindowOpen) && !promptsSnoozed && nextPickupPreview && (
            <div style={{ background:BG, border:`1.5px solid ${BORDER}`, borderRadius:12, padding:'12px 14px', margin:'10px 0 2px' }}>
              <p style={{ fontSize:14, color:MUTED, marginBottom:10, lineHeight:1.5 }}>
                Seats still open. Do you want to continue searching here, extend your search to{' '}
                <strong style={{ color:OLIVE }}>{nextPickupPreview}</strong> (your matched rider{matchedRiders.length !== 1 ? 's stay' : ' stays'} on board),
                or start the route with your current rider{matchedRiders.length !== 1 ? 's' : ''}?
              </p>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={snoozePrompts}
                  style={{ flex:1, padding:'10px', borderRadius:10, background:CARD, border:`1.5px solid ${BORDER}`,
                    color:MUTED, fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  Continue searching
                </button>
                <button onClick={handleExpand}
                  style={{ flex:1, padding:'10px', borderRadius:10, background:CARD, border:`1.5px solid ${MOSS}`,
                    color:OLIVE, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  Search riders at {nextPickupPreview}
                </button>
              </div>
            </div>
          )}

          {goLiveError && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT,
              border:'1px solid #fca5a5', borderRadius:10, marginBottom:12 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:14, color:'#ef4444' }}>{goLiveError}</p>
            </div>
          )}

          <button onClick={handleConfirmRoute} disabled={confirming}
            style={{ width:'100%', marginTop:6, padding:'13px', borderRadius:12, background:NEON,
              color:ON_NEON, fontWeight:800, fontSize:14.5, border:'none', cursor:confirming?'not-allowed':'pointer',
              fontFamily:'inherit', opacity:confirming?0.7:1, boxShadow:confirming?'none':'0 4px 12px rgba(204,255,0,0.3)' }}>
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
            style={{ marginTop:14, padding:'10px 22px', borderRadius:50, background:INVERT, color:NEON,
              fontWeight:700, fontSize:14.5, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
            Back to Daily Drive
          </button>
        </div>
      )
    }

    if (!ride) return null

    if (tripDone) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, textAlign:'center', padding:24 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 8px 24px rgba(204,255,0,0.4)' }}>
            <CheckCircle size={40} color={OLIVE}/>
          </div>
          <h2 style={{ fontSize:24, fontWeight:900, color:TEXT, marginBottom:8, letterSpacing:'-0.02em' }}>Trip Completed!</h2>
          <p style={{ color:MUTED, fontSize:15, marginBottom:8 }}>
            {rides.length > 1 ? `Fares collected — ${rides.length} riders` : 'Fare collected'}
          </p>
          <p style={{ fontSize:36, fontWeight:900, color:ON_NEON_HARD, letterSpacing:'-0.03em', marginBottom:28, background:NEON, display:'inline-block', padding:'4px 24px', borderRadius:14 }}>
            ₦{rides.reduce((sum, r) => sum + (r.fare || 0), 0).toLocaleString()}
          </p>

          {/* Exception-based rider rating — all riders pre-set to 5★; only
              adjust the ones that were a problem, then submit once. */}
          {ratingsSubmitted ? (
            <>
              <p style={{ color:TEXT, fontWeight:700, fontSize:15, marginBottom:20 }}>✓ Ratings submitted — thank you!</p>
              <button onClick={backToDailyDrive}
                style={{ padding:'13px 32px', borderRadius:50, background:INVERT, color:NEON, fontWeight:700, fontSize:15, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                Back to Daily Drive
              </button>
            </>
          ) : unratedRides === null ? (
            <p style={{ color:MUTED, fontSize:14.5 }}>Loading riders…</p>
          ) : unratedRides.length === 0 ? (
            <button onClick={backToDailyDrive}
              style={{ padding:'13px 32px', borderRadius:50, background:INVERT, color:NEON, fontWeight:700, fontSize:15, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              Back to Daily Drive
            </button>
          ) : (
            <div style={{ width:'100%', maxWidth:440 }}>
              <p style={{ fontSize:14.5, fontWeight:800, color:TEXT, marginBottom:4 }}>Rate your rider{unratedRides.length > 1 ? 's' : ''}</p>
              <p style={{ fontSize:14, color:MUTED, marginBottom:14 }}>
                Everyone starts at 5 stars — tap a star only if a rider needs a lower rating.
                Unrated rides from recent trips appear here too.
              </p>

              {unratedRides.map(r => (
                <div key={r.rideId} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                  background:CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:'10px 14px', marginBottom:8 }}>
                  <div style={{ minWidth:0, textAlign:'left' }}>
                    <p style={{ fontSize:14.5, fontWeight:700, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.riderName}
                    </p>
                    <p style={{ fontSize:13, color:MUTED, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.pickup} → {r.destination}
                      {/* Trip time — same rider can appear once per unrated trip */}
                      {r.completedAt ? ` · ${new Date(r.completedAt).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}` : ''}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setRateStars(s => ({ ...s, [r.rideId]: n }))}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:2, fontSize:20, lineHeight:1,
                          color: n <= (rateStars[r.rideId] || 5) ? '#f59e0b' : '#d1d5db' }}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button onClick={submitAllRatings} disabled={rateBusy}
                style={{ width:'100%', marginTop:10, padding:'13px', borderRadius:50, background:NEON, color:ON_NEON,
                  fontWeight:800, fontSize:15, border:'none', cursor:rateBusy?'not-allowed':'pointer',
                  fontFamily:'inherit', opacity:rateBusy?0.7:1 }}>
                {rateBusy ? 'Submitting…' : `Submit ${unratedRides.length > 1 ? 'All Ratings' : 'Rating'}`}
              </button>
              <button onClick={backToDailyDrive}
                style={{ width:'100%', marginTop:8, padding:'11px', borderRadius:50, background:'transparent', color:MUTED,
                  fontWeight:600, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                Skip for now
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <>
        {chatRide && (
          <ChatModal rideId={chatRide.id} title={chatRide.rider?.name || 'Rider'} onClose={() => setChatRide(null)}/>
        )}

        <ActiveRideMap pickup={ride.pickup} dropoff={ride.destination} riderLocation={ride.riderLocation} status={ride.status} onEtaChange={setEtaSeconds}
          riders={rides.map(r => ({ name: r.rider?.name || 'Rider', location: r.riderLocation }))}/>

        {rideError && (
          <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT, border:'1px solid #fca5a5', borderRadius:10, marginBottom:16 }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:14, color:'#ef4444' }}>{rideError}</p>
          </div>
        )}

        {/* Trip stage — one line, no redundant headers */}
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:'10px 16px', marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <p style={{ color:TEXT, fontWeight:700, fontSize:'clamp(13px, 3vw, 15px)' }}>{STAGES[stage]}</p>
          {etaSeconds != null && (
            <span style={{ fontSize:13.5, fontWeight:700, color:OLIVE, background:BG, border:`1px solid ${BORDER}`, padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>
              {fmtEta(etaSeconds)}
            </span>
          )}
        </div>

        {/* Rider cards — one per matched rider in the pool. Header shows the
            shared route once; each rider gets their own Call/Chat. */}
        {rides.length > 1 && (
          <p style={{ fontSize:13.5, fontWeight:800, color:MUTED, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px 2px' }}>
            {rides.length} riders in this pool · {ride.pickup} → {ride.destination}
          </p>
        )}
        {rides.map(r => (
          <PoolRiderCard key={r.id} ride={r} stage={stage} showRoute={rides.length === 1}
            onOpenChat={() => setChatRide(r)}/>
        ))}

        <button onClick={advanceRide} disabled={advancing}
          style={{ width:'100%', padding:'15px', borderRadius:50, background:NEON, color:ON_NEON, fontWeight:700, fontSize:15, border:'none', cursor:advancing?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:advancing?0.7:1, boxShadow:advancing?'none':'0 4px 12px rgba(204,255,0,0.3)' }}>
          {advancing ? 'Updating…' : stage===1 ? 'Start Trip' : stage<STAGES.length-1 ? STAGES[stage+1] : 'Complete Trip & Collect Fare'}
        </button>

        {/* Cancelling stays possible right up until the trip starts — riders'
            requests go back into the queue so they re-match automatically. */}
        {stage < 2 && (
          <button onClick={() => setShowTripCancelConfirm(true)}
            style={{ width:'100%', marginTop:10, padding:'12px', borderRadius:50, background:'transparent', color:'#ef4444', fontWeight:700, fontSize:14.5, border:'1.5px solid #fca5a5', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel Ride
          </button>
        )}

        {showTripCancelConfirm && (
          <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={() => setShowTripCancelConfirm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:CARD, borderRadius:16, padding:24, maxWidth:340, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)', textAlign:'center' }}>
              <p style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:8 }}>Cancel this trip?</p>
              <p style={{ fontSize:14, color:MUTED, marginBottom:20, lineHeight:1.5 }}>
                {rides.length > 1 ? `All ${rides.length} riders` : 'Your rider'} will be returned to the queue and matched with another driver. This can't be undone.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setShowTripCancelConfirm(false)}
                  style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:700, fontSize:14.5, cursor:'pointer', fontFamily:'inherit' }}>
                  Keep Trip
                </button>
                <button onClick={cancelActiveTrip} disabled={cancellingTrip}
                  style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:14.5, cursor:cancellingTrip?'not-allowed':'pointer', fontFamily:'inherit', opacity:cancellingTrip?0.7:1 }}>
                  {cancellingTrip ? 'Cancelling…' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const isActiveRide = !!(activeRideIds && activeRideIds.length)

  return (
    <AppLayout title={isActiveRide ? 'Active Ride' : <OnlineToggle online={online} busy={togglingOnline} onToggle={handleToggleOnline}/>}>

      {isActiveRide ? renderActiveRide() : (
        <>
          {showCancelConfirm && (
            <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.4)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
              onClick={() => setShowCancelConfirm(false)}>
              <div onClick={e => e.stopPropagation()}
                style={{ background:CARD, borderRadius:16, padding:24, maxWidth:340, width:'100%',
                  boxShadow:'0 12px 32px rgba(0,0,0,0.2)', textAlign:'center' }}>
                <p style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:8 }}>Cancel search?</p>
                <p style={{ fontSize:14, color:MUTED, marginBottom:20, lineHeight:1.5 }}>
                  Are you sure you want to cancel the search? You'll stop matching with riders on this route.
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setShowCancelConfirm(false)}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${BORDER}`,
                      background:CARD, color:TEXT, fontWeight:700, fontSize:14.5, cursor:'pointer', fontFamily:'inherit' }}>
                    No
                  </button>
                  <button onClick={() => { setShowCancelConfirm(false); handleGoOffline() }}
                    style={{ flex:1, padding:'11px', borderRadius:10, border:'none',
                      background:NEON, color:ON_NEON, fontWeight:700, fontSize:14.5, cursor:'pointer', fontFamily:'inherit' }}>
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}

          {showRoutePreview && pickup && dropoff && (
            <RoutePreviewModal pickup={pickup} dropoff={dropoff} timeSlot={timeSlot} seats={seats}
              poolFareKobo={previewRoute?.poolFareKobo} stopCoords={stopCoords}
              onClose={()=>setShowRoutePreview(false)} onGoLive={handleGoLive} goingLive={isGoingLive}
              phase={matchPhase} onCancel={()=>setShowCancelConfirm(true)}
              scheduleMode={scheduleMode} scheduleDate={scheduleDate}
              onSchedule={handleScheduleRoute} schedulingRoute={schedulingRoute}/>
          )}

          <div>
          {onlineError && (
            <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT,
              border:'1px solid #fca5a5', borderRadius:10, marginBottom:10 }}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:14, color:'#ef4444' }}>{onlineError}</p>
            </div>
          )}

          {/* ── Matching states, or the route form ────────────────────────────
              Driving now needs the driver online; scheduling a later day does
              not — it's a commitment, not a search running right now. ─────── */}
          {online && matchPhase !== 'idle' ? renderMatching() : (
            <>
              {/* Drive now / Schedule toggle */}
              <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:8, marginBottom:10 }}>
                {[
                  { val:'now',      icon:<Zap size={15}/>,          label:'Drive Now',     sub:'Match riders live' },
                  { val:'schedule', icon:<CalendarDays size={15}/>, label:'Schedule Drive', sub:'Pick a day ahead' },
                ].map(({ val, icon, label, sub }) => (
                  <button key={val} onClick={() => { setFormMode(val); setScheduleOk(null); setScheduleError(null) }}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:12,
                      border:`1.5px solid ${formMode===val ? NEON : BORDER}`,
                      background:formMode===val ? NEON : CARD,
                      cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.2s',
                      boxShadow:formMode===val ? '0 4px 12px rgba(204,255,0,0.3)' : 'none' }}>
                    <span style={{ color:formMode===val ? ON_NEON : MUTED, flexShrink:0 }}>{icon}</span>
                    <div style={{ minWidth:0 }}>
                      <p style={{ fontWeight:800, fontSize:14, color:formMode===val ? ON_NEON : TEXT }}>{label}</p>
                      <p style={{ fontSize:11.5, color:formMode===val ? 'rgba(36,56,0,0.55)' : MUTED, marginTop:0 }}>{sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Just-scheduled confirmation */}
              {scheduleOk && (
                <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px',
                  background:NEON_SOFT, border:`1.5px solid ${NEON}`, borderRadius:12, marginBottom:10 }}>
                  <CalendarCheck size={17} color={OLIVE} style={{ flexShrink:0, marginTop:1 }}/>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:800, color:OLIVE }}>
                      Drive scheduled for {formatScheduleDate(scheduleOk.date, { long:true })}
                    </p>
                    <p style={{ fontSize:13, color:MUTED, marginTop:2, lineHeight:1.4 }}>
                      {scheduleOk.riders.length
                        ? `${scheduleOk.riders.length} rider${scheduleOk.riders.length>1?'s':''} already scheduled this trip — ${scheduleOk.riders.map(r=>r.riderName).join(', ')} ${scheduleOk.riders.length>1?'are':'is'} reserved for you.`
                        : "We'll hold riders for you as they schedule this trip. Start the drive from below on the day."}
                    </p>
                  </div>
                  <button onClick={()=>setScheduleOk(null)} aria-label="Dismiss"
                    style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:2, marginLeft:'auto', flexShrink:0 }}>
                    <X size={15}/>
                  </button>
                </div>
              )}

              {scheduleError && (
                <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT,
                  border:'1px solid #fca5a5', borderRadius:10, marginBottom:10 }}>
                  <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
                  <p style={{ fontSize:14, color:'#ef4444' }}>{scheduleError}</p>
                </div>
              )}

              {!online && !scheduleMode ? (
                <div style={{ background:BG, border:`1.5px dashed ${BORDER}`, borderRadius:16, padding:24,
                  textAlign:'center', marginBottom:16 }}>
                  <Wifi size={28} color={BORDER} style={{ marginBottom:10 }}/>
                  <p style={{ fontWeight:700, fontSize:14.5, color:TEXT, marginBottom:4 }}>You're offline</p>
                  <p style={{ fontSize:14, color:MUTED }}>Go online above to set your route and start receiving bookings — or schedule a drive for a later day.</p>
                </div>
              ) : (
                <div style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:14, padding:14,
                  boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>

                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:4, height:16, borderRadius:2, background:NEON }}/>
                    <p style={{ fontWeight:800, fontSize:14, color:OLIVE, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      {scheduleMode ? 'Schedule Departure & Route' : 'Set Departure & Route'}
                    </p>
                  </div>

                  {/* Which day — scheduling only. Everything below is the same
                      form a drive-now session uses. */}
                  {scheduleMode && (
                    <div style={{ marginBottom:10 }}>
                      <ScheduleDatePicker label="Drive Date" value={scheduleDate} onChange={setScheduleDate}/>
                    </div>
                  )}

                  {/* AM/PM picks the half of the day, the field beside it the
                      exact time within it; the period follows from AM/PM */}
                  <div style={{ display:'grid', gridTemplateColumns:'minmax(88px,0.42fr) minmax(0,1fr)',
                    gap:8, marginBottom:10 }}>
                    <Dropdown options={MERIDIEMS} value={half} onChange={chooseHalf}
                      placeholder="AM / PM" icon={<Sun size={15}/>}/>
                    <Dropdown options={slots} value={timeSlot} onChange={setTimeSlot}
                      placeholder="Select a time slot" icon={<Clock size={15}/>}/>
                  </div>

                  {/* Available seats */}
                  <p style={{ fontSize:12.5, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                    Available Seats
                  </p>
                  <div style={{ marginBottom:10 }}>
                    <Dropdown options={['1','2','3','4','5','6','7','8']} value={seats} onChange={setSeats}
                      placeholder="How many seats are available?" icon={<Users size={15}/>}/>
                  </div>

                  <p style={{ fontSize:13.5, fontWeight:600, color:TEXT, marginBottom:4 }}>Pickup Location</p>
                  <div style={{ marginBottom:8 }}>
                    <Dropdown options={pickupOptions} value={pickup} onChange={setPickup}
                      placeholder={routesLoading ? 'Loading…' : 'Select pickup location'} icon={<MapPin size={15}/>}/>
                  </div>

                  <p style={{ fontSize:13.5, fontWeight:600, color:TEXT, marginBottom:4 }}>Drop-off Location</p>
                  <div style={{ marginBottom:10 }}>
                    <Dropdown options={dropoffOptions} value={dropoff} onChange={setDropoff}
                      placeholder={routesLoading ? 'Loading…' : 'Select drop-off location'} icon={<MapPin size={15}/>} forceUpward/>
                  </div>

                  <p style={{ fontSize:13.5, fontWeight:600, color:TEXT, marginBottom:4 }}>Additional Comment (optional)</p>
                  <div style={{ marginBottom:10 }}>
                    <textarea value={comment} onChange={e=>setComment(e.target.value.slice(0,200))}
                      placeholder="A note for your rider - e.g. I'll be passing through Ogudu Roundabout" rows={2}
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, fontSize:14.5, border:`1.5px solid ${BORDER}`, outline:'none', background:CARD, color:TEXT, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }}
                      onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER}/>
                  </div>

                  {!showRoutePreview && (
                    <button type="button" onClick={()=>canPreviewRoute && setShowRoutePreview(true)} disabled={!canPreviewRoute}
                      style={{
                        width:'100%', padding:'12px', borderRadius:10, fontSize:14.5, fontWeight:700,
                        background:canPreviewRoute?NEON:BORDER, color:canPreviewRoute? ON_NEON :MUTED,
                        border:'none', cursor:canPreviewRoute?'pointer':'not-allowed',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        fontFamily:'inherit', marginBottom:10,
                      }}>
                      Preview Route<ChevronRight size={15}/>
                    </button>
                  )}

                  {goLiveError && (
                    <div style={{ display:'flex', gap:8, padding:'10px 14px', background:DANGER_SOFT,
                      border:'1px solid #fca5a5', borderRadius:10, marginBottom:10 }}>
                      <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
                      <p style={{ fontSize:14, color:'#ef4444' }}>{goLiveError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Drives already scheduled ─────────────────────────────────
                  Today's schedule is the one that can actually be started —
                  the rest are commitments waiting for their day. */}
              {schedules.length > 0 && (
                <div style={{ background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:14, padding:14,
                  marginTop:10, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <div style={{ width:4, height:16, borderRadius:2, background:NEON }}/>
                    <p style={{ fontWeight:800, fontSize:14, color:OLIVE, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      Your Scheduled Drives
                    </p>
                  </div>

                  {schedules.map(s => (
                    <div key={s.availabilityId} style={{ border:`1.5px solid ${s.isToday ? NEON : BORDER}`,
                      borderRadius:12, padding:'10px 12px', marginBottom:8, background:s.isToday ? NEON_SOFT : CARD }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <CalendarDays size={13} color={OLIVE} style={{ flexShrink:0 }}/>
                        <p style={{ fontSize:14, fontWeight:800, color:OLIVE }}>
                          {formatScheduleDate(s.scheduledDate, { long:true })} · {s.timeSlot}
                        </p>
                        <span style={{ marginLeft:'auto', fontSize:12.5, fontWeight:700, color:MUTED,
                          border:`1.5px solid ${BORDER}`, borderRadius:8, padding:'1px 7px', flexShrink:0, whiteSpace:'nowrap' }}>
                          {s.reservedCount}/{s.seats} seat{s.seats === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p style={{ fontSize:13, color:MUTED, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.pickup} → {s.dropoff}
                      </p>

                      {s.riders.length > 0 ? (
                        <div style={{ marginTop:8 }}>
                          {s.riders.map(r => (
                            <div key={r.riderId} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                              <PersonAvatar userId={r.riderId} name={r.riderName} size={28} fontSize={11} radius={8}/>
                              <div style={{ minWidth:0, flex:1 }}>
                                <p style={{ fontSize:13.5, fontWeight:700, color:TEXT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {r.riderName}
                                </p>
                                <p style={{ fontSize:12, color:MUTED }}>⭐ {r.riderRating.toFixed(1)} · from {r.pickup}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize:12.5, color:MUTED, marginTop:6, fontStyle:'italic' }}>
                          No riders scheduled on this trip yet
                        </p>
                      )}

                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        {s.isToday && (
                          <button onClick={() => activateSchedule(s)} disabled={!online || activatingId === s.availabilityId}
                            title={online ? undefined : 'Go online first'}
                            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                              padding:'9px', borderRadius:10, border:'none',
                              background:online ? NEON : BORDER, color:online ? ON_NEON : MUTED,
                              fontWeight:800, fontSize:14, fontFamily:'inherit',
                              cursor:(!online || activatingId === s.availabilityId) ? 'not-allowed' : 'pointer' }}>
                            <Wifi size={13}/>
                            {activatingId === s.availabilityId ? 'Starting…' : online ? 'Start this drive' : 'Go online to start'}
                          </button>
                        )}
                        <button onClick={() => cancelSchedule(s.availabilityId)} disabled={cancellingScheduleId === s.availabilityId}
                          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                            padding:'9px 12px', borderRadius:10, background:'none', border:`1.5px solid ${BORDER}`,
                            color:cancellingScheduleId === s.availabilityId ? MUTED : '#ef4444',
                            fontWeight:700, fontSize:13.5, fontFamily:'inherit',
                            cursor:cancellingScheduleId === s.availabilityId ? 'not-allowed' : 'pointer' }}>
                          <Trash2 size={12}/>{cancellingScheduleId === s.availabilityId ? 'Cancelling…' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          </div>
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
