/**
 * FeaziMove — Email Sent Confirmation Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown after successful OTP verification.
 * Tells the user to check their email for the registration continuation link.
 */
import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import faviconImg from '../../assets/favicon.png'

const LIME  = '#ccff00'
const GREEN = '#2a6048'
const DARK  = '#0a1f15'

export default function EmailSent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { maskedEmail, role } = location.state || {}

  // Guard — must arrive from verify-otp
  useEffect(() => {
    if (!maskedEmail) navigate('/signup', { replace: true })
  }, [maskedEmail, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 50%, #f0f9ff 100%)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Nav */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        padding: '14px clamp(20px,5vw,60px)',
      }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <span style={{ fontSize: 15, fontWeight: 900, color: DARK, letterSpacing: '-0.3px' }}>
            Feazi<span style={{ color: GREEN }}>Move</span>
          </span>
        </Link>
      </nav>

      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(32px,5vw,60px) clamp(16px,4vw,24px)',
      }}>
        <div style={{ width: '100%', maxWidth: 500, textAlign: 'center' }}>

          {/* Success animation */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ccff00, #a8e063)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(204,255,0,0.4)',
                margin: '0 auto',
              }}>
                <CheckCircle2 size={48} color={DARK} strokeWidth={2.5} />
              </div>
              {/* Decorative ring */}
              <div style={{
                position: 'absolute', inset: -8,
                borderRadius: '50%', border: '2px solid rgba(204,255,0,0.3)',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
            </div>
          </div>

          <h1 style={{
            margin: '0 0 12px',
            fontSize: 'clamp(1.6rem,4vw,2.1rem)', fontWeight: 900,
            color: DARK, letterSpacing: '-0.5px', lineHeight: 1.2,
          }}>
            Email verified successfully! 🎉
          </h1>

          <p style={{ fontSize: 16, color: '#4b5563', margin: '0 0 8px', lineHeight: 1.7 }}>
            We've sent your registration link to
          </p>
          <p style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#f0fdf4', border: '1.5px solid #bbf7d0',
            borderRadius: 50, padding: '8px 20px', margin: '0 0 32px',
            fontSize: 14, fontWeight: 700, color: GREEN,
          }}>
            <Mail size={15} /> {maskedEmail}
          </p>

          {/* Steps */}
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
            padding: 'clamp(24px,4vw,36px)',
            textAlign: 'left', marginBottom: 28,
            border: '1.5px solid #f0f0f0',
          }}>
            <p style={{ margin: '0 0 20px', fontSize: 13, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              What happens next
            </p>
            {[
              { step: '1', icon: '📬', title: 'Check your inbox', desc: 'Look for an email from FeaziMove with your personalised registration link.' },
              { step: '2', icon: '🔗', title: 'Click the link', desc: 'The link in the email will take you directly to your registration steps. It\'s valid for 24 hours.' },
              { step: '3', icon: role === 'driver' ? '🚗' : '🛵', title: `Complete your ${role === 'driver' ? 'driver' : 'rider'} profile`, desc: role === 'driver'
                  ? 'Upload your vehicle documents, license, and photos to become a FeaziMove driver.'
                  : 'Verify your identity and agree to our terms to start booking rides.' },
              { step: '4', icon: '✅', title: 'Go live!', desc: 'Once approved, you\'re ready to move the Feazi Way.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: 16, marginBottom: step === '4' ? 0 : 20 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: step === '1' ? LIME : '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {icon}
                </div>
                <div>
                  <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Spam warning */}
          <div style={{
            background: '#fffbeb', border: '1.5px solid #fde68a',
            borderRadius: 12, padding: '14px 18px', marginBottom: 28,
            display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📁</span>
            <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.65 }}>
              <strong>Don't see the email?</strong> Check your spam or promotions folder. If it's not there within a few minutes, try signing up again.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <a
              href={`mailto:${maskedEmail}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 32px', borderRadius: 50,
                background: DARK, color: LIME,
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(10,31,21,0.25)',
              }}
            >
              <Mail size={16} /> Open email app <ArrowRight size={15} />
            </a>
            <Link to="/" style={{
              fontSize: 13, color: '#9ca3af', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              ← Back to FeaziMove home
            </Link>
          </div>

        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%       { transform: scale(1.08); opacity: 0.2; }
        }
      `}</style>
    </div>
  )
}
