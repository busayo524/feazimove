import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon, ChevronDown, Users, Car, Clock, Package, Briefcase, TrendingUp, MapPin, BookOpen } from 'lucide-react'
import Logo from './Logo'
import { useTheme } from '../context/ThemeContext'

const FOREST = '#15803d'
const NEON   = '#ccff00'
const NT     = '#0a0a0a'

const RIDE_ITEMS = [
  { icon: <Users size={18} color="#15803d"/>,   label: 'FeaziPool',        sub: 'Share a route, split the cost',        href: '/services', bg: '#dcfce7' },
  { icon: <Car size={18} color="#1d4ed8"/>,      label: 'Solo Ride',        sub: 'Private, direct trips',                href: '/services', bg: '#dbeafe' },
  { icon: <Clock size={18} color="#b45309"/>,    label: 'Schedule a Ride',  sub: 'Book in advance, travel on your time', href: '/services', bg: '#fef3c7' },
  { icon: <Package size={18} color="#7c3aed"/>,  label: 'FeaziSend',        sub: 'Fast & reliable package delivery',     href: '/services', bg: '#ede9fe' },
]

const DRIVE_ITEMS = [
  { icon: <Car size={18} color="#15803d"/>,        label: 'Become a Driver',      sub: 'Earn money driving with FeaziMove',   href: '/how-it-works', bg: '#dcfce7' },
  { icon: <TrendingUp size={18} color="#0369a1"/>, label: 'Earnings Potential',   sub: 'See how much you can make',           href: '/how-it-works', bg: '#e0f2fe' },
  { icon: <Briefcase size={18} color="#b45309"/>,  label: 'Driver Requirements',  sub: 'What you need to get started',        href: '/how-it-works', bg: '#fef3c7' },
  { icon: <MapPin size={18} color="#be185d"/>,     label: 'FeaziBiz Deliveries',  sub: 'Business logistics & bulk delivery',  href: '/services',     bg: '#fce7f3' },
]

const LEARN_ITEMS = [
  { icon: <Users size={18} color="#15803d"/>,       label: 'How FeaziMove Works',  sub: 'Understand how pooled rides & delivery work', href: '/how-it-works', bg: '#dcfce7' },
  { icon: <MapPin size={18} color="#7c3aed"/>,      label: 'Routes & Coverage',    sub: 'Explore active routes in your city',          href: '/services',     bg: '#ede9fe' },
  { icon: <Clock size={18} color="#0369a1"/>,       label: 'FAQ',                  sub: 'Answers to common questions',                 href: '/contact',      bg: '#e0f2fe' },
  { icon: <TrendingUp size={18} color="#b45309"/>,  label: 'Blog & Updates',       sub: 'Stay up to date with FeaziMove news',         href: '/about',        bg: '#fef3c7' },
  { icon: <Briefcase size={18} color="#be185d"/>,   label: 'Careers',              sub: 'Join the FeaziMove team',                     href: '/about',        bg: '#fce7f3' },
  { icon: <Package size={18} color="#1d4ed8"/>,     label: 'Contact Us',           sub: 'Having an issue? Reach out to us',            href: '/contact',      bg: '#dbeafe' },
]

const SIMPLE_LINKS = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Services',     href: '/services'     },
  { label: 'About',        href: '/about'        },
  { label: 'Contact',      href: '/contact'      },
]

function Dropdown({ items, onClose, align }) {
  return (
    <div style={{
      position: 'fixed', top: 68, left: 0, right: 0,
      background: '#ffffff',
      boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      zIndex: 999,
      animation: 'dropIn 0.18s ease',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 40px 32px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 32px' }}>
        {items.map((item, i) => (
          <Link key={i} to={item.href} onClick={onClose} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '14px 16px', borderRadius: 12, textDecoration: 'none',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg || '#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
              {item.icon}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#0a0a0a', marginBottom: 3 }}>{item.label}</p>
              <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{item.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function Navbar() {
  const { toggle, isDark } = useTheme()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [dropdown, setDropdown] = useState(null) // 'ride' | 'drive' | null
  const closeTimer = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false); setDropdown(null) }, [location.pathname])

  const isActive = (href) => location.pathname === href

  function openDrop(name) {
    clearTimeout(closeTimer.current)
    setDropdown(name)
  }
  function scheduledClose() {
    closeTimer.current = setTimeout(() => setDropdown(null), 120)
  }
  function cancelClose() {
    clearTimeout(closeTimer.current)
  }

  const linkColor = (href) => isActive(href) ? FOREST : (isDark ? '#ffffff' : '#0a0a0a')

  return (
    <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300" style={{
      background: isDark
        ? (scrolled ? 'rgba(12,12,12,0.96)' : 'rgba(12,12,12,0.85)')
        : (scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.92)'),
      backdropFilter: 'blur(20px) saturate(1.6)',
      borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
    }}>
      <nav style={{ maxWidth: "100%", padding: "0 clamp(20px,4vw,60px)", height: 72, display: "flex", alignItems: "center", gap: 0 }}>

        {/* Logo — extreme left */}
        <div style={{ flexShrink: 0, marginRight: 32 }}><Logo /></div>
        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.10)", marginRight: 28, flexShrink: 0 }} />

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-0" style={{ listStyle:'none', margin:0, padding:0, flex: 1 }}>

          {/* Ride dropdown */}
          <li style={{ position:'relative' }}
            onMouseEnter={() => openDrop('ride')}
            onMouseLeave={scheduledClose}>
            <button style={{
              display:'flex', alignItems:'center', gap:5, padding:'8px 14px',
              background:'none', border:'none', cursor:'pointer', borderRadius:8,
              fontWeight: 600, fontSize: 14,
              color: dropdown === 'ride' ? FOREST : (isDark ? '#fff' : NT),
              transition:'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = FOREST}
              onMouseLeave={e => e.currentTarget.style.color = dropdown === 'ride' ? FOREST : (isDark ? '#fff' : NT)}>
              Ride
              <ChevronDown size={14} style={{ transition:'transform 0.2s', transform: dropdown === 'ride' ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
            </button>
            {dropdown === 'ride' && (
              <div onMouseEnter={cancelClose} onMouseLeave={scheduledClose}>
                <Dropdown items={RIDE_ITEMS} onClose={() => setDropdown(null)}/>
              </div>
            )}
          </li>

          {/* Drive dropdown */}
          <li style={{ position:'relative' }}
            onMouseEnter={() => openDrop('drive')}
            onMouseLeave={scheduledClose}>
            <button style={{
              display:'flex', alignItems:'center', gap:5, padding:'8px 14px',
              background:'none', border:'none', cursor:'pointer', borderRadius:8,
              fontWeight: 600, fontSize: 14,
              color: dropdown === 'drive' ? FOREST : (isDark ? '#fff' : NT),
              transition:'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = FOREST}
              onMouseLeave={e => e.currentTarget.style.color = dropdown === 'drive' ? FOREST : (isDark ? '#fff' : NT)}>
              Drive
              <ChevronDown size={14} style={{ transition:'transform 0.2s', transform: dropdown === 'drive' ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
            </button>
            {dropdown === 'drive' && (
              <div onMouseEnter={cancelClose} onMouseLeave={scheduledClose}>
                <Dropdown items={DRIVE_ITEMS} onClose={() => setDropdown(null)}/>
              </div>
            )}
          </li>

          {/* Learn dropdown */}
          <li style={{ position:'relative' }}
            onMouseEnter={() => openDrop('learn')}
            onMouseLeave={scheduledClose}>
            <button style={{
              display:'flex', alignItems:'center', gap:5, padding:'8px 14px',
              background:'none', border:'none', cursor:'pointer', borderRadius:8,
              fontWeight: 600, fontSize: 14,
              color: dropdown === 'learn' ? FOREST : (isDark ? '#fff' : NT),
              transition:'color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = FOREST}
              onMouseLeave={e => e.currentTarget.style.color = dropdown === 'learn' ? FOREST : (isDark ? '#fff' : NT)}>
              Learn
              <ChevronDown size={14} style={{ transition:'transform 0.2s', transform: dropdown === 'learn' ? 'rotate(180deg)' : 'rotate(0deg)' }}/>
            </button>
            {dropdown === 'learn' && (
              <div onMouseEnter={cancelClose} onMouseLeave={scheduledClose}>
                <Dropdown items={LEARN_ITEMS} onClose={() => setDropdown(null)}/>
              </div>
            )}
          </li>

          {/* Simple links */}
          {SIMPLE_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link to={href} style={{
                display:'block', position:'relative',
                padding:'8px 14px', borderRadius:8,
                fontWeight: isActive(href) ? 700 : 500, fontSize: 14,
                color: linkColor(href),
                textDecoration:'none', transition:'color 0.15s',
              }}
                onMouseEnter={e => { if (!isActive(href)) e.currentTarget.style.color = FOREST }}
                onMouseLeave={e => { if (!isActive(href)) e.currentTarget.style.color = isDark ? '#fff' : NT }}>
                {label}
                {isActive(href) && (
                  <span style={{ display:'block', position:'absolute', bottom:2, left:14, right:14, height:2, background:FOREST, borderRadius:1 }}/>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3" style={{ flexShrink: 0, marginLeft: 24 }}>
          <button onClick={toggle} aria-label="Toggle theme" style={{
            width:34, height:34, borderRadius:10, border:'1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            background:'transparent', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', transition:'all 0.2s',
            color: isDark ? 'rgba(255,255,255,0.6)' : '#3a3a3a',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = FOREST; e.currentTarget.style.color = FOREST }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.6)' : '#3a3a3a' }}>
            {isDark ? <Sun size={15}/> : <Moon size={15}/>}
          </button>

          <Link to="/login" style={{ padding:'9px 20px', borderRadius:50, background:'transparent', border:`1.5px solid ${isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.15)'}`, color: isDark?'#fff':NT, fontSize:13, fontWeight:700, textDecoration:'none', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = FOREST; e.currentTarget.style.color = FOREST }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.15)'; e.currentTarget.style.color = isDark?'#fff':NT }}>
            Log in
          </Link>

          <Link to="/register" style={{
            display:'inline-flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:50,
            background: NEON, color: NT, fontSize:13, fontWeight:700,
            transition:'background 0.2s, transform 0.15s', textDecoration:'none',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='#d4ff1a'; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background=NEON; e.currentTarget.style.transform='translateY(0)' }}>
            Create account
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setOpen(!open)}
          style={{ color: isDark ? '#fff' : '#1a1a1a', background:'none', border:'none', cursor:'pointer' }}
          aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden" style={{ background: isDark?'rgba(12,12,12,0.98)':'rgba(255,255,255,0.98)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(0,0,0,0.08)' }}>
          <ul style={{ margin:0, padding:'8px 24px 4px', listStyle:'none' }}>
            {[{label:'Ride', href:'/services'},{label:'Drive', href:'/services#driver'}, ...SIMPLE_LINKS].map(({ label, href }) => (
              <li key={href}>
                <Link to={href} style={{ display:'flex', alignItems:'center', padding:'14px 0', fontSize:15, fontWeight: isActive(href)?700:500, color: isActive(href)?FOREST:(isDark?'#fff':'#1a1a1a'), borderBottom:'1px solid rgba(0,0,0,0.06)', textDecoration:'none' }}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div style={{ padding:'16px 24px 24px', display:'flex', flexDirection:'column', gap:10 }}>
            <Link to="/login" style={{ display:'flex', justifyContent:'center', padding:'13px', borderRadius:50, border:`1.5px solid rgba(0,0,0,0.15)`, color:'#1a1a1a', fontSize:15, fontWeight:700, textDecoration:'none' }}>Log in</Link>
            <Link to="/register" style={{ display:'flex', justifyContent:'center', padding:'13px', borderRadius:50, background:NEON, color:NT, fontSize:15, fontWeight:700, textDecoration:'none' }}>Create account</Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .nav-link { position:relative; text-decoration:none; font-size:14px; transition:color 0.15s; }
      `}</style>
    </header>
  )
}
