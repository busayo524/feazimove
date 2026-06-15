import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Users, Package, ArrowRight, Zap, ChevronRight, Navigation } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'

function sanitize(val) { return val.replace(/[<>"']/g, '').trim() }

const POPULAR_ROUTES = [
  { from: 'Lekki Phase 1', to: 'Victoria Island' },
  { from: 'Ikeja', to: 'Lagos Island' },
  { from: 'Yaba', to: 'Surulere' },
  { from: 'Ajah', to: 'CMS' },
]

const SERVICE_TYPES = [
  { id: 'pool', icon: Users,   label: 'FeaziPool', sub: 'Share ride · Save 30%',     estimate: '₦2,000 – ₦4,500', badge: 'Most popular' },
  { id: 'send', icon: Package, label: 'FeaziSend', sub: 'Send a package · Same-day', estimate: '₦600 – ₦1,200',   badge: null },
]

function StatCard({ emoji, value, label }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '16px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 6 }}>{emoji}</div>
      <p style={{ color: '#ffffff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{label}</p>
    </div>
  )
}

export default function BookRide() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [serviceType, setServiceType] = useState('pool')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  const selected = SERVICE_TYPES.find(s => s.id === serviceType)
  const firstName = user?.name?.split(' ')[0] || 'there'

  function applyRoute(from, to) { setPickup(from); setDestination(to); setError('') }

  function handleSearch(e) {
    e.preventDefault()
    if (!pickup.trim() || !destination.trim()) { setError('Please enter both pickup and destination.'); return }
    if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) { setError('Pickup and destination cannot be the same.'); return }
    setError(''); setStep(2)
  }

  async function handleBook() {
    setLoading(true); setError('')
    try {
      const res = await api.post('/rides', { pickup: sanitize(pickup), destination: sanitize(destination), type: serviceType })
      navigate(`/track/${res.data.ride.id}`)
    } catch {
      setError('Could not book ride. Please try again.'); setStep(1)
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.09)',
    color: '#ffffff', outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <AppLayout title="Book a Ride">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: 'clamp(1.5rem,3vw,2rem)', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Hey {firstName} 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Where are you heading today?</p>
        </div>

        <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 28 }}>
          <StatCard emoji="🚗" value="2,847" label="Rides today" />
          <StatCard emoji="⏱" value="4 min" label="Avg wait" />
          <StatCard emoji="📍" value="12" label="Nearby drivers" />
        </div>

        {step === 1 ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Choose a service</p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_TYPES.map(({ id, icon: Icon, label, sub, estimate, badge }) => {
                  const active = serviceType === id
                  return (
                    <button key={id} type="button" onClick={() => setServiceType(id)} style={{
                      padding: '18px 16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
                      background: active ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${active ? 'rgba(204,255,0,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      {badge && <span style={{ position: 'absolute', top: 10, right: 10, background: '#ccff00', color: '#0a0a0a', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 50 }}>{badge}</span>}
                      <div style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(204,255,0,0.15)' : 'rgba(255,255,255,0.06)' }}>
                        <Icon size={18} style={{ color: active ? '#ccff00' : 'rgba(255,255,255,0.35)' }} />
                      </div>
                      <p style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.6)', fontWeight: 800, fontSize: 15, marginBottom: 3 }}>{label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 8 }}>{sub}</p>
                      <p style={{ color: active ? '#ccff00' : 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: 12 }}>{estimate}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px', marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Your route</p>
              <form onSubmit={handleSearch}>
                <div style={{ position: 'relative', paddingLeft: 28 }}>
                  <div style={{ position: 'absolute', left: 8, top: 18, width: 2, height: 'calc(100% - 50px)', background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                  <div style={{ position: 'absolute', left: 5, top: 14, width: 8, height: 8, borderRadius: '50%', background: '#ccff00' }} />
                  <div style={{ position: 'absolute', left: 5, bottom: 14, width: 8, height: 8, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', background: 'transparent' }} />
                  <div style={{ marginBottom: 10, position: 'relative' }}>
                    <MapPin size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#ccff00', zIndex: 1 }} />
                    <input type="text" value={pickup} onChange={e => { setPickup(e.target.value); setError('') }}
                      placeholder="Pickup location (e.g. Lekki Phase 1)" maxLength={120} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(204,255,0,0.5)'}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.09)'} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Navigation size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', zIndex: 1 }} />
                    <input type="text" value={destination} onChange={e => { setDestination(e.target.value); setError('') }}
                      placeholder="Destination (e.g. Victoria Island)" maxLength={120} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.09)'} />
                  </div>
                </div>
                {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }} role="alert">{error}</p>}
                <button type="submit" style={{
                  width: '100%', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#ccff00', color: '#0a0a0a', padding: '15px', borderRadius: 50,
                  fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(204,255,0,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  Find {serviceType === 'pool' ? 'Rides' : 'Drivers'} <ArrowRight size={16} />
                </button>
              </form>
            </div>

            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Popular routes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {POPULAR_ROUTES.map(({ from, to }) => (
                  <button key={`${from}-${to}`} type="button" onClick={() => applyRoute(from, to)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 14, cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s, border-color 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(204,255,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={14} style={{ color: '#ccff00' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{from}</p>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>to {to}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 'clamp(20px,5vw,32px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(204,255,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} style={{ color: '#ccff00' }} />
              </div>
              <div>
                <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>Confirm your ride</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 }}>Review before booking</p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3, gap: 4, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ccff00' }} />
                  <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 3 }}>Pickup</p>
                    <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>{pickup}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 3 }}>Destination</p>
                    <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>{destination}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
              {[
                { label: 'Service', value: selected.label },
                { label: 'Est. Cost', value: selected.estimate, lime: true },
                { label: 'Wait', value: '~4 min' },
              ].map(({ label, value, lime }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 4 }}>{label}</p>
                  <p style={{ color: lime ? '#ccff00' : '#ffffff', fontWeight: 800, fontSize: 13 }}>{value}</p>
                </div>
              ))}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
              Fare deducted from your FeaziMove wallet automatically.
            </p>

            {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 14 }} role="alert">{error}</p>}

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: '14px', borderRadius: 50, fontWeight: 700, fontSize: 14,
                background: 'transparent', border: '1.5px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}>
                ← Edit
              </button>
              <button onClick={handleBook} disabled={loading} style={{
                flex: 1.5, padding: '14px', borderRadius: 50, fontWeight: 800, fontSize: 14,
                background: loading ? 'rgba(204,255,0,0.5)' : '#ccff00', color: '#0a0a0a', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? (
                  <>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0a0a0a', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Booking...
                  </>
                ) : 'Confirm & Book'}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </AppLayout>
  )
}
