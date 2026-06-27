import React from 'react'
import { MapPin } from 'lucide-react'
import { useStopCoords } from '../hooks/useStopCoords'

const NEON='#ccff00'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900', BG='#f0f5e0'

// Static pickup/dropoff route preview — Mapbox Static Images API, just an <img>,
// no JS SDK or live tracking. Same pattern used on the rider's Book Ride page.
export default function RouteMap({ pickup, dropoff }) {
  const token  = import.meta.env.VITE_MAPBOX_TOKEN
  const { coords } = useStopCoords()
  const pCoord = coords[pickup]
  const dCoord = coords[dropoff]

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'hidden', marginBottom:16, boxShadow:'0 2px 8px rgba(36,56,0,0.06)' }}>
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BORDER}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ fontWeight:700, fontSize:13, color:MOSS, textTransform:'uppercase', letterSpacing:'0.06em' }}>Route Map</p>
        {pickup && dropoff && <span style={{ fontSize:12, color:MOSS, fontWeight:600 }}>{pickup} → {dropoff}</span>}
      </div>

      {pickup && dropoff ? (
        <div style={{ position:'relative' }}>
          {(!token || token === 'your_mapbox_public_token_here' || !pCoord || !dCoord) ? (
            <div style={{ height:280, background:OLIVE, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', inset:0, opacity:0.1, backgroundImage:`linear-gradient(${NEON} 1px,transparent 1px),linear-gradient(90deg,${NEON} 1px,transparent 1px)`, backgroundSize:'40px 40px' }}/>
              <div style={{ position:'relative', width:44, height:44, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <MapPin size={22} color={OLIVE}/>
              </div>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, textAlign:'center', position:'relative' }}>
                {!pCoord || !dCoord
                  ? <>Route preview unavailable for this pickup/dropoff.</>
                  : <>Add <code style={{ color:NEON, fontSize:12 }}>VITE_MAPBOX_TOKEN</code> to <code style={{ color:NEON, fontSize:12 }}>.env</code><br/>to see the route map</>
                }
              </p>
            </div>
          ) : (
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ccff00(${pCoord.lng},${pCoord.lat}),pin-l+243800(${dCoord.lng},${dCoord.lat})/auto/700x300@2x?access_token=${token}&padding=80,60,60,60`}
              alt={`Route from ${pickup} to ${dropoff}`}
              width="100%"
              height="280"
              style={{ display:'block', objectFit:'cover' }}
              loading="lazy"
            />
          )}

          <div style={{ padding:'14px 20px', borderTop:`1px solid ${BORDER}`, display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:MOSS, border:`2px solid ${BORDER}`, flexShrink:0 }}/>
              <div>
                <p style={{ fontSize:11, color:MUTED, fontWeight:500 }}>Pickup</p>
                <p style={{ fontSize:14, color:TEXT, fontWeight:600 }}>{pickup}</p>
              </div>
            </div>
            <div style={{ width:2, height:16, background:BORDER, marginLeft:4 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:OLIVE, border:`2px solid ${BORDER}`, flexShrink:0 }}/>
              <div>
                <p style={{ fontSize:11, color:MUTED, fontWeight:500 }}>Drop-off</p>
                <p style={{ fontSize:14, color:TEXT, fontWeight:600 }}>{dropoff}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ height:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:BG }}>
          <MapPin size={32} color={BORDER}/>
          <p style={{ fontSize:13, color:MUTED, textAlign:'center' }}>Select pickup and drop-off<br/>to see your route on the map</p>
        </div>
      )}
    </div>
  )
}
