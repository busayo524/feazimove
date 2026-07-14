import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Package, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { useTheme } from '../../context/ThemeContext'
import { CarWithPeople, DeliveryPerson, CommuterGroup } from '../../components/illustrations/PeopleIllustration'
import africanMob from '../../assets/AfricanMobimage.jpg'
import onePlatformImg from '../../assets/oneplatform.jpg'
import walletRafiki  from '../../assets/wallet-rafiki.svg'
import cityDriver    from '../../assets/city-driver.svg'
import takeaway      from '../../assets/takeaway.svg'
import heavyBox      from '../../assets/heavy-box-pana.svg'
import movingImg     from '../../assets/Moving.png'
import busStopPana   from '../../assets/bus-stop-pana.svg'
import apart1 from '../../assets/setus_Apart1.jpg'
import apart2 from '../../assets/setus_Apart2.jpg'
import apart3 from '../../assets/setus_Apart3.jpg'
import apart4 from '../../assets/setus_Apart4.jpg'

const features = [
  {
    id: 'cheap',
    tag: 'Shared Rides',
    icon: '↘',
    title: 'Up to 30% cheaper',
    desc: 'Share your route with commuters heading the same way. Same trip, a fraction of the price. No surge, ever.',
    cta: 'Learn more',
    img: walletRafiki,
    flip: false,
  },
  {
    id: 'send',
    tag: 'Delivery',
    icon: '⚡',
    title: 'Moving an Item? done!',
    desc: 'Move items by sharing delivery space with others moving your way. Affordable, same-day, and secure.',
    cta: 'Learn more',
    img: heavyBox,
    flip: true,
  },
]

const apartSlides = [
  {
    img: apart1,
    num: '01',
    title: 'Affordable Daily Rides',
    body: 'FeaziMove provides cost-effective transportation by pooling commuters heading the same way. Split costs, cut spending by up to 30%, and enjoy cashless trips — every day, on your route.',
  },
  {
    img: apart3,
    num: '02',
    title: 'Safe & Verified Community',
    body: 'Every driver and rider is verified. Ratings and reviews keep the community accountable. Your safety is our non-negotiable.',
  },
  {
    img: apart4,
    num: '03',
    title: 'FeaziHaul',
    body: 'From groceries to full apartment. Fast, affordable, same-day moving across the city — no extra vehicle needed.',
  },
]

const services = [
  {
    id: 'pool',
    icon: Users,
    name: 'FeaziRide',
    tagline: 'Shared rides, lower costs.',
    desc: 'Match with commuters heading the same way. Share the journey, split the cost, and reduce traffic — all in one seamless experience.',
    price: 'From ₦1000',
    color: '#0f0f0f',
    colorDim: 'rgba(204,255,0,0.18)',
    features: ['Up to 60% cheaper than solo rides', 'Verified co-riders', 'Auto wallet deduction'],
    illustration: React.createElement('img', { src: busStopPana, alt: 'FeaziRide', style: { width: '100%', maxWidth: 520, display: 'block', margin: '0 auto' } }),
  },
  {
    id: 'send',
    icon: Package,
    name: 'FeaziHaul',
    tagline: 'Same-route delivery.',
    desc: React.createElement(React.Fragment, null, 'Move an Item - from groceries to full apartments.', React.createElement('br'), 'Share Moving Space, Split the cost'),
    price: 'From ₦1000',
    color: '#0f0f0f',
    colorDim: 'rgba(204,255,0,0.18)',
    features: ['Proof of delivery photos', 'Small to large parcels', 'Same-day delivery'],
    illustration: React.createElement('img', { src: movingImg, alt: 'FeaziHaul', style: { width: '100%', maxWidth: 520, display: 'block', margin: '0 auto', borderRadius: 20 } }),
  },
]

const tableRows = [
  { label: 'Cost per trip',        feazi: 'Up to 60% less',      regular: 'Full price',    highlight: true  },
  { label: 'Route matching',       feazi: 'Smart AI matching',   regular: 'Fixed routes',  highlight: false },
  { label: 'Delivery included',    feazi: 'Yes — FeaziHaul',     regular: 'No',            highlight: true  },
  { label: 'Expense tracker',      feazi: 'Built-in dashboard',  regular: 'None',          highlight: true  },
  { label: 'Verified community',   feazi: 'All riders & drivers', regular: 'Varies',       highlight: true  },
  { label: 'Cashless payments',    feazi: 'Wallet & card',       regular: 'Cash only',     highlight: false },
]

export default function ServicesPage() {
  const [active, setActive] = useState('pool')
  const [slide, setSlide] = useState(0)
  const service = services.find(s => s.id === active)
  const { isDark } = useTheme()
  const C = {
    text:      isDark ? '#ffffff'                : '#0f0f0f',
    textSoft:  isDark ? 'rgba(255,255,255,0.55)' : '#555',
    textFaint: isDark ? 'rgba(255,255,255,0.4)'  : '#888',
    heroBg:    isDark ? '#0a0a0a'               : '#ffffff',
  }

  const prevSlide = () => setSlide(s => (s - 1 + apartSlides.length) % apartSlides.length)
  const nextSlide = () => setSlide(s => (s + 1) % apartSlides.length)
  const current = apartSlides[slide]

  return (
    <LandingLayout>
      {/* Hero */}
      <section style={{ background: C.heroBg, padding: 'clamp(48px,6vw,80px) clamp(20px,6vw,80px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ maxWidth: 1200, margin: '0 auto', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }}>
          {/* Left: text */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.textFaint, marginBottom: 20 }}>Our Services</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.8rem,5vw,4.4rem)', letterSpacing: '-0.04em', color: C.text, lineHeight: 1.05, marginBottom: 24 }}>
              One platform.<br />Every move.
            </h1>
            <p style={{ fontSize: '1.05rem', color: C.textSoft, lineHeight: 1.8, maxWidth: 480 }}>
              Whether you're commuting daily or moving your things across the city — FeaziMove has a service built for you.
            </p>
          </div>
          {/* Right: image */}
          <div style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4/3' }}>
            <img loading="lazy" decoding="async"
              src={onePlatformImg}
              alt="FeaziMove platform"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* Service tab switcher */}
      <section className="py-20" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-10">
            <div className="pill mb-4 mx-auto">Our Products</div>
            <h2 className="section-title">Pick your <span className="text-lime">service</span></h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-14">
            {services.map(({ id, name, icon: Icon }) => (
              <button key={id} onClick={() => setActive(id)}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-200"
                style={active === id
                  ? { background: '#ccff00', color: '#0f0f0f', transform: 'scale(1.05)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Icon size={16} />{name}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 'clamp(32px,5vw,56px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '48px', alignItems: 'center' }}>
            <div>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: service.colorDim, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <service.icon size={26} style={{ color: '#0f0f0f' }} />
              </div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: C.textSoft, marginBottom: 6 }}>{service.tagline}</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.2rem,5vw,3.2rem)', letterSpacing: '-0.04em', color: C.text, lineHeight: 1.05, marginBottom: 20 }}>{service.name}</h2>
              <p style={{ fontSize: '1rem', color: C.textSoft, lineHeight: 1.8, marginBottom: 28 }}>{service.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {service.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(204,255,0,0.35)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} strokeWidth={3} color="#0f0f0f" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginBottom: 4 }}>Starting at</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--text)' }}>{service.price}</div>
                </div>
                <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f0f0f', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', padding: '14px 28px', borderRadius: 50, textDecoration: 'none' }}>Get started <ArrowRight size={16} /></Link>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 340 }}>{service.illustration}</div>
          </div>
        </div>
      </section>

      {/* Alternating feature sections */}
      {features.map(({ id, tag, icon, title, desc, cta, img, flip, bg }) => (
        <section key={id} style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,60px)', background: flip ? 'var(--bg-subtle)' : 'var(--bg)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '60px', alignItems: 'center' }}>
            <div style={{ order: flip ? 2 : 1 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(204,255,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 24 }}>
                {icon}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1.15, marginBottom: 16 }}>
                {title}
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: 28 }}>{desc}</p>
              <Link to="/signup" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, borderBottom: '2px solid #ccff00', paddingBottom: 2 }}>
                {cta} <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ order: flip ? 1 : 2, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-raised)', borderRadius: 24, padding: 40, minHeight: 420 }}>
              <img loading="lazy" decoding="async" src={img} alt={title} style={{ width: '100%', maxWidth: 520, display: 'block' }} />
            </div>
          </div>
        </section>
      ))}

      {/* What Sets Us Apart carousel */}
      <section style={{ padding: 'clamp(60px,8vw,100px) clamp(20px,5vw,60px)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 56 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', letterSpacing: '-0.03em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
              What Sets Us Apart
            </h2>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'clamp(32px,5vw,60px)', alignItems: 'center' }}>
            <div style={{ position: 'relative', paddingBottom: 32, paddingRight: 0 }}>
              {/* Lime blob behind image — bottom left */}
              <div style={{ position: 'absolute', bottom: 0, left: -20, width: 120, height: 120, borderRadius: '50%', background: '#ccff00', opacity: 0.35, zIndex: 0 }} />
              <div style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: '3/3.5', boxShadow: '0 20px 60px rgba(0,0,0,0.10)', position: 'relative', zIndex: 1 }}>
                <img loading="lazy" decoding="async" src={current.img} alt={current.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.4s ease' }} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: 20 }}>
                {current.num} / 0{apartSlides.length}
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.4rem,2.5vw,2rem)', letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 16, lineHeight: 1.25 }}>
                {current.title}
              </h3>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: 36 }}>{current.body}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={prevSlide} style={{ width: 52, height: 52, borderRadius: 14, border: '1.5px solid #e0e0e0', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} aria-label="Previous">
                  <ChevronLeft size={20} style={{ color: '#0f0f0f' }} />
                </button>
                <button onClick={nextSlide} style={{ width: 52, height: 52, borderRadius: 14, background: '#ccff00', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} aria-label="Next">
                  <ChevronRight size={20} color="#0f0f0f" />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {apartSlides.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 28 : 10, height: 10, borderRadius: 5, background: i === slide ? '#ccff00' : 'var(--border-mid)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} aria-label={"Slide " + (i + 1)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* CTA */}
      <section style={{ padding: '100px 20px', textAlign: 'center', background: '#fdf6e3', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(204,255,0,0.18)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(204,255,0,0.12)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 620, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="pill mb-6 mx-auto" style={{ color: '#555', borderColor: 'rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.06)' }}>Get Started Today</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3.2rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.1, marginBottom: 20 }}>
            Ready to move the <span style={{ color: '#15803d' }}>Feazi Way?</span>
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#555', lineHeight: 1.75, marginBottom: 40 }}>
            Join thousands of commuters across African cities saving time and money every day. Download the app or sign up online.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn-lime">Start riding free <ArrowRight size={16} /></Link>
            <Link to="/how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 50, border: '1.5px solid rgba(0,0,0,0.2)', color: '#0f0f0f', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', transition: 'all 0.2s' }}>
              How it works
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
