import React, { useState, useEffect } from 'react'
import AppLayout from '../../components/AppLayout'
import { MapPin, Star, ChevronRight, Package, Clock } from 'lucide-react'
import { api } from '../../services/api'

const NEON='#ccff00', NT='#0a0a0a'
const OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#d4e5a8', TEXT='#1a2800', MUTED='#4C6900', BG='#f0f5e0'

const FILTERS=['All','Rides','Packages','Cancelled']

const STATUS_LABEL = {
  pending:         'Pending',
  cancelled:       'Cancelled',
  driver_assigned: 'Accepted',
  arrived_pickup:  'Arriving',
  in_transit:      'In Transit',
  completed:       'Completed',
}

function statusStyle(s) {
  if (s === 'cancelled')       return { bg:'#fef2f2', color:'#ef4444', border:'#fca5a5' }
  if (s === 'completed')       return { bg:BG,        color:OLIVE,     border:BORDER    }
  if (s === 'in_transit')      return { bg:'#f0fdf4', color:'#166534', border:'#bbf7d0' }
  if (s === 'arrived_pickup')  return { bg:'#fffbeb', color:'#92400e', border:'#fde68a' }
  if (s === 'driver_assigned') return { bg:'#eff6ff', color:'#1e40af', border:'#bfdbfe' }
  // pending
  return { bg:'#f8f8f8', color:'#555', border:'#ddd' }
}

export default function TripHistory(){
  const [filter, setFilter]   = useState('All')
  const [trips,  setTrips]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    api.get('/rides/history')
      .then(res => setTrips(res.data.rides || []))
      .catch(() => setError('Could not load trip history. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = trips.filter(t => {
    if (filter === 'All')       return true
    if (filter === 'Rides')     return t.type !== 'send' && t.status !== 'cancelled'
    if (filter === 'Packages')  return t.type === 'send' && t.status !== 'cancelled'
    if (filter === 'Cancelled') return t.status === 'cancelled'
    return true
  })

  const completed  = trips.filter(t => t.status === 'completed')
  const cancelled  = trips.filter(t => t.status === 'cancelled')
  const totalSpent = completed.reduce((s, t) => s + (t.fare || 0), 0)

  return (
    <AppLayout title="Trip History">
      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12,marginBottom:20}}>
        {[
          ['Completed', completed.length],
          ['Cancelled', cancelled.length],
          ['Spent',     '₦' + totalSpent.toLocaleString()],
        ].map(([l, v]) => (
          <div key={l} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:'18px 8px',textAlign:'center',boxShadow:'0 2px 8px rgba(36,56,0,0.06)',minWidth:0,overflow:'hidden'}}>
            <p style={{fontWeight:900,fontSize:'clamp(0.95rem,4vw,1.6rem)',color:OLIVE,letterSpacing:'-0.03em',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{loading ? '—' : v}</p>
            <p style={{fontSize:11,color:'rgba(36,56,0,0.6)',fontWeight:600,marginTop:2}}>{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:16,overflowX:'auto',paddingBottom:4}}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:'8px 18px',borderRadius:50,fontSize:13,fontWeight:700,border:`1.5px solid ${filter===f?NEON:BORDER}`,background:filter===f?NEON:CARD,color:filter===f?OLIVE:MOSS,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all 0.15s'}}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(36,56,0,0.06)'}}>
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontWeight:700,fontSize:13,color:MOSS,textTransform:'uppercase',letterSpacing:'0.06em'}}>Trips</p>
          {!loading && <span style={{fontSize:12,color:MUTED}}>{filtered.length} result{filtered.length!==1?'s':''}</span>}
        </div>

        {loading && (
          <div style={{padding:40,textAlign:'center',color:MUTED,fontSize:14}}>Loading trip history…</div>
        )}
        {!loading && error && (
          <div style={{padding:40,textAlign:'center',color:'#ef4444',fontSize:14}}>{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{padding:40,textAlign:'center',color:MUTED,fontSize:14}}>
            {trips.length === 0 ? 'No trips yet — book your first ride!' : 'No trips match this filter.'}
          </div>
        )}

        {!loading && !error && filtered.map((trip, i) => {
          const ss = statusStyle(trip.status)
          const isPending = trip.status === 'pending'
          return (
            <div key={trip.id}
              style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:i<filtered.length-1?`1px solid ${BORDER}`:'none',cursor:'pointer',transition:'background 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.background=BG}
              onMouseLeave={e=>e.currentTarget.style.background=CARD}>
              <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:trip.status==='cancelled'?'#fef2f2':isPending?'#f8f8f8':NEON,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {isPending
                  ? <Clock size={18} color='#888'/>
                  : trip.type==='send'
                    ? <Package size={18} color={trip.status==='cancelled'?'#ef4444':OLIVE}/>
                    : <MapPin  size={18} color={trip.status==='cancelled'?'#ef4444':OLIVE}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{color:TEXT,fontWeight:600,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{trip.pickup} → {trip.destination}</p>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <span style={{fontSize:12,color:MUTED}}>{trip.date}</span>
                  {trip.rating && <>
                    <span style={{color:MUTED,fontSize:12}}>·</span>
                    <Star size={11} color='#f59e0b' fill='#f59e0b'/>
                    <span style={{fontSize:12,color:MUTED}}>{trip.rating}</span>
                  </>}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontWeight:800,fontSize:14,color:trip.status==='cancelled'?'#ef4444':TEXT}}>
                  {trip.fare > 0 ? `₦${trip.fare.toLocaleString()}` : '—'}
                </p>
                <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,marginTop:2,display:'inline-block',background:ss.bg,color:ss.color,border:`1px solid ${ss.border}`,textTransform:'uppercase',letterSpacing:'0.04em'}}>
                  {STATUS_LABEL[trip.status] || trip.status}
                </span>
              </div>
              <ChevronRight size={16} color={MUTED}/>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
