import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { LocationDropdown, TimeDropdown } from '../../components/RouteDropdowns'
import { Package, ArrowRight, Phone, Star } from 'lucide-react'
import { api } from '../../services/api'
import { useRoutes } from '../../hooks/useRoutes'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900'

const SIZES=[
  {id:'sm',label:'Small',desc:'Documents, phones, small items'},
  {id:'md',label:'Medium',desc:'Clothes, shoes, groceries'},
  {id:'lg',label:'Large',desc:'Electronics, furniture, full apartment moves'},
]
const INPUT={width:'100%',padding:'13px 16px',borderRadius:10,fontSize:15,border:`1.5px solid ${BORDER}`,outline:'none',background:CARD,color:TEXT,fontFamily:'inherit',boxSizing:'border-box'}

// One general pickup window, 8 AM – 10 PM, instead of the morning/evening
// split used for rides — packages can be picked up any time of day.
const ALL_DAY_SLOTS=[
  '8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM',
  '4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM',
  '8:00 PM','8:30 PM','9:00 PM','9:30 PM','10:00 PM',
]
// Routes are still priced per morning/evening period under the hood — derive
// the right one from the chosen time so book-intent finds the priced route.
function periodForSlot(slot){
  return slot.includes('PM') ? 'evening' : 'morning'
}

const STAGE_LABEL = {
  pending:         'Finding a driver…',
  driver_assigned: 'Driver assigned',
  arrived_pickup:  'Driver at pickup',
  in_transit:      'On the way to drop-off',
  completed:       'Delivered',
}

// A compact status card, distinct from the full live-tracking map used for
// ride bookings — package delivery is a different service and shouldn't
// look/feel like "Track a Ride". Just enough info to know it's in progress.
function DeliveryStatusBanner({ rideId }){
  const [ride,setRide]=useState(null)
  const [error,setError]=useState('')

  useEffect(()=>{
    let cancelled=false
    function load(){
      api.get(`/rides/${rideId}`)
        .then(res=>{ if(!cancelled) setRide(res.data.ride) })
        .catch(()=>{ if(!cancelled) setError('Could not load delivery status.') })
    }
    load()
    const id=setInterval(load,8000)
    return ()=>{ cancelled=true; clearInterval(id) }
  },[rideId])

  if(error) return (
    <div style={{background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:16,padding:16,marginBottom:16}}>
      <p style={{fontSize:13,color:'#ef4444'}}>{error}</p>
    </div>
  )
  if(!ride) return (
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:16,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
      <p style={{fontSize:13,color:MUTED}}>Loading delivery status…</p>
    </div>
  )

  const driver=ride.driver

  return (
    <div style={{background:CARD,border:`1.5px solid ${NEON}`,borderRadius:16,padding:18,marginBottom:20,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,gap:10}}>
        <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>Delivery in Progress</p>
        <span style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20,background:ride.status==='completed'?'#dcfce7':NEON,color:ride.status==='completed'?'#15803d':OLIVE,whiteSpace:'nowrap',flexShrink:0}}>
          {STAGE_LABEL[ride.status]||ride.status}
        </span>
      </div>
      <p style={{fontSize:13,color:TEXT,fontWeight:600,marginBottom:driver?12:0}}>{ride.pickup} → {ride.destination}</p>
      {driver && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,paddingTop:12,borderTop:`1px solid ${BORDER}`}}>
          <div style={{minWidth:0}}>
            <p style={{fontWeight:700,fontSize:14,color:TEXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{driver.name}</p>
            {driver.rating!=null && (
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2}}>
                <Star size={11} color='#f59e0b' fill='#f59e0b'/>
                <span style={{fontSize:12,color:MUTED}}>{driver.rating}</span>
              </div>
            )}
          </div>
          {driver.phone && (
            <a href={`tel:${driver.phone}`} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:50,background:NEON,color:OLIVE,fontWeight:700,fontSize:13,textDecoration:'none',flexShrink:0}}>
              <Phone size={13}/> Call
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function SendPackage(){
  const [size,setSize]=useState('sm')
  const [timeSlot,setTimeSlot]=useState('')
  const [pickup,setPickup]=useState('')
  const [dropoff,setDropoff]=useState('')
  const [recipient,setRecipient]=useState('')
  const [recipientPhone,setRecipientPhone]=useState('')
  const [notes,setNotes]=useState('')
  const [submitting,setSubmitting]=useState(false)
  const [bookingId,setBookingId]=useState(null)
  const [quotedFare,setQuotedFare]=useState(null)
  const [bookError,setBookError]=useState(null)

  // Same route structure and data source as Book Ride — pickup/dropoff
  // dropdowns derive from the admin-priced routes. Pickup/dropoff coverage is
  // the same across both periods, so 'morning' is just used to populate the
  // dropdown options; the real period (for pricing) is derived from the
  // chosen time slot at submit time.
  const { routes, loading: routesLoading, pickupOptions, dropoffOptionsFor } = useRoutes('morning')
  const dropoffOptions = dropoffOptionsFor(pickup)

  // Active delivery — once a driver confirms the route, this page turns into
  // the live-tracking view, exactly like Book Ride.
  const [activeRideId, setActiveRideId] = useState(undefined) // undefined = checking, null = none

  useEffect(() => {
    let cancelled = false
    function check() {
      api.get('/rides/me/active')
        .then(res => { if (!cancelled) setActiveRideId(res.data.rideId) })
        .catch(() => { if (!cancelled) setActiveRideId(null) })
    }
    check()
    const id = setInterval(check, 6000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    if (dropoff && !dropoffOptions.includes(dropoff)) setDropoff('')
  }, [pickup, routes]) // eslint-disable-line react-hooks/exhaustive-deps

  function sanitize(v){return v.replace(/[<>"]/g,'').slice(0,200)}

  async function handleSubmit(e){
    e.preventDefault()
    if(!pickup||!dropoff||!timeSlot||!recipient||!recipientPhone)return
    setSubmitting(true)
    setBookingId(null)
    setQuotedFare(null)
    setBookError(null)
    try {
      const res = await api.post('/rides/book-intent', {
        period: periodForSlot(timeSlot), timeSlot, pickup, dropoff, service:'send',
        recipientName: recipient, recipientPhone, packageSize: size, notes,
      })
      setBookingId(res.data.bookingId)
      setQuotedFare(res.data.quotedFare)
    } catch(err) {
      setBookError(err.data?.message || 'Could not register your booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (activeRideId === undefined) {
    return (
      <AppLayout title="Move an Item">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
          <div style={{ width:28, height:28, border:`3px solid ${NEON}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppLayout>
    )
  }

  return(
    <AppLayout title="Move an Item">
      {activeRideId && <DeliveryStatusBanner rideId={activeRideId}/>}
      <form onSubmit={handleSubmit}>
          {/* Size */}
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
            <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Package Size</p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {SIZES.map(s=>(
                <label key={s.id} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'14px 18px',
                  borderRadius:12,border:`2px solid ${size===s.id?NEON:BORDER}`,
                  background:size===s.id?NEON:CARD,
                  cursor:'pointer',transition:'all 0.15s',
                  boxShadow:size===s.id?'0 4px 12px rgba(204,255,0,0.35)':'none'
                }}>
                  <input type="radio" name="size" value={s.id} checked={size===s.id} onChange={()=>setSize(s.id)} style={{display:'none'}}/>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:700,fontSize:14,color:size===s.id?OLIVE:TEXT,marginBottom:2}}>{s.label}</p>
                    <p style={{fontSize:12,color:size===s.id?'rgba(36,56,0,0.6)':MUTED}}>{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Time slot — one general pickup window, 8 AM – 10 PM */}
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
            <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Pickup Time</p>
            <TimeDropdown
              slots={ALL_DAY_SLOTS}
              value={timeSlot}
              onChange={setTimeSlot}
            />
          </div>

          {/* Route — same structure and data source as Book Ride */}
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
            <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Route</p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
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
            </div>
          </div>

          {/* Recipient */}
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:20,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
            <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Recipient Details</p>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Recipient Name</label>
                <input value={recipient} onChange={e=>setRecipient(sanitize(e.target.value))} placeholder="Full name" style={INPUT}
                  onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER} required/>
              </div>
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Recipient Phone</label>
                <input type="tel" value={recipientPhone} onChange={e=>setRecipientPhone(sanitize(e.target.value))} placeholder="+234 800 000 0000" style={INPUT}
                  onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER} required/>
              </div>
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>Notes (optional)</label>
                <textarea value={notes} onChange={e=>setNotes(sanitize(e.target.value))} placeholder="Fragile, handle with care..." rows={3}
                  style={{...INPUT,resize:'vertical'}}
                  onFocus={e=>e.target.style.borderColor=MOSS} onBlur={e=>e.target.style.borderColor=BORDER}/>
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting||!pickup||!dropoff||!timeSlot}
            style={{
              width:'100%',padding:'15px',borderRadius:50,
              background:submitting||!pickup||!dropoff||!timeSlot?BORDER:NEON,
              color:submitting||!pickup||!dropoff||!timeSlot?MUTED:OLIVE,
              fontWeight:800,fontSize:15,border:'none',
              cursor:submitting||!pickup||!dropoff||!timeSlot?'not-allowed':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',gap:10,
              marginBottom:16,transition:'all 0.2s',
              boxShadow:submitting||!pickup||!dropoff||!timeSlot?'none':'0 4px 16px rgba(204,255,0,0.35)'
            }}>
            <Package size={18}/>{submitting?'Booking…':'Find a Driver'}<ArrowRight size={18}/>
          </button>

          {bookingId && (
            <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 16px',
              background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:12,marginBottom:16}}>
              <Package size={18} color='#16a34a' style={{flexShrink:0,marginTop:1}}/>
              <div>
                <p style={{fontWeight:700,fontSize:14,color:'#15803d',marginBottom:2}}>You're on the list!</p>
                <p style={{fontSize:13,color:'#166534'}}>
                  We've registered your delivery for <strong>{pickup} → {dropoff}</strong> at <strong>{timeSlot}</strong>
                  {quotedFare != null && <> for <strong>₦{quotedFare.toLocaleString()}</strong></>}.
                  A driver on this route will be matched automatically — a status update will appear at the top of this page once they confirm.
                </p>
              </div>
            </div>
          )}

          {bookError && (
            <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',
              background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:12,marginBottom:16}}>
              <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
              <p style={{fontSize:13,color:'#ef4444'}}>{bookError}</p>
            </div>
          )}
        </form>
    </AppLayout>
  )
}
