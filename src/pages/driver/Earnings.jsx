import React, { useEffect, useState } from 'react'
import { TrendingUp, ArrowDownLeft } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { api } from '../../services/api'

const PERIODS = ['This Week', 'This Month', 'All Time']

export default function Earnings() {
  const [period, setPeriod] = useState('This Week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/driver/earnings?period=${encodeURIComponent(period)}`)
      .then(res => setData(res.data))
      .catch(() => setData(MOCK_DATA[period] || MOCK_DATA['This Week']))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <AppLayout title="Earnings">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Period tabs */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setLoading(true) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                period === p ? 'bg-feazi-green text-white' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Earned',   value: `₦${(data?.totalEarned || 0).toLocaleString()}`, icon: '💰', color: 'text-feazi-green' },
            { label: 'Total Trips',    value: data?.totalTrips || 0,   icon: '🚗', color: 'text-white' },
            { label: 'Avg Per Trip',   value: `₦${(data?.avgPerTrip || 0).toLocaleString()}`, icon: '📊', color: 'text-white' },
            { label: 'Rating',         value: `${data?.rating || '—'}★`, icon: '⭐', color: 'text-feazi-accent' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="card text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className={`font-display font-bold text-xl ${color}`}>{value}</div>
              <div className="text-white/40 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart (CSS-only) */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-white text-lg">Daily Earnings</h3>
            <TrendingUp size={18} className="text-feazi-green" />
          </div>
          {loading ? (
            <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-end justify-between gap-2 h-40">
              {(data?.daily || []).map(({ day, amount, max }) => {
                const pct = max > 0 ? Math.round((amount / max) * 100) : 0
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-white/40 text-xs">{pct > 0 ? `₦${(amount/1000).toFixed(1)}k` : ''}</span>
                    <div className="w-full rounded-t-xl bg-white/5 relative overflow-hidden" style={{ height: '100px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-feazi-green rounded-t-xl transition-all duration-700"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-white/40 text-xs">{day}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Payout history */}
        <div className="card">
          <h3 className="font-display font-bold text-white text-lg mb-5">Payout History</h3>
          {(data?.payouts || []).map(payout => (
            <div key={payout.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
              <div className="w-10 h-10 rounded-xl bg-feazi-green/15 flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft size={16} className="text-feazi-green" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Payout to bank</p>
                <p className="text-white/40 text-xs">{payout.date}</p>
              </div>
              <p className="text-feazi-green font-bold text-sm">+₦{payout.amount.toLocaleString()}</p>
            </div>
          ))}
          {(!data?.payouts || data.payouts.length === 0) && (
            <p className="text-white/40 text-sm text-center py-6">No payouts yet this period.</p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

const maxDay = 12000
const MOCK_DATA = {
  'This Week': {
    totalEarned: 54200, totalTrips: 43, avgPerTrip: 1260, rating: 4.9,
    daily: [
      { day: 'Mon', amount: 8200,  max: maxDay },
      { day: 'Tue', amount: 9500,  max: maxDay },
      { day: 'Wed', amount: 7300,  max: maxDay },
      { day: 'Thu', amount: 11000, max: maxDay },
      { day: 'Fri', amount: 12000, max: maxDay },
      { day: 'Sat', amount: 4200,  max: maxDay },
      { day: 'Sun', amount: 2000,  max: maxDay },
    ],
    payouts: [
      { id: 'p1', date: 'Fri, Jun 6 · 11:00 PM', amount: 42500 },
    ],
  },
}
