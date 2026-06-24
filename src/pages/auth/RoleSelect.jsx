import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import faviconImg from '../../assets/favicon.png'

const LIME  = '#ccff00'
const GREEN = '#2a6048'
const DARK  = '#0a1f15'

export default function RoleSelect() {
  const navigate = useNavigate()
  const [active, setActive]   = useState(null)
  const [mobile, setMobile]   = useState(window.innerWidth < 768)

  useEffect(() => {
    const handle = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const panel = (role) => {
    const isRider  = role === 'rider'
    const isActive = active === role
    const other    = role === 'rider' ? 'driver' : 'rider'
    const isOther  = active === other

    return (
      <button
        key={role}
        onClick={() => navigate(`/signup?role=${role}`)}
        onMouseEnter={() => !mobile && setActive(role)}
        onMouseLeave={() => !mobile && setActive(null)}
        className={`fm-panel fm-panel-${role}${isActive ? ' fm-active' : ''}${isOther ? ' fm-shrink' : ''}`}
        style={{
          background: isActive ? LIME : isRider ? '#111c15' : '#0d1a11',
        }}
      >
        {/* BG number */}
        <span className="fm-bgnumber" style={{
          color: isActive ? 'rgba(10,31,21,0.07)' : 'rgba(204,255,0,0.04)',
        }}>
          {isRider ? '01' : '02'}
        </span>

        {/* Icon box */}
        <div className="fm-icon-box" style={{
          background: isActive ? DARK : 'rgba(204,255,0,0.1)',
        }}>
          {isRider ? <RiderIcon /> : <DriverIcon />}
        </div>

        {/* Label */}
        <p className="fm-tag" style={{
          color: isActive ? 'rgba(10,31,21,0.5)' : 'rgba(204,255,0,0.55)',
        }}>
          {isRider ? 'For Commuters' : 'For Drivers'}
        </p>

        {/* Headline */}
        <h2 className="fm-headline" style={{
          color: isActive ? DARK : '#fff',
        }}>
          {isRider ? <>I want<br />a ride</> : <>I want<br />to drive</>}
        </h2>

        {/* Sub */}
        <p className="fm-sub" style={{
          color: isActive ? 'rgba(10,31,21,0.6)' : 'rgba(255,255,255,0.45)',
        }}>
          {isRider
            ? 'Pool rides along your daily route. Save money, move smarter — the Feazi Way.'
            : 'Turn your daily commute into daily income. Drive on your own schedule.'}
        </p>

        {/* CTA */}
        <div className="fm-cta" style={{
          background: isActive ? DARK : LIME,
          color: isActive ? LIME : DARK,
          boxShadow: isActive
            ? '0 8px 32px rgba(10,31,21,0.3)'
            : '0 4px 20px rgba(204,255,0,0.25)',
        }}>
          {isRider ? 'Sign up as Rider' : 'Sign up as Driver'}
          <ArrowRight size={16} />
        </div>
      </button>
    )
  }

  return (
    <div className="fm-root">

      {/* Nav */}
      <nav className="fm-nav">
        <Link to="/" className="fm-logo">
          <img src={faviconImg} alt="FeaziMove" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span>Feazi<span style={{ color: LIME }}>Move</span></span>
        </Link>
        <Link to="/login" className="fm-signin-nav">Sign in</Link>
      </nav>

      {/* Split */}
      <div className="fm-split">
        {panel('rider')}
        <div className="fm-divider" style={{ opacity: active ? 0 : 1 }} />
        {panel('driver')}
      </div>

      {/* Bottom bar */}
      <div className="fm-bottom">
        <span>Already have an account?</span>
        <Link to="/login" style={{ color: LIME, fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
        <span className="fm-sep">|</span>
        <Link to="/policies" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Terms & Privacy</Link>
      </div>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .fm-root {
          min-height: 100vh;
          background: ${DARK};
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: inherit;
        }

        /* ── NAV ── */
        .fm-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 20;
          padding: 18px clamp(20px,5vw,56px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(10,31,21,0.7);
          backdrop-filter: blur(10px);
        }
        .fm-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
          font-size: 18px; font-weight: 900;
          color: #fff; letter-spacing: -0.5px;
        }
        .fm-signin-nav {
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.65);
          text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.2);
          padding: 7px 18px; border-radius: 50px;
          transition: color .2s, border-color .2s;
        }
        .fm-signin-nav:hover {
          color: #fff;
          border-color: rgba(255,255,255,0.5);
        }

        /* ── SPLIT CONTAINER ── */
        .fm-split {
          display: flex;
          flex-direction: row;
          flex: 1;
          min-height: 100vh;
          padding-top: 70px;
        }

        /* ── PANELS ── */
        .fm-panel {
          flex: 1;
          min-height: calc(100vh - 70px);
          border: none;
          cursor: pointer;
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          padding: clamp(28px,5vw,64px) clamp(24px,4vw,56px);
          padding-bottom: clamp(80px,10vw,100px);
          position: relative;
          overflow: hidden;
          transition: flex .5s cubic-bezier(.77,0,.18,1), background .4s ease;
          text-align: left;
        }
        .fm-panel.fm-active  { flex: 1.5; }
        .fm-panel.fm-shrink  { flex: 0.5; }

        /* BG number */
        .fm-bgnumber {
          position: absolute;
          top: -10px; right: -10px;
          font-size: clamp(120px,18vw,240px);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -8px;
          user-select: none;
          pointer-events: none;
          transition: color .4s;
        }

        /* Icon */
        .fm-icon-box {
          width: clamp(60px,9vw,96px);
          height: clamp(60px,9vw,96px);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: clamp(18px,3vw,32px);
          transition: background .4s;
          flex-shrink: 0;
        }

        .fm-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          margin-bottom: 10px;
          transition: color .4s;
        }

        .fm-headline {
          font-size: clamp(2rem,4.5vw,3.8rem);
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -1.5px;
          margin-bottom: 14px;
          transition: color .4s;
        }

        .fm-sub {
          font-size: clamp(13px,1.3vw,15px);
          line-height: 1.7;
          max-width: 280px;
          margin-bottom: clamp(22px,3.5vw,40px);
          transition: color .4s;
        }

        .fm-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: clamp(12px,1.5vw,15px) clamp(20px,2.5vw,30px);
          border-radius: 50px;
          font-size: clamp(13px,1.1vw,15px);
          font-weight: 800;
          transition: background .35s, color .35s, box-shadow .35s;
        }

        /* Divider */
        .fm-divider {
          width: 1px;
          background: rgba(255,255,255,0.07);
          flex-shrink: 0;
          transition: opacity .4s;
          align-self: stretch;
        }

        /* Bottom bar */
        .fm-bottom {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(10,31,21,0.9);
          backdrop-filter: blur(14px);
          padding: 13px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          z-index: 20;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          flex-wrap: wrap;
        }
        .fm-sep {
          color: rgba(255,255,255,0.15);
          margin: 0 4px;
        }

        /* ── MOBILE ── */
        @media (max-width: 767px) {
          .fm-split {
            flex-direction: column;
            min-height: auto;
          }

          .fm-panel {
            flex: none !important;
            min-height: 50vh;
            width: 100%;
            justify-content: flex-end;
            padding: 28px 28px 90px;
            transition: background .3s ease;
          }

          .fm-panel.fm-active,
          .fm-panel.fm-shrink {
            flex: none !important;
          }

          .fm-divider { display: none; }

          .fm-bgnumber {
            font-size: 130px;
            top: -5px; right: -5px;
          }

          .fm-icon-box {
            width: 60px; height: 60px;
            border-radius: 16px;
            margin-bottom: 16px;
          }

          .fm-headline {
            font-size: 2.4rem;
            letter-spacing: -1px;
            margin-bottom: 10px;
          }

          .fm-sub {
            font-size: 13px;
            margin-bottom: 20px;
            max-width: 100%;
          }

          .fm-cta {
            font-size: 14px;
            padding: 12px 22px;
          }

          .fm-bottom {
            font-size: 12px;
            padding: 11px 16px;
            gap: 8px;
          }

          .fm-sep { display: none; }

          .fm-nav {
            padding: 14px 20px;
          }

          .fm-split {
            padding-top: 64px;
          }
        }

        /* Touch: active state on tap */
        @media (hover: none) {
          .fm-panel:active {
            background: ${LIME} !important;
          }
        }

        button:focus-visible { outline: 3px solid ${LIME}; outline-offset: -3px; }
      `}</style>
    </div>
  )
}

function RiderIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="10" r="4" fill={LIME} />
      <path d="M22 16 L18 26 L22 30 L26 26 Z" fill={LIME} opacity="0.9"/>
      <ellipse cx="14" cy="32" rx="5" ry="5" stroke={LIME} strokeWidth="2.5" fill="none"/>
      <ellipse cx="30" cy="32" rx="5" ry="5" stroke={LIME} strokeWidth="2.5" fill="none"/>
      <path d="M14 32 L22 24 L30 32" stroke={LIME} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function DriverIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
      <rect x="4" y="18" width="40" height="16" rx="6" stroke={LIME} strokeWidth="2.5" fill="none"/>
      <path d="M10 18 L14 10 H34 L38 18" stroke={LIME} strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
      <circle cx="13" cy="34" r="4" stroke={LIME} strokeWidth="2.5" fill="none"/>
      <circle cx="35" cy="34" r="4" stroke={LIME} strokeWidth="2.5" fill="none"/>
      <rect x="20" y="13" width="8" height="5" rx="1" fill={LIME} opacity="0.4"/>
      <line x1="4" y1="24" x2="44" y2="24" stroke={LIME} strokeWidth="1.5" opacity="0.3"/>
    </svg>
  )
}
