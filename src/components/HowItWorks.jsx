import React from 'react'
import { Download, MapPin, Users, Star } from 'lucide-react'

const steps = [
  {
    icon: Download,
    step: '01',
    title: 'Download the App',
    desc: 'Get FeaziMove from the App Store or Google Play. Sign up in under 2 minutes — no paperwork, just your phone number.',
    color: 'from-feazi-green/20 to-feazi-green/5',
  },
  {
    icon: MapPin,
    step: '02',
    title: 'Set Your Route',
    desc: 'Enter your pickup and destination. FeaziMove matches you with other riders and goods moving the same way.',
    color: 'from-feazi-accent/20 to-feazi-accent/5',
  },
  {
    icon: Users,
    step: '03',
    title: 'Match & Pool',
    desc: 'Get paired with a verified driver and fellow commuters on your route. Share the ride, split the cost.',
    color: 'from-blue-500/20 to-blue-500/5',
  },
  {
    icon: Star,
    step: '04',
    title: 'Arrive & Rate',
    desc: 'Reach your destination safely. Rate your experience and help build a trusted community of riders and drivers.',
    color: 'from-purple-500/20 to-purple-500/5',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-feazi-dark bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-block bg-feazi-green/15 border border-feazi-green/30 text-feazi-green text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Simple. Fast. Feazi.
          </span>
          <h2 className="section-title mb-4">
            How <span className="gradient-text">FeaziMove</span> Works
          </h2>
          <p className="section-sub mx-auto text-center">
            From download to destination in four simple steps. No complexity, no stress — just the Feazi Way.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ icon: Icon, step, title, desc, color }, i) => (
            <div key={step} className="relative group">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-0" />
              )}

              <div className={`card bg-gradient-to-br ${color} h-full relative z-10`}>
                {/* Step number */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-feazi-green/30 transition-colors duration-300">
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className="font-display font-black text-5xl text-white/5 group-hover:text-white/10 transition-colors">{step}</span>
                </div>

                <h3 className="font-display font-bold text-xl text-white mb-3">{title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
