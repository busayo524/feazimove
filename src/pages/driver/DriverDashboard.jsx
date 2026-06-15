import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToggleLeft, ToggleRight, MapPin, Users, Package, Clock, TrendingUp, Star, Navigation } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'

const MOCK_REQUESTS = [
  { id: 'r1', type: 'pool', from: 'Ikeja GRA', to: 'Victoria Island', riders: 2, fare: 3600, dist: '28 km', eta: '32 min' },
  { id: 'r2', type: 'send', from: 'Surulere',  to: 'Lekki Phase 1',  riders: 1, fare: 2800, dist: '18 km', eta: '22 min' },
]

const MOCK_STATS = {
  today:    { trips: 4, earned: 12400, hours: 6 },
  week:     { trips: 22, earned: 68000, hours: 34 },
  rating:   4.9,
  acceptance: 87,
}

const MOCK_RECENT = [
  { id: 't1', from: 'Ikeja', to: 'VI',     fare: 3200, time: '9:10 AM',  status: 'completed' },
  { id: 't2', from: 'Yaba',  to: 'Lekki',  fare: 2900, time: '11:45 AM', status: 'completed' },
  { id: 't3', from: 'Ajah',  to: 'CMS',    fare: 4100, time: '2:00 PM',  status: 'completed' },
  { id: 't4', from: 'GRA',   to: 'Apapa',  fare: 3600, time: '4:30 PM',  status: 'cancelled' },
]

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px', flex: 1, minWidth: 130 }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</p>
      <p style={{ color: accent || '#ffffff', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,2rem)', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function RideRequest({ req, onAccept }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: req.type === 'pool' ? 'rgba(204,255,0,0.10)' : 'rgba(250,204,21,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {req.type === 'pool' ? <Users size={16} color="#ccff00" /> : <Package size={16} color="#facc15" />}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{req.type === 'pool' ? 'FeaziPool' : 'FeaziSend'}</span>
        </div>
        <span style={{ color: '#ccff00', fontWeight: 900, fontSize: 20 }}>₦{req.fare.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ccff00', flexShrink: 0 }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{req.from}</span>
        </div>
        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', marginLeft: 3.5 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, border: '1.5px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
          <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 700 }}>{req.to}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />{req.dist}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{req.eta}</span>
        {req.type === 'pool' && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}><Users size={12} style={{ display: 'inline', marginRight: 4 }} />{req.riders} riders</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button style={{ padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)', color: '#f87171' }}>Decline</button>
        <button onClick={() => onAccept(req)} style={{ padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#ccff00', border: 'none', color: '#000000' }}>Accept</button>
      </div>
    </div>
  )
}

export default function DriverDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [online, setOnline] = useState(false)
  const [view, setView] = useState('today')
  const firstName = user?.name?.split(' ')[0] || 'Driver'

  function handleAccept(req) {
    navigate(`/driver/ride/${req.id}`)
  }

  const stats = MOCK_STATS[view === 'today' ? 'today' : 'week']

  return (
    <AppLayout title="Driver Dashboard">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Greeting + online toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.9rem)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              Good day, {firstName} 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
              {online ? 'You are online — ride requests will come in.' : 'Go online to start receiving ride requests.'}
            </p>
          </div>
          <button onClick={() => setOnline(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 50, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: online ? 'rgba(204,255,0,0.12)' : 'rgba(255,255,255,0.07)', color: online ? '#ccff00' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
            {online ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {online ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <StatCard label="Trips" value={stats.trips} sub={view === 'today' ? 'today' : 'this week'} />
          <StatCard label="Earned" value={`₦${(stats.earned/1000).toFixed(0)}k`} sub={view === 'today' ? 'today' : 'this week'} accent="#ccff00" />
          <StatCard label="Rating" value={`${MOCK_STATS.rating}★`} sub="from riders" accent="#facc15" />
          <StatCard label="Acceptance" value={`${MOCK_STATS.acceptance}%`} sub="rate" />
        </div>

        {/* Period toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['today', 'week'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '7px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: view === v ? '#ccff00' : 'rgba(255,255,255,0.06)', color: view === v ? '#000000' : 'rgba(255,255,255,0.5)' }}>
              {v === 'today' ? 'Today' : 'This Week'}
            </button>
          ))}
        </div>

        {/* Ride requests */}
        {online && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Navigation size={16} color="#ccff00" />
              <h3 style={{ color: '#ffffff', fontWeight: 800, fontSize: 15 }}>Incoming Requests</h3>
              <span style={{ background: '#ccff00', color: '#000', fontWeight: 800, fontSize: 11, padding: '2px 8px', borderRadius: 99 }}>{MOCK_REQUESTS.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {MOCK_REQUESTS.map(r => <RideRequest key={r.id} req={r} onAccept={handleAccept} />)}
            </div>
          </div>
        )}

        {!online && (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, marginBottom: 32 }}>
            <ToggleLeft size={40} style={{ margin: '0 auto 12px', color: 'rgba(255,255,255,0.2)' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 16 }}>You are offline</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, marginTop: 6 }}>Toggle online above to receive ride requests</p>
          </div>
        )}

        {/* Recent trips */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={15} color="rgba(255,255,255,0.4)" />
            <h3 style={{ color: '#ffffff', fontWeight: 800, fontSize: 15 }}>Recent Trips</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {MOCK_RECENT.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>{t.from} → {t.to}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 }}>{t.time}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: t.status === 'completed' ? '#ccff00' : '#f87171', fontWeight: 800, fontSize: 14 }}>₦{t.fare.toLocaleString()}</p>
                  <span style={{ fontSize: 11, color: t.status === 'completed' ? 'rgba(204,255,0,0.5)' : 'rgba(248,113,113,0.5)', textTransform: 'capitalize' }}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/driver/earnings')} style={{ width: '100%', marginTop: 16, padding: '11px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <TrendingUp size={15} /> View Full Earnings
          </button>
        </div>

      </div>
    </AppLayout>
  )
}
