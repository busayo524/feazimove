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
        color: installed ? NEON : 'rgba(255,255,255,0.85)',
        padding: '15px 24px', borderRadius: 50,
        fontWeight: 700, fontSize: 15,
        background: 'transparent',
        border: `1.5px solid ${installed ? 'rgba(204,255,0,0.6)' : 'rgba(255,255,255,0.25)'}`,
        cursor: installed ? 'default' : 'pointer', fontFamily: 'inherit',
        transition: 'border-color 0.2s, color 0.2s',
      }}
        onMouseEnter={e => { if (!installed) { e.currentTarget.style.borderColor = 'rgba(204,255,0,0.6)'; e.currentTarget.style.color = NEON } }}
        onMouseLeave={e => { if (!installed) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' } }}
      >
        {installed
          ? <><CheckCircle2 size={16} /> App installed</>
          : <><Smartphone size={16} /> Get the App</>}
      </button>

      {/* Install instructions sheet (iOS + browsers without the prompt) */}
      {showSheet && (
        <div onClick={() => setShowSheet(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#111a00', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 20,
            padding: '28px 26px', maxWidth: 400, width: '100%', position: 'relative',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <button onClick={() => setShowSheet(false)} aria-label="Close" style={{
              position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4,
            }}><X size={18} /></button>

            <div style={{ width: 52, height: 52, borderRadius: 14, background: NEON, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Smartphone size={26} color="#0a0a0a" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Install FeaziMove
            </h3>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 20 }}>
              Add FeaziMove to your home screen for a full-screen app experience — no app store needed.
            </p>

            {ios ? (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: <Share size={16} color={NEON} />, text: <>Tap the <strong style={{ color: '#fff' }}>Share</strong> button in Safari's toolbar</> },
                  { icon: <SquarePlus size={16} color={NEON} />, text: <>Scroll down and tap <strong style={{ color: '#fff' }}>Add to Home Screen</strong></> },
                  { icon: <CheckCircle2 size={16} color={NEON} />, text: <>Tap <strong style={{ color: '#fff' }}>Add</strong> — FeaziMove appears on your home screen</> },
                ].map((s, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(204,255,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</span>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: '5px 0 0' }}>{s.text}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0 }}>
                Open <strong style={{ color: NEON }}>feazimove.com</strong> in <strong style={{ color: '#fff' }}>Chrome</strong> on your phone,
                then choose <strong style={{ color: '#fff' }}>Install app</strong> (or "Add to Home screen") from the ⋮ menu.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
