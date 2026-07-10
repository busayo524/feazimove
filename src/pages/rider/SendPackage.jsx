import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { LocationDropdown, TimeDropdown } from '../../components/RouteDropdowns'
import { Package, ArrowRight, Phone, Star } from 'lucide-react'
import { api } from '../../services/api'
import { track } from '../../services/analytics'
import { useRoutes } from '../../hooks/useRoutes'
import movingImg from '../../assets/Moving.png'

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

// Full-page "Launching Soon" takeover — the booking form stays mounted and
// visible (blurred) underneath, but the feature is gated until launch.
// Floaters sit in the four corners (not around the headline column) so they
// never collide with the badge/title text on narrow phone screens, and the
// whole thing scales down via clamp()/media queries instead of fixed px.
function LaunchingSoonOverlay(){
  // idle → joining → joined; contact details come from the logged-in account
  // server-side, so joining is a single tap with no form.
  const [waitlist,setWaitlist]=useState('idle')

  useEffect(()=>{
    let cancelled=false
    api.get('/rides/move-waitlist/me')
      .then(res=>{ if(!cancelled && res.data.joined) setWaitlist('joined') })
      .catch(()=>{})
    return ()=>{ cancelled=true }
  },[])

  async function joinWaitlist(){
    if(waitlist!=='idle')return
    setWaitlist('joining')
    try {
      await api.post('/rides/move-waitlist')
      setWaitlist('joined')
    } catch {
      setWaitlist('idle')
    }
  }

  const floaters=[
    {emoji:'📦', cls:'ls-fl ls-fl-tl', delay:'0s'},
    {emoji:'🛋️', cls:'ls-fl ls-fl-tr', delay:'0.8s'},
    {emoji:'🛍️', cls:'ls-fl ls-fl-bl', delay:'1.4s'},
    {emoji:'📦', cls:'ls-fl ls-fl-br', delay:'2s'},
  ]
  return (
    <div className="ls-overlay" style={{position:'absolute',inset:0,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:20,animation:'lsFade 0.5s ease-out both'}}>
      {/* Moving.png backdrop — slightly transparent so the page peeks through */}
      <div style={{position:'absolute',inset:0,backgroundImage:`url(${movingImg})`,backgroundSize:'cover',backgroundPosition:'center',opacity:0.88}}/>
      {/* Dark wash so the text stays readable over the photo */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg, rgba(10,18,0,0.40) 0%, rgba(10,18,0,0.55) 55%, rgba(10,18,0,0.78) 100%)'}}/>

      {/* Floating packages drifting gently, tucked into the corners */}
      {floaters.map((f,i)=>(
        <span key={i} aria-hidden="true" className={f.cls} style={{
          position:'absolute',animation:`lsFloat 4.5s ease-in-out ${f.delay} infinite`,
          filter:'drop-shadow(0 6px 12px rgba(0,0,0,0.45))',
        }}>{f.emoji}</span>
      ))}

      {/* Centre content */}
      <div className="ls-content" style={{position:'relative',textAlign:'center',maxWidth:680,animation:'lsRise 0.8s cubic-bezier(.22,1,.36,1) 0.15s both'}}>
        <span className="ls-badge" style={{
          display:'inline-flex',alignItems:'center',gap:8,borderRadius:50,
          background:NEON,color:OLIVE,fontWeight:900,letterSpacing:'0.14em',
          textTransform:'uppercase',boxShadow:'0 0 30px rgba(204,255,0,0.5)',
          animation:'lsBadge 2.2s ease-in-out infinite',
        }}>
          <Package size={14}/> Coming to FeaziMove
        </span>

        <h2 className="ls-title" style={{
          fontWeight:900,color:'#ffffff',
          letterSpacing:'-0.03em',lineHeight:1.05,
          animation:'lsGlow 2.8s ease-in-out infinite',
        }}>
          Launching <span style={{color:NEON}}>Soon!!!</span>
        </h2>

        <div className="ls-rule" style={{background:NEON,borderRadius:2,margin:'0 auto',boxShadow:'0 0 14px rgba(204,255,0,0.8)'}}/>

        <p className="ls-sub" style={{color:'rgba(255,255,255,0.92)',fontWeight:600,lineHeight:1.6}}>
          Move an Item - from groceries to full apartments.
        </p>

        <p className="ls-tagline" style={{color:NEON,fontWeight:800,letterSpacing:'0.04em',textShadow:'0 0 18px rgba(204,255,0,0.4)'}}>
          Share Moving Space, Split the cost
        </p>

        {/* Little delivery truck driving across a dashed road */}
        <div className="ls-road" style={{position:'relative',borderBottom:'2px dashed rgba(204,255,0,0.45)',overflow:'hidden'}}>
          <span aria-hidden="true" className="ls-truck" style={{position:'absolute',bottom:2,left:0,animation:'lsDrive 5s linear infinite'}}>
            <span style={{display:'inline-block',transform:'scaleX(-1)'}}>🚚</span>
          </span>
        </div>

        {/* One-tap waitlist — morphs into a celebration once joined */}
        {waitlist==='joined' ? (
          <div className="ls-joined" style={{
            display:'inline-flex',alignItems:'center',gap:10,borderRadius:50,
            background:'rgba(204,255,0,0.14)',border:`1.5px solid ${NEON}`,color:NEON,
            fontWeight:800,boxShadow:'0 0 26px rgba(204,255,0,0.35)',
            animation:'lsPop 0.45s cubic-bezier(.34,1.56,.64,1) both',
          }}>
            <span style={{fontSize:'1.2em'}}>🎉</span> You're on the list! We'll notify you at launch.
          </div>
        ) : (
          <button onClick={joinWaitlist} disabled={waitlist==='joining'} className="ls-cta" style={{
            display:'inline-flex',alignItems:'center',gap:10,borderRadius:50,border:'none',
            background:NEON,color:NT,fontWeight:900,letterSpacing:'0.02em',
            cursor:waitlist==='joining'?'wait':'pointer',fontFamily:'inherit',
            boxShadow:'0 0 30px rgba(204,255,0,0.45), 0 8px 24px rgba(0,0,0,0.35)',
            animation:'lsBadge 2.2s ease-in-out infinite',transition:'transform 0.15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            {waitlist==='joining'
              ? <><span className="ls-spin"/> Saving your spot…</>
              : <>Join the Waitlist <ArrowRight size={17}/></>}
          </button>
        )}
      </div>

      <style>{`
        @keyframes lsFade  { from { opacity:0 } to { opacity:1 } }
        @keyframes lsRise  { from { opacity:0; transform:translateY(28px) scale(0.96) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes lsFloat { 0%,100% { transform:translateY(0) rotate(-3deg) } 50% { transform:translateY(-16px) rotate(3deg) } }
        @keyframes lsGlow  { 0%,100% { text-shadow:0 0 24px rgba(204,255,0,0.25) } 50% { text-shadow:0 0 46px rgba(204,255,0,0.65) } }
        @keyframes lsBadge { 0%,100% { transform:scale(1) } 50% { transform:scale(1.06) } }
        @keyframes lsDrive { 0% { left:-12% } 100% { left:104% } }
        @keyframes lsPop   { from { opacity:0; transform:scale(0.6) } to { opacity:1; transform:scale(1) } }
        @keyframes lsSpin  { to { transform:rotate(360deg) } }

        .ls-spin {
          width:15px; height:15px; border-radius:50%; display:inline-block;
          border:2.5px solid rgba(10,10,10,0.25); border-top-color:#0a0a0a;
          animation: lsSpin 0.8s linear infinite;
        }

        .ls-stage   { min-height: 420px; height: min(78vh, 720px); height: min(78dvh, 720px); }
        @media (max-width: 480px) { .ls-stage { min-height: 380px; height: min(72vh, 640px); height: min(72dvh, 640px); } }

        .ls-content { padding: 0 clamp(16px, 6vw, 28px); }
        .ls-badge   { padding: clamp(5px,1.4vw,7px) clamp(12px,3vw,18px); font-size: clamp(9px,2.6vw,12px); margin-bottom: clamp(14px,4vw,22px); }
        .ls-title   { font-size: clamp(1.7rem, 8vw, 4rem); margin-bottom: clamp(10px,3vw,18px); }
        .ls-rule    { width: 48px; height: 3px; margin-bottom: clamp(12px,3vw,18px); }
        .ls-sub     { font-size: clamp(0.88rem, 3.6vw, 1.35rem); margin-bottom: clamp(8px,2vw,12px); }
        .ls-tagline { font-size: clamp(0.8rem, 3.2vw, 1.05rem); margin-bottom: clamp(16px,4vw,28px); }
        .ls-road    { height: clamp(28px,7vw,40px); margin-bottom: clamp(18px,4.5vw,26px); }
        .ls-truck   { font-size: clamp(20px,5vw,28px); }
        .ls-cta     { padding: clamp(11px,2.8vw,14px) clamp(22px,6vw,34px); font-size: clamp(0.85rem,3.4vw,1rem); }
        .ls-joined  { padding: clamp(10px,2.6vw,13px) clamp(16px,4.5vw,26px); font-size: clamp(0.78rem,3vw,0.95rem); }

        /* Corner floaters — clamp() keeps them clear of the text column and
           shrinks/fades them on small screens instead of overlapping content */
        .ls-fl        { font-size: clamp(18px, 6vw, 40px); opacity: 0.85; }
        .ls-fl-tl     { top: clamp(4%, 3vw, 12%);    left: clamp(3%, 3vw, 8%); }
        .ls-fl-tr     { top: clamp(3%, 2vw, 8%);     right: clamp(3%, 3vw, 10%); font-size: clamp(16px, 5vw, 40px); }
        .ls-fl-bl     { bottom: clamp(22%, 6vw, 28%); left: clamp(3%, 3vw, 12%); }
        .ls-fl-br     { bottom: clamp(28%, 7vw, 34%); right: clamp(3%, 3vw, 14%); font-size: clamp(14px, 4vw, 26px); }

        @media (max-width: 480px) {
          .ls-fl-tr { opacity: 0.55; }
          .ls-fl-br { display: none; }
        }
      `}</style>
    </div>
  )
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
      track('search_route', { pickup_zone: pickup, dropoff_zone: dropoff, service: 'send' })
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
      <div className="ls-stage" style={{position:'relative',borderRadius:20,overflow:'hidden'}}>
        <LaunchingSoonOverlay/>
        {/* Existing page, kept intact but frozen behind the launch overlay */}
        <div aria-hidden="true" style={{height:'100%',overflow:'hidden',filter:'blur(3px)',pointerEvents:'none',userSelect:'none'}}>
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
        </div>
      </div>
    </AppLayout>
  )
}
