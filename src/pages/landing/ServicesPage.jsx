import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Package, Briefcase, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { CarWithPeople, DeliveryPerson, CommuterGroup } from '../../components/illustrations/PeopleIllustration'
import africanMob from '../../assets/AfricanMobimage.jpg'
import walletRafiki  from '../../assets/wallet-rafiki.svg'
import cityDriver    from '../../assets/city-driver.svg'
import takeaway      from '../../assets/takeaway.svg'
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
    id: 'track',
    tag: 'Live Tracking',
    icon: '📍',
    title: 'Live tracking, always',
    desc: 'Know exactly where your ride is in real time. Share your journey with family so they ride with you too.',
    cta: 'Learn more',
    img: cityDriver,
    flip: true,
  },
  {
    id: 'send',
    tag: 'Delivery',
    icon: '⚡',
    title: 'Send, deliver, done',
    desc: 'Ship packages with drivers already heading your way. Affordable, same-day, trackable end-to-end.',
    cta: 'Learn more',
    img: takeaway,
    flip: false,
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
    img: apart2,
    num: '02',
    title: 'Real-Time Tracking',
    body: 'Track your ride from pickup to drop-off. Share your live journey with loved ones and arrive with total peace of mind — always.',
  },
  {
    img: apart3,
    num: '03',
    title: 'Safe & Verified Community',
    body: 'Every driver and rider is verified. Ratings and reviews keep the community accountable. Your safety is our non-negotiable.',
  },
  {
    img: apart4,
    num: '04',
    title: 'Feazi Package Delivery',
    body: 'Send parcels with drivers already on route. Fast, affordable, same-day delivery across the city — no extra vehicle needed.',
  },
]

const services = [
  {
    id: 'pool',
    icon: Users,
    name: 'FeaziPool',
    tagline: 'Ride Together, Save Together',
    desc: 'Match with commuters heading the same way. Share the journey, split the cost, and reduce traffic — all in one seamless experience.',
    price: 'From ₦350',
    color: 'var(--lime)',
    colorDim: 'var(--lime-dim)',
    features: ['Up to 60% cheaper than solo rides', 'Door-to-door service', 'AC vehicles', 'Verified co-riders', 'Real-time tracking', 'Auto wallet deduction'],
    illustration: React.createElement(CarWithPeople, { className: 'w-full max-w-sm animate-float' }),
  },
  {
    id: 'send',
    icon: Package,
    name: 'FeaziSend',
    tagline: 'Same-Route Delivery',
    desc: 'Send packages with drivers already heading in that direction. Affordable, fast, and trackable end-to-end. Same-day delivery across the city.',
    price: 'From ₦600',
    color: '#FFB800',
    colorDim: 'rgba(255,184,0,0.12)',
    features: ['Real-time package tracking', 'Proof of delivery', 'Small to large parcels', 'Recipient SMS alerts', 'Same-day delivery', 'Insured shipments'],
    illustration: React.createElement(DeliveryPerson, { className: 'w-48 mx-auto animate-float-slow', color: '#FFB800' }),
  },
  {
    id: 'biz',
    icon: Briefcase,
    name: 'FeaziBiz',
    tagline: 'Mobility for Teams',
    desc: 'Manage employee commutes and business deliveries from one dashboard. Reduce fleet costs, get invoices, and track every trip.',
    price: 'Custom pricing',
    color: '#60A5FA',
    colorDim: 'rgba(96,165,250,0.12)',
    features: ['Bulk ride booking', 'Team management dashboard', 'Monthly invoicing', 'Analytics & reports', 'Priority driver assignment', 'Dedicated account manager'],
    illustration: React.createElement(CommuterGroup, { className: 'w-full max-w-xs mx-auto animate-float' }),
  },
]

const tableRows = [
  { label: 'Cost per trip',        feazi: 'Up to 60% less',    regular: 'Full price',    highlight: true  },
  { label: 'Route matching',       feazi: 'Smart AI matching', regular: 'Fixed routes',  highlight: false },
  { label: 'Live tracking',        feazi: 'Real-time GPS',     regular: 'Limited',       highlight: true  },
  { label: 'Delivery included',    feazi: 'Yes — FeaziSend',    regular: 'No',            highlight: false },
  { label: 'Business dashboard',   feazi: 'Yes — FeaziBiz',     regular: 'No',            highlight: true  },
  { label: 'Verified community',   feazi: 'All riders & drivers', regular: 'Varies',      highlight: false },
  { label: 'Cashless payments',    feazi: 'Wallet & card',     regular: 'Cash only',     highlight: true  },
]

export default function ServicesPage() {
  const [active, setActive] = useState('pool')
  const [slide, setSlide] = useState(0)
  const service = services.find(s => s.id === active)

  const prevSlide = () => setSlide(s => (s - 1 + apartSlides.length) % apartSlides.length)
  const nextSlide = () => setSlide(s => (s + 1) % apartSlides.length)
  const current = apartSlides[slide]

  return (
    <LandingLayout>
      {/* Hero */}
      <section style={{ position: 'relative', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img
          src={africanMob}
          alt="FeaziMove services"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px', maxWidth: 680, margin: '0 auto' }}>
          <div className="pill mb-6 mx-auto" style={{ color: '#ccff00', borderColor: 'rgba(204,255,0,0.35)', background: 'rgba(204,255,0,0.12)' }}>Our Services</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.4rem,6vw,4rem)', letterSpacing: '-0.04em', color: '#ffffff', lineHeight: 1.1, marginBottom: 20 }}>
            One platform,<br /><span style={{ color: '#ccff00' }}>every move</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.15rem)', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, marginBottom: 32 }}>
            Whether you're commuting daily, sending a package, or managing a team — FeaziMove has a service built for you.
          </p>
          <Link to="/register" className="btn-lime">Get Started <ArrowRight size={16} /></Link>
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
                  ? { background: service.color, color: '#0F0F0F', transform: 'scale(1.05)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                <Icon size={16} />{name}
              </button>
            ))}
          </div>
          <div className="card p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: service.colorDim }}>
                <service.icon size={28} style={{ color: service.color }} />
              </div>
              <h2 className="font-display font-black text-4xl mb-2" style={{ color: 'var(--text)' }}>{service.name}</h2>
              <p className="font-semibold mb-6" style={{ color: service.color }}>{service.tagline}</p>
              <p className="section-sub mb-8">{service.desc}</p>
              <ul className="space-y-3 mb-8">
                {service.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: service.colorDim, color: service.color }}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Starting at</div>
                  <div className="font-display font-black text-2xl" style={{ color: service.color }}>{service.price}</div>
                </div>
                <Link to="/register" className="btn-lime" style={{ background: service.color }}>Get Started <ArrowRight size={16} /></Link>
              </div>
            </div>
            <div className="flex items-center justify-center min-h-48">{service.illustration}</div>
          </div>
        </div>
      </section>

      {/* Alternating feature sections */}
      {features.map(({ id, tag, icon, title, desc, cta, img, flip }) => (
        <section key={id} style={{ padding: '100px 20px', background: flip ? '#f5f5f5' : '#ffffff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '60px', alignItems: 'center' }}>
            <div style={{ order: flip ? 2 : 1 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(204,255,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 24 }}>
                {icon}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.15, marginBottom: 16 }}>
                {title}
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#555', lineHeight: 1.75, marginBottom: 28 }}>{desc}</p>
              <Link to="/register" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f0f0f', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, borderBottom: '2px solid #ccff00', paddingBottom: 2 }}>
                {cta} <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ order: flip ? 1 : 2, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0', borderRadius: 24, padding: 32, minHeight: 320 }}>
              <img src={img} alt={title} style={{ width: '100%', maxWidth: 380, display: 'block' }} />
            </div>
          </div>
        </section>
      ))}

      {/* What Sets Us Apart carousel */}
      <section style={{ padding: '100px 20px', background: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', letterSpacing: '-0.03em', color: '#0f0f0f', marginBottom: 48 }}>
            What Sets Us Apart
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: '4/3', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
                <img src={current.img} alt={current.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.3s ease' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -16, right: -16, width: 64, height: 64, borderRadius: '50%', background: '#ccff00', opacity: 0.6 }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#aaa', marginBottom: 20 }}>
                {current.num} / 0{apartSlides.length}
              </p>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.4rem,2.5vw,2rem)', letterSpacing: '-0.03em', color: '#0f0f0f', marginBottom: 16, lineHeight: 1.25 }}>
                {current.title}
              </h3>
              <p style={{ fontSize: '1rem', color: '#666', lineHeight: 1.75, marginBottom: 36 }}>{current.body}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={prevSlide} style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #e0e0e0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} aria-label="Previous">
                  <ChevronLeft size={18} color="#0f0f0f" />
                </button>
                <button onClick={nextSlide} style={{ width: 44, height: 44, borderRadius: '50%', background: '#ccff00', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} aria-label="Next">
                  <ChevronRight size={18} color="#0f0f0f" />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {apartSlides.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 28 : 10, height: 10, borderRadius: 5, background: i === slide ? '#ccff00' : '#d0d0d0', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} aria-label={"Slide " + (i + 1)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-24" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display font-black section-title mb-4">
              Why choose <span className="text-lime">FeaziMove?</span>
            </h2>
            <p className="section-sub mx-auto" style={{ maxWidth: 520 }}>
              See how FeaziMove compares to traditional transport options across the metrics that matter.
            </p>
          </div>
          <div className="card overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f0f0f' }}>
                  <th style={{ padding: '18px 24px', textAlign: 'left', color: '#aaa', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Feature</th>
                  <th style={{ padding: '18px 24px', textAlign: 'center', color: '#ccff00', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>FeaziMove</th>
                  <th style={{ padding: '18px 24px', textAlign: 'center', color: '#aaa', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>Regular Transport</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ label, feazi, regular, highlight }, i) => (
                  <tr key={label} style={{ background: highlight ? 'var(--bg-subtle)' : 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px', fontSize: '0.95rem', color: 'var(--text)', fontWeight: 500 }}>{label}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f0f0f', background: '#ccff00', borderRadius: 20, padding: '4px 14px', display: 'inline-block' }}>{feazi}</span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{regular}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 20px', textAlign: 'center', background: '#0f0f0f', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(204,255,0,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(204,255,0,0.06)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 620, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="pill mb-6 mx-auto" style={{ color: '#ccff00', borderColor: 'rgba(204,255,0,0.35)', background: 'rgba(204,255,0,0.12)' }}>Get Started Today</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,5vw,3.2rem)', letterSpacing: '-0.04em', color: '#ffffff', lineHeight: 1.1, marginBottom: 20 }}>
            Ready to move the <span style={{ color: '#ccff00' }}>Feazi Way?</span>
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: 40 }}>
            Join thousands of commuters across African cities saving time and money every day. Download the app or sign up online.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-lime">Start riding free <ArrowRight size={16} /></Link>
            <Link to="/how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 50, border: '1.5px solid rgba(255,255,255,0.2)', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', transition: 'all 0.2s' }}>
              How it works
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
