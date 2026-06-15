import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { CommuterGroup, WalkingPerson } from '../../components/illustrations/PeopleIllustration'
import aboutBanner from '../../assets/about-banner.jpg.jpg'
import africanMob from '../../assets/AfricanMobimage.jpg'

const values = [
  { letter: 'F', word: 'Feasibility',       color: 'var(--lime)',  desc: 'Practical solutions built for the everyday realities of African cities.' },
  { letter: 'E', word: 'Ease',              color: '#60A5FA',      desc: 'Every interaction on FeaziMove must feel seamless, fast, and stress-free.' },
  { letter: 'A', word: 'Accountability',    color: '#FFB800',      desc: 'We operate with transparency, reliability, and responsibility — always.' },
  { letter: 'Z', word: 'Zeal for Innovation', color: '#C084FC',   desc: 'We continuously push to improve mobility, logistics, and customer experience.' },
  { letter: 'I', word: 'Inclusion',         color: '#F472B6',      desc: 'FeaziMove is designed to work for the whole city — not just the few.' },
]

const team = [
  { name: 'Busayomi Olowooke', role: 'Founder & CEO',      initial: 'BO' },
  { name: 'Operations Lead',   role: 'Head of Operations',  initial: 'OL' },
  { name: 'Tech Lead',         role: 'Head of Engineering', initial: 'TL' },
  { name: 'Growth Lead',       role: 'Head of Growth',      initial: 'GL' },
]

export default function AboutPage() {
  return (
    <LandingLayout>
      {/* ── Hero with background image ─────────────────────────────────── */}
      <section style={{ position: 'relative', height: 320, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <img
          src={aboutBanner}
          alt="About FeaziMove"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)' }} />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px,6vw,80px)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.8rem,7vw,5rem)', letterSpacing: '-0.04em', color: '#ffffff', lineHeight: 1.05, marginBottom: 16 }}>
            About FeaziMove
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
            Africa's Smart Shared Mobility Partner
          </p>
        </div>
      </section>


      {/* ── Built for Africa section ──────────────────────────────────── */}
      <section style={{ background: '#ffffff', padding: '100px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '80px', alignItems: 'center' }}>
          {/* Text */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.8rem,6vw,5rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.0, marginBottom: 36 }}>
              Built for Africa's reality.
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#444', lineHeight: 1.8, marginBottom: 20 }}>
              FeaziMove is a trademark of FeaziMove Technologies Ltd. We are an urban mobility company engineering sustainable transit infrastructure for regions where unpredictable traffic, soaring transport costs, and unreliable daily commuting persist.
            </p>
            <p style={{ fontSize: '1.05rem', color: '#444', lineHeight: 1.8, marginBottom: 20 }}>
              Our flagship offering connects commuters and goods with independent drivers along shared routes. By pooling transport, we make everyday movement more feasible, affordable, and easy —{' '}
              <strong>the "Feazi" Way.</strong>
            </p>
            <p style={{ fontSize: '1.05rem', color: '#444', lineHeight: 1.8 }}>
              Optimizing shared mobility allows us to enhance convenience, slash transport costs, and lower carbon emissions by reducing vehicle density on the road. Beyond daily commuting, FeaziMove is building a comprehensive mobility ecosystem designed to empower individuals, businesses, and logistics networks alike.
            </p>
          </div>
          {/* Image */}
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3' }}>
              <img
                src={africanMob}
                alt="FeaziMove community"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ position: 'absolute', bottom: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: '#ccff00', opacity: 0.7, zIndex: -1 }} />
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ───────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-8">
          <div className="card p-8">
            <div className="text-4xl mb-4">&#127919;</div>
            <h3 className="font-display font-black text-2xl mb-4" style={{ color: 'var(--text)' }}>Mission</h3>
            <p className="section-sub">To simplify how people and goods move in African cities by making mobility feasible, affordable, and easy through shared solutions.</p>
          </div>
          <div className="card p-8" style={{ border: '1px solid var(--lime-dim)' }}>
            <div className="text-4xl mb-4">&#128301;</div>
            <h3 className="font-display font-black text-2xl mb-4 text-lime">Vision</h3>
            <p className="section-sub">To build Africa's leading shared mobility platform — driving a cleaner, more efficient transport future while creating economic opportunities across the ecosystem.</p>
          </div>
        </div>
      </section>

      {/* ── FEAZI Values ───────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <div className="pill mb-4 mx-auto">Our Values</div>
            <h2 className="section-title mb-4">What <span className="text-lime">FEAZI</span> stands for</h2>
            <p className="section-sub mx-auto">Five principles guiding every decision we make.</p>
          </div>
          <div className="space-y-4">
            {values.map(({ letter, word, color, desc }) => (
              <div key={letter} className="card flex items-start gap-6 p-6 md:p-8 group">
                <div className="font-display font-black text-6xl flex-shrink-0 leading-none w-14 text-center" style={{ color }}>
                  {letter}
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>{word}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Brand quote */}
          <div className="mt-12 p-8 rounded-3xl text-center relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--lime-dim)' }}>
            <div className="text-5xl mb-4">&#128172;</div>
            <p className="font-display font-black text-xl md:text-2xl mb-4" style={{ color: 'var(--text)' }}>
              "A smart mobility platform today — evolving into a sustainable transport and infrastructure ecosystem tomorrow."
            </p>
            <p className="text-lime font-bold text-sm">— The FeaziMove Vision</p>
          </div>
        </div>
      </section>

      {/* ── Illustration band ──────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="pill mb-4">Our Story</div>
              <h2 className="font-display font-black text-3xl md:text-4xl mb-5" style={{ color: 'var(--text)' }}>
                Born from the<br /><span className="text-lime">daily commute</span>
              </h2>
              <p className="section-sub mb-5">
                FeaziMove was born from the frustration of expensive, unreliable transport in African cities. We saw millions of commuters facing the same routes, paying full price alone — while empty seats rolled by.
              </p>
              <p className="section-sub">
                We built FeaziMove to fix that — one shared ride at a time. By optimizing shared mobility, we reduce costs, ease congestion, and lower emissions. That's not just transportation; that's transformation.
              </p>
            </div>
            <div className="flex justify-center">
              <CommuterGroup className="w-full max-w-xs animate-float-slow" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Team ───────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <div className="pill mb-4 mx-auto">The Team</div>
            <h2 className="section-title mb-4">People behind <span className="text-lime">FeaziMove</span></h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map(({ name, role, initial }) => (
              <div key={name} className="card text-center p-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-2xl mx-auto mb-4 text-lime" style={{ background: 'var(--lime-dim)' }}>
                  {initial}
                </div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Taglines ───────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {['"The Feazi Way"', '"Making Mobility Feasible. Making Everyday Life Easy."', '"It\'s Feazi"'].map(tag => (
              <span key={tag} className="font-display font-bold text-lg md:text-xl text-lime">
                {tag}
              </span>
            ))}
          </div>
          <Link to="/register" className="btn-lime">Join the Movement <ArrowRight size={16} /></Link>
        </div>
      </section>
    </LandingLayout>
  )
}
