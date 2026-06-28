import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import faviconImg from '../assets/favicon.png'
import {
  LayoutGrid, Users, Car, Navigation, UserCog, LogOut, Menu, X, Settings, Wallet, AlertTriangle,
  BarChart3, Map, MapPin, Tag,
} from 'lucide-react'

const SB_BG = '#0a0a0a', SB_BORDER = 'rgba(255,255,255,0.08)'
const SB_TEXT = '#cbd5c0', SB_MUTED = '#6b8a55', SB_HOVER = 'rgba(255,255,255,0.08)'
const NEON = '#ccff00', NT = '#0a0a0a'
const BG = '#f5f7f2', TEXT = '#1a1a1a'

const NAV = [
  { to: '/admin',          icon: <LayoutGrid size={18}/>,    label: 'Dashboard', end: true },
  { to: '/admin/riders',   icon: <Users size={18}/>,         label: 'Riders' },
  { to: '/admin/drivers',  icon: <Car size={18}/>,           label: 'Drivers' },
  { to: '/admin/rides',    icon: <Navigation size={18}/>,    label: 'Rides' },
  { to: '/admin/payments', icon: <Wallet size={18}/>,        label: 'Payments' },
  { to: '/admin/routes',   icon: <Map size={18}/>,           label: 'Routes' },
  { to: '/admin/stops',    icon: <MapPin size={18}/>,        label: 'Stops' },
  { to: '/admin/pricing',  icon: <Tag size={18}/>,           label: 'Pricing' },
  { to: '/admin/alerts',   icon: <AlertTriangle size={18}/>, label: 'Alerts' },
  { to: '/admin/reports',  icon: <BarChart3 size={18}/>,     label: 'Reports' },
  { to: '/admin/users',    icon: <UserCog size={18}/>,       label: 'User Management' },
  { to: '/admin/settings', icon: <Settings size={18}/>,      label: 'Settings' },
]

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const SidebarContent = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:SB_BG }}>
      <div style={{ padding:'24px 20px', borderBottom:`1px solid ${SB_BORDER}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width:34, height:34, objectFit:'contain' }}/>
          <div>
            <p style={{ margin:0, fontSize:16, fontWeight:900, color:'#fff' }}>FeaziMove</p>
            <p style={{ margin:0, fontSize:11, color:SB_MUTED }}>Admin Panel</p>
          </div>
        </div>
      </div>

      <nav style={{ flex:1, padding:'16px 12px', overflowY:'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10,
              marginBottom:4, textDecoration:'none', fontWeight:600, fontSize:14, transition:'all 0.15s',
              background: isActive ? NEON : 'transparent',
              color: isActive ? NT : SB_TEXT,
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('204')) e.currentTarget.style.background = SB_HOVER }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('204')) e.currentTarget.style.background = 'transparent' }}>
            {item.icon}{item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding:'14px 16px', borderTop:`1px solid ${SB_BORDER}` }}>
        <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {user?.email || user?.name}
        </p>
        <p style={{ color:SB_MUTED, fontSize:11, margin:'2px 0 12px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Admin</p>
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px',
            borderRadius:10, background:'rgba(255,255,255,0.06)', border:`1px solid ${SB_BORDER}`,
            color:SB_TEXT, fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          <LogOut size={15}/> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:BG, colorScheme:'light' }}>
      <aside style={{ width:230, position:'fixed', top:0, left:0, height:'100vh', zIndex:40, flexShrink:0 }} className="admin-desktop-sidebar">
        <SidebarContent/>
      </aside>

      {open && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)}/>
          <aside style={{ position:'relative', width:240, height:'100%', zIndex:1 }}>
            <SidebarContent/>
          </aside>
        </div>
      )}

      <div style={{ flex:1, marginLeft:230, display:'flex', flexDirection:'column', minHeight:'100vh' }} className="admin-main-content">
        <header style={{ position:'sticky', top:0, zIndex:30, background:'#fff', borderBottom:'1px solid #e5e7eb',
          padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <button onClick={() => setOpen(!open)} style={{ display:'none', background:'none', border:'none', cursor:'pointer', color:TEXT, padding:4, flexShrink:0 }}
              className="admin-mobile-menu-btn" aria-label="Toggle menu">
              <Menu size={22}/>
            </button>
            <h1 style={{ fontWeight:800, fontSize:18, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>{title}</h1>
          </div>
        </header>

        <main style={{ flex:1, padding:24, maxWidth:1200, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .admin-desktop-sidebar { display:none !important; }
          .admin-main-content { margin-left:0 !important; }
          .admin-mobile-menu-btn { display:flex !important; }
        }
      `}</style>
    </div>
  )
}
