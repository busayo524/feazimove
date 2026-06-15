import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import pressingPhone  from '../../assets/pressingphone.jpg'
import driveSchedule  from '../../assets/driveschedule.jpg'
import driveJpg      from '../../assets/Drive.jpg'
import accessAccount  from '../../assets/access-account.svg'
import orderRide      from '../../assets/order-ride.svg'
import busStop        from '../../assets/bus-stop-pana.svg'
import testimonials   from '../../assets/testimonials.svg'

const steps = [
  { num: '01', icon: 'down',  title: 'Download & Sign Up', desc: 'Get the app from App Store or Google Play. Create your account in under 2 minutes — just your name and phone number.', detail: 'No documents needed to start. Verification is quick and secure.', img: accessAccount, imgAlt: 'Download and sign up' },
  { num: '02', icon: 'pin',   title: 'Set your route',     desc: "Enter where you're going. FeaziMove instantly finds matched rides and deliveries heading the same way — across all major city routes.", detail: 'Our matching engine works across all major routes in your city.', img: orderRide, imgAlt: 'Set your route' },
  { num: '03', icon: 'group', title: 'Pool & Ride',        desc: 'Get matched with a verified driver and fellow commuters heading your way. Share the ride, split the cost — simple.', detail: 'All co-riders are verified. Ratings keep the community accountable.', img: busStop, imgAlt: 'Pool and ride together' },
  { num: '04', icon: 'star',  title: 'Arrive & Rate',      desc: 'Reach your destination. Rate your driver and co-riders to keep the community trusted and growing.', detail: 'Your wallet is automatically charged — no cash needed.', img: testimonials, imgAlt: 'Arrive and rate your trip' },
]

const iconMap = { down: String.fromCodePoint(0x2B07), pin: String.fromCodePoint(0x1F4CD), group: String.fromCodePoint(0x1F465), star: String.fromCodePoint(0x2B50) }

export default function HowItWorksPage() {
  return (
    <LandingLayout>

      {/* HERO */}
      <section style={{ background: '#ffffff', padding: '120px 20px 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 32 }}>Simple Process</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.4rem,6vw,4rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.1, margin: '0 0 20px' }}>
            Four steps to your first ride
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2vw,1.15rem)', color: '#555', lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>
            From download to destination — FeaziMove is designed to be the simplest way to move in your city. No complexity, no stress. Just the Feazi Way.
          </p>
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', borderRadius: 20, overflow: 'hidden', height: 420 }}>
          <img src={pressingPhone} alt="FeaziMove app in use" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />
        </div>
      </section>

      {/* STEPS */}
      <section style={{ background: '#ffffff', padding: '80px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {steps.map(({ num, icon, title, desc, detail, img, imgAlt }, i) => {
            const flip = i % 2 !== 0
            return (
              <div key={num} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '80px', alignItems: 'center', padding: '80px 0', borderBottom: i < steps.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div style={{ order: flip ? 2 : 1, background: '#f8f8f8', borderRadius: 24, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
                  <img src={img} alt={imgAlt} style={{ width: '100%', maxWidth: 520, display: 'block' }} />
                </div>
                <div style={{ order: flip ? 1 : 2 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(90px,12vw,140px)', lineHeight: 0.9, letterSpacing: '-0.04em', color: '#e8e8e8', marginBottom: 24 }}>{num}</div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(204,255,0,0.22)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 20 }}>{iconMap[icon]}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,3.5vw,3rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.1, marginBottom: 16, display: 'block' }}>{title}</h3>
                  <p style={{ fontSize: '1rem', color: '#666666', lineHeight: 1.8, marginBottom: 12 }}>{desc}</p>
                  <p style={{ fontSize: '0.875rem', color: '#999', fontWeight: 400 }}>{detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FOR DRIVERS — white margins on sides */}
      <div style={{ background: '#ffffff', padding: '0 clamp(16px,4vw,60px) 80px' }}>
        <section style={{ background: '#f2f2ef', borderRadius: 24, padding: '80px clamp(24px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -80, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(204,255,0,0.35)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666', marginBottom: 16 }}>For Drivers</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.2rem,4vw,3.4rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.0, margin: '0 0 24px' }}>
                Drive on your<br />own schedule
              </h2>
              <p style={{ fontSize: '1rem', color: '#555', lineHeight: 1.8, marginBottom: 28 }}>
                Go online when you want. Accept requests on your route. Earn more by carrying multiple passengers per trip — the Feazi pooling advantage.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {['Flexible hours — drive when you want', 'Earn more per trip with pooling', 'Real-time earnings dashboard', 'Fast weekly payouts to your bank'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.95rem', color: '#333' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(204,255,0,0.35)', color: '#0f0f0f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register?role=driver" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0f0f0f', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', padding: '14px 28px', borderRadius: 50, textDecoration: 'none' }}>
                Become a driver <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', minHeight: 360 }}>
              <img src={driveSchedule} alt="Driver on the road" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          </div>
        </section>
      </div>

      {/* FOR RIDERS — white margins on sides */}
      <div style={{ background: '#ffffff', padding: '0 clamp(16px,4vw,60px) 80px' }}>
        <section style={{ background: '#f2f2ef', borderRadius: 24, padding: '80px clamp(24px,5vw,80px)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(204,255,0,0.35)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', minHeight: 360 }}>
              <img src={driveJpg} alt="Rider in the city" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666', marginBottom: 16 }}>For Riders</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.2rem,4vw,3.4rem)', letterSpacing: '-0.04em', color: '#0f0f0f', lineHeight: 1.0, margin: '0 0 24px' }}>
                Ride smarter,<br />pay less daily
              </h2>
              <p style={{ fontSize: '1rem', color: '#555', lineHeight: 1.8, marginBottom: 28 }}>
                Match with commuters on your route and split the cost. Save up to 60% on every trip — no haggling, no cash, no stress. Just the Feazi Way.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {['Save up to 60% on daily commutes', 'Matched rides on your exact route', 'Verified drivers and co-riders', 'Cashless — wallet auto-deduction'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.95rem', color: '#333' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(204,255,0,0.35)', color: '#0f0f0f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register?role=rider" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0f0f0f', color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', padding: '14px 28px', borderRadius: 50, textDecoration: 'none' }}>
                Become a rider <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#ffffff', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', letterSpacing: '-0.04em', color: '#0f0f0f', marginBottom: 16 }}>
            Ready to move smarter?
          </h2>
          <p style={{ fontSize: '1rem', color: '#666', lineHeight: 1.75, marginBottom: 32 }}>
            Join thousands of commuters saving time and money every day.
          </p>
          <Link to="/register" className="btn-lime">Get Started Free <ArrowRight size={16} /></Link>
        </div>
      </section>

    </LandingLayout>
  )
}