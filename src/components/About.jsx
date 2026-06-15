import React from 'react'

const values = [
  { letter: 'F', word: 'Feasibility', color: 'text-feazi-green', desc: 'Practical solutions built for the everyday realities of African cities.' },
  { letter: 'E', word: 'Ease', color: 'text-blue-400', desc: 'Technology that simplifies life — every interaction must feel seamless and stress-free.' },
  { letter: 'A', word: 'Accountability', color: 'text-feazi-accent', desc: 'Transparency, reliability, and responsibility — in every ride and every delivery.' },
  { letter: 'Z', word: 'Zeal for Innovation', color: 'text-purple-400', desc: 'Continuously pushing to improve mobility, logistics, sustainability, and experience.' },
  { letter: 'I', word: 'Inclusion', color: 'text-pink-400', desc: 'Designed to work for the whole city — not just the few.' },
]

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32" style={{ background: 'linear-gradient(180deg, #0B1E35 0%, #0A1628 100%)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div>
            <span className="inline-block bg-feazi-green/15 border border-feazi-green/30 text-feazi-green text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
              About FeaziMove
            </span>

            <h2 className="section-title mb-6">
              Built for Africa's <br />Urban Reality
            </h2>

            <p className="text-white/70 text-lg leading-relaxed mb-6">
              FeaziMove is a smart urban mobility platform built for African cities — where traffic is unpredictable, transport costs are high, and reliable daily movement remains a major challenge without a structured solution.
            </p>

            <p className="text-white/70 leading-relaxed mb-6">
              Our flagship offering connects commuters and goods moving along the same routes through pooled transport, making everyday movement more feasible, affordable, and easy — the <span className="text-feazi-green font-semibold">"Feazi" Way</span>.
            </p>

            <p className="text-white/70 leading-relaxed mb-10">
              By optimizing shared mobility, we not only improve convenience and reduce transport costs, but also lower emissions by decreasing the number of vehicles on the road — driving more efficient and sustainable urban movement.
            </p>

            {/* Mission & Vision */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card border-feazi-green/20">
                <div className="text-feazi-green text-2xl mb-3">🎯</div>
                <h4 className="font-display font-bold text-white mb-2">Mission</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  Simplify how people and goods move in African cities through shared, feasible, and affordable solutions.
                </p>
              </div>
              <div className="card border-feazi-accent/20">
                <div className="text-feazi-accent text-2xl mb-3">🔭</div>
                <h4 className="font-display font-bold text-white mb-2">Vision</h4>
                <p className="text-white/60 text-sm leading-relaxed">
                  Build West Africa's leading shared mobility platform — driving a cleaner, more efficient transport future.
                </p>
              </div>
            </div>
          </div>

          {/* Right — FEAZI values */}
          <div>
            <div className="mb-8">
              <h3 className="font-display font-bold text-2xl text-white mb-2">What <span className="gradient-text">FEAZI</span> Stands For</h3>
              <p className="text-white/50 text-sm">Five principles that guide everything we do.</p>
            </div>

            <div className="space-y-4">
              {values.map(({ letter, word, color, desc }) => (
                <div key={letter} className="card group flex items-start gap-5 hover:border-feazi-green/30 transition-all duration-300">
                  <div className={`font-display font-black text-5xl ${color} leading-none flex-shrink-0 w-12 text-center`}>
                    {letter}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-white text-lg mb-1">{word}</h4>
                    <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Brand quote */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-feazi-green/15 to-feazi-green/5 border border-feazi-green/20">
              <p className="text-white/90 text-base italic leading-relaxed">
                "A smart mobility platform today — evolving into a sustainable transport and infrastructure ecosystem tomorrow."
              </p>
              <p className="text-feazi-green font-semibold text-sm mt-3">— The FeaziMove Vision</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
