import React, { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadMapbox } from '../utils/mapbox'
import { useStopCoords } from '../hooks/useStopCoords'
import { api } from '../services/api'
import { fetchDrivingRoute } from '../utils/mapboxDirections'

const NEON='#ccff00', OLIVE='#243800'
const CARD='#ffffff', BORDER='#d4e5a8', MUTED='#4C6900'

function lerp(a, b, t) { return a + (b - a) * t }

function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

// Shows the pickup → dropoff route, the driver's real live device location,
// and the rider's real reported location (falling back to the static pickup
// stop until the rider's device has shared a position).
export default function ActiveRideMap({ pickup, dropoff, riderLocation, status }) {
  const containerRef = useRef(null)
  const mapRef        = useRef(null)
  const driverMarkerRef = useRef(null)
  const riderMarkerRef  = useRef(null)
  const watchIdRef    = useRef(null)
  const lastPushRef   = useRef(0)
  const riderAnimFrameRef = useRef(null)

  const [mapReady, setMapReady] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [tokenMissing, setTokenMissing] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [coords, setCoords] = useState(null) // driver's own live GPS position

  const { coords: stopCoords } = useStopCoords()
  const pCoord = stopCoords[pickup]
  const dCoord = stopCoords[dropoff]

  // ── Load Mapbox SDK ───────────────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token || token === 'your_mapbox_public_token_here') {
      setTokenMissing(true)
      return
    }
    setSdkError(false)
    loadMapbox().then(() => setMapReady(true)).catch(() => setSdkError(true))
  }, [retryKey])

  // ── Track the driver's real location, and push it to the backend (throttled)
  // so the rider's tracking page can show where the driver actually is ───────
  useEffect(() => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { longitude: lng, latitude: lat } = pos.coords
        setCoords({ lng, lat })
        const now = Date.now()
        if (now - lastPushRef.current >= 6000) {
          lastPushRef.current = now
          api.patch('/driver/location', { lat, lng }).catch(() => {})
        }
      },
      () => {}, // silently degrade — the route still shows without a live position
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  // ── Initialise the map once the SDK and both stops are ready ───────
  useEffect(() => {
    if (!mapReady || !containerRef.current || !pCoord || !dCoord || mapRef.current) return

    const mb = window.mapboxgl
    mb.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const map = new mb.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lerp(pCoord.lng, dCoord.lng, 0.5), lerp(pCoord.lat, dCoord.lat, 0.5)],
      zoom: 12,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })
    mapRef.current = map

    map.on('load', () => {
      setMapLoaded(true)
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [
          [pCoord.lng, pCoord.lat], [dCoord.lng, dCoord.lat],
        ] } },
      })
      map.addLayer({ id: 'route-glow', type: 'line', source: 'route',
        paint: { 'line-color': '#22c55e', 'line-width': 10, 'line-opacity': 0.15, 'line-blur': 4 } })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route',
        paint: { 'line-color': '#22c55e', 'line-width': 3.5, 'line-opacity': 0.9, 'line-dasharray': [2, 2.5] } })

      new mb.Marker({ color: OLIVE })
        .setLngLat([dCoord.lng, dCoord.lat])
        .setPopup(new mb.Popup({ offset: 16 }).setText(`Dropoff: ${dropoff}`))
        .addTo(map)

      const bounds = new mb.LngLatBounds([pCoord.lng, pCoord.lat], [dCoord.lng, dCoord.lat])
      if (coords) bounds.extend([coords.lng, coords.lat])
      map.fitBounds(bounds, { padding: 60, duration: 0 })
    })

    return () => { setMapLoaded(false); map.remove(); mapRef.current = null; driverMarkerRef.current = null; riderMarkerRef.current = null }
  }, [mapReady, pCoord, dCoord])

  // ── Place/move the driver's own live position marker ──────────────
  useEffect(() => {
    if (!coords || !mapRef.current || !window.mapboxgl) return
    if (!driverMarkerRef.current) {
      const driverEl = document.createElement('div')
      Object.assign(driverEl.style, {
        width:'38px', height:'38px',
        display:'flex', alignItems:'center', justifyContent:'center',
        filter:'drop-shadow(0 2px 5px rgba(0,0,0,0.55))',
      })
      driverEl.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path fill="${OLIVE}" stroke="${NEON}" stroke-width="0.8"
            d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>`
      driverMarkerRef.current = new window.mapboxgl.Marker({ element: driverEl, anchor: 'center' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapRef.current)
    } else {
      driverMarkerRef.current.setLngLat([coords.lng, coords.lat])
    }
  }, [coords])

  // ── Place/animate the rider's real reported position (falls back to the
  // static pickup stop until their device has shared a position) ───────────
  const riderRefPoint = riderLocation || pCoord
  useEffect(() => {
    if (!mapRef.current || !window.mapboxgl || !riderRefPoint) return
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
        .setLngLat([riderRefPoint.lng, riderRefPoint.lat])
        .setPopup(new mb.Popup({ offset: 24 }).setText(riderLocation ? `Rider: ${pickup}` : `Pickup: ${pickup}`))
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
          lerp(startLng, riderRefPoint.lng, eased),
          lerp(startLat, riderRefPoint.lat, eased),
        ])
        if (raw < 1) riderAnimFrameRef.current = requestAnimationFrame(animate)
      }
      riderAnimFrameRef.current = requestAnimationFrame(animate)
    }

    return () => cancelAnimationFrame(riderAnimFrameRef.current)
  }, [riderRefPoint?.lat, riderRefPoint?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refit bounds to whatever real positions we have (driver, rider, dropoff)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const mb = window.mapboxgl
    const points = []
    if (coords) points.push([coords.lng, coords.lat])
    if (riderRefPoint) points.push([riderRefPoint.lng, riderRefPoint.lat])
    if (dCoord) points.push([dCoord.lng, dCoord.lat])
    if (points.length < 2) return

    const bounds = new mb.LngLatBounds(points[0], points[0])
    points.forEach(p => bounds.extend(p))
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 800 })
  }, [mapLoaded, coords?.lng, coords?.lat, riderRefPoint?.lat, riderRefPoint?.lng, dCoord]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch the real, road-following route for the current leg — driver →
  // rider before pickup, driver → dropoff after — so the driver's own map
  // also shows the actual streets, not a straight line. ─────────────────────
  useEffect(() => {
    if (!mapLoaded) return
    const headingToPickup = status === 'pending' || status === 'driver_assigned'
    const from = coords || riderRefPoint
    const to   = headingToPickup ? riderRefPoint : dCoord
    if (!from || !to) return

    const token = import.meta.env.VITE_MAPBOX_TOKEN
    fetchDrivingRoute(from, to, token).then(routeCoords => {
      if (!routeCoords) return
      const src = mapRef.current?.getSource('route')
      if (src) src.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: routeCoords } })
    })
  }, [mapLoaded, status, coords?.lng, coords?.lat, riderRefPoint?.lat, riderRefPoint?.lng, dCoord]) // eslint-disable-line react-hooks/exhaustive-deps

  if (tokenMissing) {
    return (
      <div style={{ background:OLIVE, borderRadius:20, height:340, marginBottom:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
        <MapPin size={26} color={NEON}/>
        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, textAlign:'center', padding:'0 20px' }}>
          Add <code style={{ color:NEON }}>VITE_MAPBOX_TOKEN</code> to your <code style={{ color:NEON }}>.env</code> to see the map
        </p>
      </div>
    )
  }

  if (sdkError) {
    return (
      <div style={{ background:OLIVE, borderRadius:20, height:340, marginBottom:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
        <MapPin size={26} color={NEON}/>
        <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, textAlign:'center', padding:'0 20px' }}>Couldn't load the map.</p>
        <button onClick={() => setRetryKey(k => k + 1)}
          style={{ padding:'7px 18px', borderRadius:50, background:NEON, color:OLIVE, fontWeight:700, fontSize:13, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          Retry
        </button>
      </div>
    )
  }

  if (!pCoord || !dCoord) {
    return (
      <div style={{ background:CARD, border:`1.5px dashed ${BORDER}`, borderRadius:20, padding:24, marginBottom:20, textAlign:'center' }}>
        <MapPin size={24} color={MUTED} style={{ marginBottom:8 }}/>
        <p style={{ fontSize:13, color:MUTED }}>Route preview unavailable for this pickup/dropoff.</p>
      </div>
    )
  }

  return (
    <div style={{ borderRadius:20, overflow:'hidden', marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
      <div ref={containerRef} style={{ width:'100%', height:340, background:OLIVE }}/>
    </div>
  )
}
