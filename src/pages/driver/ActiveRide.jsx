import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Phone, CheckCircle, Navigation } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { api } from '../../services/api'

const STEPS = [
  { key: 'heading_to_pickup', label: 'Heading to pickup', action: 'Arrived at Pickup' },
  { key: 'arrived_pickup',    label: 'At pickup location', action: 'Start Ride' },
  { key: 'in_transit',        label: 'Ride in progress', action: 'Complete Ride' },
  { key: 'completed',         label: 'Ride completed', action: null },
]

export default function ActiveRide() {
  const { rideId } = useParams()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get(`/rides/${rideId}`)
      .then(res => setRide(res.data.ride))
      .catch(() => setRide(MOCK_RIDE))
  }, [rideId])

  async function advanceStep() {
    if (stepIdx >= STEPS.length - 1) return
    setLoading(true)
    try {
      await api.patch(`/rides/${rideId}/status`, { status: STEPS[stepIdx + 1].key })
      setStepIdx(i => i + 1)
      if (stepIdx + 1 === STEPS.length - 1) {
        setTimeout(() => navigate('/driver'), 3000)
      }
    } catch {
      // stay on step
    } finally {
      setLoading(false)
    }
  }

  const currentStep = STEPS[stepIdx]

  return (
    <AppLayout title="Active Ride">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Status */}
        <div className={`card text-center py-8 transition-all ${stepIdx === STEPS.length - 1 ? 'border-feazi-green/50 bg-feazi-green/10' : ''}`}>
          {stepIdx === STEPS.length - 1 ? (
            <>
              <CheckCircle size={52} className="text-feazi-green mx-auto mb-3" />
              <h2 className="font-display font-bold text-white text-2xl mb-1">Ride Complete!</h2>
              <p className="text-white/50 text-sm">Fare has been added to your wallet. Returning to dashboard...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-feazi-green/20 border border-feazi-green/30 flex items-center justify-center mx-auto mb-4">
                <Navigation size={28} className="text-feazi-green" />
              </div>
              <h2 className="font-display font-bold text-white text-xl mb-1">{currentStep.label}</h2>
              <div className="flex justify-center gap-2 mt-3">
                {STEPS.map((s, i) => (
                  <div key={s.key} className={`h-1.5 rounded-full transition-all ${i <= stepIdx ? 'bg-feazi-green w-8' : 'bg-white/10 w-4'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="relative bg-feazi-green/5 border border-white/10 rounded-3xl overflow-hidden h-52">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 200">
            <path d="M0 100 Q125 50 250 100 T500 100" stroke="#0D7A3E" strokeWidth="3" fill="none" opacity="0.5"/>
            <circle cx="80" cy="95" r="8" fill="#FFB800"/>
            <circle cx="420" cy="100" r="8" fill="#0D7A3E"/>
            <circle cx={80 + stepIdx * 90} cy={95 + Math.sin(stepIdx) * 10} r="10" fill="#0D7A3E">
              <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <div className="absolute top-3 left-3 bg-feazi-dark/90 rounded-xl px-3 py-1.5 text-xs text-white/70">
            📍 Live Route
          </div>
        </div>

        {/* Riders */}
        {ride?.riders && (
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Passengers ({ride.riders.length})</h3>
            <div className="space-y-3">
              {ride.riders.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-feazi-green/20 border border-feazi-green/30 flex items-center justify-center text-feazi-green font-bold text-sm">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{r.name}</p>
                    <p className="text-white/40 text-xs">{r.dropoff}</p>
                  </div>
                  <a href={`tel:${r.phone}`} className="w-8 h-8 rounded-xl bg-feazi-green/15 flex items-center justify-center text-feazi-green hover:bg-feazi-green/25 transition" aria-label={`Call ${r.name}`}>
                    <Phone size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fare */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-white/50 text-sm">Trip Fare</p>
            <p className="font-display font-bold text-feazi-green text-3xl">₦{(ride?.fare || 0).toLocaleString()}</p>
            <p className="text-white/30 text-xs mt-0.5">Auto-deducted from rider wallet</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-sm">Distance</p>
            <p className="text-white font-bold text-xl">{ride?.distance || '14 km'}</p>
          </div>
        </div>

        {/* Advance step button */}
        {currentStep.action && (
          <button
            onClick={advanceStep}
            disabled={loading}
            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </span>
            ) : currentStep.action}
          </button>
        )}
      </div>
    </AppLayout>
  )
}

const MOCK_RIDE = {
  fare: 900,
  distance: '14 km',
  riders: [
    { name: 'Adaeze O.', dropoff: 'CMS Bus Stop', phone: '+2348012345678' },
    { name: 'Emeka N.',  dropoff: 'Marina, Lagos', phone: '+2348023456789' },
  ],
}
