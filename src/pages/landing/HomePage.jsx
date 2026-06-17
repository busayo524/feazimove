import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import heroBg from '../../assets/car picture group.jpg'
import { UrbanBoardingScene } from '../../components/illustrations/PeopleIllustration'
import accessAccountSvg from '../../assets/access-account.svg'
import messengerPana from '../../assets/messenger-pana.svg'
import walletRafiki from '../../assets/wallet-rafiki.svg'
import cityDriverCuate from '../../assets/city-driver-cuate.svg'
import wpImg  from '../../assets/Corporate commuters.jpg'
import drvImg from '../../assets/Female Driver solo.jpg'
import urbImg from '../../assets/urban residents.jpg'

function HeroScene({ className = '' }) {
  return <img src={accessAccountSvg} alt="Access account illustration" className={className} style={{ width:'100%', display:'block' }} />
}

function DeliveryScene({ className = '' }) {
  return <img src={messengerPana} alt="Delivery illustration" className={className} style={{ width:'100%', display:'block' }} />
}

function RideSharingScene({ className = '' }) {
  return <img src={cityDriverCuate} alt="Ride sharing illustration" className={className} style={{ width:'100%', display:'block' }} />
}

function WalletScene({ className = '' }) {
  return <img src={walletRafiki} alt="Wallet illustration" className={className} style={{ width:'100%', display:'block' }} />
}

/* ─── Who It's For ─────────────────────────────────────────────────────── */
const audience = [
  {
    img: wpImg,
    imgPos: 'top center',
    tag: 'Commuters',
    title: 'Working professionals & daily commuters',
    body: 'Reliable, structured transport that fits your schedule — no waiting, no surge pricing, no stress.',
  },
  {
    img: drvImg,
    imgPos: 'center center',
    tag: 'Drivers',
    title: 'Independent drivers',
    body: 'Earn consistently by picking up verified passengers already heading your way. More trips, less dead miles.',
  },
  {
    img: urbImg,
    imgPos: 'center center',
    tag: 'City residents',
    title: 'Urban residents',
    body: 'Lower-cost, safer, and more predictable mobility options designed for the realities of African cities.',
  },
]

function WhoItsFor() {
  return (
    <section className="section" style={{ background: 'var(--bg-subtle)' }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
        <div className="text-center mb-14">
          <p className="label mb-3">Built for everyone</p>
          <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', letterSpacing: '-0.03em', color: 'var(--text)' }}>
            Who FeaziMove is for
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {audience.map(({ img, imgPos, tag, title, body }) => (
            <div key={tag} className="card overflow-hidden flex flex-col" style={{ padding: 0 }}>
              {/* Image */}
              <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
                <img
                  src={img}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: imgPos || 'center center', display: 'block' }}
                />
                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)',
                }} />
                {/* Tag chip */}
                <span style={{
                  position: 'absolute', top: 16, left: 16,
                  background: '#ccff00', color: '#0a0a0a',
                  fontSize: 12, fontWeight: 800,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '5px 14px', borderRadius: 50,
                }}>
                  {tag}
                </span>
              </div>

              {/* Text */}
              <div style={{ padding: '28px 32px 36px', flex: 1 }}>
                <h3 className="font-bold mb-4" style={{ fontSize: '1.2rem', letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.35 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--text-muted)' }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── data ─────────────────────────────────────────────────────────────── */
const stats = [
  { value: 'Soon',  label: 'Launching in Lagos' },
  { value: '30%',   label: 'Projected savings' },
  { value: '3+',    label: 'Routes at launch' },
  { value: 'Free',  label: 'To register' },
]

const logos = ['FeaziPool', 'FeaziSend', 'FeaziBiz', 'FeaziMove', 'FeaziPool', 'FeaziSend', 'FeaziBiz', 'FeaziMove']

/* ── Hero animated illustration panel ──────────────────────────────────── */
function HeroAnimationPanel() {
  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden flex-1"
      style={{
        height: '100%',
        minHeight: 560,
        background: 'linear-gradient(160deg,rgba(204,255,0,0.08) 0%,var(--bg-card) 55%,rgba(204,255,0,0.06) 100%)',
      }}
    >

      {/* Route SVG — road path + pins */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}
        viewBox="0 0 540 520" preserveAspectRatio="xMidYMid meet">
        {/* Dashed route line */}
        <path
          d="M85,400 Q165,320 265,270 Q365,220 455,162"
          stroke="#ccff00" strokeWidth="2.5" strokeDasharray="10 7"
          fill="none" strokeLinecap="round"
          className="animate-route-draw"
          opacity="0.65"
        />
        {/* Pickup pin pulse */}
        <circle cx="85" cy="400" r="22" fill="#ccff00" opacity="0.12" className="animate-pulse-ring"/>
        <circle cx="85" cy="400" r="10" fill="#ccff00"/>
        <circle cx="85" cy="400" r="4"  fill="#ffffff"/>
        {/* Dropoff pin pulse */}
        <circle cx="455" cy="162" r="18" fill="#1a1a1a" opacity="0.1" className="animate-pulse-ring" style={{animationDelay:'1.1s'}}/>
        <circle cx="455" cy="162" r="9"  fill="#1a1a1a"/>
        <circle cx="455" cy="162" r="3.5" fill="#ffffff"/>
      </svg>

      {/* Animated car */}
      <div
        className="animate-car-drive"
        style={{ position:'absolute', top:230, left:0, willChange:'transform' }}
      >
        <svg width="72" height="36" viewBox="0 0 72 36" fill="none">
          <rect x="3" y="12" width="66" height="18" rx="6" fill="#1a1a1a"/>
          <rect x="14" y="4"  width="40" height="14" rx="5" fill="#1a1a1a"/>
          <rect x="16" y="6" width="15" height="10" rx="3" fill="#d4ff1a" opacity="0.8"/>
          <rect x="35" y="6" width="15" height="10" rx="3" fill="#d4ff1a" opacity="0.8"/>
          <circle cx="16" cy="30" r="5.5" fill="#333"/>
          <circle cx="16" cy="30" r="2.5" fill="#666"/>
          <circle cx="56" cy="30" r="5.5" fill="#333"/>
          <circle cx="56" cy="30" r="2.5" fill="#666"/>
          <rect x="63" y="18" width="6" height="4" rx="2" fill="#FBBF24" opacity="0.9"/>
        </svg>
      </div>

      {/* Floating phone mockup */}
      <div
        className="animate-float-slow"
        style={{
          position:'absolute', top:28, right:22,
          width:148, height:268, borderRadius:22,
          background:'#1a1a1a', boxShadow:'0 20px 50px rgba(0,0,0,0.15)',
          padding:10, overflow:'hidden',
        }}
      >
        <div style={{ width:50, height:4, background:'#333', borderRadius:4, margin:'0 auto 8px'}}/>
        <div style={{
          background:'#f5f5f0', borderRadius:14,
          height:'calc(100% - 14px)', padding:10, overflow:'hidden',
        }}>
          <div style={{
            background:'#ccff00', borderRadius:10,
            padding:'8px 10px', marginBottom:8,
          }}>
            <div style={{ color:'#0a0a0a', fontSize:9, fontWeight:800, letterSpacing:'0.06em' }}>FEAZIMOVE</div>
            <div style={{ color:'rgba(0,0,0,0.5)', fontSize:7.5, marginTop:1 }}>Where are you going?</div>
          </div>
          {['Home → Lekki', 'Office → Marina', 'Airport → VI'].map((r, i) => (
            <div key={i} style={{
              background:'white', borderRadius:8, padding:'6px 8px', marginBottom:5,
              display:'flex', alignItems:'center', gap:6,
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
            }}>
              <div style={{
                width:7, height:7, borderRadius:'50%', flexShrink:0,
                background: i === 0 ? '#ccff00' : '#d1d5db',
              }}/>
              <span style={{ fontSize:8.5, color:'#1a1a1a', fontWeight:500 }}>{r}</span>
            </div>
          ))}
          <div style={{ background:'#000', borderRadius:10, padding:'8px 10px', marginTop:6 }}>
            <span style={{ color:'white', fontSize:8, fontWeight:700 }}>Book FeaziPool →</span>
          </div>
        </div>
      </div>

      {/* Badge 1: Rating */}
      <div
        className="animate-badge-1"
        style={{
          position:'absolute', top:52, left:24,
          background:'white', borderRadius:14, padding:'10px 16px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.10)',
          fontSize:13, fontWeight:700, color:'#1a1a1a',
          whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6,
        }}
      >
        <span style={{ color:'#FBBF24' }}>★</span> 4.9 rating
      </div>

      {/* Badge 2: ETA */}
      <div
        className="animate-badge-2"
        style={{
          position:'absolute', top:130, left:18,
          background:'white', borderRadius:14, padding:'10px 16px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.10)',
          fontSize:13, fontWeight:700, color:'#1a1a1a',
          whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:7,
        }}
      >
        <span style={{
          width:8, height:8, borderRadius:'50%', background:'#ccff00', display:'inline-block',
        }}/>
        2 min away
      </div>

      {/* Badge 3: Matched */}
      <div
        className="animate-badge-3"
        style={{
          position:'absolute', bottom:90, left:48,
          background:'#ccff00', borderRadius:14, padding:'10px 18px',
          boxShadow:'0 4px 24px rgba(204,255,0,0.35)',
          fontSize:13, fontWeight:700, color:'#0a0a0a', whiteSpace:'nowrap',
        }}
      >
        ✓ Ride matched!
      </div>
    </div>
  )
}

// Cycling word animation
const CYCLING_WORDS = ['Everyday use.', 'Every commute.', 'Every journey.', 'Every city.', 'Every African.']

function CyclingWord() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % CYCLING_WORDS.length)
        setVisible(true)
      }, 350)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <span style={{
      color: '#ccff00',
      textShadow: '0 0 60px rgba(204,255,0,0.35)',
      display: 'inline-block',
      transition: 'opacity 0.35s ease, transform 0.35s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
    }}>
      {CYCLING_WORDS[index]}
    </span>
  )
}

export default function HomePage() {
  return (
    <LandingLayout>

      {/* ══════════════════════════════════════════════════════════════════
          HERO — full-screen photo background
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Multi-layer overlay: dark on left for text legibility, opens up on right */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(105deg, rgba(0,0,0,0.62) 0%, rgba(5,12,2,0.52) 35%, rgba(0,0,0,0.32) 60%, rgba(0,0,0,0.15) 100%)',
        }}/>

        {/* Dot grid — top right */}
        <div style={{
          position:'absolute', top:110, right:'4%',
          display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:9,
          opacity:0.18, pointerEvents:'none',
        }}>
          {Array.from({length:40}).map((_,i)=>(
            <div key={i} style={{width:4,height:4,borderRadius:'50%',background:'#ccff00'}}/>
          ))}
        </div>
        {/* Dot grid — bottom left */}
        <div style={{
          position:'absolute', bottom:90, left:'4%',
          display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:9,
          opacity:0.14, pointerEvents:'none',
        }}>
          {Array.from({length:30}).map((_,i)=>(
            <div key={i} style={{width:4,height:4,borderRadius:'50%',background:'#ccff00'}}/>
          ))}
        </div>

        {/* Vertical lime line accent */}
        <div style={{
          position:'absolute', top:'15%', left:'calc(50% - 1px)',
          width:1, height:'30%',
          background:'linear-gradient(to bottom, transparent, rgba(204,255,0,0.4), transparent)',
          pointerEvents:'none',
        }}/>

        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 w-full pt-36 pb-24 relative" style={{ zIndex:1 }}>
          <div className="max-w-4xl">

            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#ccff00' }} />
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: '#0a0a0a',
                background: '#ccff00', borderRadius: 6, padding: '4px 12px',
              }}>BETA — Lagos</span>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 6, padding: '4px 12px',
              }}>Coming Soon</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6" style={{
              fontFamily: "'Barlow', 'Inter', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(2.6rem, 5.5vw, 5.5rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.0,
              color: '#ffffff',
            }}>
              Mobility for<br />
              <CyclingWord />
            </h1>

            {/* Tagline */}
            <p style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 500,
              lineHeight: 1.65,
              maxWidth: 480,
              marginBottom: 16,
            }}>
              FeaziMove is a scheduled ride-sharing platform that matches commuters with independent car owners/drivers along shared routes, making movement feasible, affordable & easy.{' '}
              <span style={{ whiteSpace: 'nowrap' }}>The Feazi Way.</span>
            </p>

            {/* Divider line */}
            <div style={{ width: 56, height: 2, background: '#ccff00', borderRadius: 2, marginBottom: 32, opacity: 0.8 }}/>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <Link to="/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#ccff00', color: '#0a0a0a',
                padding: '15px 32px', borderRadius: 50,
                fontWeight: 800, fontSize: 15, textDecoration: 'none',
                letterSpacing: '-0.01em',
                boxShadow: '0 0 32px rgba(204,255,0,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 48px rgba(204,255,0,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 0 32px rgba(204,255,0,0.3)' }}
              >
                Start for free <ArrowRight size={16} />
              </Link>
              <Link to="/how-it-works" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'rgba(255,255,255,0.85)',
                padding: '15px 24px', borderRadius: 50,
                fontWeight: 700, fontSize: 15, textDecoration: 'none',
                border: '1.5px solid rgba(255,255,255,0.25)',
                transition: 'border-color 0.2s, color 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(204,255,0,0.6)'; e.currentTarget.style.color='#ccff00' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.25)'; e.currentTarget.style.color='rgba(255,255,255,0.85)' }}
              >
                How it works <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-6">
              {['No surge pricing', 'Verified drivers', 'Instant matching'].map(t => (
                <span key={t} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  <span style={{ color: '#ccff00', fontWeight: 900 }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade — to black so stats bar connects cleanly */}
        <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #1e2a1e 0%, transparent 100%)' }} />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'rgba(15,30,15,0.72)', backdropFilter: 'blur(8px)', position:'relative', overflow:'hidden' }}>
        {/* Dot grid — right */}
        <div style={{
          position:'absolute', top:'50%', right:'2%', transform:'translateY(-50%)',
          display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8,
          opacity:0.12, pointerEvents:'none',
        }}>
          {Array.from({length:25}).map((_,i)=>(
            <div key={i} style={{width:4,height:4,borderRadius:'50%',background:'#ccff00'}}/>
          ))}
        </div>
        {/* Dot grid — left */}
        <div style={{
          position:'absolute', top:'50%', left:'2%', transform:'translateY(-50%)',
          display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8,
          opacity:0.12, pointerEvents:'none',
        }}>
          {Array.from({length:25}).map((_,i)=>(
            <div key={i} style={{width:4,height:4,borderRadius:'50%',background:'#ccff00'}}/>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center" style={{ paddingTop: 48, paddingBottom: 56 }}>
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="font-black text-4xl md:text-5xl mb-1"
                style={{ color: '#ccff00', letterSpacing: '-0.04em' }}>
                {value}
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHO IT'S FOR
      ═══════════════════════════════════════════════════════════════════ */}
      <WhoItsFor />


      {/* ══════════════════════════════════════════════════════════════════
          SPLIT PANEL — FeaziPool / FeaziSend (Rank Reserve/Flex style)
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="mb-12">
            <p className="label mb-2">Our services</p>
            <h2 className="font-black" style={{ fontSize:'clamp(2.2rem,4vw,3.4rem)', letterSpacing:'-0.04em', color:'var(--text)' }}>Pick your move.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">

            {/* FeaziPool */}
            <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background:'var(--bg)', border:'1px solid var(--border)', minHeight:380 }}>
              <div className="flex flex-col justify-between p-8 flex-1">
                <div>
                  <p className="label mb-3" style={{ color:'var(--lime-text)', letterSpacing:'0.16em' }}>POOL</p>
                  <h3 className="font-black mb-2" style={{ fontSize:'clamp(1.8rem,2.5vw,2.4rem)', letterSpacing:'-0.04em', color:'var(--lime-text)', lineHeight:1 }}>FeaziPool</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color:'var(--text-muted)' }}>
                    Share your route with commuters heading your way. Same trip, up to 20% cheaper — no surge, ever.
                  </p>
                </div>
                <Link to="/services#feazipool" className="inline-flex items-center gap-2 font-bold text-sm" style={{ color:'var(--lime-text)' }}
                  onMouseEnter={e => e.currentTarget.style.gap='10px'} onMouseLeave={e => e.currentTarget.style.gap='8px'}>
                  Explore FeaziPool <ArrowRight size={14} />
                </Link>
              </div>
              <div className="overflow-hidden" style={{ height:200, background:'var(--bg-subtle)' }}>
                <RideSharingScene className="w-full h-full" />
              </div>
            </div>

            {/* FeaziSend */}
            <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background:'#e8e8e4', border:'1px solid rgba(0,0,0,0.08)', minHeight:380 }}>
              <div className="flex flex-col justify-between p-8 flex-1">
                <div>
                  <p className="label mb-3" style={{ color:'#555', letterSpacing:'0.16em' }}>SEND</p>
                  <h3 className="font-black mb-2" style={{ fontSize:'clamp(1.8rem,2.5vw,2.4rem)', letterSpacing:'-0.04em', color:'#0f0f0f', lineHeight:1 }}>FeaziSend</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color:'#444' }}>
                    Ship packages with drivers already heading your way. Affordable, same-day, trackable end-to-end.
                  </p>
                </div>
                <Link to="/services#feazisend" className="inline-flex items-center gap-2 font-bold text-sm" style={{ color:'#0f0f0f' }}
                  onMouseEnter={e => e.currentTarget.style.gap='10px'} onMouseLeave={e => e.currentTarget.style.gap='8px'}>
                  Explore FeaziSend <ArrowRight size={14} />
                </Link>
              </div>
              <div className="overflow-hidden" style={{ height:200, background:'rgba(255,255,255,0.04)' }}>
                <DeliveryScene className="w-full h-full" />
              </div>
            </div>

            {/* FeaziBiz */}
            <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background:'var(--bg-subtle)', border:'1px solid var(--border)', minHeight:380 }}>
              <div className="flex flex-col justify-between p-8 flex-1">
                <div>
                  <p className="label mb-3" style={{ color:'var(--lime-text)', letterSpacing:'0.16em' }}>BIZ</p>
                  <h3 className="font-black mb-2" style={{ fontSize:'clamp(1.8rem,2.5vw,2.4rem)', letterSpacing:'-0.04em', color:'var(--text)', lineHeight:1 }}>FeaziBiz</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color:'var(--text-muted)' }}>
                    Corporate transport for teams. Manage commutes, deliveries, and fleet costs from one dashboard.
                  </p>
                </div>
                <Link to="/services#feazibiz" className="inline-flex items-center gap-2 font-bold text-sm" style={{ color:'var(--lime-text)' }}
                  onMouseEnter={e => e.currentTarget.style.gap='10px'} onMouseLeave={e => e.currentTarget.style.gap='8px'}>
                  Explore FeaziBiz <ArrowRight size={14} />
                </Link>
              </div>
              <div className="overflow-hidden" style={{ height:200, background:'var(--bg)' }}>
                <WalletScene className="w-full h-full" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MARQUEE — services ticker
      ═══════════════════════════════════════════════════════════════════ */}
      <section
        className="py-6 overflow-hidden"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex gap-12 animate-marquee whitespace-nowrap">
          {[...logos, ...logos].map((l, i) => (
            <span key={i} className="font-black text-2xl tracking-tight"
              style={{ color: i % 4 === 0 ? 'var(--lime-text)' : 'var(--text-faint)', letterSpacing: '-0.03em' }}>
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          EARLY ACCESS — pre-launch waitlist section
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="section" style={{ background: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              <p className="label mb-4">Early access</p>
              <h2 className="mb-6" style={{
                fontWeight: 900,
                fontSize: 'clamp(2rem, 4.5vw, 4rem)',
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
              }}>
                Be the first<br />to ride Feazi.
              </h2>
              <p className="section-sub mb-8 max-w-md">
                We're launching soon in Lagos. Register now to get early access, priority matching, and exclusive launch pricing — before we go public.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-lime">
                  Join the waitlist <ArrowRight size={16} />
                </Link>
                <Link to="/how-it-works" className="btn-ghost">
                  How it works <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>

            {/* Right: launch perks cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🚀', title: 'Launch pricing', desc: 'Exclusive discounted fares for early riders during our launch period.' },
                { icon: '⚡', title: 'Priority matching', desc: 'Early registrants get faster driver matching at launch.' },
                { icon: '🛡️', title: 'Verified drivers', desc: 'Every driver is screened, verified, and rated before going live.' },
                { icon: '📍', title: 'Lagos first', desc: 'Starting with key Lagos routes. More cities coming soon.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl card" style={{ border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 26 }}>{icon}</span>
                  <p className="font-bold mt-3 mb-1 text-sm" style={{ color: 'var(--text)' }}>{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── App Download CTA ─────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-subtle)', padding: '80px 0', overflow: 'visible' }}>
        <div style={{ width: '100%' }}>
          <div className="grid lg:grid-cols-2 gap-0" style={{ background: '#2c4a2c', minHeight: 360, overflow: 'visible', position: 'relative' }}>

            {/* Left: text + buttons */}
            <div className="app-dl-left" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{
                fontWeight: 900, color: '#ffffff',
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20,
              }}>
                Start Moving the<br />
                <span style={{ color: '#ccff00' }}>Feazi Way.</span>
              </h2>

              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, lineHeight: 1.75, marginBottom: 40, maxWidth: 400 }}>
                Book pooled rides, send packages, and manage your commute — all in one place. Launching soon in Lagos.
              </p>

              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link to="/register" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#ccff00', color: '#0a0a0a',
                  padding: '14px 28px', borderRadius: 50,
                  textDecoration: 'none', fontWeight: 800, fontSize: 15,
                  transition: 'transform 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Get early access <ArrowRight size={16} />
                </Link>
                <Link to="/how-it-works" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: 'rgba(255,255,255,0.7)',
                  padding: '14px 28px', borderRadius: 50,
                  textDecoration: 'none', fontWeight: 600, fontSize: 15,
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.5)'; e.currentTarget.style.color='#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; e.currentTarget.style.color='rgba(255,255,255,0.7)' }}
                >
                  How it works
                </Link>
              </div>
            </div>

            {/* Right: phone mockup — bleeds above & below the card */}
            <div className="hidden lg:flex" style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'visible', paddingBottom: 0 }}>

              {/* Lime glow blob — removed */}
              <div style={{
                position: 'absolute', bottom: -40, right: 20,
                width: 340, height: 340, borderRadius: '50%',
                background: 'transparent',
                pointerEvents: 'none',
              }} />

              {/* Phone outer shell */}
              <div style={{
                width: 260, flexShrink: 0,
                background: '#111111',
                borderRadius: 44,
                border: '8px solid #222222',
                boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 -12px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.07)',
                overflow: 'hidden',
                position: 'relative', zIndex: 10,
                transform: 'rotate(-5deg) translateY(-20px)',
              }}>
                {/* Status bar */}
                <div style={{ background: '#f7f7f7', padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#0a0a0a' }}>11:32</span>
                  <div style={{ width: 60, height: 14, background: '#111', borderRadius: 10 }} />
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 1 }}>
                      {[4,7,10,14].map((h,i) => <div key={i} style={{width:2,height:h,background:'#0a0a0a',borderRadius:1}}/>)}
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 600, color: '#0a0a0a', marginLeft: 2 }}>SG</span>
                  </div>
                </div>

                {/* Mini map strip */}
                <div style={{ position: 'relative', height: 80, background: '#e8f0e8', overflow: 'hidden' }}>
                  {/* Road lines */}
                  <div style={{ position: 'absolute', top: 20, left: 0, right: 0, height: 24, background: '#d0d8d0' }} />
                  <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.7)', borderStyle: 'dashed' }} />
                  <div style={{ position: 'absolute', top: '35%', left: '15%', width: '40%', height: 20, background: '#d0d8d0', transform: 'rotate(45deg)' }} />
                  {/* Buildings */}
                  {[[10,40,18,30],[35,30,22,40],[65,35,16,35],[82,25,20,44]].map(([l,b,w,h],i)=>(
                    <div key={i} style={{position:'absolute',bottom:b,left:`${l}%`,width:w,height:h,background:'#b8c8b8',borderRadius:2}}/>
                  ))}
                  {/* Pin */}
                  <div style={{ position: 'absolute', top: '30%', left: '55%', width: 16, height: 16, background: '#ccff00', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                  {/* Route line */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(247,247,247,0.95) 100%)' }} />
                </div>

                {/* Screen content */}
                <div style={{ background: '#f7f7f7', padding: '14px 14px 0' }}>

                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 9, color: '#888', marginBottom: 1 }}>Good morning 👋</p>
                      <p style={{ fontSize: 13, fontWeight: 900, color: '#0a0a0a', letterSpacing: '-0.03em' }}>Oluwabusayo</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ccff00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#0a0a0a' }}>O</div>
                    </div>
                  </div>

                  {/* Search bar */}
                  <div style={{ background: '#0a0a0a', borderRadius: 12, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ccff00', flexShrink: 0 }}/>
                    <span style={{ fontSize: 9, color: '#888' }}>Where are you going?</span>
                  </div>

                  {/* Choose a service */}
                  <p style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Choose a service</p>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
                    {[
                      { icon: '🚌', name: 'FeaziPool', sub: 'Save 30%', active: true },
                      { icon: '📦', name: 'FeaziSend', sub: 'Same-day', active: false },
                      { icon: '💼', name: 'FeaziBiz', sub: 'For teams', active: false },
                    ].map(({ icon, name, sub, active }) => (
                      <div key={name} style={{
                        flex: 1, background: active ? '#0a0a0a' : 'white',
                        borderRadius: 12, padding: '10px 4px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: active ? '1.5px solid #ccff00' : '1px solid #eee',
                      }}>
                        <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
                        <div style={{ fontSize: 8, fontWeight: 800, color: active ? '#ccff00' : '#0a0a0a', lineHeight: 1.2 }}>{name}</div>
                        <div style={{ fontSize: 7, color: active ? 'rgba(204,255,0,0.6)' : '#aaa', marginTop: 2 }}>{sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick links */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {[['🕐','History'],['📍','Saved'],['💳','Wallet']].map(([icon,label]) => (
                      <div key={label} style={{ flex:1, background:'white', borderRadius:10, padding:'7px 4px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', border:'1px solid #f0f0f0' }}>
                        <span style={{ fontSize: 11 }}>{icon}</span>
                        <p style={{ fontSize: 7, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Wallet card */}
                  <div style={{ background: '#0a0a0a', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(204,255,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13 }}>💳</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 8, color: '#888', marginBottom: 1 }}>Feazi Wallet</p>
                        <p style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.04em' }}>₦4,200</p>
                      </div>
                    </div>
                    <div style={{ background: '#ccff00', borderRadius: 20, padding: '5px 10px', fontSize: 8, fontWeight: 800, color: '#0a0a0a' }}>Top up +</div>
                  </div>
                </div>

                {/* Bottom nav */}
                <div style={{ background: '#f7f7f7', padding: '10px 8px 14px', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #eee' }}>
                  {[['🏠','Home'],['⚡','Activity'],['📋','Trips'],['👤','Account']].map(([icon, label], i) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 14, opacity: i === 0 ? 1 : 0.35 }}>{icon}</span>
                      <span style={{ fontSize: 6.5, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? '#0a0a0a' : '#aaa' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>



      {/* ── Connect with Us ──────────────────────────────────────────────── */}
      <section style={{ background: '#f8f8f6', padding: '80px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '64px', alignItems: 'start' }}>
          {/* Left: heading */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#15803d', marginBottom: 16 }}>Socials</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', color: '#0f0f0f', lineHeight: 1.1, marginBottom: 16 }}>Connect with Us</h2>
            <p style={{ fontSize: '1rem', color: '#666', lineHeight: 1.7 }}>Join our community and follow us on social media to stay updated about FeaziMove.</p>
          </div>

          {/* Right: 2×2 social grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Facebook */}
            <a href="https://facebook.com/feazimove" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '28px 24px', border: '1px solid #e8e8e8', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                </div>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f0f0f', marginBottom: 6 }}>Follow us on Facebook</h4>
                <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: 1.6, marginBottom: 8 }}>Get FeaziMove news, updates, and community resources.</p>
                <span style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: 700 }}>@feazimove</span>
              </div>
            </a>

            {/* X / Twitter */}
            <a href="https://x.com/feazimove" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '28px 24px', border: '1px solid #e8e8e8', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#0f0f0f"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f0f0f', marginBottom: 6 }}>Follow us on X</h4>
                <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: 1.6, marginBottom: 8 }}>Get FeaziMove news, updates, and company information.</p>
                <span style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: 700 }}>@feazimove</span>
              </div>
            </a>

            {/* Instagram */}
            <a href="https://instagram.com/feazimove" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '28px 24px', border: '1px solid #e8e8e8', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fff0f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="url(#ig-grad)">
                    <defs>
                      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f09433"/>
                        <stop offset="25%" stopColor="#e6683c"/>
                        <stop offset="50%" stopColor="#dc2743"/>
                        <stop offset="75%" stopColor="#cc2366"/>
                        <stop offset="100%" stopColor="#bc1888"/>
                      </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f0f0f', marginBottom: 6 }}>Follow us on Instagram</h4>
                <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: 1.6, marginBottom: 8 }}>Behind-the-scenes, community stories, and updates.</p>
                <span style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: 700 }}>@feazimove</span>
              </div>
            </a>

            {/* WhatsApp / Contact */}
            <a href="https://wa.me/2347000000000" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ background: '#ffffff', borderRadius: 16, padding: '28px 24px', border: '1px solid #e8e8e8', transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.547a.75.75 0 00.921.921l5.702-1.475A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.014-1.376l-.36-.214-3.727.977.993-3.62-.235-.374A9.818 9.818 0 0112 2.182c5.427 0 9.818 4.39 9.818 9.818 0 5.427-4.39 9.818-9.818 9.818z"/></svg>
                </div>
                <h4 style={{ fontWeight: 800, fontSize: '1rem', color: '#0f0f0f', marginBottom: 6 }}>Chat with Us</h4>
                <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: 1.6, marginBottom: 8 }}>Reach our support team directly on WhatsApp.</p>
                <span style={{ fontSize: '0.88rem', color: '#15803d', fontWeight: 700 }}>WhatsApp Support</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .app-dl-left { padding: 64px 80px; }
        @media (max-width: 1023px) { .app-dl-left { padding: 40px 28px; } }
        @media (max-width: 639px)  { .app-dl-left { padding: 32px 20px; } }
      `}</style>
    </LandingLayout>
  )
}
