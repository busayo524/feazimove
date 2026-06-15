import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { Clock, MapPin, Package, ChevronRight, Star, Filter } from 'lucide-react'

const MOCK_TRIPS = [
  { id: 't1', type: 'pool', from: 'Ikeja, Lagos', to: 'Victoria Island, Lagos', date: 'Today, 9:14 AM', fare: 1800, status: 'completed', rating: 5, driver: 'Emeka O.', duration: '34 min' },
  { id: 't2', type: 'send', from: 'Surulere', to: 'Lekki Phase 1', date: 'Yesterday, 2:30 PM', fare: 2400, status: 'completed', rating: 4, driver: 'Tunde A.', duration: '42 min' },
  { id: 't3', type: 'pool', from: 'Yaba', to: 'Ajah', date: 'Jun 9, 8:00 AM', fare: 3200, status: 'cancelled', rating: null, driver: null, duration: null },
  { id: 't4', type: 'pool', from: 'Ikeja GRA', to: 'Eko Hotel', date: 'Jun 8, 6:15 PM', fare: 2100, status: 'completed', rating: 5, driver: 'Biodun K.', duration: '28 min' },
  { id: 't5', type: 'send', from: 'Magodo', to: 'Isale Eko', date: 'Jun 7, 11:00 AM', fare: 1950, status: 'completed', rating: 3, driver: 'Chidi N.', duration: '55 min' },
]

const FILTERS = ['All', 'Completed', 'Cancelled', 'Pool', 'Send']

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 22px', flex: 1, minWidth: 140 }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ color: '#ffffff', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em' }}>{value}</p>
      {sub && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} fill={i <= rating ? '#ccff00' : 'none'} stroke={i <= rating ? '#ccff00' : 'rgba(255,255,255,0.2)'} />
      ))}
    </div>
  )
}

function TripCard({ trip }) {
  const statusColor = trip.status === 'completed' ? '#ccff00' : '#f87171'
  const statusBg = trip.status === 'completed' ? 'rgba(204,255,0,0.10)' : 'rgba(248,113,113,0.10)'
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
      <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: trip.type === 'pool' ? 'rgba(204,255,0,0.10)' : 'rgba(250,204,21,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {trip.type === 'pool' ? <MapPin size={20} color={'#ccff00'} /> : <Package size={20} color={'#facc15'} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>{trip.from}</p>
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: 15 }}>{trip.to}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#ccff00', fontWeight: 800, fontSize: 15 }}>₦{trip.fare.toLocaleString()}</p>
            <span style={{ display: 'inline-block', marginTop: 4, background: statusBg, color: statusColor, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, textTransform: 'capitalize' }}>{trip.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              <Clock size={12} />{trip.date}
            </div>
            {trip.duration && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{trip.duration}</span>}
          </div>
          {trip.rating && <Stars rating={trip.rating} />}
        </div>
        {trip.driver && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 }}>Driver: {trip.driver}</p>}
      </div>
    </div>
  )
}

export default function TripHistory() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('All')

  const filtered = MOCK_TRIPS.filter(t => {
    if (filter === 'All') return true
    if (filter === 'Completed') return t.status === 'completed'
    if (filter === 'Cancelled') return t.status === 'cancelled'
    if (filter === 'Pool') return t.type === 'pool'
    if (filter === 'Send') return t.type === 'send'
    return true
  })

  const completed = MOCK_TRIPS.filter(t => t.status === 'completed')
  const totalSpend = completed.reduce((s, t) => s + t.fare, 0)
  const avgRating = (completed.filter(t => t.rating).reduce((s, t) => s + t.rating, 0) / completed.filter(t => t.rating).length).toFixed(1)

  return (
    <AppLayout title="Trip History">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.8rem)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Your Trips
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Review all your rides and deliveries</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard label="Total Trips" value={MOCK_TRIPS.length} sub={`${completed.length} completed`} />
          <StatCard label="Total Spend" value={`₦${totalSpend.toLocaleString()}`} sub="all time" />
          <StatCard label="Avg Rating" value={avgRating} sub="out of 5.0" />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <Filter size={14} />
          </div>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: filter === f ? '#ccff00' : 'rgba(255,255,255,0.06)', color: filter === f ? '#000000' : 'rgba(255,255,255,0.5)' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Trip list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.25)' }}>
              <Clock size={36} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 700 }}>No trips found</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Try a different filter</p>
            </div>
          ) : filtered.map(trip => <TripCard key={trip.id} trip={trip} />)}
        </div>

      </div>
    </AppLayout>
  )
}
