import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { api } from '../../services/api'
import { Navigation } from 'lucide-react'

const NEON='#ccff00'
const TEXT='#1a2800', MUTED='#4C6900'

// Resolves the rider's current in-progress ride (if any) and redirects to it.
// Reached via the "Track Ride" sidebar link, which doesn't know a ride ID ahead of time.
export default function CurrentRide(){
  const [rideId, setRideId] = useState(undefined) // undefined = loading, null = none found

  useEffect(() => {
    api.get('/rides/me/active')
      .then(res => setRideId(res.data.rideId))
      .catch(() => setRideId(null))
  }, [])

  if (rideId === undefined) {
    return (
      <AppLayout title="Track Ride">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppLayout>
    )
  }

  if (rideId) return <Navigate to={`/track/${rideId}`} replace/>

  return (
    <AppLayout title="Track Ride">
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', padding:24 }}>
        <Navigation size={32} color={MUTED} style={{ marginBottom:12 }}/>
        <p style={{ color:TEXT, fontWeight:700, marginBottom:6 }}>No active ride right now</p>
        <p style={{ color:MUTED, fontSize:13 }}>Book a ride to start tracking it here.</p>
      </div>
    </AppLayout>
  )
}
