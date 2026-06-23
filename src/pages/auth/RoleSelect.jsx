import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bike, Car, ArrowRight } from 'lucide-react'
import faviconImg from '../../assets/favicon.png'

const LIME  = '#ccff00'
const GREEN = '#2a6048'
const DARK  = '#0a1f15'

export default function RoleSelect() {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 60%, #f0f9ff 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Navbar */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '14px clamp(20px,5vw,60px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: DARK, letterSpacing: '-0.3px' }}>
              Feazi<span style={{ color: GREEN }}>Move</span>
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Smart Urban Mobility</p>
          </div>
        </Link>
        <span style={{ fontSize: 13, color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </span>
      </nav>

      {/* Main */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px,5vw,64px) clamp(16px,4vw,24px)',
      }}>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            margin: '0 0 10px',
            fontSize: 'clamp(1.8rem,4vw,2.4rem)',
            fontWeight: 900, color: DARK, letterSpacing: '-0.5px', lineHeight: 1.15,
          }}>
            How would you like to move?
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: '#6b7280' }}>
            Choose your role to get started with FeaziMove.
          </p>
        </div>

        {/* Role cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20, width: '100%', maxWidth: 580,
        }}>

          {/* Rider */}
          <button
            onClick={() => navigate('/signup?role=rider')}
            onMouseEnter={() => setHovered('rider')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'rider' ? DARK : '#fff',
              border: `2.5px solid ${hovered === 'rider' ? DARK : '#e5e7eb'}`,
              borderRadius: 24, padding: 'clamp(32px,5vw,48px) 28px',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              transition: 'all 0.22s ease',
              transform: hovered === 'rider' ? 'translateY(-6px)' : 'translateY(0)',
              boxShadow: hovered === 'rider'
                ? '0 20px 48px rgba(10,31,21,0.18)'
                : '0 2px 16px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: hovered === 'rider' ? LIME : '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.22s',
            }}>
              <Bike size={32} color={DARK} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: '0 0 4px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: hovered === 'rider' ? 'rgba(255,255,255,0.5)' : '#9ca3af',
              }}>
                For Commuters
              </p>
              <h2 style={{
                margin: '0 0 6px', fontSize: 'clamp(1.2rem,2.5vw,1.5rem)',
                fontWeight: 900, letterSpacing: '-0.3px',
                color: hovered === 'rider' ? '#fff' : DARK,
              }}>
                Sign up as Rider
              </h2>
              <p style={{
                margin: 0, fontSize: 13, lineHeight: 1.6,
                color: hovered === 'rider' ? 'rgba(255,255,255,0.65)' : '#6b7280',
              }}>
                Pool rides, save money,<br />move the Feazi Way.
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: hovered === 'rider' ? LIME : DARK,
              color: hovered === 'rider' ? DARK : '#fff',
              padding: '10px 22px', borderRadius: 50,
              fontSize: 13, fontWeight: 700,
              transition: 'all 0.22s',
            }}>
              Get started <ArrowRight size={14} />
            </div>
          </button>

          {/* Driver */}
          <button
            onClick={() => navigate('/signup?role=driver')}
            onMouseEnter={() => setHovered('driver')}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === 'driver' ? DARK : '#fff',
              border: `2.5px solid ${hovered === 'driver' ? DARK : '#e5e7eb'}`,
              borderRadius: 24, padding: 'clamp(32px,5vw,48px) 28px',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              transition: 'all 0.22s ease',
              transform: hovered === 'driver' ? 'translateY(-6px)' : 'translateY(0)',
              boxShadow: hovered === 'driver'
                ? '0 20px 48px rgba(10,31,21,0.18)'
                : '0 2px 16px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: hovered === 'driver' ? LIME : '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.22s',
            }}>
              <Car size={32} color={DARK} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: '0 0 4px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: hovered === 'driver' ? 'rgba(255,255,255,0.5)' : '#9ca3af',
              }}>
                For Drivers
              </p>
              <h2 style={{
                margin: '0 0 6px', fontSize: 'clamp(1.2rem,2.5vw,1.5rem)',
                fontWeight: 900, letterSpacing: '-0.3px',
                color: hovered === 'driver' ? '#fff' : DARK,
              }}>
                Sign up as Driver
              </h2>
              <p style={{
                margin: 0, fontSize: 13, lineHeight: 1.6,
                color: hovered === 'driver' ? 'rgba(255,255,255,0.65)' : '#6b7280',
              }}>
                Earn daily along your route,<br />on your own schedule.
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: hovered === 'driver' ? LIME : DARK,
              color: hovered === 'driver' ? DARK : '#fff',
              padding: '10px 22px', borderRadius: 50,
              fontSize: 13, fontWeight: 700,
              transition: 'all 0.22s',
            }}>
              Get started <ArrowRight size={14} />
            </div>
          </button>

        </div>

        <p style={{ marginTop: 32, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          By signing up you agree to our{' '}
          <Link to="/policies" style={{ color: GREEN, fontWeight: 600, textDecoration: 'none' }}>Terms & Privacy Policy</Link>
        </p>

      </main>
    </div>
  )
}
