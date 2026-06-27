import React, { useState, useRef, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { MapPin, ArrowRight, Users, Navigation, ChevronDown, Check, Clock, Sun, Moon, CheckCircle } from 'lucide-react'
import { api } from '../../services/api'
import { useStopCoords } from '../../hooks/useStopCoords'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900', BG='#f0f5e0'

const MORNING_SLOTS=[
  '5:00 AM','5:30 AM','6:00 AM','6:30 AM','7:00 AM',
  '7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM',
]
const EVENING_SLOTS=[
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM',
  '5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM',
]

const SERVICES=[
  { id:'pool', icon:<Users size={20}/>,     label:'Pool Ride',   desc:'Share route, split cost' },
  { id:'solo', icon:<Navigation size={20}/>, label:'Solo Ride',   desc:'Private, direct route' },
]

const ROUTES=[
  { from:'Ifako',             to:'Victoria Island', est:'₦1,400–₦2,200', dur:'40 min' },
  { from:'Ogudu Roundabout',  to:'Marina (CMS)',    est:'₦1,000–₦1,600', dur:'28 min' },
  { from:'Berger',            to:'Lekki Phase 1',   est:'₦1,500–₦2,400', dur:'45 min' },
  { from:'Estate (Alapere)',  to:'Ajah',            est:'₦1,200–₦1,900', dur:'35 min' },
]

/* ── Custom Dropdown ── */
function LocationDropdown({ label, options, value, onChange, placeholder }){
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(()=>{
    function handleClick(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return ()=> document.removeEventListener('mousedown', handleClick)
  },[])

  return(
    <div>
      <label style={{display:'block',fontSize:13,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
      <div ref={ref} style={{position:'relative'}}>
        {/* Trigger */}
        <button type="button" onClick={()=>setOpen(o=>!o)}
          style={{
            width:'100%',padding:'13px 16px',paddingLeft:42,paddingRight:40,
            borderRadius:10,fontSize:15,
            border:`1.5px solid ${open?MOSS:BORDER}`,
            background:CARD,color:value?TEXT:MUTED,
            fontFamily:'inherit',boxSizing:'border-box',
            textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',
            transition:'border-color 0.15s',outline:'none',
          }}>
          <MapPin size={15} style={{position:'absolute',left:14,color:open?MOSS:MUTED,transition:'color 0.15s'}}/>
          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {value || placeholder}
          </span>
          <ChevronDown size={15} style={{position:'absolute',right:14,color:MUTED,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}/>
        </button>

        {/* Dropdown list */}
        {open&&(
          <div style={{
            position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:100,
            background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:12,
            boxShadow:'0 8px 24px rgba(36,56,0,0.12)',overflow:'hidden',
          }}>
            {options.map((opt,i)=>(
              <button key={opt} type="button"
                onClick={()=>{ onChange(opt); setOpen(false) }}
                style={{
                  width:'100%',padding:'12px 16px',
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:value===opt?BG:CARD,
                  borderBottom:i<options.length-1?`1px solid ${BORDER}`:'none',
                  border:'none',cursor:'pointer',textAlign:'left',
                  fontFamily:'inherit',fontSize:14,
                  color:value===opt?OLIVE:TEXT,fontWeight:value===opt?700:400,
                  transition:'background 0.1s',
                }}
                onMouseEnter={e=>{ if(value!==opt) e.currentTarget.style.background=BG }}
                onMouseLeave={e=>{ if(value!==opt) e.currentTarget.style.background=CARD }}>
                <span style={{display:'flex',alignItems:'center',gap:10}}>
                  <MapPin size={13} color={value===opt?MOSS:MUTED}/>
                  {opt}
                </span>
                {value===opt&&<Check size={14} color={MOSS}/>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Time Dropdown ── */
function TimeDropdown({ slots, value, onChange }){
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(()=>{
    function handleClick(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return ()=> document.removeEventListener('mousedown', handleClick)
  },[])

  return(
    <div ref={ref} style={{position:'relative'}}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{
          width:'100%',padding:'13px 16px',paddingLeft:42,paddingRight:40,
          borderRadius:10,fontSize:15,
          border:`1.5px solid ${open?MOSS:BORDER}`,
          background:CARD,color:value?TEXT:MUTED,
          fontFamily:'inherit',boxSizing:'border-box',
          textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',
          transition:'border-color 0.15s',outline:'none',
        }}>
        <Clock size={15} style={{position:'absolute',left:14,color:open?MOSS:MUTED,transition:'color 0.15s'}}/>
        <span style={{flex:1}}>{value || 'Select a time slot'}</span>
        <ChevronDown size={15} style={{position:'absolute',right:14,color:MUTED,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}/>
      </button>

      {open&&(
        <div style={{
          position:'absolute',top:'calc(100% + 6px)',left:0,right:0,zIndex:100,
          background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:12,
          boxShadow:'0 8px 24px rgba(36,56,0,0.12)',
          maxHeight:220,overflowY:'auto',
        }}>
          {slots.map((s,i)=>(
            <button key={s} type="button"
              onClick={()=>{ onChange(s); setOpen(false) }}
              style={{
                width:'100%',padding:'12px 16px',
                display:'flex',alignItems:'center',justifyContent:'space-between',
                background:value===s?BG:CARD,
                borderBottom:i<slots.length-1?`1px solid ${BORDER}`:'none',
                border:'none',cursor:'pointer',textAlign:'left',
                fontFamily:'inherit',fontSize:14,
                color:value===s?OLIVE:TEXT,fontWeight:value===s?700:400,
                transition:'background 0.1s',
              }}
              onMouseEnter={e=>{ if(value!==s) e.currentTarget.style.background=BG }}
              onMouseLeave={e=>{ if(value!==s) e.currentTarget.style.background=CARD }}>
              <span style={{display:'flex',alignItems:'center',gap:10}}>
                <Clock size={13} color={value===s?MOSS:MUTED}/>
                {s}
              </span>
              {value===s&&<Check size={14} color={MOSS}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BookRide(){
  const [service,setService]=useState('pool')
  const [pickup,setPickup]=useState('')
  const [dropoff,setDropoff]=useState('')
  const [period,setPeriod]=useState('morning')
  const [timeSlot,setTimeSlot]=useState('')
  const [searching,setSearching]=useState(false)
  const [bookingId,setBookingId]=useState(null)
  const [quotedFare,setQuotedFare]=useState(null)
  const [bookError,setBookError]=useState(null)

  // Active, priced routes for the selected period — replaces the old hardcoded
  // location arrays. Pickup/dropoff dropdowns are derived from this.
  const [routes,setRoutes]=useState([])
  const [routesLoading,setRoutesLoading]=useState(true)
  const { coords: stopCoords } = useStopCoords()

  useEffect(()=>{
    setRoutesLoading(true)
    api.get(`/routes?period=${period}`)
      .then(res => setRoutes(res.data.routes))
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false))
  },[period])

  const pickupOptions = [...new Set(routes.map(r => r.pickup))].sort()
  const dropoffOptions = [...new Set(
    routes.filter(r => !pickup || r.pickup === pickup).map(r => r.dropoff)
  )].sort()

  function switchPeriod(p){
    if(p === period) return
    setPeriod(p)
    setTimeSlot('')
    setPickup('')
    setDropoff('')
    setBookingId(null)
    setQuotedFare(null)
    setBookError(null)
  }

  async function handleSearch(e){
    e.preventDefault()
    if(!pickup||!dropoff||!timeSlot)return
    setSearching(true)
    setBookingId(null)
    setQuotedFare(null)
    setBookError(null)
    try {
      const res = await api.post('/rides/book-intent', { period, timeSlot, pickup, dropoff, service })
      setBookingId(res.data.bookingId)
      setQuotedFare(res.data.quotedFare)
    } catch(err) {
      setBookError(err.data?.message || 'Could not register your booking. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  // If the chosen pickup no longer offers the currently-selected dropoff
  // (e.g. period switched, or that pair simply isn't priced), clear it.
  useEffect(() => {
    if (dropoff && !dropoffOptions.includes(dropoff)) setDropoff('')
  }, [pickup, routes]) // eslint-disable-line react-hooks/exhaustive-deps

  return(
    <AppLayout title="Book a Ride">

      {/* Service selector */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>What do you need?</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
          {SERVICES.map(s=>{
            const active=service===s.id
            return(
              <button key={s.id} onClick={()=>setService(s.id)} style={{
                padding:'14px 10px',borderRadius:12,
                border:`2px solid ${active?NEON:BORDER}`,
                background:active?NEON:CARD,
                cursor:'pointer',textAlign:'center',transition:'all 0.15s',
                boxShadow:active?'0 4px 16px rgba(204,255,0,0.35)':'none'
              }}>
                <div style={{display:'flex',justifyContent:'center',marginBottom:6,color:active?OLIVE:MOSS}}>{s.icon}</div>
                <p style={{fontWeight:700,fontSize:13,color:active?OLIVE:TEXT,marginBottom:2}}>{s.label}</p>
                <p style={{fontSize:11,color:active?'rgba(36,56,0,0.65)':MUTED,lineHeight:1.3}}>{s.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Route form */}
      <form onSubmit={handleSearch}>
        {/* Time slot */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Departure Time</p>

          {/* Morning / Evening toggle */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
            {[
              { key:'morning', label:'Morning', icon:<Sun size={15}/>, sub:'5 AM – 10 AM' },
              { key:'evening', label:'Evening', icon:<Moon size={15}/>, sub:'3 PM – 8 PM' },
            ].map(p=>(
              <button key={p.key} type="button" onClick={()=>switchPeriod(p.key)}
                style={{
                  padding:'12px 10px',borderRadius:12,
                  border:`1.5px solid ${period===p.key?NEON:BORDER}`,
                  background:period===p.key?NEON:CARD,
                  cursor:'pointer',transition:'all 0.15s',
                  display:'flex',alignItems:'center',gap:8,
                  boxShadow:period===p.key?'0 4px 12px rgba(204,255,0,0.3)':'none',
                }}>
                <span style={{color:period===p.key?OLIVE:MOSS}}>{p.icon}</span>
                <div style={{textAlign:'left'}}>
                  <p style={{fontWeight:700,fontSize:13,color:period===p.key?OLIVE:TEXT,lineHeight:1.2}}>{p.label}</p>
                  <p style={{fontSize:11,color:period===p.key?'rgba(36,56,0,0.55)':MUTED,marginTop:1}}>{p.sub}</p>
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

        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,marginBottom:16,boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14}}>Your Route</p>
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
            />
          </div>
        </div>

        <button type="submit" disabled={searching||!pickup||!dropoff} style={{
          width:'100%',padding:'15px',borderRadius:50,
          background:searching||!pickup||!dropoff?BORDER:NEON,
          color:searching||!pickup||!dropoff?MUTED:OLIVE,
          fontWeight:800,fontSize:15,border:'none',
          cursor:searching||!pickup||!dropoff?'not-allowed':'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          marginBottom:20,transition:'all 0.2s',
          boxShadow:searching||!pickup||!dropoff?'none':'0 4px 16px rgba(204,255,0,0.35)'
        }}>
          {searching?'Searching for drivers…':'Find Rides'}<ArrowRight size={18}/>
        </button>

        {/* Booking registered confirmation */}
        {bookingId && (
          <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 16px',
            background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:12,marginBottom:16}}>
            <CheckCircle size={18} color='#16a34a' style={{flexShrink:0,marginTop:1}}/>
            <div>
              <p style={{fontWeight:700,fontSize:14,color:'#15803d',marginBottom:2}}>You're on the list!</p>
              <p style={{fontSize:13,color:'#166534'}}>
                We've registered your booking for <strong>{pickup} → {dropoff}</strong> at <strong>{timeSlot}</strong>
                {quotedFare != null && <> for <strong>₦{quotedFare.toLocaleString()}</strong></>}.
                A driver on this route will be matched with you automatically.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {bookError && (
          <div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',
            background:'#fef2f2',border:'1px solid #fca5a5',borderRadius:12,marginBottom:16}}>
            <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
            <p style={{fontSize:13,color:'#ef4444'}}>{bookError}</p>
          </div>
        )}
      </form>

      {/* Route Map */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>Route Map</p>
          {pickup&&dropoff&&<span style={{fontSize:12,color:MOSS,fontWeight:600}}>{pickup} → {dropoff}</span>}
        </div>

        {pickup&&dropoff ? (
          <div style={{position:'relative'}}>
            {/* Mapbox Static Images API — no JS needed, just an img tag */}
            {(() => {
              const token = import.meta.env.VITE_MAPBOX_TOKEN
              const pCoord = stopCoords[pickup]
              const dCoord = stopCoords[dropoff]
              if (!token || token === 'your_mapbox_public_token_here' || !pCoord || !dCoord) {
                return (
                  <div style={{height:280,background:OLIVE,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',inset:0,opacity:0.1,backgroundImage:`linear-gradient(${NEON} 1px,transparent 1px),linear-gradient(90deg,${NEON} 1px,transparent 1px)`,backgroundSize:'40px 40px'}}/>
                    <div style={{position:'relative',width:44,height:44,borderRadius:'50%',background:NEON,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <MapPin size={22} color={OLIVE}/>
                    </div>
                    <p style={{color:'rgba(255,255,255,0.7)',fontSize:13,textAlign:'center',position:'relative'}}>
                      Add <code style={{color:NEON,fontSize:12}}>VITE_MAPBOX_TOKEN</code> to <code style={{color:NEON,fontSize:12}}>.env</code><br/>to see the route map
                    </p>
                  </div>
                )
              }
              // pin-l+COLOR(lng,lat) — no # in color
              const pickupPin = `pin-l+ccff00(${pCoord.lng},${pCoord.lat})`
              const dropoffPin = `pin-l+243800(${dCoord.lng},${dCoord.lat})`
              const src = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pickupPin},${dropoffPin}/auto/700x300@2x?access_token=${token}&padding=80,60,60,60`
              return (
                <img
                  src={src}
                  alt={`Route from ${pickup} to ${dropoff}`}
                  width="100%"
                  height="280"
                  style={{display:'block',objectFit:'cover'}}
                  loading="lazy"
                />
              )
            })()}
            {/* Takeoff / Dropoff labels */}
            <div style={{padding:'14px 20px',borderTop:`1px solid ${BORDER}`,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:MOSS,border:`2px solid ${BORDER}`,flexShrink:0}}/>
                <div>
                  <p style={{fontSize:11,color:MUTED,fontWeight:500}}>Takeoff</p>
                  <p style={{fontSize:14,color:TEXT,fontWeight:600}}>{pickup}</p>
                </div>
              </div>
              <div style={{width:2,height:16,background:BORDER,marginLeft:4}}/>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:OLIVE,border:`2px solid ${BORDER}`,flexShrink:0}}/>
                <div>
                  <p style={{fontSize:11,color:MUTED,fontWeight:500}}>Dropoff</p>
                  <p style={{fontSize:14,color:TEXT,fontWeight:600}}>{dropoff}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{height:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,background:BG}}>
            <MapPin size={32} color={BORDER}/>
            <p style={{fontSize:13,color:MUTED,textAlign:'center'}}>Select pickup and drop-off<br/>to see your route on the map</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
