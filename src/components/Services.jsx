import React, { useState } from 'react'
import { Users, Package, Briefcase, ArrowRight } from 'lucide-react'

const services = [
  {
    id: 'pool',
    icon: Users,
    title: 'FeaziRide',
    tagline: 'Ride Together, Save Together',
    desc: 'Match with commuters heading the same way. Share the journey, split the cost, reduce traffic — and arrive refreshed.',
    price: 'From ₦2,000',
    features: ['Up to 60% cheaper', 'Door-to-door', 'AC vehicles', 'Verified co-riders'],
    color: 'feazi-green',
    emoji: '🚗',
  },
  {
    id: 'send',
    icon: Package,
    title: 'FeaziMove',
    tagline: 'Same-Route Delivery',
    desc: 'Send packages and goods with drivers already heading in that direction. Affordable, fast, and secure.',
    price: 'From ₦600',
    features: ['Proof of delivery', 'Insured items', 'Same-day delivery'],
    color: 'feazi-accent',
    emoji: '📦',
  },
  {
    id: 'biz',
    icon: Briefcase,
    title: 'FaeziBiz',
    tagline: 'Mobility for Teams',
    desc: 'Manage employee commutes and business deliveries from a single dashboard. Reduce fleet costs and boost productivity.',
    price: 'Custom pricing',
    features: ['Bulk booking', 'Analytics dashboard', 'Invoicing & receipts', 'Priority support'],
    color: 'blue-400',
    emoji: '🏢',
  },
]

export default function Services() {
  const [active, setActive] = useState('pool')
  const service = services.find(s => s.id === active)
  const Icon = service.icon

  return (
    <section id="services" className="py-24 md:py-32 bg-feazi-dark bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-feazi-green/15 border border-feazi-green/30 text-feazi-green text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Our Services
          </span>
          <h2 className="section-title mb-4">
            One Platform, <span className="gradient-text">Every Move</span>
          </h2>
          <p className="section-sub mx-auto text-center">
            Whether you're commuting daily, sending a package, or managing a fleet — FeaziMove has a service for you.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          {services.map(({ id, title, emoji }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-200 ${
                active === id
                  ? 'bg-feazi-green text-white shadow-lg shadow-green-900/40 scale-105'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <span>{emoji}</span>
              {title}
            </button>
          ))}
        </div>

        {/* Service detail */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="card gradient-border p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-feazi-green/20 border border-feazi-green/30 flex items-center justify-center">
                <Icon size={28} className="text-feazi-green" />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-white">{service.title}</h3>
                <p className="text-feazi-green text-sm font-medium">{service.tagline}</p>
              </div>
            </div>

            <p className="text-white/70 text-base leading-relaxed mb-8">{service.desc}</p>

            <ul className="space-y-3 mb-8">
              {service.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-white/80 text-sm">
                  <span className="w-5 h-5 rounded-full bg-feazi-green/20 border border-feazi-green/40 flex items-center justify-center flex-shrink-0 text-feazi-green text-xs font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Starting at <span className="text-white font-bold text-lg">{service.price}</span></span>
              <a href="#download" className="btn-primary text-sm px-5 py-2.5">
                Try it now <ArrowRight size={15} />
              </a>
            </div>
          </div>

          {/* Visual */}
          <div className="relative flex justify-center">
            <div className="text-center">
              <div className="text-9xl mb-8 animate-float">{service.emoji}</div>
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                {service.features.map((f, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/70 font-medium text-center">
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
