import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { useMyAvatar } from '../hooks/useMyAvatar'
import faviconImg from '../assets/favicon.png'
import {
  MapPin, Clock, Package, Wallet, User, LogOut, Menu, X,
  TrendingUp, LayoutGrid,
} from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', BG='#f6f7f9', BORDER='#e5e7eb', TEXT='#1a2800'

// Sidebar-specific palette
const SB_BG      = '#1a2400'          // sidebar background — very deep lime neon
const SB_BORDER  = 'rgba(255,255,255,0.08)'
const SB_TEXT    = '#e8f5d0'          // inactive label
const SB_MUTED   = '#7aad40'          // subdued text
const SB_CARD    = 'rgba(255,255,255,0.06)'  // user card / sign out bg
const SB_HOVER   = 'rgba(255,255,255,0.08)'
const NAV_ACTIVE_BG = 'rgba(204,255,0,0.08)' // faint wash behind the active item

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
  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const initials  = `${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`.toUpperCase() || 'U'
  const [avatarUrl] = useMyAvatar(user?.id)
  const [walletBalance, setWalletBalance] = useState(null)

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
          <span style={{ fontStyle:'normal', fontSize:18, letterSpacing:'-0.01em', color:'#fff' }}>
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
              textDecoration:'none', fontWeight:600, fontSize:14,
              transition:'all 0.15s',
              background: isActive ? NAV_ACTIVE_BG : 'transparent',
              color: isActive ? NEON : SB_TEXT,
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
            textDecoration:'none', fontWeight:600, fontSize:14,
            transition:'all 0.15s',
            background: isActive ? NAV_ACTIVE_BG : 'transparent',
            color: isActive ? NEON : SB_TEXT,
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
            style={{ width:'100%', marginBottom:8, padding:'9px 14px', borderRadius:12, border:`1.5px solid ${NEON}`, background:'transparent', color:NEON, fontWeight:700, fontSize:13, cursor:switching?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', opacity:switching?0.6:1, transition:'all 0.15s' }}>
            {switching ? 'Switching…' : user?.role === 'driver' ? 'Switch to Rider' : 'Switch to Driver'}
          </button>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:SB_CARD, marginBottom:8 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <span style={{ color:NT, fontWeight:800, fontSize:14 }}>{initials}</span>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:'#fff', fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ color:SB_MUTED, fontSize:11, textTransform:'capitalize', marginTop:1 }}>{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:12, background:SB_CARD, border:`1.5px solid ${SB_BORDER}`, color:SB_TEXT, fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.background=SB_CARD; e.currentTarget.style.color=SB_TEXT; e.currentTarget.style.borderColor=SB_BORDER }}>
          <LogOut size={16}/> Sign Out
        </button>
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
      <div style={{ flex:1, marginLeft:240, display:'flex', flexDirection:'column', minHeight:'100vh' }} className="main-content">
        {/* Top bar — fixed (not sticky) so it's guaranteed to stay pinned
            regardless of scroll context quirks */}
        <header style={{ position:'fixed', top:0, left:240, right:0, zIndex:30, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(10px)', borderBottom:`1px solid ${BORDER}`, padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }} className="app-header">
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex:1 }}>
            <button onClick={() => setOpen(!open)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:TEXT, padding:4, flexShrink:0 }} className="mobile-menu-btn" aria-label="Toggle menu">
              <Menu size={22}/>
            </button>
            <p style={{ fontSize:14, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>{today}</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            {/* Wallet balance pill — opens the wallet page for every role */}
            <button onClick={() => navigate('/wallet')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 13px', borderRadius:50, background:NEON, border:'none', cursor:'pointer', textDecoration:'none', flexShrink:0 }}>
              <Wallet size={14} color={NT} strokeWidth={2.5}/>
              <span style={{ fontWeight:800, fontSize:13, color:NT, letterSpacing:'-0.01em' }}>
                {walletBalance === null ? '—' : `₦${walletBalance.toLocaleString()}`}
              </span>
            </button>
            {/* Avatar */}
            <NavLink to="/profile" style={{ display:'block', flexShrink:0 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:NEON, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <span style={{ color:NT, fontWeight:800, fontSize:13 }}>{initials}</span>
                }
              </div>
            </NavLink>
          </div>
        </header>

        <main style={{ flex:1, padding:'84px 24px 24px', width:'100%', boxSizing:'border-box' }}>
          <h1 style={{ fontWeight:800, fontSize:26, color:TEXT, letterSpacing:'-0.02em', margin:'4px 0 6px' }}>{title}</h1>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
          .app-header { left: 0 !important; }
        }
      `}</style>
    </div>
  )
}
