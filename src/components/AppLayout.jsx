import { NEON, ON_NEON_HARD as NT, BG, TEXT, ADMIN_BORDER as BORDER, HEADER,
  SB_BG, SB_BORDER, SB_TEXT, SB_MUTED, SB_CARD, SB_HOVER, SB_ACTIVE, SB_ACTIVE_BG } from '../theme/palette'
import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { useMyAvatar } from '../hooks/useMyAvatar'
import faviconImg from '../assets/favicon.png'
import { useHiddenBalance, maskAmount } from './BalanceAmount'
import {
  MapPin, Clock, Package, Wallet, User, LogOut, Menu, X,
  TrendingUp, LayoutGrid, Instagram, Facebook,
} from 'lucide-react'


// Sidebar palette now themes: deep lime-green in light (unchanged), neutral ash
// in dark — on a black page a green panel reads as a second brand colour rather
// than a menu. Values live in index.css.
const NAV_ACTIVE_BG = 'rgba(204,255,0,0.08)' // faint wash behind the active item

// Where the social links point. Same URLs the marketing footer uses, so there
// is one place to change them.
const SOCIALS = [
  { Icon: Instagram, href: 'https://www.instagram.com/feazimove/', label: 'FeaziMove on Instagram' },
  { Icon: Facebook,  href: 'https://web.facebook.com/profile.php?id=61590273165597', label: 'FeaziMove on Facebook' },
]

const RIDER_NAV=[
  { to:'/book',    icon:<MapPin size={19}/>,    label:'Schedule Ride' },
  { to:'/wallet',  icon:<Wallet size={19}/>,     label:'Wallet' },
  { to:'/history', icon:<Clock size={19}/>,      label:'Trip History' },
  { to:'/send',    icon:<Package size={19}/>,    label:'Move an Item' },
]
const DRIVER_NAV=[
  { to:'/driver',          icon:<LayoutGrid size={19}/>, label:'Daily Drive', end:true },
  { to:'/driver/earnings', icon:<TrendingUp size={19}/>, label:'Earnings' },
  { to:'/driver/history',  icon:<Clock size={19}/>,      label:'Trip History' },
]

export default function AppLayout({ children, title }){
  const { user, logout, switchRole } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)

  const navItems  = user?.role === 'driver' ? DRIVER_NAV : RIDER_NAV
  // Long date on desktop, compact on phones (the long one truncated in narrow headers)
  const todayLong  = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const todayShort = new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
  const initials  = `${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`.toUpperCase() || 'U'
  const [avatarUrl] = useMyAvatar(user?.id)
  const [walletBalance, setWalletBalance] = useState(null)
  const [hideBalance] = useHiddenBalance()

  useEffect(() => {
    if (!user) return
    api.get('/wallet/balance')
      .then(res => setWalletBalance(res.data?.balance ?? 0))
      .catch(() => setWalletBalance(0))
  }, [user])

  function handleLogout(){
    logout()
    navigate('/login', { replace: true })
  }

  async function handleSwitch(){
    if (switching) return
    const next = user?.role === 'driver' ? 'rider' : 'driver'
    setSwitching(true)
    try {
      await switchRole(next)
      navigate(next === 'driver' ? '/driver' : '/book', { replace: true })
    } catch { /* user doesn't have that role yet */ }
    finally { setSwitching(false) }
  }

  const SidebarContent = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:SB_BG }}>
      {/* Logo — deliberately not a link; logged-in users shouldn't land back on the marketing page */}
      <div style={{ padding:'28px 20px 20px', borderBottom:`1px solid ${SB_BORDER}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width:38, height:38, objectFit:'contain', display:'block', flexShrink:0 }} />
          <span style={{ fontStyle:'normal', fontSize:18, letterSpacing:'-0.01em', color:SB_TEXT }}>
            <span style={{ fontWeight:500 }}>Feazi</span><span style={{ fontWeight:900 }}>Move</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'16px 12px', overflowY:'auto' }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12,
              padding:'11px 14px', borderRadius:12, marginBottom:4,
              textDecoration:'none', fontWeight:600, fontSize:15.5,
              transition:'all 0.15s',
              background: isActive ? SB_ACTIVE_BG : 'transparent',
              color: isActive ? SB_ACTIVE : SB_TEXT,
              border: '1.5px solid transparent',
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('204')) e.currentTarget.style.background = SB_HOVER }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('204')) e.currentTarget.style.background = 'transparent' }}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        <NavLink to="/profile" onClick={() => setOpen(false)}
          style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:12,
            padding:'11px 14px', borderRadius:12, marginTop:8,
            textDecoration:'none', fontWeight:600, fontSize:15.5,
            transition:'all 0.15s',
            background: isActive ? SB_ACTIVE_BG : 'transparent',
            color: isActive ? SB_ACTIVE : SB_TEXT,
            border: '1.5px solid transparent',
          })}>
          <User size={19}/> Profile
        </NavLink>
      </nav>

      {/* User + Logout */}
      <div style={{ padding:'16px 12px', borderTop:`1px solid ${SB_BORDER}` }}>
        {/* Role switcher — only shown when user has both roles */}
        {user?.canRide && user?.canDrive && (
          <button onClick={handleSwitch} disabled={switching}
            style={{ width:'100%', marginBottom:8, padding:'9px 14px', borderRadius:12, border:`1.5px solid ${NEON}`, background:'transparent', color:NEON, fontWeight:700, fontSize:15, cursor:switching?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', opacity:switching?0.6:1, transition:'all 0.15s' }}>
            {switching ? 'Switching…' : user?.role === 'driver' ? 'Switch to Rider' : 'Switch to Driver'}
          </button>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:SB_CARD, marginBottom:8 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <span style={{ color:NT, fontWeight:800, fontSize:15.5 }}>{initials}</span>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:SB_TEXT, fontWeight:700, fontSize:15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ color:SB_MUTED, fontSize:14.5, textTransform:'capitalize', marginTop:1 }}>{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:12, background:SB_CARD, border:`1.5px solid ${SB_BORDER}`, color:SB_TEXT, fontWeight:600, fontSize:15.5, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background=SB_CARD; e.currentTarget.style.color=SB_TEXT; e.currentTarget.style.borderColor=SB_BORDER }}>
          <LogOut size={16}/> Sign Out
        </button>
        {/* Social links — same accounts the marketing footer points at */}
        <div style={{ display:'flex', justifyContent:'center', gap:14, marginTop:12 }}>
          {SOCIALS.map(({ Icon, href, label }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}
              style={{ width:36, height:36, borderRadius:10, display:'flex', alignItems:'center',
                justifyContent:'center', background:SB_CARD, color:SB_TEXT,
                border:`1px solid ${SB_BORDER}`, transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = NEON; e.currentTarget.style.borderColor = NEON }}
              onMouseLeave={e => { e.currentTarget.style.color = SB_TEXT; e.currentTarget.style.borderColor = SB_BORDER }}>
              <Icon size={17}/>
            </a>
          ))}
        </div>

      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:BG }}>
      {/* Desktop sidebar */}
      <aside style={{ width:240, background:SB_BG, borderRight:`1px solid ${SB_BORDER}`, position:'fixed', top:0, left:0, height:'100vh', overflowY:'auto', zIndex:40, flexShrink:0 }} className="desktop-sidebar">
        <SidebarContent/>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)' }} onClick={() => setOpen(false)}/>
          <aside style={{ position:'relative', width:260, background:SB_BG, height:'100%', zIndex:1, overflowY:'auto' }}>
            <SidebarContent/>
          </aside>
        </div>
      )}

      {/* Main */}
      {/* minWidth:0 — flex items otherwise refuse to shrink below their
          content's intrinsic width, pushing the page wider than the phone */}
      <div style={{ flex:1, minWidth:0, marginLeft:240, display:'flex', flexDirection:'column', minHeight:'100vh' }} className="main-content">
        {/* Top bar — fixed (not sticky) so it's guaranteed to stay pinned
            regardless of scroll context quirks */}
        <header style={{ position:'fixed', top:0, left:240, right:0, zIndex:30, background:HEADER, backdropFilter:'blur(10px)', borderBottom:`1px solid ${BORDER}`, padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }} className="app-header">
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex:1 }}>
            <button onClick={() => setOpen(!open)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:TEXT, padding:4, flexShrink:0 }} className="mobile-menu-btn" aria-label="Toggle menu">
              <Menu size={22}/>
            </button>
            <p style={{ fontSize:15.5, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}><span className="fm-date-long">{todayLong}</span><span className="fm-date-short">{todayShort}</span></p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            {/* Wallet balance pill — opens the wallet page for every role */}
            <button onClick={() => navigate('/wallet')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 13px', borderRadius:50, background:NEON, border:'none', cursor:'pointer', textDecoration:'none', flexShrink:0 }}>
              <Wallet size={14} color={NT} strokeWidth={2.5}/>
              <span style={{ fontWeight:800, fontSize:15, color:NT, letterSpacing:'-0.01em' }}>
                {walletBalance === null ? '—' : hideBalance ? maskAmount() : `₦${walletBalance.toLocaleString()}`}
              </span>
            </button>
            {/* Avatar */}
            <NavLink to="/profile" style={{ display:'block', flexShrink:0 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ color:NT, fontWeight:800, fontSize:15 }}>{initials}</span>
                }
              </div>
            </NavLink>
          </div>
        </header>

        <main style={{ flex:1, minWidth:0, padding:'84px 24px 24px', width:'100%', boxSizing:'border-box' }}>
          <h1 style={{ fontWeight:800, fontSize:26, color:TEXT, letterSpacing:'-0.02em', margin:'4px 0 6px' }}>{title}</h1>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; max-width: 100vw; overflow-x: hidden; }
          .mobile-menu-btn { display: flex !important; }
          .app-header { left: 0 !important; }
        }
      `}</style>
    </div>
  )
}
