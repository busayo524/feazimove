import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import ChatModal from '../../components/ChatModal'
import { api } from '../../services/api'
import { loadMapbox } from '../../utils/mapbox'
import { LOCATION_COORDS } from '../../utils/locations'
import { Phone, MessageSquare, Star, AlertCircle } from 'lucide-react'

const NEON='#ccff00'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900'

const STEPS = [
  'Driver assigned',
  'Driver en route',
  'Driver arrived',
  'Trip in progress',
  'Trip completed',
]

// Maps a ride.status from the backend to a step index in STEPS
const STATUS_TO_STEP = {
  pending:         0,
  driver_assigned: 1,
  arrived_pickup:  2,
  in_transit:      3,
  completed:       4,
}

// How far along the route (0→1) the driver is at each step
const STEP_PROGRESS = [0, 0.15, 0.4, 0.7, 1.0]

// Linear interpolation helper
function lerp(a, b, t) { return a + (b - a) * t }

// Ease-in-out for smooth animation
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }


export default function TrackRide() {
  const { rideId } = useParams()
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const driverMarkerRef = useRef(null)
  const mapLoadedRef    = useRef(false)
  const animFrameRef    = useRef(null)

  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  async function loadRide() {
    try {
      const res = await api.get(`/rides/${rideId}`)
      setRide(res.data.ride)
      setError('')
    } catch (err) {
      setError(err.data?.message || 'Could not load this ride.')
    } finally {
      setLoading(false)
    }
  }

  // ── Fetch the real ride, then poll while it's still in progress ───
  useEffect(() => {
    loadRide()
    const id = setInterval(() => {
      if (ride?.status !== 'completed') loadRide()
    }, 8000)
    return () => clearInterval(id)
  }, [rideId, ride?.status])

  const step    = ride ? (STATUS_TO_STEP[ride.status] ?? 0) : 0
  const pickup  = ride?.pickup      || ''
  const dropoff = ride?.destination || ''
  const pCoord  = LOCATION_COORDS[pickup]
  const dCoord  = LOCATION_COORDS[dropoff]
  const driver  = ride?.driver || { name: 'Driver', phone: '', rating: null }

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
      mapLoadedRef.current = true

      // ── Route line ────────────────────────────────────────────
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
      // Glow layer (wide, faded)
      map.addLayer({
        id:     'route-glow',
        type:   'line',
        source: 'route',
        paint: {
          'line-color':   NEON,
          'line-width':   10,
          'line-opacity': 0.15,
          'line-blur':    4,
        },
      })
      // Main dashed line
      map.addLayer({
        id:     'route-line',
        type:   'line',
        source: 'route',
        paint: {
          'line-color':      NEON,
          'line-width':      3.5,
          'line-opacity':    0.9,
          'line-dasharray':  [2, 2.5],
        },
      })

      // ── Pickup marker (neon green P) ──────────────────────────
      const pickupEl = document.createElement('div')
      Object.assign(pickupEl.style, {
        width:'30px', height:'30px', borderRadius:'50%',
        background: NEON, border: `3px solid ${OLIVE}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:'900', fontSize:'12px', color: OLIVE,
        boxShadow: `0 0 0 4px rgba(204,255,0,0.25), 0 2px 8px rgba(0,0,0,0.4)`,
        cursor: 'default',
      })
      pickupEl.textContent = 'P'
      new mb.Marker({ element: pickupEl })
        .setLngLat([pCoord.lng, pCoord.lat])
        .setPopup(new mb.Popup({ offset: 16 }).setText(`Takeoff: ${pickup}`))
        .addTo(map)

      // ── Dropoff marker (dark olive D) ─────────────────────────
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
        .setPopup(new mb.Popup({ offset: 16 }).setText(`Dropoff: ${dropoff}`))
        .addTo(map)

      // ── Driver car marker (animated) ──────────────────────────
      const driverEl = document.createElement('div')
      Object.assign(driverEl.style, {
        width:'40px', height:'40px', borderRadius:'50%',
        background: OLIVE, border: `2.5px solid ${NEON}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'20px', lineHeight:'1',
        boxShadow: `0 0 0 5px rgba(204,255,0,0.2), 0 4px 14px rgba(0,0,0,0.5)`,
        cursor: 'pointer',
        transition: 'transform 0.2s',
      })
      driverEl.textContent = '🚗'
      driverEl.addEventListener('mouseenter', () => { driverEl.style.transform = 'scale(1.15)' })
      driverEl.addEventListener('mouseleave', () => { driverEl.style.transform = 'scale(1)' })

      const driverMarker = new mb.Marker({ element: driverEl, anchor: 'center' })
        .setLngLat([pCoord.lng, pCoord.lat])
        .setPopup(new mb.Popup({ offset: 20 }).setText(driver.name))
        .addTo(map)
      driverMarkerRef.current = driverMarker

      // Fit both stops in view
      const bounds = new mb.LngLatBounds(
        [pCoord.lng, pCoord.lat],
        [dCoord.lng, dCoord.lat]
      )
      map.fitBounds(bounds, { padding: 80, duration: 800 })
    })

    return () => {
      mapLoadedRef.current = false
      cancelAnimationFrame(animFrameRef.current)
      map.remove()
      mapRef.current = null
      driverMarkerRef.current = null
    }
  }, [mapReady, !!ride])

  // ── Animate driver marker when step changes ───────────────────────
  useEffect(() => {
    if (!driverMarkerRef.current || !mapLoadedRef.current || !pCoord || !dCoord) return
    cancelAnimationFrame(animFrameRef.current)

    const progress   = STEP_PROGRESS[step] ?? 0
    const targetLng  = lerp(pCoord.lng, dCoord.lng, progress)
    const targetLat  = lerp(pCoord.lat, dCoord.lat, progress)
    const currentPos = driverMarkerRef.current.getLngLat()
    const startLng   = currentPos.lng
    const startLat   = currentPos.lat
    const DURATION   = 1800
    let startTime    = null

    function animate(ts) {
      if (!startTime) startTime = ts
      const raw    = Math.min((ts - startTime) / DURATION, 1)
      const eased  = easeInOut(raw)
      driverMarkerRef.current?.setLngLat([
        lerp(startLng, targetLng, eased),
        lerp(startLat, targetLat, eased),
      ])
      if (raw < 1) animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [step])

  if (loading) {
    return (
      <AppLayout title="Track Ride">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppLayout>
    )
  }

  if (error && !ride) {
    return (
      <AppLayout title="Track Ride">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', padding:24 }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom:12 }}/>
          <p style={{ color:TEXT, fontWeight:700, marginBottom:6 }}>{error}</p>
          <p style={{ color:MUTED, fontSize:13 }}>This ride may have ended or doesn't belong to you.</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Track Ride">
      {showChat && (
        <ChatModal rideId={rideId} title={driver.name} onClose={() => setShowChat(false)}/>
      )}

      {/* ── Map card ──────────────────────────────────────────────── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden', marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>

        {/* ETA bar */}
        <div style={{ padding:'12px 20px', background:OLIVE, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>📍</span>
            <div>
              <p style={{ fontSize:11, color:'rgba(204,255,0,0.6)', fontWeight:500 }}>Live Tracking</p>
              <p style={{ fontSize:13, color:'#fff', fontWeight:700 }}>{pickup} → {dropoff}</p>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>Status</p>
            <p style={{ fontSize:14, fontWeight:800, color:NEON, lineHeight:1.3 }}>{STEPS[step]}</p>
          </div>
        </div>

        {/* Map / fallback */}
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
          <div ref={mapContainerRef} style={{ width:'100%', height:300 }}/>
        )}

        {/* Takeoff / Dropoff labels */}
        <div style={{ padding:'14px 20px', borderTop:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:NEON, border:`2px solid ${MOSS}`, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:11, color:MUTED }}>Takeoff</p>
              <p style={{ fontSize:14, fontWeight:600, color:TEXT }}>{pickup}</p>
            </div>
          </div>
          <div style={{ width:2, height:14, background:BORDER, marginLeft:4 }}/>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:OLIVE, border:`2px solid ${MOSS}`, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:11, color:MUTED }}>Dropoff</p>
              <p style={{ fontSize:14, fontWeight:600, color:TEXT }}>{dropoff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ride Progress ─────────────────────────────────────────── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
        <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Ride Progress</p>
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

      {/* ── Driver card ───────────────────────────────────────────── */}
      <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:20, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
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

        {error && (
          <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, marginBottom:14 }}>
            <AlertCircle size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
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

    </AppLayout>
  )
}
