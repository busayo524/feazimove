import React, { useEffect, useState } from 'react'
import { Smartphone, X, Share, SquarePlus, CheckCircle2 } from 'lucide-react'

const NEON = '#ccff00'

// One shared handle on Chrome's install prompt — the event fires once per page
// load, usually before this component mounts, so it's captured at module level.
let deferredPrompt = null
const promptListeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    promptListeners.forEach(fn => fn())
  })
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/**
 * "Get the App" button for the landing pages.
 * - Chrome/Edge on Android or desktop: triggers the native install dialog
 * - iPhone/iPad: opens a step-by-step "Add to Home Screen" sheet
 * - Other browsers: opens the same sheet with general instructions
 * - Hidden entirely when already running as the installed app
 */
export default function InstallAppButton() {
  const [canPrompt, setCanPrompt] = useState(() => !!deferredPrompt)
  const [installed, setInstalled] = useState(false)
  const [showSheet, setShowSheet] = useState(false)

  useEffect(() => {
    const onPrompt = () => setCanPrompt(true)
    promptListeners.add(onPrompt)
    const onInstalled = () => { setInstalled(true); setShowSheet(false) }
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      promptListeners.delete(onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (isStandalone()) return null // already inside the installed app

  async function handleClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      deferredPrompt = null
      setCanPrompt(false)
      return
    }
    setShowSheet(true)
  }

  const ios = isIOS()

  return (
    <>
      <button onClick={handleClick} disabled={installed} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        color: '#0a0a0a',
        padding: '15px 32px', borderRadius: 50,
        fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em',
        background: NEON,
        border: 'none',
        boxShadow: '0 0 32px rgba(204,255,0,0.3)',
        cursor: installed ? 'default' : 'pointer', fontFamily: 'inherit',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => { if (!installed) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(204,255,0,0.5)' } }}
        onMouseLeave={e => { if (!installed) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(204,255,0,0.3)' } }}
      >
        {installed
          ? <><CheckCircle2 size={16} /> App installed</>
          : <><Smartphone size={16} /> Get the App</>}
      </button>

      {/* Install instructions sheet (iOS + browsers without the prompt) */}
      {showSheet && (
        <div onClick={() => setShowSheet(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,10,10,0.55)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#ffffff', borderRadius: 24,
            padding: '30px 28px 28px', maxWidth: 410, width: '100%', position: 'relative',
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          }}>
            <button onClick={() => setShowSheet(false)} aria-label="Close" style={{
              position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%',
              background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#6b7280', cursor: 'pointer', padding: 0,
            }}><X size={16} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Smartphone size={24} color={NEON} />
              </div>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 900, color: '#0f0f0f', letterSpacing: '-0.02em', margin: 0 }}>
                  Install FeaziMove
                </h3>
                <p style={{ fontSize: 12.5, color: '#6b7280', margin: '2px 0 0' }}>Free · No app store needed</p>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.65, marginBottom: 22 }}>
              Add FeaziMove to your home screen and use it like any other app — full screen, with its own icon.
            </p>

            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(ios ? [
                { icon: <Share size={15} color="#0a0a0a" />, text: <>Tap the <strong>Share</strong> button in Safari's toolbar</> },
                { icon: <SquarePlus size={15} color="#0a0a0a" />, text: <>Scroll down and tap <strong>Add to Home Screen</strong></> },
                { icon: <CheckCircle2 size={15} color="#0a0a0a" />, text: <>Tap <strong>Add</strong> — FeaziMove appears on your home screen</> },
              ] : [
                { icon: <Smartphone size={15} color="#0a0a0a" />, text: <>Open <strong>this website</strong> in Chrome on your phone</> },
                { icon: <SquarePlus size={15} color="#0a0a0a" />, text: <>Tap the <strong>⋮ menu</strong>, then <strong>Add to Home screen</strong> or <strong>Install app</strong></> },
                { icon: <CheckCircle2 size={15} color="#0a0a0a" />, text: <>Confirm — FeaziMove appears on your home screen</> },
              ]).map((s, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 12px', borderRadius: 12, background: i % 2 ? '#ffffff' : '#f8faf5' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: NEON, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</span>
                  <p style={{ fontSize: 13.5, color: '#1f2937', lineHeight: 1.5, margin: 0 }}>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
