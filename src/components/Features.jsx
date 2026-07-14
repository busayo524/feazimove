import React from 'react'
import { Shield, Zap, MapPin, DollarSign, Bell, BarChart3 } from 'lucide-react'

const features = [
  {
    icon: DollarSign,
    title: 'Save Up to 60%',
    desc: 'Pooled transport means shared costs. Get from A to B for a fraction of solo ride prices — every single day.',
    badge: 'Most Popular',
  },
  {
    icon: MapPin,
    title: 'Scheduled Routes',
    desc: 'Book your seat ahead on a fixed route and time — your commute becomes predictable, every single day.',
    badge: null,
  },
  {
    icon: Shield,
    title: 'Verified & Safe',
    desc: 'Every driver is background-checked, licensed, and rated by the community. Your safety is non-negotiable.',
    badge: 'Safety First',
  },
  {
    icon: Zap,
    title: 'Lightning Fast Matching',
    desc: 'Our AI engine matches riders and goods on overlapping routes in seconds — no waiting, no guessing.',
    badge: null,
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    desc: 'Get notified when your ride is confirmed, when your driver is close, and when goods are delivered.',
    badge: null,
  },
  {
    icon: BarChart3,
    title: 'Trip Analytics',
    desc: 'See your spending, CO₂ saved, and trips completed. Data that helps you travel smarter.',
    badge: null,
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32" style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0B1E35 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block bg-feazi-green/15 border border-feazi-green/30 text-feazi-green text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Why FeaziMove
          </span>
          <h2 className="section-title mb-4">
            Everything You Need to <span className="gradient-text">Move Smart</span>
          </h2>
          <p className="section-sub mx-auto text-center">
            Designed for the daily realities of African cities — traffic, cost, and convenience, solved the Feazi Way.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, badge }) => (
            <div key={title} className="card group relative overflow-hidden">
              {badge && (
                <div className="absolute top-4 right-4 bg-feazi-accent text-feazi-dark text-xs font-bold px-3 py-1 rounded-full">
                  {badge}
                </div>
              )}

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-feazi-green/15 border border-feazi-green/20 flex items-center justify-center mb-6 group-hover:bg-feazi-green/25 group-hover:scale-110 transition-all duration-300">
                <Icon size={24} className="text-feazi-green" />
              </div>

              <h3 className="font-display font-bold text-xl text-white mb-3">{title}</h3>
              <p className="text-white/60 text-sm leading-relaxed">{desc}</p>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-feazi-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
