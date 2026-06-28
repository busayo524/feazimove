import React, { useState, useRef, useEffect } from 'react'
import ChatModal from './ChatModal'
import { Phone, MessageSquare, Star, AlertCircle, Package } from 'lucide-react'
import { api } from '../services/api'
import { useStopCoords } from '../hooks/useStopCoords'
import { loadMapbox } from '../utils/mapbox'
import { fetchDrivingRoute } from '../utils/mapboxDirections'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900'

const STEPS = [
  'Driver assigned',
  'Driver en route',
  'Driver arrived',
  'Trip in progress',
  'Trip completed',
]
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

// Live ride/delivery tracking — shared by Book Ride and Move an Item, since
// both run through the exact same booking → match → confirm-route pipeline
// and the same real-GPS map logic, just with a different "Done" action.
export default function RideTracker({ activeRideId, onDone, doneLabel }) {
  const [ride, setRide] = useState(null)
  const [rideLoading, setRideLoading] = useState(false)
  const [rideError, setRideError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
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
      if (ride?.status !== 'completed') loadRide(activeRideId)
    }, 8000)
    return () => clearInterval(id)
  }, [activeRideId, ride?.status]) // eslint-disable-line react-hooks/exhaustive-deps

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
        width:'30px', height:'30px', borderRadius:'50%',
        background: OLIVE, border: `3px solid ${NEON}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:'900', fontSize:'12px', color: NEON,
        boxShadow: `0 0 0 4px rgba(36,56,0,0.3), 0 2px 8px rgba(0,0,0,0.4)`,
        cursor: 'default',
      })
      dropoffEl.textContent = 'D'
      new mb.Marker({ element: dropoffEl })
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
    if (!from || !to) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN
    fetchDrivingRoute(from, to, token).then(coords => {
      if (!coords) return
      const src = mapRef.current?.getSource('route')
      if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })
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

  const isPackage = ride.type === 'send'

  return (
    <>
      {showChat && (
        <ChatModal rideId={activeRideId} title={driver.name} onClose={() => setShowChat(false)}/>
      )}

      {/* Map card */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden', marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ padding:'12px 20px', background:OLIVE, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>📍</span>
            <div>
              <p style={{ fontSize:11, color:'rgba(204,255,0,0.6)', fontWeight:500 }}>Live Tracking</p>
              <p style={{ fontSize:13, color:'#fff', fontWeight:700 }}>{trackPickup} → {trackDropoff}</p>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Status</p>
            <p style={{ fontSize:14, fontWeight:800, color:NEON, lineHeight:1.3 }}>{STEPS[step]}</p>
          </div>
        </div>

        {mapError ? (
          <div style={{ height:280, background:OLIVE, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:20, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, opacity:0.1, backgroundImage:`linear-gradient(${NEON} 1px,transparent 1px),linear-gradient(90deg,${NEON} 1px,transparent 1px)`, backgroundSize:'40px 40px' }}/>
            <div style={{ position:'relative', width:48, height:48, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 8px rgba(204,255,0,0.15)' }}>
              <span style={{ fontSize:24 }}>🗺️</span>
            </div>
            <div style={{ position:'relative', textAlign:'center' }}>
              <p style={{ color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:600, marginBottom:6 }}>Map requires a Mapbox token</p>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>
                Add <code style={{ color:NEON }}>VITE_MAPBOX_TOKEN</code> to your <code style={{ color:NEON }}>.env</code> file<br/>
                Get a free token at <span style={{ color:NEON }}>account.mapbox.com</span>
              </p>
            </div>
          </div>
        ) : (
          <div style={{ position:'relative' }}>
            <div ref={mapContainerRef} style={{ width:'100%', height:300 }}/>
            {!ride.driverLocation && ride.status !== 'completed' && (
              <div style={{ position:'absolute', top:10, left:10, right:10, background:'rgba(10,10,10,0.75)', borderRadius:10, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:14, height:14, border:`2px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }}/>
                <p style={{ fontSize:12, color:'#fff' }}>Waiting for your driver's location…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
          </div>
        )}

        <div style={{ padding:'14px 20px', borderTop:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:NEON, border:`2px solid ${MOSS}`, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:11, color:MUTED }}>Takeoff</p>
              <p style={{ fontSize:14, fontWeight:600, color:TEXT }}>{trackPickup}</p>
            </div>
          </div>
          <div style={{ width:2, height:14, background:BORDER, marginLeft:4 }}/>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:OLIVE, border:`2px solid ${MOSS}`, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:11, color:MUTED }}>Dropoff</p>
              <p style={{ fontSize:14, fontWeight:600, color:TEXT }}>{trackDropoff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Package details (Move an Item bookings only) */}
      {isPackage && (
        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
          <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Package Details</p>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom: ride.notes ? 12 : 0 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:OLIVE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Package size={20} color={NEON}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ color:TEXT, fontWeight:700, fontSize:14 }}>{ride.recipientName} {SIZE_LABEL[ride.packageSize] ? `· ${SIZE_LABEL[ride.packageSize]}` : ''}</p>
              {ride.recipientPhone && <p style={{ fontSize:12, color:MUTED, marginTop:2 }}>{ride.recipientPhone}</p>}
            </div>
          </div>
          {ride.notes && <p style={{ fontSize:13, color:MUTED, fontStyle:'italic' }}>"{ride.notes}"</p>}
        </div>
      )}

      {/* Ride Progress */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>{isPackage ? 'Delivery Progress' : 'Ride Progress'}</p>
        {STEPS.map((s, i) => {
          const done   = i < step
          const active = i === step
          return (
            <div key={s} style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom: i < STEPS.length - 1 ? 4 : 0 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0,
                  transition:'all 0.35s',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: done || active ? NEON : BORDER,
                  border: `2px solid ${done || active ? NEON : BORDER}`,
                }}>
                  {done   && <span style={{ color:OLIVE, fontSize:11, fontWeight:800 }}>✓</span>}
                  {active && <div style={{ width:8, height:8, borderRadius:'50%', background:OLIVE }}/>}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width:2, height:22, background: done ? MOSS : BORDER, marginTop:2, transition:'background 0.35s' }}/>
                )}
              </div>
              <p style={{
                fontSize:14, paddingTop:2, transition:'color 0.35s',
                fontWeight: active ? 700 : done ? 600 : 400,
                color: active ? OLIVE : done ? TEXT : MUTED,
              }}>{s}</p>
            </div>
          )
        })}
      </div>

      {/* Driver card */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, marginBottom: ride.status === 'completed' ? 16 : 0, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>Your Driver</p>

        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:NEON, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(204,255,0,0.3)' }}>
            <span style={{ color:OLIVE, fontWeight:800, fontSize:22 }}>{driver.name[0]}</span>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ color:TEXT, fontWeight:700, fontSize:15 }}>{driver.name}</p>
            {driver.rating != null && (
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                <Star size={13} color='#f59e0b' fill='#f59e0b'/>
                <span style={{ fontSize:13, color:MUTED }}>{driver.rating}</span>
              </div>
            )}
          </div>
        </div>

        {rideError && (
          <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:14 }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:13, color:'#ef4444' }}>{rideError}</p>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <a href={driver.phone ? `tel:${driver.phone}` : undefined} aria-disabled={!driver.phone}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, background:NEON, color:OLIVE, fontWeight:800, fontSize:14, textDecoration:'none', boxShadow:'0 4px 12px rgba(204,255,0,0.3)', opacity:driver.phone?1:0.5, pointerEvents:driver.phone?'auto':'none' }}>
            <Phone size={16}/> Call
          </a>
          <button onClick={() => setShowChat(true)}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px', borderRadius:12, background:CARD, border:`1.5px solid ${BORDER}`, color:TEXT, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
            <MessageSquare size={16}/> Chat
          </button>
        </div>
      </div>

      {ride.status === 'completed' && (
        <button onClick={onDone}
          style={{ width:'100%', padding:'15px', borderRadius:50, background:NT, color:NEON, fontWeight:700, fontSize:15, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          {doneLabel || 'Done'}
        </button>
      )}
    </>
  )
}
