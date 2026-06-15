import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { api } from '../../services/api'

function sanitize(val) { return val.replace(/[<>"']/g, '').slice(0, 300) }

const DRIVER_TAGS = ['Great driving', 'Very punctual', 'Clean vehicle', 'Friendly', 'Safe driver']
const RIDER_TAGS  = ['Friendly', 'On time', 'Quiet ride', 'Respectful']

export default function RateRide() {
  const { rideId } = useParams()
  const navigate = useNavigate()

  const [ride, setRide] = useState(null)
  const [driverRating, setDriverRating] = useState(0)
  const [driverHover, setDriverHover] = useState(0)
  const [driverTags, setDriverTags] = useState([])
  const [riderRatings, setRiderRatings] = useState({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get(`/rides/${rideId}`)
      .then(res => setRide(res.data.ride))
      .catch(() => setRide(MOCK_RIDE))
  }, [rideId])

  function toggleTag(tag) {
    setDriverTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!driverRating) return
    setLoading(true)
    try {
      await api.post(`/rides/${rideId}/rate`, {
        driverRating,
        driverTags,
        riderRatings,
        comment: sanitize(comment),
      })
      setSubmitted(true)
      setTimeout(() => navigate('/book'), 2500)
    } catch {
      setLoading(false)
    }
  }

  if (submitted) return (
    <AppLayout title="Rating Submitted">
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="font-display font-bold text-white text-2xl mb-3">Thank you!</h2>
        <p className="text-white/60 mb-2">Your rating helps keep FeaziMove safe and great.</p>
        <p className="text-white/40 text-sm">Redirecting to home...</p>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout title="Rate Your Ride">
      <div className="max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Rate driver */}
          <div className="card text-center">
            <div className="w-20 h-20 rounded-2xl bg-feazi-green/20 border border-feazi-green/30 flex items-center justify-center font-bold text-feazi-green text-3xl mx-auto mb-4">
              {ride?.driver?.name?.charAt(0) || 'D'}
            </div>
            <h3 className="font-display font-bold text-white text-xl mb-1">{ride?.driver?.name || 'Your Driver'}</h3>
            <p className="text-white/50 text-sm mb-6">{ride?.driver?.vehicle || 'FeaziPool Driver'}</p>

            <p className="text-white/70 text-sm font-medium mb-3">How was your driver?</p>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setDriverHover(star)}
                  onMouseLeave={() => setDriverHover(0)}
                  onClick={() => setDriverRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    size={36}
                    className={`transition-colors ${(driverHover || driverRating) >= star ? 'text-feazi-accent fill-feazi-accent' : 'text-white/20'}`}
                  />
                </button>
              ))}
            </div>

            {/* Tags */}
            {driverRating >= 4 && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {DRIVER_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      driverTags.includes(tag)
                        ? 'bg-feazi-green border-feazi-green text-white'
                        : 'border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rate co-riders */}
          {ride?.coRiders?.length > 0 && (
            <div className="card">
              <h3 className="font-display font-bold text-white text-lg mb-4">Rate your co-riders</h3>
              <div className="space-y-5">
                {ride.coRiders.map(rider => (
                  <div key={rider.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                      {rider.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium mb-1">{rider.name}</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRiderRatings(prev => ({ ...prev, [rider.id]: star }))}
                            aria-label={`Rate ${rider.name} ${star} stars`}
                          >
                            <Star
                              size={18}
                              className={`transition-colors ${(riderRatings[rider.id] || 0) >= star ? 'text-feazi-accent fill-feazi-accent' : 'text-white/20'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional comment */}
          <div className="card">
            <label htmlFor="rate-comment" className="block text-white/70 text-sm font-medium mb-3">
              Leave a comment (optional)
            </label>
            <textarea
              id="rate-comment"
              value={comment}
              onChange={e => setComment(sanitize(e.target.value))}
              placeholder="Tell us about your experience..."
              rows={3}
              maxLength={300}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-feazi-green/60 transition resize-none"
            />
            <p className="text-white/30 text-xs mt-1 text-right">{comment.length}/300</p>
          </div>

          <button
            type="submit"
            disabled={!driverRating || loading}
            className="btn-primary w-full justify-center py-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : 'Submit Rating'}
          </button>

          <button type="button" onClick={() => navigate('/book')} className="w-full text-center text-white/30 text-sm hover:text-white/50 transition">
            Skip for now
          </button>
        </form>
      </div>
    </AppLayout>
  )
}

const MOCK_RIDE = {
  driver: { name: 'Chidi Okafor', vehicle: 'Toyota Corolla · LND 432 GH' },
  coRiders: [
    { id: 'r1', name: 'Emeka N.' },
    { id: 'r2', name: 'Fatima S.' },
  ],
}
