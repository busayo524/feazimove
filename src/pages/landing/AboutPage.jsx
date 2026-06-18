import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { useTheme } from '../../context/ThemeContext'
import { CommuterGroup, WalkingPerson } from '../../components/illustrations/PeopleIllustration'
import aboutBanner from '../../assets/about-banner.jpg.jpg'
import africanMob from '../../assets/African Reality.jpg'

const values = [
  { letter: 'F', word: 'Feasibility',          desc: 'Practical solutions built for the everyday realities of African cities.' },
  { letter: 'E', word: 'Ease',                 desc: 'Every interaction on FeaziMove must feel seamless, fast, and stress-free.' },
  { letter: 'A', word: 'Accountability',        desc: 'We operate with transparency, reliability, and responsibility — always.' },
  { letter: 'Z', word: 'Zeal for Innovation',   desc: 'We continuously push to improve mobility, logistics, and customer experience.' },
  { letter: 'I', word: 'Inclusion',             desc: 'FeaziMove is designed to work for the whole city — not just the few.' },
]

const team = [
  { name: 'Busayomi Olowooke', role: 'Founder & CEO',      initial: 'BO' },
  { name: 'Operations Lead',   role: 'Head of Operations',  initial: 'OL' },
  { name: 'Tech Lead',         role: 'Head of Engineering', initial: 'TL' },
  { name: 'Growth Lead',       role: 'Head of Growth',      initial: 'GL' },
]

export default function AboutPage() {
  const { isDark } = useTheme()
  const C = {
    text:      isDark ? '#ffffff'                : '#0f0f0f',
    textMid:   isDark ? 'rgba(255,255,255,0.75)' : '#444',
    textSoft:  isDark ? 'rgba(255,255,255,0.55)' : '#555',
    textFaint: isDark ? 'rgba(255,255,255,0.4)'  : '#888',
    subtleBg:  isDark ? '#0d0d0d'               : '#fdf6e3',
    cardBg:    isDark ? '#111111'               : '#ffffff',
    feaziWayBg:isDark ? '#1a1a1a'              : '#f2f2ef',
    numColor:  isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0',
  }
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


      {/* ── Our Story ──────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: 'clamp(60px,8vw,100px) clamp(20px,6vw,80px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: 1200, margin: '0 auto', gap: 'clamp(40px,6vw,80px)', alignItems: 'center' }}>
          {/* Image — left */}
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', width: '100%', height: 'clamp(300px,50vw,560px)' }}>
              <img
                src={africanMob}
                alt="FeaziMove community"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
              />
            </div>
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: '#ccff00', opacity: 0.7, zIndex: -1 }} />
          </div>
          {/* Our Story — right */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textFaint, marginBottom: 20 }}>Our Story</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.2rem,4vw,3.4rem)', letterSpacing: '-0.04em', color: C.text, lineHeight: 1.05, marginBottom: 40 }}>
              How FeaziMove began
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <p style={{ fontSize: '1.05rem', color: C.textMid, lineHeight: 1.85 }}>
                FeaziMove is a trademark of FeaziMove Technologies Ltd. We are an urban mobility company engineering sustainable transit infrastructure for regions facing soaring transport costs and unreliable daily commutes.
              </p>
              <p style={{ fontSize: '1.05rem', color: C.textMid, lineHeight: 1.85 }}>
                The name Feazi is a play on Feasible and Easy — two qualities we believe everyday transit in Africa must have. Our flagship offering connects commuters and goods with independent drivers along shared routes. By pooling rides, we make everyday movement feasible, affordable and easy.{' '}
                <span style={{ background: '#ccff00', color: '#0f0f0f', fontWeight: 800, padding: '2px 10px', borderRadius: 6, display: 'inline' }}>&ldquo;The Feazi Way&rdquo;</span>
              </p>
              <p style={{ fontSize: '1.05rem', color: C.textMid, lineHeight: 1.85 }}>
                Optimizing shared transit allows us to enhance convenience, slash commuting costs, and lower carbon emissions by reducing vehicle density on the road. Beyond daily commuting, FeaziMove is building a comprehensive mobility ecosystem designed to empower individuals, businesses, and logistics networks alike.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why FeaziMove ───────────────────────────────────────────────── */}
      <section style={{ background: C.subtleBg, padding: 'clamp(60px,8vw,100px) clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textSoft, marginBottom: 16 }}>Why FeaziMove</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3.2rem)', letterSpacing: '-0.04em', color: C.text, lineHeight: 1.1, maxWidth: 600, margin: '0 auto' }}>
              The problem we're solving
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { num: '01', title: 'High Transport Costs',  body: 'Solo rides are expensive. By pooling commuters heading the same way, we cut costs by up to 60% per trip — every day.' },
              { num: '02', title: 'Unreliable Movement',   body: 'Most transport has no scheduling, tracking, or accountability. FeaziMove brings structure, safety, and predictability.' },
              { num: '03', title: 'Urban Emissions',       body: 'Fewer vehicles on the road means lower carbon output. Every shared ride is a step toward a cleaner African city.' },
              { num: '04', title: 'Logistics Gaps',        body: 'Small businesses and individuals have no affordable, trackable way to move goods across the city. FeaziSend fills that gap by piggybacking deliveries on existing commuter routes.' },
              { num: '05', title: 'Driver Income Instability', body: 'Independent drivers earn inconsistently with no guaranteed trips. FeaziMove gives drivers a steady stream of matched rides and deliveries — turning their daily route into reliable income.' },
            ].map(({ num, title, body }) => (
              <div key={num} className="card" style={{ padding: 'clamp(24px,4vw,40px) clamp(20px,4vw,36px)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: C.textFaint, textTransform: 'uppercase', margin: 0 }}>{num}</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.25rem,2.2vw,1.6rem)', lineHeight: 1.1, color: C.text, margin: 0 }}>{title}</h3>
                <p style={{ fontSize: '0.97rem', color: C.textSoft, lineHeight: 1.85, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Mission & Vision ───────────────────────────────────────────── */}
      <section className="py-28" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: 1000, margin: '0 auto', padding: '0 clamp(20px,5vw,60px)', gap: 32 }}>
          {/* Mission */}
          <div className="card p-10 md:p-14" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: C.textFaint, textTransform: 'uppercase', marginBottom: 8 }}>Mission</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.2vw,2.6rem)', lineHeight: 1.05, color: C.text, margin: 0, whiteSpace: 'nowrap' }}>Why we exist</h3>
            <p style={{ fontSize: '1.08rem', color: C.textSoft, lineHeight: 1.85, margin: 0 }}>To simplify how people and goods move in African cities by making mobility feasible, affordable, and easy through shared solutions.</p>
          </div>
          {/* Vision */}
          <div className="card p-10 md:p-14" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: C.textFaint, textTransform: 'uppercase', marginBottom: 8 }}>Vision</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,3.6vw,2.8rem)', lineHeight: 1.05, color: C.text, margin: 0 }}>Where we&apos;re<br />going</h3>
            <p style={{ fontSize: '1.08rem', color: C.textSoft, lineHeight: 1.85, margin: 0 }}>To build Africa&apos;s leading shared mobility platform — driving a cleaner, more efficient transport future while creating economic opportunities across the ecosystem.</p>
          </div>
        </div>
      </section>

      {/* ── FEAZI Values ───────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.18em', color: C.textFaint, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Our Values</p>
            <h2 className="section-title mb-4">What <span className="text-lime">FEAZI</span> stands for</h2>
            <p className="section-sub mx-auto">Five principles guiding every decision we make.</p>
          </div>
          <div className="space-y-5">
            {values.map(({ letter, word, desc }) => (
              <div key={letter} className="card flex items-start gap-8 p-8 md:p-10 group">
                <div className="font-display font-black flex-shrink-0 leading-none text-center" style={{ fontSize: '5rem', width: '72px', color: C.text }}>
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

    </LandingLayout>
  )
}
