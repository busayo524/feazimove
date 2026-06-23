import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, TrendingUp, Shield, Zap, MapPin, Star, Package } from 'lucide-react'
import faviconImg from '../../assets/favicon.png'

const NEON = '#ccff00'
const DARK = '#0a0a0a'

export default function RoleSelect() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '20px clamp(20px,5vw,60px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          <span style={{ fontSize: 18, letterSpacing: '-0.01em', color: DARK }}>
            <span style={{ fontWeight: 500 }}>Feazi</span><span style={{ fontWeight: 900 }}>Move</span>
          </span>
        </Link>
        <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: '#888', textDecoration: 'none' }}>
          Have an account? <span style={{ color: DARK, borderBottom: `2px solid ${NEON}` }}>Log in</span>
        </Link>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(32px,5vw,60px) clamp(20px,5vw,60px)' }}>

        {/* Headline */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: DARK, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 8 }}>
            How would you like to move?
          </h1>
          <p style={{ fontSize: 15, color: '#888', fontWeight: 500 }}>Pick your role to get started.</p>
        </div>

        {/* Cards */}
        <div className="role-select-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 780 }}>

          {/* RIDER */}
          <div
            onClick={() => navigate('/signup?role=rider')}
            onMouseEnter={() => setHovered('rider')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: '#ffffff',
              border: `2px solid ${hovered === 'rider' ? NEON : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 20, padding: 'clamp(36px,5vw,48px)', cursor: 'pointer',
              transition: 'all 0.25s ease',
              transform: hovered === 'rider' ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hovered === 'rider' ? '0 20px 50px rgba(204,255,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>For Commuters</p>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: DARK, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              Ride with Feazi
            </h2>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.6, marginBottom: 20 }}>
              Pooled rides along shared routes — affordable, safe, and stress-free every day.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[
                [<TrendingUp size={13}/>, 'Save up to 60% per trip'],
                [<Zap size={13}/>,        'Instant route matching'],
                [<Shield size={13}/>,     'Verified drivers only'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#15803d' }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: NEON,
              borderRadius: 12, padding: '13px 18px',
              transition: 'background 0.25s',
            }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: DARK }}>Sign up as Rider</span>
              <ArrowRight size={16} style={{ color: DARK }} />
            </div>
          </div>

          {/* DRIVER */}
          <div
            onClick={() => navigate('/signup?role=driver')}
            onMouseEnter={() => setHovered('driver')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: '#ffffff',
              border: `2px solid ${hovered === 'driver' ? NEON : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 20, padding: 'clamp(36px,5vw,48px)', cursor: 'pointer',
              transition: 'all 0.25s ease',
              transform: hovered === 'driver' ? 'translateY(-4px)' : 'translateY(0)',
              boxShadow: hovered === 'driver' ? '0 20px 50px rgba(204,255,0,0.2)' : '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>For Drivers</p>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', color: DARK, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              Drive &amp; Earn Daily
            </h2>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.6, marginBottom: 20 }}>
              Turn your daily route into steady income — pick up passengers heading your way.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {[
                [<TrendingUp size={13}/>, 'Predictable daily income'],
                [<MapPin size={13}/>,     'Trips along your own route'],
                [<Star size={13}/>,       'Build your driver rating'],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#15803d' }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: NEON,
              borderRadius: 12, padding: '13px 18px',
              transition: 'background 0.25s',
            }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: DARK }}>Sign up as Driver</span>
              <ArrowRight size={16} style={{ color: DARK }} />
            </div>
          </div>

        </div>

        {/* Footer note */}
        <p style={{ marginTop: 28, fontSize: 15, color: '#888', textAlign: 'center' }}>
          By signing up you agree to our{' '}
          <Link to="/policies" style={{ color: '#666', textDecoration: 'underline' }}>Terms</Link> &amp;{' '}
          <Link to="/policies" style={{ color: '#666', textDecoration: 'underline' }}>Privacy Policy</Link>.
        </p>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .role-select-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
