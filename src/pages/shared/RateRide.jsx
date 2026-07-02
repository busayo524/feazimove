import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { Star, AlertCircle } from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280'

export default function RateRide(){
  const { rideId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [stars,setStars]=useState(0)
  const [hover,setHover]=useState(0)
  const [submitted,setSubmitted]=useState(false)
  const [submitting,setSubmitting]=useState(false)
  const [submitError,setSubmitError]=useState('')

  useEffect(() => {
    api.get(`/rides/${rideId}`)
      .then(res => setRide(res.data.ride))
      .catch(err => setLoadError(err.data?.message || 'Could not load this ride.'))
      .finally(() => setLoading(false))
  }, [rideId])

  function homeRoute(){ return user?.role === 'driver' ? '/driver' : '/book' }

  async function handleSubmit(e){
    e.preventDefault()
    if(!stars || submitting)return
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.post(`/rides/${rideId}/rate`, { stars })
      setSubmitted(true)
    } catch(err) {
      setSubmitError(err.data?.message || 'Could not submit your rating.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="Rate Ride">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppLayout>
    )
  }

  if (loadError || !ride) {
    return (
      <AppLayout title="Rate Ride">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', padding:24 }}>
          <AlertCircle size={32} color="#ef4444" style={{ marginBottom:12 }}/>
          <p style={{ color:TEXT, fontWeight:700 }}>{loadError || 'Ride not found.'}</p>
        </div>
      </AppLayout>
    )
  }

  // Who we're rating depends on which side of the ride the current user is on.
  const isRider = ride.myRole === 'rider'
  const other = isRider ? ride.driver : ride.rider
  const otherLabel = isRider ? 'driver' : 'rider'

  if (ride.alreadyRated || submitted) {
    return(
      <AppLayout title="Rate Ride">
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,textAlign:'center',padding:24}}>
          <h2 style={{fontSize:24,fontWeight:900,color:TEXT,letterSpacing:'-0.02em',marginBottom:8}}>Thanks for your feedback!</h2>
          <p style={{color:MUTED,fontSize:15,marginBottom:10}}>{submitted ? `You rated your ${otherLabel}` : `You already rated this ${otherLabel}`}</p>
          {submitted && (
            <div style={{display:'flex',gap:4,justifyContent:'center',marginBottom:32}}>
              {[1,2,3,4,5].map(s=><Star key={s} size={28} fill={s<=stars?'#f59e0b':'none'} color={s<=stars?'#f59e0b':BORDER}/>)}
            </div>
          )}
          <button onClick={()=>navigate(homeRoute())} style={{padding:'13px 32px',borderRadius:50,background:NEON,color:NT,fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
            Done
          </button>
        </div>
      </AppLayout>
    )
  }

  return(
    <AppLayout title="Rate Ride">
      {/* Trip summary */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:52,height:52,borderRadius:14,background:NEON,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:NT,fontWeight:800,fontSize:22}}>{other?.name?.[0] || '?'}</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontWeight:700,fontSize:15,color:TEXT}}>{other?.name || `Your ${otherLabel}`}</p>
            <p style={{fontSize:13,color:MUTED,marginTop:2}}>{ride.pickup} → {ride.destination}</p>
            <p style={{fontSize:12,color:MUTED,marginTop:1}}>{ride.date}</p>
          </div>
          <p style={{fontWeight:900,fontSize:18,color:NT,background:NEON,padding:'4px 12px',borderRadius:10,flexShrink:0}}>₦{ride.fare.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Stars */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,marginBottom:16,boxShadow:'0 1px 3px rgba(0,0,0,0.04)',textAlign:'center'}}>
          <p style={{fontWeight:700,fontSize:15,color:TEXT,marginBottom:6}}>How was your {isRider ? 'ride' : 'rider'}?</p>
          <p style={{fontSize:13,color:MUTED,marginBottom:20}}>Tap a star to rate</p>
          <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:12}}>
            {[1,2,3,4,5].map(s=>(
              <button key={s} type="button" onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setStars(s)} style={{background:'none',border:'none',cursor:'pointer',padding:4,transition:'transform 0.1s',transform:(hover||stars)>=s?'scale(1.15)':'scale(1)'}}>
                <Star size={40} fill={(hover||stars)>=s?'#f59e0b':'none'} color={(hover||stars)>=s?'#f59e0b':BORDER} strokeWidth={1.5}/>
              </button>
            ))}
          </div>
          {stars>0&&<p style={{fontWeight:700,fontSize:15,color:NT,background:NEON,display:'inline-block',padding:'4px 16px',borderRadius:20}}>{['','Poor','Fair','Good','Great','Excellent!'][stars]}</p>}
        </div>

        {submitError && (
          <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:12,marginBottom:16}}>
            <AlertCircle size={16} color="#ef4444" style={{flexShrink:0,marginTop:1}}/>
            <p style={{fontSize:13,color:'#ef4444'}}>{submitError}</p>
          </div>
        )}

        <button type="submit" disabled={!stars||submitting} style={{width:'100%',padding:'15px',borderRadius:50,background:!stars||submitting?'#e5e7eb':NEON,color:!stars||submitting?MUTED:NT,fontWeight:700,fontSize:15,border:'none',cursor:!stars||submitting?'not-allowed':'pointer',transition:'background 0.2s'}}>
          {submitting?'Submitting…':'Submit Rating'}
        </button>
      </form>
    </AppLayout>
  )
}
