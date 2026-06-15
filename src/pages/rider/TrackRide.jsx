import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Phone, MessageSquare, X, ChevronRight, Star } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { api } from '../../services/api'

const STATUSES = ['Driver assigned', 'Driver en route', 'Driver arrived', 'In transit', 'Completed']

export default function TrackRide() {
  const { rideId } = useParams()
  const navigate = useNavigate()

  const [ride, setRide] = useState(null)
  const [statusIdx, setStatusIdx] = useState(1)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    api.get(`/rides/${rideId}`)
      .then(res => { setRide(res.data.ride); setLoading(false) })
      .catch(() => { navigate('/book'); })

    // Poll status every 10s (replace with WebSocket in production)
    const poll = setInterval(() => {
      api.get(`/rides/${rideId}/status`)
        .then(res => {
          const idx = STATUSES.indexOf(res.data.status)
          if (idx !== -1) setStatusIdx(idx)
          if (res.data.status === 'Completed') {
            clearInterval(poll)
            setTimeout(() => navigate(`/rate/${rideId}`), 2000)
          }
        })
        .catch(() => {})
    }, 10000)

    return () => clearInterval(poll)
  }, [rideId, navigate])

  async function handleCancel() {
    if (!window.confirm('Cancel this ride?')) return
    setCancelling(true)
    try {
      await api.patch(`/rides/${rideId}/cancel`)
      navigate('/book')
    } catch {
      setCancelling(false)
    }
  }

  if (loading) return (
    <AppLayout title="Tracking Ride">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-feazi-green border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout title="Live Tracking">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Map placeholder — replace with Google Maps or Mapbox */}
        <div className="relative bg-feazi-green/5 border border-white/10 rounded-3xl overflow-hidden h-72">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
            {/* Road network */}
            <path d="M0 150 Q150 80 300 150 T600 150" stroke="#0D7A3E" strokeWidth="3" fill="none" opacity="0.4"/>
            <path d="M0 200 Q200 120 400 180 T600 160" stroke="#0D7A3E" strokeWidth="1.5" fill="none" opacity="0.2"/>
            <path d="M100 0 Q130 100 100 300" stroke="#0D7A3E" strokeWidth="1.5" fill="none" opacity="0.2"/>
            <path d="M400 0 Q370 150 400 300" stroke="#0D7A3E" strokeWidth="1.5" fill="none" opacity="0.2"/>
            {/* Driver dot (animated) */}
            <circle cx="180" cy="130" r="10" fill="#0D7A3E" opacity="0.9">
              <animate attributeName="cx" values="120;180;240" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="180" cy="130" r="20" fill="#0D7A3E" opacity="0.2">
              <animate attributeName="cx" values="120;180;240" dur="4s" repeatCount="indefinite"/>
              <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite"/>
            </circle>
            {/* Destination pin */}
            <circle cx="480" cy="148" r="8" fill="#FFB800"/>
            <path d="M480 140 L480 115" stroke="#FFB800" strokeWidth="2"/>
          </svg>

          {/* ETA chip */}
          <div className="absolute top-4 left-4 bg-feazi-dark/90 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
            <p className="text-white/50 text-xs">Estimated arrival</p>
            <p className="text-white font-bold text-lg">~8 min</p>
          </div>

          <div className="absolute bottom-4 right-4 bg-feazi-green text-white text-xs font-bold px-3 py-1.5 rounded-xl">
            LIVE
          </div>
        </div>

        {/* Status steps */}
        <div className="card">
          <h3 className="font-display font-bold text-white mb-5">Ride Status</h3>
          <div className="space-y-3">
            {STATUSES.map((status, i) => (
              <div key={status} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-500 ${
                  i < statusIdx ? 'bg-feazi-green text-white' :
                  i === statusIdx ? 'bg-feazi-green/20 border-2 border-feazi-green text-feazi-green animate-pulse' :
                  'bg-white/5 text-white/20'
                }`}>
                  {i < statusIdx ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium transition-colors ${
                  i <= statusIdx ? 'text-white' : 'text-white/30'
                }`}>{status}</span>
                {i === statusIdx && <span className="ml-auto text-feazi-green text-xs font-semibold animate-pulse">Now</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Driver card */}
        {ride?.driver && (
          <div className="card flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-feazi-green/20 border border-feazi-green/30 flex items-center justify-center font-bold text-feazi-green text-xl flex-shrink-0">
              {ride.driver.name?.charAt(0) || 'D'}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{ride.driver.name}</p>
              <div className="flex items-center gap-1 text-feazi-accent text-sm">
                <Star size={12} className="fill-feazi-accent" />
                <span>{ride.driver.rating || '4.9'}</span>
                <span className="text-white/30 mx-1">·</span>
                <span className="text-white/50 text-xs">{ride.driver.vehicle || 'Toyota Corolla'} · {ride.driver.plate || 'LND 123 GH'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${ride.driver.phone}`} className="w-10 h-10 rounded-xl bg-feazi-green/20 border border-feazi-green/30 flex items-center justify-center text-feazi-green hover:bg-feazi-green/30 transition" aria-label="Call driver">
                <Phone size={16} />
              </a>
              <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 transition" aria-label="Message driver">
                <MessageSquare size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Co-riders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Co-riders on this route</h3>
            <span className="text-feazi-green text-sm font-semibold">2 others</span>
          </div>
          {['Emeka N.', 'Fatima S.'].map((name, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                {name.charAt(0)}
              </div>
              <span className="text-white/70 text-sm">{name}</span>
              <div className="ml-auto flex items-center gap-1 text-feazi-accent text-xs">
                <Star size={10} className="fill-feazi-accent" />
                <span>4.{8 + i}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cancel */}
        {statusIdx < 3 && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition text-sm font-semibold disabled:opacity-50"
          >
            <X size={16} />
            {cancelling ? 'Cancelling...' : 'Cancel Ride'}
          </button>
        )}
      </div>
    </AppLayout>
  )
}
