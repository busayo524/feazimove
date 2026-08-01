import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/favicon.png'

// True when running as an installed app (home-screen launch) rather than a
// browser tab — covers Android/desktop Chrome and iOS Safari.
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

// The installed app is for the internal experience only — marketing pages
// live on the website. /policies stays reachable (linked from registration).
const MARKETING_PATHS = ['/', '/how-it-works', '/services', '/about', '/contact', '/safety']

function roleHome(user) {
  if (user.role === 'admin') return '/admin'
  return (user.activeRole || user.role) === 'driver' ? '/driver' : '/book'
}

// Redirects installed-app users off marketing pages: logged in → their
// dashboard, logged out → login. Browser visitors are never affected.
export function StandaloneGate() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isStandalone() || loading) return
    if (MARKETING_PATHS.includes(location.pathname)) {
      navigate(user ? roleHome(user) : '/login', { replace: true })
    }
  }, [loading, user, location.pathname, navigate])

  return null
}

// Logo wrapper for the auth screens. In the browser the logo links home like
// any website header. In the installed app it is a plain picture: '/' is a
// marketing path, so tapping it navigated to the landing page only for
// StandaloneGate to bounce straight back — a visible flicker with no
// destination. Only ever rendered inside the app, so no home link is lost.
export function HomeLogoLink({ children, style, className }) {
  if (isStandalone()) {
    return (
      <div className={className} style={{ ...style, userSelect: 'none', pointerEvents: 'none' }}>
        {children}
      </div>
    )
  }
  return <Link to="/" className={className} style={{ textDecoration: 'none', ...style }}>{children}</Link>
}

// Renders children only in the browser — for links that point at marketing
// pages, which are out of scope in the installed app.
export function BrowserOnly({ children }) {
  return isStandalone() ? null : children
}

// Branded launch splash — black screen with the centered logo, shown only in
// the installed app. Drawn by the app itself so it looks identical on every
// phone, then fades once auth state is restored (minimum 1.2s so it never
// flickers on fast devices).
export function StandaloneSplash() {
  const { loading } = useAuth()
  const [minTimeDone, setMinTimeDone] = useState(false)
  const [fading, setFading] = useState(false)
  const [gone, setGone] = useState(() => !isStandalone())

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 1200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (gone || loading || !minTimeDone) return
    setFading(true)
  }, [gone, loading, minTimeDone])

  // Separate effect: starting the fade must not cancel the removal timer
  useEffect(() => {
    if (!fading) return
    const t = setTimeout(() => setGone(true), 450)
    return () => clearTimeout(t)
  }, [fading])

  if (gone) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: fading ? 0 : 1, transition: 'opacity 0.45s ease',
    }}>
      <img src={logo} alt="FeaziMove" style={{ width: 96, height: 96, objectFit: 'contain' }} />
    </div>
  )
}
