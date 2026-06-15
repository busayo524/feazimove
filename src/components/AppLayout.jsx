import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import faviconImg from '../assets/favicon.png'
import {
  MapPin, Clock, Package, Wallet, User, LogOut, Menu, X,
  Car, TrendingUp, Navigation, LayoutGrid,
} from 'lucide-react'

const NEON='#ccff00', NT='#0a0a0a', BG='#f5f7fa', CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280'
const NL='#f9ffe0', NB='#e8ff80'

const RIDER_NAV=[
  { to:'/book',    icon:<MapPin size={19}/>,    label:'Book Ride' },
  { to:'/track/1', icon:<Navigation size={19}/>, label:'Track Ride' },
  { to:'/history', icon:<Clock size={19}/>,      label:'Trip History' },
  { to:'/send',    icon:<Package size={19}/>,    label:'Send Package' },
  { to:'/wallet',  icon:<Wallet size={19}/>,     label:'Wallet' },
]
const DRIVER_NAV=[
  { to:'/driver',       icon:<LayoutGrid size={19}/>, label:'Dashboard' },
  { to:'/driver/ride/1',icon:<Car size={19}/>,        label:'Active Ride' },
  { to:'/earnings',     icon:<TrendingUp size={19}/>, label:'Earnings' },
  { to:'/wallet',       icon:<Wallet size={19}/>,     label:'Wallet' },
]

export default function AppLayout({ children, title }){
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const navItems = user?.role === 'driver' ? DRIVER_NAV : RIDER_NAV
  const initials = `${user?.firstName?.[0]||''}${user?.lastName?.[0]||''}`.toUpperCase() || 'U'

  function handleLogout(){
    logout()
    navigate('/login', { replace: true })
  }

  const SidebarContent = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Logo */}
      <div style={{ padding:'28px 20px 20px', borderBottom:`1px solid ${BORDER}` }}>
        <NavLink to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width:38, height:38, objectFit:'contain', display:'block', flexShrink:0 }} />
          <span style={{ fontStyle:'italic', fontSize:18, letterSpacing:'-0.01em', color:TEXT }}>
            <span style={{ fontWeight:500 }}>Feazi</span><span style={{ fontWeight:900 }}>Move</span>
          </span>
        </NavLink>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'16px 12px', overflowY:'auto' }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12,
              padding:'11px 14px', borderRadius:12, marginBottom:4,
              textDecoration:'none', fontWeight:600, fontSize:14,
              transition:'all 0.15s',
              background: isActive ? NEON : CARD,
              color: isActive ? NT : MUTED,
              border: isActive ? `1.5px solid ${NB}` : '1.5px solid transparent',
            })}>
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
            background: isActive ? NEON : CARD,
            color: isActive ? NT : MUTED,
            border: isActive ? `1.5px solid ${NB}` : '1.5px solid transparent',
          })}>
          <User size={19}/> Profile
        </NavLink>
      </nav>

      {/* User + Logout */}
      <div style={{ padding:'16px 12px', borderTop:`1px solid ${BORDER}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:BG, marginBottom:8 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:NT, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ color:NEON, fontWeight:800, fontSize:14 }}>{initials}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ color:TEXT, fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ color:MUTED, fontSize:11, textTransform:'capitalize', marginTop:1 }}>{user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:12, background:CARD, border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.borderColor='#fca5a5' }}
          onMouseLeave={e => { e.currentTarget.style.background=CARD; e.currentTarget.style.color=MUTED; e.currentTarget.style.borderColor=BORDER }}>
          <LogOut size={16}/> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:BG }}>
      {/* Desktop sidebar */}
      <aside style={{ width:240, background:CARD, borderRight:`1px solid ${BORDER}`, position:'fixed', top:0, left:0, height:'100vh', overflowY:'auto', zIndex:40, flexShrink:0 }} className="desktop-sidebar">
        <SidebarContent/>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.3)' }} onClick={() => setOpen(false)}/>
          <aside style={{ position:'relative', width:260, background:CARD, height:'100%', zIndex:1, overflowY:'auto' }}>
            <SidebarContent/>
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={{ flex:1, marginLeft:240, display:'flex', flexDirection:'column', minHeight:'100vh' }} className="main-content">
        {/* Top bar */}
        <header style={{ position:'sticky', top:0, zIndex:30, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)', borderBottom:`1px solid ${BORDER}`, padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setOpen(!open)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:TEXT, padding:4 }} className="mobile-menu-btn" aria-label="Toggle menu">
              <Menu size={22}/>
            </button>
            <h1 style={{ fontWeight:800, fontSize:18, color:TEXT, letterSpacing:'-0.02em' }}>{title}</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:NT, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:NEON, fontWeight:800, fontSize:13 }}>{initials}</span>
            </div>
          </div>
        </header>

        <main style={{ flex:1, padding:'24px', maxWidth:720, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
