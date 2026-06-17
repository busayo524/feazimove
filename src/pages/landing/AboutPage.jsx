import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { CommuterGroup, WalkingPerson } from '../../components/illustrations/PeopleIllustration'
import aboutBanner from '../../assets/about-banner.jpg.jpg'
import africanMob from '../../assets/African Reality.jpg'

const values = [
  { letter: 'F', word: 'Feasibility',       color: '#0f0f0f',  desc: 'Practical solutions built for the everyday realities of African cities.' },
  { letter: 'E', word: 'Ease',              color: '#0f0f0f',  desc: 'Every interaction on FeaziMove must feel seamless, fast, and stress-free.' },
  { letter: 'A', word: 'Accountability',    color: '#0f0f0f',  desc: 'We operate with transparency, reliability, and responsibility — always.' },
  { letter: 'Z', word: 'Zeal for Innovation', color: '#0f0f0f', desc: 'We continuously push to improve mobility, logistics, and customer experience.' },
  { letter: 'I', word: 'Inclusion',         color: '#0f0f0f',  desc: 'FeaziMove is designed to work for the whole city — not just the few.' },
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
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', transform: 'scale(1.08)', transformOrigin: 'center center' }}
        />
        {/* Lime green transparent overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(100,160,0,0.82)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)' }} />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px,6vw,80px)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.8rem,7vw,5rem)', letterSpacing: '-0.04em', color: '#ffffff', lineHeight: 1.05, marginBottom: 12 }}>
            About FeaziMove
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: 'rgba(255,255,255,0.90)', fontWeight: 500 }}>
            Africa's Smart Shared Mobility Partner
          </p>
        </div>
      </section>


      {/* ── Built for Africa section ──────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '100px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          {/* Image — left */}
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '3/4', minHeight: 520 }}>
              <img
                src={africanMob}
                alt="FeaziMove community"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: '#ccff00', opacity: 0.7, zIndex: -1 }} />
          </div>
          {/* Text — right */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.8rem,6vw,5rem)', letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1.0, marginBottom: 36 }}>
              Built for Africa's reality.
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 20 }}>
              FeaziMove is a trademark of FeaziMove Technologies Ltd. We are an urban mobility company engineering sustainable transit infrastructure for regions where unpredictable traffic, soaring transport costs, and unreliable daily commuting persist.
            </p>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 20 }}>
              Our flagship offering connects commuters and goods with independent drivers along shared routes. By pooling transport, we make everyday movement more feasible, affordable, and easy —{' '}
              <strong>the "Feazi" Way.</strong>
            </p>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
              Optimizing shared mobility allows us to enhance convenience, slash transport costs, and lower carbon emissions by reducing vehicle density on the road. Beyond daily commuting, FeaziMove is building a comprehensive mobility ecosystem designed to empower individuals, businesses, and logistics networks alike.
            </p>
          </div>
        </div>
      </section>

      {/* ── Our Story ──────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '100px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', textAlign: 'center', marginBottom: 20 }}>Our Story</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,3.8rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.05, textAlign: 'center', marginBottom: 56 }}>
            How FeaziMove began
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <p style={{ fontSize: '1.1rem', color: '#444', lineHeight: 1.85 }}>
              FeaziMove was born out of a simple frustration — getting around African cities is unnecessarily hard, expensive, and unreliable. Every day, millions of commuters in Lagos and cities across the continent spend hours in traffic, overpay for transport, and still arrive late.
            </p>
            <p style={{ fontSize: '1.1rem', color: '#444', lineHeight: 1.85 }}>
              We asked: what if shared routes could be matched intelligently? What if a driver already heading your way could carry you along — and someone&apos;s package too — making every trip earn more, cost less, and move faster?
            </p>
            <p style={{ fontSize: '1.1rem', color: '#444', lineHeight: 1.85 }}>
              That question became FeaziMove. A platform that pools riders and goods along the same routes, reducing transport costs by up to 30%, cutting emissions, and creating a predictable, cashless commuting experience across African cities.
            </p>
            <p style={{ fontSize: '1.1rem', color: '#444', lineHeight: 1.85 }}>
              We are building more than a ride-hailing app. FeaziMove is the foundation of a shared mobility ecosystem — one that will power how individuals, businesses, and logistics networks move across Africa.{' '}
              <span style={{ background: '#ccff00', color: '#0f0f0f', fontWeight: 800, padding: '2px 10px', borderRadius: 6, display: 'inline' }}>That&apos;s the Feazi Way.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Why FeaziMove ───────────────────────────────────────────────── */}
      <section style={{ background: '#fdf6e3', padding: '100px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666', marginBottom: 16 }}>Why FeaziMove</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3.2rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.1, maxWidth: 600, margin: '0 auto' }}>
              The problem we're solving
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {[
              { num: '01', title: 'Unpredictable Traffic', body: 'African cities face daily gridlock with no reliable alternatives. FeaziMove optimises shared routes to cut time on the road.' },
              { num: '02', title: 'High Transport Costs',  body: 'Solo rides are expensive. By pooling commuters heading the same way, we cut costs by up to 60% per trip — every day.' },
              { num: '03', title: 'Unreliable Movement',   body: 'Most transport has no scheduling, tracking, or accountability. FeaziMove brings structure, safety, and predictability.' },
              { num: '04', title: 'Urban Emissions',       body: 'Fewer vehicles on the road means lower carbon output. Every shared ride is a step toward a cleaner African city.' },
              { num: '05', title: 'Logistics Gaps',        body: 'Small businesses and individuals have no affordable, trackable way to move goods across the city. FeaziSend fills that gap by piggybacking deliveries on existing commuter routes.' },
              { num: '06', title: 'Driver Income Instability', body: 'Independent drivers earn inconsistently with no guaranteed trips. FeaziMove gives drivers a steady stream of matched rides and deliveries — turning their daily route into reliable income.' },
            ].map(({ num, title, body }) => (
              <div key={num} style={{ background: '#ffffff', borderRadius: 20, padding: '36px 32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '5rem', color: '#f0f0f0', lineHeight: 1, position: 'absolute', top: 12, right: 20, letterSpacing: '-0.04em', userSelect: 'none' }}>{num}</div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ccff00', marginBottom: 24 }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.25rem', color: '#0f0f0f', marginBottom: 14, lineHeight: 1.2 }}>{title}</h3>
                <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.8 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Mission & Vision ───────────────────────────────────────────── */}
      <section className="py-28" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(20px,5vw,60px)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
          {/* Mission */}
          <div className="card p-10 md:p-14" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Mission</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.2vw,2.6rem)', lineHeight: 1.05, color: '#0f0f0f', margin: 0, whiteSpace: 'nowrap' }}>Why we exist</h3>
            <p style={{ fontSize: '1.08rem', color: '#555', lineHeight: 1.85, margin: 0 }}>To simplify how people and goods move in African cities by making mobility feasible, affordable, and easy through shared solutions.</p>
          </div>
          {/* Vision */}
          <div className="card p-10 md:p-14" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Vision</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,3.6vw,2.8rem)', lineHeight: 1.05, color: '#0f0f0f', margin: 0 }}>Where we&apos;re<br />going</h3>
            <p style={{ fontSize: '1.08rem', color: '#555', lineHeight: 1.85, margin: 0 }}>To build Africa&apos;s leading shared mobility platform — driving a cleaner, more efficient transport future while creating economic opportunities across the ecosystem.</p>
          </div>
          {/* The Feazi Way */}
          <div className="card p-10 md:p-14" style={{ display: 'flex', flexDirection: 'column', gap: 20, background: '#f2f2ef' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>The Feazi Way</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.2vw,2.6rem)', lineHeight: 1.05, color: '#0f0f0f', margin: 0, whiteSpace: 'nowrap' }}>How we do it</h3>
            <p style={{ fontSize: '1.08rem', color: '#555', lineHeight: 1.85, margin: 0 }}>Pooled transport along shared routes — connecting commuters and goods moving the same way, making every journey more feasible, easy, and affordable. That&apos;s the Feazi Way.</p>
          </div>
        </div>
      </section>

      {/* ── FEAZI Values ───────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: '#888', textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Our Values</p>
            <h2 className="section-title mb-4">What <span className="text-lime">FEAZI</span> stands for</h2>
            <p className="section-sub mx-auto">Five principles guiding every decision we make.</p>
          </div>
          <div className="space-y-5">
            {values.map(({ letter, word, color, desc }) => (
              <div key={letter} className="card flex items-start gap-8 p-8 md:p-10 group">
                <div className="font-display font-black flex-shrink-0 leading-none text-center" style={{ fontSize: '5rem', width: '72px', color }}>
                  {letter}
                </div>
                <div>
                  <h4 className="font-display font-bold mb-3" style={{ color: 'var(--text)', fontSize: '1.35rem' }}>{word}</h4>
                  <p className="leading-relaxed" style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Brand quote */}
          <div className="mt-12 p-8 rounded-3xl text-center relative overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--lime-dim)' }}>

            <p className="font-display font-black text-xl md:text-2xl mb-4" style={{ color: 'var(--text)' }}>
              "A smart mobility platform today — evolving into a sustainable transport and infrastructure ecosystem tomorrow."
            </p>
            <p className="text-lime font-bold text-sm">— The FeaziMove Vision</p>
          </div>
        </div>
      </section>

      {/* ── Taglines ───────────────────────────────────────────────────── */}
      <section className="py-28" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
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
