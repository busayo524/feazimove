import React, { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { loadMapbox } from '../utils/mapbox'
import { LOCATION_COORDS } from '../utils/locations'

const NEON='#ccff00', OLIVE='#243800'
const CARD='#ffffff', BORDER='#d4e5a8', MUTED='#4C6900'

function lerp(a, b, t) { return a + (b - a) * t }

// Shows the pickup → dropoff route plus the driver's real, live device location.
export default function ActiveRideMap({ pickup, dropoff }) {
  const containerRef = useRef(null)
  const mapRef        = useRef(null)
  const driverMarkerRef = useRef(null)
  const watchIdRef    = useRef(null)

  const [mapReady, setMapReady] = useState(false)
  const [tokenMissing, setTokenMissing] = useState(false)
  const [sdkError, setSdkError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [coords, setCoords] = useState(null)

  const pCoord = LOCATION_COORDS[pickup]
  const dCoord = LOCATION_COORDS[dropoff]

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

  // ── Track the driver's real location ──────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude }),
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

      new mb.Marker({ color: '#22c55e' })
        .setLngLat([pCoord.lng, pCoord.lat])
        .setPopup(new mb.Popup({ offset: 16 }).setText(`Pickup: ${pickup}`))
        .addTo(map)

      new mb.Marker({ color: OLIVE })
        .setLngLat([dCoord.lng, dCoord.lat])
        .setPopup(new mb.Popup({ offset: 16 }).setText(`Dropoff: ${dropoff}`))
        .addTo(map)

      const bounds = new mb.LngLatBounds([pCoord.lng, pCoord.lat], [dCoord.lng, dCoord.lat])
      if (coords) bounds.extend([coords.lng, coords.lat])
      map.fitBounds(bounds, { padding: 60, duration: 0 })
    })

    return () => { map.remove(); mapRef.current = null; driverMarkerRef.current = null }
  }, [mapReady, pCoord, dCoord])

  // ── Place/move the driver's own live position marker ──────────────
  useEffect(() => {
    if (!coords || !mapRef.current || !window.mapboxgl) return
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new window.mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapRef.current)
    } else {
      driverMarkerRef.current.setLngLat([coords.lng, coords.lat])
    }
  }, [coords])

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
