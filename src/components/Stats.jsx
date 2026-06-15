import React from 'react'

const stats = [
  { value: '50K+', label: 'Commuters Served', icon: '👥' },
  { value: '60%', label: 'Cost Savings', icon: '💰' },
  { value: '15+', label: 'Cities Covered', icon: '🌍' },
  { value: '4.8★', label: 'App Rating', icon: '⭐' },
]

export default function Stats() {
  return (
    <section className="relative py-16 bg-feazi-dark border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ value, label, icon }) => (
            <div key={label} className="text-center group">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="font-display font-black text-4xl md:text-5xl text-white mb-1 group-hover:text-feazi-green transition-colors duration-300">
                {value}
              </div>
              <div className="text-white/50 text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
