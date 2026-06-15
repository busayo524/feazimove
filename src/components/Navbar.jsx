import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon } from 'lucide-react'
import Logo from './Logo'
import { useTheme } from '../context/ThemeContext'

const navLinks = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Services',     href: '/services' },
  { label: 'About',        href: '/about' },
  { label: 'Contact',      href: '/contact' },
]

export default function Navbar() {
  const { toggle, isDark } = useTheme()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  const isActive = (href) => location.pathname === href

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: isDark
          ? (scrolled ? 'rgba(12,12,12,0.96)' : 'rgba(12,12,12,0.85)')
          : (scrolled ? 'rgba(245,245,240,0.97)' : 'rgba(245,245,240,0.92)'),
        backdropFilter: 'blur(20px) saturate(1.6)',
        borderBottom: isDark
          ? '1px solid rgba(255,255,255,0.07)'
          : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 sm:px-10 h-[72px] flex items-center justify-between">

        {/* Logo */}
        <Logo />

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <li key={href}>
              <Link
                to={href}
                className="nav-link"
                style={{
                  color: isActive(href) ? '#ccff00' : (isDark ? '#ffffff' : '#0a0a0a'),
                  fontWeight: isActive(href) ? 600 : 500,
                }}
                onMouseEnter={e => { if (!isActive(href)) e.currentTarget.style.color = isDark ? '#ccff00' : '#000000' }}
                onMouseLeave={e => { if (!isActive(href)) e.currentTarget.style.color = isDark ? '#ffffff' : '#0a0a0a' }}
              >
                {label}
                {/* Active underline dot */}
                {isActive(href) && (
                  <span style={{
                    display:'block',position:'absolute',bottom:-3,left:0,
                    width:'100%',height:2,background:'#ccff00',borderRadius:1
                  }}/>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width:36, height:36, borderRadius:10, border:'1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
              background: 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', transition:'all 0.2s',
              color: isDark ? 'rgba(255,255,255,0.6)' : '#3a3a3a',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#ccff00'}
            onMouseLeave={e => e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}
          >
            {isDark ? <Sun size={15}/> : <Moon size={15}/>}
          </button>
          <Link
            to="/login"
            className="inline-flex items-center font-semibold transition-all duration-150"
            style={{
              padding:'10px 22px', borderRadius:50,
              background:'#000000', color:'#ffffff',
              fontSize:13, fontWeight:700, letterSpacing:'-0.01em',
              border:'none'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
            onMouseLeave={e => e.currentTarget.style.background = '#000000'}
          >
            Sign in
          </Link>

          <Link
            to="/register"
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'10px 22px', borderRadius:50,
              background:'#ccff00', color:'#0a0a0a',
              fontSize:13, fontWeight:700, letterSpacing:'-0.01em',
              transition:'background 0.2s, transform 0.15s',
              textDecoration:'none'
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#d4ff1a'; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background='#ccff00'; e.currentTarget.style.transform='translateY(0)' }}
          >
            Get started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          style={{ color: '#1a1a1a' }}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden"
          style={{
            background: 'rgba(245,245,240,0.98)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <ul className="px-6 pt-4 pb-2 space-y-0">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  to={href}
                  className="flex items-center py-4 text-base font-medium transition-colors"
                  style={{
                    color: isActive(href) ? '#ccff00' : '#1a1a1a',
                    borderBottom: '1px solid rgba(0,0,0,0.07)',
                    fontWeight: isActive(href) ? 700 : 500,
                  }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-6 py-5 flex flex-col gap-3">
            <Link
              to="/login"
              style={{
                display:'flex', justifyContent:'center', alignItems:'center',
                padding:'14px', borderRadius:50,
                background:'#000000', color:'#ffffff',
                fontSize:15, fontWeight:700,
              }}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              style={{
                display:'flex', justifyContent:'center', alignItems:'center',
                padding:'14px', borderRadius:50,
                background:'#ccff00', color:'#0a0a0a',
                fontSize:15, fontWeight:700,
              }}
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
