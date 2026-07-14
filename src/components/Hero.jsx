import React from 'react'
import { ArrowRight, MapPin, Users, Package } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-feazi-dark bg-grid">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — copy */}
          <div className="text-center lg:text-left">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 bg-feazi-green/15 border border-feazi-green/30 text-feazi-green text-sm font-semibold px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-feazi-green animate-pulse" />
              🌍 Built for African Cities
            </div>

            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-none mb-6 text-white">
              Making <br />
              <span className="gradient-text">Mobility</span> <br />
              <span className="text-white">Feasible.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 mb-4 leading-relaxed">
              FeaziMove connects commuters and goods moving along shared routes through pooled transport — making everyday movement more feasible, affordable, and easy.
            </p>

            <p className="text-feazi-accent font-semibold text-base mb-10 italic">
              "It's Feazi."
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href="#download" className="btn-primary">
                Get Started Free
                <ArrowRight size={18} />
              </a>
              <a href="#how-it-works" className="btn-outline">
                See How It Works
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap gap-6 justify-center lg:justify-start text-sm text-white/50">
              <span className="flex items-center gap-2">
                <span className="text-feazi-green">✓</span> No surge pricing
              </span>
              <span className="flex items-center gap-2">
                <span className="text-feazi-green">✓</span> Instant matching
              </span>
              <span className="flex items-center gap-2">
                <span className="text-feazi-green">✓</span> Verified drivers
              </span>
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-72 md:w-80 animate-float">
              {/* Phone frame */}
              <div className="relative bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-[3rem] p-3 shadow-2xl glow">
                <div className="bg-feazi-dark rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-6 pt-4 pb-2">
                    <span className="text-white text-xs font-semibold">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-2 border border-white/60 rounded-sm">
                        <div className="w-3/4 h-full bg-feazi-green rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* App UI */}
                  <div className="px-4 pt-2 pb-4">
                    <div className="text-white font-display font-bold text-lg mb-4">Where to?</div>

                    {/* Search inputs */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                        <MapPin size={14} className="text-feazi-green flex-shrink-0" />
                        <span className="text-white/60 text-xs">Your location</span>
                      </div>
                      <div className="flex items-center gap-3 bg-feazi-green/20 border border-feazi-green/40 rounded-2xl px-4 py-3">
                        <MapPin size={14} className="text-feazi-accent flex-shrink-0" />
                        <span className="text-white text-xs font-medium">Lagos Island, VI</span>
                      </div>
                    </div>

                    {/* Map placeholder */}
                    <div className="relative bg-feazi-green/10 rounded-2xl h-32 mb-4 overflow-hidden border border-white/5">
                      {/* Road lines */}
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
                        <path d="M0 50 Q50 20 100 50 T200 50" stroke="#0D7A3E" strokeWidth="2" fill="none" opacity="0.4"/>
                        <path d="M0 70 Q80 40 160 70 T200 60" stroke="#0D7A3E" strokeWidth="1" fill="none" opacity="0.2"/>
                        <circle cx="60" cy="45" r="4" fill="#0D7A3E" opacity="0.8"/>
                        <circle cx="140" cy="55" r="4" fill="#FFB800" opacity="0.8"/>
                      </svg>
                      <div className="absolute bottom-2 left-2 bg-feazi-green text-white text-xs px-2 py-1 rounded-lg font-semibold">
                        3 rides nearby
                      </div>
                    </div>

                    {/* Ride options */}
                    <div className="space-y-2">
                      {[
                        { icon: Users, label: 'FeaziRide', price: '₦450', time: '4 min', active: true },
                        { icon: Package, label: 'FeaziGo', price: '₦800', time: '6 min', active: false },
                      ].map(({ icon: Icon, label, price, time, active }) => (
                        <div key={label} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
                          active ? 'bg-feazi-green text-white' : 'bg-white/5 text-white/70'
                        }`}>
                          <Icon size={14} />
                          <span className="text-xs font-semibold flex-1">{label}</span>
                          <span className="text-xs opacity-70">{time}</span>
                          <span className="text-xs font-bold">{price}</span>
                        </div>
                      ))}
                    </div>

                    {/* Book button */}
                    <button className="w-full mt-4 bg-feazi-green text-white font-bold py-3 rounded-2xl text-sm">
                      Book FeaziRide — ₦450
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div className="absolute -left-10 top-16 bg-feazi-dark border border-white/15 rounded-2xl px-4 py-3 shadow-xl">
                <div className="text-feazi-green text-xs font-semibold">💚 Save up to</div>
                <div className="text-white font-bold text-lg">60%</div>
                <div className="text-white/50 text-xs">on daily rides</div>
              </div>

              <div className="absolute -right-8 bottom-24 bg-feazi-dark border border-white/15 rounded-2xl px-4 py-3 shadow-xl">
                <div className="text-feazi-accent text-xs font-semibold">🚗 Driver nearby</div>
                <div className="text-white font-bold text-base">4 min</div>
                <div className="text-white/50 text-xs">estimated arrival</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 inset-x-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
          <path d="M0 80L1440 80L1440 30C1200 70 960 0 720 20C480 40 240 10 0 30L0 80Z" fill="rgba(255,255,255,0.02)"/>
        </svg>
      </div>
    </section>
  )
}
