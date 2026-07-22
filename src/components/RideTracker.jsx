import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatModal from './ChatModal'
import PersonAvatar from './PersonAvatar'
import { Phone, MessageSquare, Star, AlertCircle, Package } from 'lucide-react'
import { api } from '../services/api'
import { useStopCoords } from '../hooks/useStopCoords'
import { useUnreadChat } from '../hooks/useUnreadChat'
import { loadMapbox } from '../utils/mapbox'
import { fetchDrivingRoute } from '../utils/mapboxDirections'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

// One-line, friendlier phrasing for each stage.
const STAGE_PHRASES = [
  'Driver assigned to your trip',
  "Driver's on his way",
  'Driver has arrived',
  'Heading to destination',
  'Trip completed',
]
// Pooled drivers may have several riders matched at once and can't always
// tap a button for each one individually — so the rider can confirm their
// own pickup/arrival/completion too, via the same backend endpoint.
const NEXT_STATUS = ['arrived_pickup', 'in_transit', 'completed']
const NEXT_STATUS_LABEL = {
  arrived_pickup: 'Driver has arrived',
  in_transit:     'Start Trip',
  completed:      'Trip completed',
}
const STATUS_TO_STEP = {
  pending:         0,
  driver_assigned: 1,
  arrived_pickup:  2,
  in_transit:      3,
  completed:       4,
}
const SIZE_LABEL = { sm: 'Small', md: 'Medium', lg: 'Large' }

function lerp(a, b, t) { return a + (b - a) * t }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }
function fmtEta(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60))
  if (mins < 60) return `~${mins} min`
  return `~${Math.floor(mins / 60)}h ${mins % 60}min`
}

// Live ride/delivery tracking — shared by Book Ride and Move an Item, since
// both run through the exact same booking → match → confirm-route pipeline
// and the same real-GPS map logic, just with a different "Done" action.
export default function RideTracker({ activeRideId, onExit }) {
  const navigate = useNavigate()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [ride, setRide] = useState(null)
  const [rideLoading, setRideLoading] = useState(false)
  const [rideError, setRideError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const { hasUnread: hasUnreadChat, markSeen: markChatSeen } = useUnreadChat(activeRideId)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [etaSeconds, setEtaSeconds] = useState(null)
  const [advancing, setAdvancing] = useState(false)
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const driverMarkerRef = useRef(null)
  const riderMarkerRef  = useRef(null)
  const animFrameRef    = useRef(null)
  const riderAnimFrameRef = useRef(null)

  const { coords: stopCoords } = useStopCoords()

  async function loadRide(id) {
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
    loadRide(activeRideId)
    const id = setInterval(() => {
      if (ride?.status !== 'completed' && ride?.status !== 'cancelled') loadRide(activeRideId)
    }, 8000)
    return () => clearInterval(id)
  }, [activeRideId, ride?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function cancelRide() {
    if (cancelling) return
    setCancelling(true)
    try {
      await api.patch(`/rides/${activeRideId}/cancel`)
      setShowCancelConfirm(false)
      onExit ? onExit() : navigate('/book')
    } catch (err) {
      setShowCancelConfirm(false)
      setRideError(err.data?.message || 'Could not cancel this ride.')
    } finally {
      setCancelling(false)
    }
  }

  // Advance the trip stage myself — same endpoint the driver uses, so either
  // side can confirm pickup/arrival/completion without waiting on the other.
  async function advanceRide() {
    if (!ride || advancing || ride.status === 'completed') return
    const nextIdx = step <= 1 ? 0 : step - 1
    const nextStatus = NEXT_STATUS[nextIdx]
    if (!nextStatus) return
    setAdvancing(true)
    try {
      await api.patch(`/rides/${activeRideId}/status`, { status: nextStatus })
      await loadRide(activeRideId)
    } catch (err) {
      setRideError(err.data?.message || 'Could not update ride status.')
    } finally {
      setAdvancing(false)
    }
  }

  const step         = ride ? (STATUS_TO_STEP[ride.status] ?? 0) : 0
  const trackPickup  = ride?.pickup      || ''
  const trackDropoff = ride?.destination || ''
  const pCoord       = stopCoords[trackPickup]
  const dCoord       = stopCoords[trackDropoff]
  const driver       = ride?.driver || { name: 'Driver', phone: '', rating: null }

  // ── Capture the rider's own real GPS position and push it to the backend
  // (throttled) — symmetric to the driver's location push — so both sides of
  // the map use real positions, not the static pickup stop coordinate ───────
  const [riderCoords, setRiderCoords] = useState(null)
  const riderWatchIdRef = useRef(null)
  const riderLastPushRef = useRef(0)

  useEffect(() => {
    if (ride?.status === 'completed' || !navigator.geolocation) return
    riderWatchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { longitude: lng, latitude: lat } = pos.coords
        setRiderCoords({ lng, lat })
        const now = Date.now()
        if (now - riderLastPushRef.current >= 6000) {
          riderLastPushRef.current = now
          api.patch(`/rides/${activeRideId}/location`, { lat, lng }).catch(() => {})
        }
      },
      () => {}, // silently degrade — the static pickup point still shows
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    return () => {
      if (riderWatchIdRef.current != null) navigator.geolocation.clearWatch(riderWatchIdRef.current)
    }
  }, [activeRideId, ride?.status])

  // Rider's real position when available, falling back to the named pickup
  // stop until geolocation permission is granted / a fix is acquired.
  const riderRefPoint = riderCoords || pCoord

  // ── Load Mapbox SDK ───────────────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token || token === 'your_mapbox_public_token_here') {
      setMapError(true)
      return
    }
    loadMapbox()
      .then(() => setMapReady(true))
      .catch(() => setMapError(true))
  }, [])

  // ── Initialise map once SDK is ready and the real ride has loaded ─
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || !pCoord || !dCoord) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN
    const mb = window.mapboxgl
    mb.accessToken = token

    const map = new mb.Map({
      container:        mapContainerRef.current,
      style:            'mapbox://styles/mapbox/streets-v12',
      center:           [lerp(pCoord.lng, dCoord.lng, 0.5), lerp(pCoord.lat, dCoord.lat, 0.5)],
      zoom:             11,
      attributionControl: false,
      logoPosition:     'bottom-left',
    })
    mapRef.current = map

    map.on('load', () => {
      setMapLoaded(true)

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [pCoord.lng, pCoord.lat],
              [dCoord.lng, dCoord.lat],
            ],
          },
        },
      })
      map.addLayer({
        id: 'route-glow', type: 'line', source: 'route',
        paint: { 'line-color': NEON, 'line-width': 10, 'line-opacity': 0.15, 'line-blur': 4 },
      })
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        paint: { 'line-color': NEON, 'line-width': 3.5, 'line-opacity': 0.9, 'line-dasharray': [2, 2.5] },
      })

      const dropoffEl = document.createElement('div')
      Object.assign(dropoffEl.style, {
        width:'30px', height:'38px',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        filter:'drop-shadow(0 2px 5px rgba(0,0,0,0.45))',
        cursor: 'default',
      })
      dropoffEl.innerHTML = `
        <svg width="30" height="38" viewBox="0 0 24 30">
          <path fill="${OLIVE}" stroke="${NEON}" stroke-width="1.5"
            d="M12 1C6.5 1 2 5.5 2 11c0 7.5 10 18 10 18s10-10.5 10-18c0-5.5-4.5-10-10-10z"/>
          <circle cx="12" cy="11" r="3.6" fill="${NEON}"/>
        </svg>`
      new mb.Marker({ element: dropoffEl, anchor: 'bottom' })
        .setLngLat([dCoord.lng, dCoord.lat])
        .setPopup(new mb.Popup({ offset: 16 }).setText(`Dropoff: ${trackDropoff}`))
        .addTo(map)

      const bounds = new mb.LngLatBounds(
        [pCoord.lng, pCoord.lat],
        [dCoord.lng, dCoord.lat]
      )
      map.fitBounds(bounds, { padding: 80, duration: 0 })
    })

    return () => {
      setMapLoaded(false)
      cancelAnimationFrame(animFrameRef.current)
      cancelAnimationFrame(riderAnimFrameRef.current)
      map.remove()
      mapRef.current = null
      driverMarkerRef.current = null
      riderMarkerRef.current = null
    }
  }, [mapReady, !!ride, pCoord, dCoord]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place/animate the rider's own marker at their real GPS position
  // (falls back to the named pickup stop until a fix is acquired) ───────────
  useEffect(() => {
    const pt = riderRefPoint
    if (!mapRef.current || !pt) return
    const mb = window.mapboxgl

    if (!riderMarkerRef.current) {
      const riderEl = document.createElement('div')
      Object.assign(riderEl.style, {
        width:'32px', height:'40px',
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        filter:'drop-shadow(0 2px 5px rgba(0,0,0,0.45))',
        cursor: 'default',
      })
      riderEl.innerHTML = `
        <svg width="30" height="38" viewBox="0 0 24 30">
          <path fill="${NEON}" stroke="${OLIVE}" stroke-width="1"
            d="M12 1C6.5 1 2 5.5 2 11c0 7.5 10 18 10 18s10-10.5 10-18c0-5.5-4.5-10-10-10z"/>
          <circle cx="12" cy="11" r="3.6" fill="${OLIVE}"/>
        </svg>`
      riderMarkerRef.current = new mb.Marker({ element: riderEl, anchor: 'bottom' })
        .setLngLat([pt.lng, pt.lat])
        .setPopup(new mb.Popup({ offset: 24 }).setText(riderCoords ? 'You' : `Pickup: ${trackPickup}`))
        .addTo(mapRef.current)
    } else {
      cancelAnimationFrame(riderAnimFrameRef.current)
      const current  = riderMarkerRef.current.getLngLat()
      const startLng = current.lng, startLat = current.lat
      const DURATION = 1800
      let startTime  = null

      function animate(ts) {
        if (!startTime) startTime = ts
        const raw   = Math.min((ts - startTime) / DURATION, 1)
        const eased = easeInOut(raw)
        riderMarkerRef.current?.setLngLat([
          lerp(startLng, pt.lng, eased),
          lerp(startLat, pt.lat, eased),
        ])
        if (raw < 1) riderAnimFrameRef.current = requestAnimationFrame(animate)
      }
      riderAnimFrameRef.current = requestAnimationFrame(animate)
    }

    return () => cancelAnimationFrame(riderAnimFrameRef.current)
  }, [mapReady, riderRefPoint?.lat, riderRefPoint?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place/animate the driver marker at their real, reported GPS position
  // (pushed from the driver's device — see ActiveRideMap.jsx) — not a
  // simulated point along the route. Before pickup this naturally shows the
  // real distance between the driver and the rider; bounds refit to keep
  // both in view as that gap closes. ──────────────────────────────────────
  useEffect(() => {
    const loc = ride?.driverLocation
    if (!mapRef.current || !loc) return
    const mb = window.mapboxgl

    if (!driverMarkerRef.current) {
      const driverEl = document.createElement('div')
      Object.assign(driverEl.style, {
        width:'38px', height:'38px',
        display:'flex', alignItems:'center', justifyContent:'center',
        filter:'drop-shadow(0 2px 5px rgba(0,0,0,0.55))',
        cursor: 'pointer',
        transition: 'transform 0.2s',
      })
      driverEl.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path fill="${OLIVE}" stroke="${NEON}" stroke-width="0.8"
            d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>`
      driverEl.addEventListener('mouseenter', () => { driverEl.style.transform = 'scale(1.15)' })
      driverEl.addEventListener('mouseleave', () => { driverEl.style.transform = 'scale(1)' })

      driverMarkerRef.current = new mb.Marker({ element: driverEl, anchor: 'center' })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(new mb.Popup({ offset: 20 }).setText(driver.name))
        .addTo(mapRef.current)
    } else {
      cancelAnimationFrame(animFrameRef.current)
      const current  = driverMarkerRef.current.getLngLat()
      const startLng = current.lng, startLat = current.lat
      const DURATION = 1800
      let startTime  = null

      function animate(ts) {
        if (!startTime) startTime = ts
        const raw   = Math.min((ts - startTime) / DURATION, 1)
        const eased = easeInOut(raw)
        driverMarkerRef.current?.setLngLat([
          lerp(startLng, loc.lng, eased),
          lerp(startLat, loc.lat, eased),
        ])
        if (raw < 1) animFrameRef.current = requestAnimationFrame(animate)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }

    return () => cancelAnimationFrame(animFrameRef.current)
  }, [mapReady, ride?.driverLocation?.lat, ride?.driverLocation?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refit the map to whichever real positions we currently have — the
  // driver's, the rider's (or the fallback pickup stop), and the dropoff —
  // so the rider always sees the actual gap that matters at each stage. ─────
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const mb = window.mapboxgl
    const loc = ride?.driverLocation
    const points = []
    if (loc) points.push([loc.lng, loc.lat])
    if (riderRefPoint) points.push([riderRefPoint.lng, riderRefPoint.lat])
    if (dCoord) points.push([dCoord.lng, dCoord.lat])
    if (points.length < 2) return

    const bounds = new mb.LngLatBounds(points[0], points[0])
    points.forEach(p => bounds.extend(p))
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 800 })
  }, [mapLoaded, ride?.driverLocation?.lat, ride?.driverLocation?.lng, riderRefPoint?.lat, riderRefPoint?.lng, dCoord]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch the real, road-following route for whichever leg is current —
  // driver → rider before pickup, driver → dropoff after — so the rider sees
  // the actual streets the driver is travelling, not a straight line. ───────
  useEffect(() => {
    if (!mapLoaded) return
    const headingToPickup = step < STATUS_TO_STEP.arrived_pickup
    const from = ride?.driverLocation || riderRefPoint
    const to   = headingToPickup ? riderRefPoint : dCoord
    if (!from || !to) { setEtaSeconds(null); return }

    const token = import.meta.env.VITE_MAPBOX_TOKEN
    fetchDrivingRoute(from, to, token).then(result => {
      if (!result) return
      const src = mapRef.current?.getSource('route')
      if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: result.coordinates } })
      setEtaSeconds(result.durationSeconds)
    })
  }, [mapLoaded, step, ride?.driverLocation?.lat, ride?.driverLocation?.lng, riderRefPoint?.lat, riderRefPoint?.lng, dCoord]) // eslint-disable-line react-hooks/exhaustive-deps

  if (rideLoading && !ride) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (rideError && !ride) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', padding:24 }}>
        <AlertCircle size={32} color="#ef4444" style={{ marginBottom:12 }}/>
        <p style={{ color:TEXT, fontWeight:700, marginBottom:6 }}>{rideError}</p>
      </div>
    )
  }

  if (!ride) return null

  // Trip cancelled. If the DRIVER cancelled, the rider's booking is already
  // back in the queue — show a brief notice, then drop back to the matching
  // screen automatically (the booking-restore logic resumes the search).
  if (ride.status === 'cancelled') {
    const byDriver = ride.cancelledBy === 'driver'
    return <CancelledNotice byDriver={byDriver} onExit={() => (onExit ? onExit() : navigate('/book'))} />
  }

  const isPackage = ride.type === 'send'

  return (
    <>
      {showCancelConfirm && (
        <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setShowCancelConfirm(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:CARD, borderRadius:16, padding:24, maxWidth:340, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)', textAlign:'center' }}>
            <p style={{ fontWeight:800, fontSize:16, color:TEXT, marginBottom:8 }}>Cancel this ride?</p>
            <p style={{ fontSize:13, color:MUTED, marginBottom:20, lineHeight:1.5 }}>
              Your driver will be notified and your seat will be released. This can't be undone.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowCancelConfirm(false)}
                style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                Keep Ride
              </button>
              <button onClick={cancelRide} disabled={cancelling}
                style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'#ef4444', color:'#fff', fontWeight:700, fontSize:14, cursor:cancelling?'not-allowed':'pointer', fontFamily:'inherit', opacity:cancelling?0.7:1 }}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChat && (
        <ChatModal rideId={activeRideId} title={driver.name} onClose={() => setShowChat(false)}/>
      )}

      {/* Map card */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden', marginBottom:8, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        {mapError ? (
          <div style={{ height:340, background:OLIVE, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:14, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, opacity:0.1, backgroundImage:`linear-gradient(${NEON} 1px,transparent 1px),linear-gradient(90deg,${NEON} 1px,transparent 1px)`, backgroundSize:'40px 40px' }}/>
            <div style={{ position:'relative', width:36, height:36, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 6px rgba(204,255,0,0.15)' }}>
              <span style={{ fontSize:18 }}>🗺️</span>
            </div>
            <div style={{ position:'relative', textAlign:'center' }}>
              <p style={{ color:'rgba(255,255,255,0.85)', fontSize:12, fontWeight:600, marginBottom:4 }}>Map requires a Mapbox token</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>
                Add <code style={{ color:NEON }}>VITE_MAPBOX_TOKEN</code> to your <code style={{ color:NEON }}>.env</code> file<br/>
                Get a free token at <span style={{ color:NEON }}>account.mapbox.com</span>
              </p>
            </div>
          </div>
        ) : (
          <div style={{ position:'relative' }}>
            <div ref={mapContainerRef} style={{ width:'100%', height:340 }}/>
            {!ride.driverLocation && ride.status !== 'completed' && (
              <div style={{ position:'absolute', top:8, left:8, right:8, background:'rgba(10,10,10,0.75)', borderRadius:10, padding:'6px 10px', display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:12, height:12, border:`2px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
                <p style={{ fontSize:11, color:'#fff' }}>Waiting for your driver's location…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
          </div>
        )}

        <div style={{ padding:'10px 14px', borderTop:`1px solid ${BORDER}`, display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:'1 1 0%', display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:NEON, border:`2px solid ${MOSS}`, flexShrink:0 }}/>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:10, color:MUTED, whiteSpace:'nowrap' }}>Takeoff</p>
              <p style={{ fontSize:'clamp(11px, 3vw, 14px)', fontWeight:600, color:TEXT, lineHeight:1.25, wordBreak:'break-word' }}>{trackPickup}</p>
            </div>
          </div>
          <div style={{ width:1, height:28, background:BORDER, flexShrink:0 }}/>
          <div style={{ flex:'1 1 0%', display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:OLIVE, border:`2px solid ${MOSS}`, flexShrink:0 }}/>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:10, color:MUTED, whiteSpace:'nowrap' }}>Dropoff</p>
              <p style={{ fontSize:'clamp(11px, 3vw, 14px)', fontWeight:600, color:TEXT, lineHeight:1.25, wordBreak:'break-word' }}>{trackDropoff}</p>
            </div>
          </div>
          <div style={{ width:1, height:28, background:BORDER, flexShrink:0 }}/>
          <div style={{ flexShrink:0, textAlign:'right' }}>
            <p style={{ fontSize:10, color:MUTED, whiteSpace:'nowrap' }}>Price</p>
            <p style={{ fontSize:'clamp(11px, 3vw, 14px)', fontWeight:700, color:OLIVE, whiteSpace:'nowrap' }}>₦{ride.fare.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Package details (Move an Item bookings only) */}
      {isPackage && (
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:14, marginBottom:8, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
          <p style={{ fontWeight:700, fontSize:12, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Package Details</p>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: ride.notes ? 8 : 0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:OLIVE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Package size={16} color={NEON}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ color:TEXT, fontWeight:700, fontSize:13 }}>{ride.recipientName} {SIZE_LABEL[ride.packageSize] ? `· ${SIZE_LABEL[ride.packageSize]}` : ''}</p>
              {ride.recipientPhone && <p style={{ fontSize:11, color:MUTED, marginTop:1 }}>{ride.recipientPhone}</p>}
            </div>
          </div>
          {ride.notes && <p style={{ fontSize:12, color:MUTED, fontStyle:'italic' }}>"{ride.notes}"</p>}
        </div>
      )}

      {/* Trip stage — one line, no redundant headers */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:'10px 16px', marginBottom:8, boxShadow:'0 2px 8px rgba(36,56,0,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <p style={{ color:TEXT, fontWeight:700, fontSize:'clamp(13px, 3vw, 15px)' }}>{STAGE_PHRASES[step]}</p>
        {etaSeconds != null && (
          <span style={{ fontSize:12, fontWeight:700, color:OLIVE, background:BG, border:`1px solid ${BORDER}`, padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap', flexShrink:0 }}>
            {fmtEta(etaSeconds)}
          </span>
        )}
      </div>

      {/* Driver card */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:14, marginBottom:8, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <p style={{ fontWeight:700, fontSize:12, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Driver</p>

        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:12, marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            <PersonAvatar userId={driver.id} name={driver.name} size={36} fontSize={14} radius={10}/>
            <div style={{ minWidth:0 }}>
              <p style={{ color:TEXT, fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{driver.name}</p>
              {driver.rating != null && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:1 }}>
                  <Star size={12} color='#f59e0b' fill='#f59e0b'/>
                  <span style={{ fontSize:12, color:MUTED }}>{driver.rating}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4, fontSize:11, color:MUTED, minWidth:0 }}>
            <p style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              <span style={{ color:MOSS, fontWeight:600 }}>Model: </span>
              <span style={{ color:TEXT, fontWeight:700 }}>{[driver.vehicleMake, driver.vehicleModel].filter(Boolean).join(' ') || '—'}</span>
            </p>
            <p style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              <span style={{ color:MOSS, fontWeight:600 }}>Color: </span>
              <span style={{ color:TEXT, fontWeight:700 }}>{driver.vehicleColor || '—'}</span>
            </p>
            <p style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              <span style={{ color:MOSS, fontWeight:600 }}>Plate: </span>
              <span style={{ color:TEXT, fontWeight:700 }}>{driver.plateNumber || '—'}</span>
            </p>
          </div>
        </div>

        {rideError && (
          <div style={{ display:'flex', gap:8, padding:'8px 12px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:10 }}>
            <AlertCircle size={13} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:12, color:'#ef4444' }}>{rideError}</p>
          </div>
        )}

        {/* Once the trip is in progress, the rider is already with the
            driver in person — calling/chatting no longer makes sense. */}
        {step < 3 && (
        <div style={{ display:'flex', gap:8 }}>
          <a href={driver.phone ? `tel:${driver.phone}` : undefined} aria-disabled={!driver.phone}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:12, background:NEON, color:OLIVE, fontWeight:800, fontSize:13, textDecoration:'none', boxShadow:'0 4px 12px rgba(204,255,0,0.3)', opacity:driver.phone?1:0.5, pointerEvents:driver.phone?'auto':'none' }}>
            <Phone size={14}/> Call
          </a>
          <button onClick={() => { setShowChat(true); markChatSeen() }}
            style={{ position:'relative', flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px', borderRadius:12, background:CARD, border:`1.5px solid ${BORDER}`, color:TEXT, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            <MessageSquare size={14}/> Chat
            {hasUnreadChat && (
              <span style={{ position:'absolute', top:6, right:'28%', width:9, height:9, borderRadius:'50%', background:'#ef4444', border:'2px solid '+CARD }}/>
            )}
          </button>
        </div>
        )}
      </div>

      {/* Let the rider confirm their own progress too — the driver may have
          several riders matched at once and can't always tap a button for
          each one right away. */}
      {ride.status !== 'completed' && (
        <button onClick={advanceRide} disabled={advancing} style={{ width:'100%', padding:'13px', borderRadius:50, marginBottom:8, background:advancing?BORDER:NEON, color:advancing?MUTED:OLIVE, fontWeight:700, fontSize:14, border:'none', cursor:advancing?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10, opacity:advancing?0.7:1, boxShadow:advancing?'none':'0 4px 12px rgba(204,255,0,0.3)', fontFamily:'inherit' }}>
          {advancing ? 'Updating…' : NEXT_STATUS_LABEL[NEXT_STATUS[step <= 1 ? 0 : step - 1]]}
        </button>
      )}

      {/* Cancelling stays possible right up until the trip actually starts —
          even after the driver has arrived at the pickup. */}
      {step < STATUS_TO_STEP.in_transit && (
        <button onClick={() => setShowCancelConfirm(true)}
          style={{ width:'100%', padding:'12px', borderRadius:50, marginBottom:8, background:'transparent', color:'#ef4444', fontWeight:700, fontSize:13.5, border:'1.5px solid #fca5a5', cursor:'pointer', fontFamily:'inherit' }}>
          Cancel Ride
        </button>
      )}

      {ride.status === 'completed' && (
        <button onClick={() => navigate(`/rate/${activeRideId}`)}
          style={{ width:'100%', padding:'13px', borderRadius:50, background:NEON, color:OLIVE, fontWeight:800, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(204,255,0,0.35)' }}>
          Rate This Trip
        </button>
      )}
    </>
  )
}

// Cancelled-ride notice. A driver-cancel auto-returns the rider to the
// matching screen after a short beat (their booking is already re-queued);
// a self-cancel just waits for an OK tap.
function CancelledNotice({ byDriver, onExit }) {
  useEffect(() => {
    if (!byDriver) return
    const t = setTimeout(onExit, 2600)
    return () => clearTimeout(t)
  }, [byDriver]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:340, textAlign:'center', padding:24 }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <AlertCircle size={30} color="#ef4444"/>
      </div>
      <p style={{ color:TEXT, fontWeight:800, fontSize:17, marginBottom:6 }}>
        {byDriver ? 'Ride cancelled by driver' : 'This trip was cancelled'}
      </p>
      <p style={{ color:MUTED, fontSize:13.5, lineHeight:1.6, maxWidth:320, marginBottom:20 }}>
        {byDriver
          ? "No worries — we're finding you another driver on the same route now…"
          : 'Your booking has been cancelled.'}
      </p>
      {byDriver ? (
        <div style={{ width:26, height:26, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      ) : (
        <button onClick={onExit}
          style={{ padding:'12px 28px', borderRadius:50, background:NT, color:NEON, fontWeight:700, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          OK
        </button>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
