import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { useTheme } from '../../context/ThemeContext'

// ── Asset imports (using confirmed existing assets) ───────────────────────────
import africaReImg      from '../../assets/African Reality.jpg'
import corporateImg     from '../../assets/Corporate commuters.jpg'
import femaleDriverImg  from '../../assets/Female Driver solo.jpg'
import urbanImg         from '../../assets/urban residents.jpg'
import heroBg           from '../../assets/car picture group.jpg'

import safetyImg        from '../../assets/safety.png'

// Optional assets — add these files to src/assets/ to enable them
import driverWithCarImg from '../../assets/driverwithcar.jpg'
import africaImg        from '../../assets/Africa.jpg'
import rideImg          from '../../assets/ride.png'
import safety1Img       from '../../assets/safety1.png'
import respectImg       from '../../assets/respect for all.jpg'
import onePersonImg     from '../../assets/oneperson.jpg'
import discriminateImg  from '../../assets/Discriminate.jpg'
import passengerSafetyImg from '../../assets/passengersafty.jpg'

// ── Inline SVG Illustrations (B&W + lime #ccff00) ─────────────────────────────

function RespectIllustration() {
  return (
    <img
      src={respectImg}
      alt="Respect for all"
      style={{ width: '100%', maxWidth: 260, height: 180, objectFit: 'cover', borderRadius: 12 }}
    />
  )
}

function OneAccountIllustration() {
  return (
    <img
      src={onePersonImg}
      alt="One person, one account"
      style={{ width: '100%', maxWidth: 260, height: 180, objectFit: 'cover', borderRadius: 12 }}
    />
  )
}

function NoDismissalIllustration() {
  return (
    <img
      src={discriminateImg}
      alt="No discrimination"
      style={{ width: '100%', maxWidth: 260, height: 180, objectFit: 'cover', borderRadius: 12 }}
    />
  )
}

// ── Safety standards cards ─────────────────────────────────────────────────────
const STANDARDS = [
  {
    Illustration: RespectIllustration,
    title: 'Respect for all',
    body: 'Treat every driver, passenger, and co-commuter with courtesy. Harassment, verbal abuse, or disrespectful behaviour will not be tolerated on FeaziMove.',
  },
  {
    Illustration: OneAccountIllustration,
    title: 'One person, one account',
    body: 'Do not share your FeaziMove account. Each account is tied to a verified identity. Sharing accounts undermines safety and may result in permanent suspension.',
  },
  {
    Illustration: NoDismissalIllustration,
    title: 'No discrimination',
    body: 'FeaziMove has a zero-tolerance policy towards discrimination of any kind — based on gender, ethnicity, religion, disability, or any other characteristic.',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
export default function SafetyPage() {
  const [activeTab, setActiveTab] = useState('passengers')
  const { isDark } = useTheme()

  const C = {
    sectionBg:  isDark ? '#0a0a0a'                  : '#f5f5e6',
    whiteBg:    isDark ? '#111111'                  : '#ffffff',
    phoneBg:    isDark ? '#1a1a1a'                  : '#f4f4f0',
    text:       isDark ? '#ffffff'                  : '#0f0f0f',
    textMid:    isDark ? 'rgba(255,255,255,0.78)'   : '#3a3a3a',
    textSoft:   isDark ? 'rgba(255,255,255,0.55)'   : '#555',
    textFaint:  isDark ? 'rgba(255,255,255,0.5)'    : '#666',
    border:     isDark ? 'rgba(255,255,255,0.1)'    : '#ececec',
    cardBg:     isDark ? 'rgba(255,255,255,0.05)'   : 'white',
    btnInactive:     isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)',
    btnInactiveText: isDark ? '#ffffff'                : '#0f0f0f',
    pillBorder: isDark ? 'rgba(255,255,255,0.35)'   : '#1a1a1a',
    pillText:   isDark ? '#ffffff'                  : '#1a1a1a',
    pillHoverBg:isDark ? '#1a1a1a'                  : '#1a1a1a',
  }

  return (
    <LandingLayout>
      <style>{`
        .seat-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          flex: 1;
          min-height: 420px;
          cursor: pointer;
        }
        .seat-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
          transition: transform 0.4s ease;
        }
        .seat-card:hover img { transform: scale(1.04); }
        .seat-label {
          position: absolute;
          bottom: 24px;
          left: 24px;
          font-weight: 900;
          font-size: 1.4rem;
          color: white;
          font-family: var(--font-display);
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
        }
        .seat-btn {
          position: absolute;
          top: 24px;
          left: 24px;
          background: #ccff00;
          color: #0f0f0f;
          font-weight: 800;
          font-size: 0.85rem;
          padding: 10px 22px;
          border-radius: 999px;
          text-decoration: none;
          display: inline-block;
          transition: transform 0.2s;
        }
        .seat-btn:hover { transform: scale(1.05); }
      `}</style>

      {/* ── 1. HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ background: C.sectionBg, minHeight: '88vh', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px clamp(20px,4vw,60px) 60px' }}>

        {/* Large shield SVG behind text */}
        <svg viewBox="0 0 400 460" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-52%)', width: 'clamp(280px,42vw,480px)', opacity: 0.9, zIndex: 0, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
          <path d="M200 20 L360 80 L360 240 C360 340 200 440 200 440 C200 440 40 340 40 240 L40 80 Z" fill="#ccff00"/>
        </svg>

        {/* Left photo stack */}
        <div style={{ position: 'absolute', left: 'clamp(10px,5vw,60px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 2 }} className="hidden lg:flex">
          <div style={{ width: 200, height: 240, borderRadius: 20, overflow: 'hidden', transform: 'rotate(-4deg)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <img src={safetyImg} alt="Safety" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
          <div style={{ width: 170, height: 190, borderRadius: 20, overflow: 'hidden', transform: 'rotate(3deg) translateX(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
            <img src={rideImg} alt="Ride" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
        </div>

        {/* Right photo stack */}
        <div style={{ position: 'absolute', right: 'clamp(10px,5vw,60px)', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 16, zIndex: 2 }} className="hidden lg:flex">
          <div style={{ width: 200, height: 240, borderRadius: 20, overflow: 'hidden', transform: 'rotate(4deg)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <img src={safety1Img} alt="Driver safety" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
          <div style={{ width: 170, height: 190, borderRadius: 20, overflow: 'hidden', transform: 'rotate(-3deg) translateX(-20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
            <img src={africaImg} alt="Africa" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', maxWidth: 620 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.4rem,5.5vw,4.4rem)', color: C.text, lineHeight: 1.08, marginBottom: 24 }}>
            We want everyone to be safe — every single trip.
          </h1>
          <p style={{ fontSize: '1.1rem', color: C.textMid, lineHeight: 1.75, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
            Safety at FeaziMove is a shared commitment — between passengers, drivers, and us. Here's how we all hold up our end.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('passengers')}
              style={{ padding: '14px 32px', borderRadius: 999, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: activeTab === 'passengers' ? '#0f0f0f' : C.btnInactive, color: activeTab === 'passengers' ? '#ccff00' : C.btnInactiveText, transition: 'all 0.2s' }}>
              For passengers
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              style={{ padding: '14px 32px', borderRadius: 999, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: activeTab === 'drivers' ? '#0f0f0f' : C.btnInactive, color: activeTab === 'drivers' ? '#ccff00' : C.btnInactiveText, transition: 'all 0.2s' }}>
              For drivers
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. SAFETY STANDARDS ───────────────────────────────────────────────── */}
      <section style={{ background: C.sectionBg, padding: 'clamp(48px,7vw,80px) clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', color: C.text, textAlign: 'center', marginBottom: 56 }}>
            Safety at{' '}
            <span style={{ background: '#ccff00', color: '#0f0f0f', padding: '2px 14px', borderRadius: 6, display: 'inline-block' }}>FeaziMove</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {STANDARDS.map(({ Illustration, title, body }) => (
              <div key={title} style={{ background: C.cardBg, borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.4)' : '0 2px 16px rgba(0,0,0,0.06)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'center', minHeight: 180 }}>
                  <Illustration />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.35rem', color: C.text, marginBottom: 10 }}>{title}</h3>
                  <p style={{ color: C.textSoft, lineHeight: 1.8, fontSize: '0.97rem' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SAFETY FOR BOTH SEATS ──────────────────────────────────────────── */}
      <section style={{ background: C.sectionBg, padding: '0 clamp(20px,6vw,80px) 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.2em', color: C.textSoft, textTransform: 'uppercase', marginBottom: 14 }}>3-sided pact</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', color: C.text }}>
              Safety for{' '}
              <span style={{ background: '#ccff00', padding: '2px 14px', borderRadius: 6, display: 'inline-block' }}>both seats</span>
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {/* Passenger safety */}
            <div className="seat-card">
              <img src={passengerSafetyImg} alt="Passenger safety" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
              <Link to="/policies?tab=safety" className="seat-btn">Learn more</Link>
              <span className="seat-label">Passenger safety</span>
            </div>
            {/* Driver safety */}
            <div className="seat-card">
              <img src={driverWithCarImg} alt="Driver safety" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />
              <Link to="/policies?tab=safety" className="seat-btn">Learn more</Link>
              <span className="seat-label">Driver safety</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FULL-BLEED QUOTE BANNER ────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: 420 }}>
        <img src={safety1Img} alt="Safety commitment" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} />
        {/* Lime blob */}
        <div style={{ position: 'absolute', right: 0, bottom: 0, width: 320, height: 320, background: '#ccff00', borderRadius: '80% 0 0 0', opacity: 0.18 }} />
        <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(48px,7vw,80px) clamp(20px,6vw,80px)', maxWidth: 800 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.18em', color: '#ccff00', textTransform: 'uppercase', marginBottom: 24 }}>Our commitment</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', color: 'white', lineHeight: 1.3, marginBottom: 32 }}>
            Our commuters' safety is as{' '}
            <span style={{ background: '#ccff00', color: '#0f0f0f', padding: '2px 10px', borderRadius: 6, display: 'inline' }}>important to FeaziMove</span>
            {' '}as building an efficient, affordable, and sustainable city.
          </h2>
          <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#ccff00', color: '#0f0f0f', fontWeight: 800, fontSize: '0.95rem', padding: '14px 28px', borderRadius: 999, textDecoration: 'none' }}>
            Report a safety concern <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── 7. SAFETY TIPS GRID ───────────────────────────────────────────────── */}
      <section style={{ background: '#0f0f0f', padding: 'clamp(48px,7vw,80px) clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', color: 'white', marginBottom: 12 }}>
            Before every trip
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', marginBottom: 48 }}>Quick safety checklist for passengers and drivers.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { num: '01', tip: "Verify the driver's name, photo, and plate number before boarding." },
              { num: '02', tip: "Always wear your seatbelt immediately after entering the vehicle." },
              { num: '03', tip: "Trust your instincts — ask the driver to stop safely if something feels wrong." },
              { num: '04', tip: "Rate your trip honestly. Your feedback keeps the community safe." },
              { num: '05', tip: "Drivers: confirm the passenger's name before starting the trip." },
            ].map(({ num, tip }) => (
              <div key={num} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '2.2rem', color: '#ccff00', marginBottom: 12, lineHeight: 1 }}>{num}</p>
                <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, fontSize: '0.95rem' }}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. SAFETY IMAGE + CTA ─────────────────────────────────────────────── */}
      <section style={{ background: C.sectionBg, padding: 'clamp(48px,7vw,80px) clamp(20px,6vw,80px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: 1100, margin: '0 auto', gap: 'clamp(32px,5vw,60px)', alignItems: 'center' }}>
          <div style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: '4/3' }}>
            <img src={safetyImg} alt="Safety" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', color: '#5a9e00', textTransform: 'uppercase', marginBottom: 16 }}>Always on</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3vw,2.6rem)', color: C.text, lineHeight: 1.15, marginBottom: 20 }}>
              Our safety team operates 24 hours a day, 7 days a week.
            </h2>
            <p style={{ color: C.textSoft, lineHeight: 1.85, marginBottom: 32, fontSize: '1rem' }}>
              Whether it's a concern during a trip or a report after the fact, FeaziMove's dedicated safety team responds to every alert. We take every report seriously and act on it.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f0f0f', color: '#ccff00', fontWeight: 800, fontSize: '0.92rem', padding: '13px 26px', borderRadius: 999, textDecoration: 'none' }}>
                Contact safety team <ArrowRight size={14} />
              </Link>
              <Link to="/policies?tab=safety" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: C.text, fontWeight: 700, fontSize: '0.92rem', padding: '12px 26px', borderRadius: 999, textDecoration: 'none', border: `1.5px solid ${C.text}` }}>
                Read safety policy
              </Link>
            </div>
          </div>
        </div>
      </section>

    </LandingLayout>
  )
}
