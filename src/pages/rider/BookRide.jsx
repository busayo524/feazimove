import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import RideTracker from '../../components/RideTracker'
import { LocationDropdown, TimeDropdown, MORNING_SLOTS, EVENING_SLOTS } from '../../components/RouteDropdowns'
import { MapPin, ArrowRight, Users, Navigation, Sun, Moon, X, Clock } from 'lucide-react'
import { api } from '../../services/api'
import { track } from '../../services/analytics'
import { useStopCoords } from '../../hooks/useStopCoords'
import { useRoutes } from '../../hooks/useRoutes'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

const SERVICES=[
  { id:'pool', icon:<Users size={18}/>,     label:'Pool Ride',   desc:'Share route, split cost' },
  { id:'solo', icon:<Navigation size={18}/>, label:'Solo Ride',   desc:'Private, direct route' },
]

/* ── Route preview popup — auto-shown once pickup/dropoff/time are all set ──
   The actual "Schedule a Ride" action lives inside this popup, not the page ── */
function RoutePreviewModal({ pickup, dropoff, timeSlot, fareKobo, stopCoords, onClose, onBook, booking, matching, onCancel, cancelling, insufficient }){
  const pc = stopCoords[pickup]
  const dc = stopCoords[dropoff]
  const token = import.meta.env.VITE_MAPBOX_TOKEN

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={matching ? undefined : onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:CARD,borderRadius:18,maxWidth:380,width:'100%',overflow:'hidden',boxShadow:'0 16px 40px rgba(0,0,0,0.25)',maxHeight:'95vh',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontWeight:700,fontSize:12,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>Route Preview</p>
          {!matching && (
            <button onClick={onClose} aria-label="Close" style={{background:'none',border:'none',cursor:'pointer',color:MUTED,padding:2}}><X size={16}/></button>
          )}
        </div>

        {(!token || token==='your_mapbox_public_token_here' || !pc || !dc) ? (
          <div style={{height:100,background:OLIVE,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,position:'relative',overflow:'hidden'}}>
            <MapPin size={22} color={NEON}/>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:11,textAlign:'center',padding:'0 20px'}}>Map preview unavailable for this route</p>
          </div>
        ) : (
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ccff00(${pc.lng},${pc.lat}),pin-l+243800(${dc.lng},${dc.lat})/auto/700x300@2x?access_token=${token}&padding=80,60,60,60&attribution=false&logo=false`}
            alt={`Route from ${pickup} to ${dropoff}`}
            width="100%" height="100" style={{display:'block',objectFit:'cover'}} loading="lazy"
          />
        )}

        <div style={{padding:'10px 14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{flex:1,display:'flex',alignItems:'center',gap:8,minWidth:0}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:MOSS,border:`2px solid ${BORDER}`,flexShrink:0}}/>
              <div style={{minWidth:0}}><p style={{fontSize:10,color:MUTED,fontWeight:500}}>Takeoff</p><p style={{fontSize:13,color:TEXT,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pickup}</p></div>
            </div>
            <div style={{flex:1,display:'flex',alignItems:'center',gap:8,minWidth:0}}>
              <div style={{width:9,height:9,borderRadius:'50%',background:OLIVE,border:`2px solid ${BORDER}`,flexShrink:0}}/>
              <div style={{minWidth:0}}><p style={{fontSize:10,color:MUTED,fontWeight:500}}>Dropoff</p><p style={{fontSize:13,color:TEXT,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dropoff}</p></div>
            </div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1,background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:10,padding:'8px 10px',display:'flex',alignItems:'center',gap:6}}>
              <Clock size={13} color={MOSS}/>
              <span style={{fontSize:12,fontWeight:700,color:TEXT}}>{timeSlot}</span>
            </div>
            <div style={{flex:1,background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
              {fareKobo!=null
                ? <span style={{fontSize:14,fontWeight:800,color:OLIVE}}>{`₦${Math.round(fareKobo/100).toLocaleString()}`}</span>
                : <span style={{fontSize:11,fontWeight:600,color:MUTED}}>Set once matched</span>}
            </div>
          </div>
        </div>

        <div style={{padding:'0 14px 12px'}}>
          {matching ? (
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'12px 0',marginBottom:8}}>
                <div style={{width:18,height:18,border:`2.5px solid ${OLIVE}`,borderTopColor:'transparent',borderRadius:'50%',animation:'bookride-spin 0.8s linear infinite'}}/>
                <span style={{fontSize:13,fontWeight:700,color:OLIVE}}>Matching you with a driver on your route…</span>
              </div>
              <button onClick={onCancel} disabled={cancelling} style={{
                width:'100%',padding:'11px',borderRadius:50,
                background:'none',border:`1.5px solid ${BORDER}`,
                color:cancelling?MUTED:'#ef4444',
                fontWeight:700,fontSize:14,
                cursor:cancelling?'not-allowed':'pointer',
                fontFamily:'inherit',transition:'all 0.2s'
              }}>
                {cancelling?'Cancelling…':'Cancel Request'}
              </button>
              <style>{`@keyframes bookride-spin{to{transform:rotate(360deg)}}`}</style>
            </>
          ) : (
            <>
            <p style={{fontSize:11,fontStyle:'italic',color:MUTED,textAlign:'center',margin:'0 0 8px'}}>*Booking should be within 24hrs*</p>
            <button onClick={onBook} disabled={booking||insufficient} style={{
              width:'100%',padding:'11px',borderRadius:50,
              background:(booking||insufficient)?BORDER:NEON,color:(booking||insufficient)?MUTED:OLIVE,
              fontWeight:800,fontSize:14,border:'none',
              cursor:(booking||insufficient)?'not-allowed':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              transition:'all 0.2s',
              boxShadow:(booking||insufficient)?'none':'0 4px 16px rgba(204,255,0,0.35)'
            }}>
              {booking?'Scheduling…':'Schedule a Ride'}<ArrowRight size={16}/>
            </button>
            {insufficient && (
              <p style={{fontSize:12,fontWeight:600,color:'#ef4444',textAlign:'center',margin:'8px 0 0',lineHeight:1.4}}>
                Insufficient wallet balance for this ride. Top up your wallet to continue.
              </p>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookRide(){
  const [service,setService]=useState('pool')
  const [pickup,setPickup]=useState('')
  const [dropoff,setDropoff]=useState('')
  const [comment,setComment]=useState('')
  const [period,setPeriod]=useState('morning')
  const [timeSlot,setTimeSlot]=useState('')
  const [searching,setSearching]=useState(false)
  const [bookingId,setBookingId]=useState(null)
  const [bookError,setBookError]=useState(null)
  const [cancelling,setCancelling]=useState(false)
  const [walletKobo,setWalletKobo]=useState(null) // live wallet balance in kobo

  // Active, priced routes for the selected period — same data source and
  // structure used by Move an Item — pickup/dropoff dropdowns derive from it.
  const { routes, loading: routesLoading, pickupOptions, dropoffOptionsFor } = useRoutes(period)
  const dropoffOptions = dropoffOptionsFor(pickup)
  const { coords: stopCoords } = useStopCoords()

  // ── Active ride — once a driver confirms the route, this page turns into
  // the live-tracking view (mirrors DriverDashboard's pattern) ──────────────
  const [activeRideId, setActiveRideId] = useState(undefined) // undefined = checking, null = none

  // Poll for a confirmed ride while none is active, so a driver match flips
  // this page into the tracking view live, with no reload needed. Once a ride
  // IS active, stop polling this endpoint — it only reports 'active' statuses
  // (pending/driver_assigned/arrived_pickup/in_transit), not 'completed', so
  // re-polling here would rip the "Rate This Trip" screen away the instant
  // the trip finishes, before the rider gets a chance to see or tap it.
  // RideTracker owns the rest of that ride's lifecycle from here.
  useEffect(() => {
    if (activeRideId) return
    let cancelled = false
    function check() {
      api.get('/rides/me/active')
        .then(res => { if (!cancelled) setActiveRideId(res.data.rideId) })
        .catch(() => { if (!cancelled) setActiveRideId(null) })
    }
    check()
    const id = setInterval(check, 6000)
    return () => { cancelled = true; clearInterval(id) }
  }, [activeRideId])

  // Restore a still-pending booking after a reload — or after a driver
  // cancelled the trip and this rider's request went back into the queue —
  // so the "Matching you with a driver…" modal resumes instead of vanishing.
  useEffect(() => {
    if (activeRideId !== null || bookingId) return
    let cancelled = false
    api.get('/rides/book-intent/mine')
      .then(res => {
        const b = res.data.booking
        if (cancelled || !b || (b.service !== 'pool' && b.service !== 'solo')) return
        setPeriod(b.period)
        setTimeSlot(b.timeSlot)
        setPickup(b.pickup)
        setDropoff(b.dropoff)
        setBookingId(b.bookingId)
        setShowPreview(true)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activeRideId]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchPeriod(p){
    if(p === period) return
    setPeriod(p)
    setTimeSlot('')
    setPickup('')
    setDropoff('')
    setComment('')
    setBookingId(null)
    setBookError(null)
  }

  async function handleSearch(){
    if(!pickup||!dropoff||!timeSlot)return
    setSearching(true)
    setBookingId(null)
    setBookError(null)
    try {
      track('search_route', { pickup_zone: pickup, dropoff_zone: dropoff, service })
      const res = await api.post('/rides/book-intent', { period, timeSlot, pickup, dropoff, service, comment })
      setBookingId(res.data.bookingId)
    } catch(err) {
      setBookError(err.data?.message || 'Could not register your booking. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // Cancel a pending request while still searching for a driver
  async function cancelBooking(){
    if(!bookingId || cancelling)return
    setCancelling(true)
    try {
      await api.patch(`/rides/book-intent/${bookingId}/cancel`)
    } catch(err) {
      setBookError(err.data?.message || 'Could not cancel this request.')
    } finally {
      setCancelling(false)
      setBookingId(null)
      setShowPreview(false)
    }
  }

  // If the chosen pickup no longer offers the currently-selected dropoff
  // (e.g. period switched, or that pair simply isn't priced), clear it.
  useEffect(() => {
    if (dropoff && !dropoffOptions.includes(dropoff)) setDropoff('')
  }, [pickup, routes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Route preview is opened manually via the "Preview Route" button below —
  // not auto-shown — so the rider gets a chance to type a comment first.
  const [showPreview, setShowPreview] = useState(false)
  const canPreview = !!(pickup && dropoff && timeSlot)

  const previewRoute = routes.find(r => r.pickup === pickup && r.dropoff === dropoff)
  // Solo fare depends on which driver's car a rider ends up matched with (its
  // seat count) — it's never known upfront, only once /driver/confirm-route
  // actually pairs them, so there's nothing to preview here for that service.
  const previewFareKobo = previewRoute && service === 'pool' ? previewRoute.poolFareKobo : null

  // Pull the live wallet balance whenever the preview opens, so the
  // insufficient-funds note reflects reality (not a stale login-time value).
  useEffect(() => {
    if (!showPreview) return
    api.get('/wallet/balance')
      .then(res => setWalletKobo(Math.round((res.data?.balance || 0) * 100)))
      .catch(() => setWalletKobo(null))
  }, [showPreview])
  const insufficientFunds = previewFareKobo != null && walletKobo != null && walletKobo < previewFareKobo

  if (activeRideId === undefined) {
    return (
      <AppLayout title="Schedule Ride">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppLayout>
    )
  }

  return(
    <AppLayout title={activeRideId ? 'Track Ride' : 'Schedule Ride'}>
      {activeRideId ? (
        <RideTracker activeRideId={activeRideId} onExit={() => setActiveRideId(null)}/>
      ) : (
        <>
          {showPreview && pickup && dropoff && (
            <RoutePreviewModal pickup={pickup} dropoff={dropoff} timeSlot={timeSlot} fareKobo={previewFareKobo}
              stopCoords={stopCoords} onClose={()=>setShowPreview(false)} onBook={handleSearch} booking={searching}
              matching={!!bookingId} onCancel={cancelBooking} cancelling={cancelling} insufficient={insufficientFunds}/>
          )}

          <div className="bookride-scroll">
            {/* Service selector */}
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:12,marginBottom:10,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
              <p style={{fontWeight:700,fontSize:12,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>What do you need?</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
                {SERVICES.map(s=>{
                  const active=service===s.id
                  return(
                    <button key={s.id} onClick={()=>setService(s.id)} style={{
                      padding:'10px 8px',borderRadius:10,
                      border:`2px solid ${active?NEON:BORDER}`,
                      background:active?NEON:CARD,
                      cursor:'pointer',textAlign:'center',transition:'all 0.15s',
                      boxShadow:active?'0 4px 16px rgba(204,255,0,0.35)':'none'
                    }}>
                      <div style={{display:'flex',justifyContent:'center',marginBottom:4,color:active?OLIVE:MOSS}}>{s.icon}</div>
                      <p style={{fontWeight:700,fontSize:12,color:active?OLIVE:TEXT,marginBottom:1}}>{s.label}</p>
                      <p style={{fontSize:10,color:active?'rgba(36,56,0,0.65)':MUTED,lineHeight:1.2}}>{s.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Route form */}
            <div>
              {/* Time slot */}
              <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:12,marginBottom:10,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
                {/* Morning / Evening toggle */}
                <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:8,marginBottom:8}}>
                  {[
                    { key:'morning', label:'Morning', icon:<Sun size={14}/>, sub:'5 AM – 10 AM' },
                    { key:'evening', label:'Evening', icon:<Moon size={14}/>, sub:'3 PM – 10 PM' },
                  ].map(p=>(
                    <button key={p.key} type="button" onClick={()=>switchPeriod(p.key)}
                      style={{
                        padding:'8px 10px',borderRadius:10,
                        border:`1.5px solid ${period===p.key?NEON:BORDER}`,
                        background:period===p.key?NEON:CARD,
                        cursor:'pointer',transition:'all 0.15s',
                        display:'flex',alignItems:'center',gap:6,
                        boxShadow:period===p.key?'0 4px 12px rgba(204,255,0,0.3)':'none',
                      }}>
                      <span style={{color:period===p.key?OLIVE:MOSS}}>{p.icon}</span>
                      <div style={{textAlign:'left'}}>
                        <p style={{fontWeight:700,fontSize:12,color:period===p.key?OLIVE:TEXT,lineHeight:1.2}}>{p.label}</p>
                        <p style={{fontSize:10,color:period===p.key?'rgba(36,56,0,0.55)':MUTED,marginTop:0}}>{p.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Time dropdown */}
                <TimeDropdown
                  slots={period==='morning'?MORNING_SLOTS:EVENING_SLOTS}
                  value={timeSlot}
                  onChange={setTimeSlot}
                />
              </div>

              <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:12,marginBottom:10,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <LocationDropdown
                    label="Pickup Location"
                    options={pickupOptions}
                    value={pickup}
                    onChange={setPickup}
                    placeholder={routesLoading ? 'Loading…' : 'Select pickup location'}
                  />
                  <LocationDropdown
                    label="Drop-off Location"
                    options={dropoffOptions}
                    value={dropoff}
                    onChange={setDropoff}
                    placeholder={routesLoading ? 'Loading…' : 'Select drop-off location'}
                    forceUpward
                  />
                  <div>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Additional Comment (optional)</label>
                    <textarea value={comment} onChange={e=>setComment(e.target.value.slice(0,200))}
                      placeholder="A note for your driver - e.g I'll be waiting at Ogudu Express" rows={2}
                      style={{width:'100%',padding:'12px 14px',borderRadius:10,fontSize:14,border:`1.5px solid ${BORDER}`,outline:'none',background:CARD,color:TEXT,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}
                      onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER}/>
                  </div>
                  {!showPreview && (
                    <button type="button" onClick={()=>canPreview && setShowPreview(true)} disabled={!canPreview}
                      style={{
                        width:'100%',padding:'12px',borderRadius:10,fontSize:14,fontWeight:700,
                        background:canPreview?NEON:BORDER,color:canPreview?OLIVE:MUTED,
                        border:'none',cursor:canPreview?'pointer':'not-allowed',
                        display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                        fontFamily:'inherit',transition:'opacity 0.2s',
                      }}>
                      Preview Route<ArrowRight size={15}/>
                    </button>
                  )}
                </div>
              </div>

              {/* Error */}
              {bookError && (
                <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',
                  background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:12,marginBottom:10}}>
                  <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                  <p style={{fontSize:13,color:'#ef4444'}}>{bookError}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}
