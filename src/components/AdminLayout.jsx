import { NEON, ON_NEON_HARD as NT, ADMIN_BG as BG, ADMIN_TEXT as TEXT, HEADER,
  SB_BG, SB_BORDER, SB_TEXT, SB_MUTED, SB_CARD, SB_HOVER, CHIP, SB_ACTIVE, SB_ACTIVE_BG } from '../theme/palette'
import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import faviconImg from '../assets/favicon.png'
import {
  LayoutGrid, Users, Car, Navigation, LogOut, Menu, X, Settings, Wallet, AlertTriangle, Instagram, Facebook,
  BarChart3, Map, MapPin, Tag, PackageOpen, ShieldCheck, MessageSquare, FileSearch,
} from 'lucide-react'

/* NEON / NT come from the themed palette */
/* palette: themed tokens — page plane flips with the theme; the sidebar
   below stays dark in both, which is the reference design. */
const SOCIALS = [
  { Icon: Instagram, href: 'https://www.instagram.com/feazimove/', label: 'FeaziMove on Instagram' },
  { Icon: Facebook,  href: 'https://web.facebook.com/profile.php?id=61590273165597', label: 'FeaziMove on Facebook' },
]

const NAV_ACTIVE_BG = 'rgba(204,255,0,0.08)' // faint wash behind the active item

const NAV = [
  { to: '/admin',          icon: <LayoutGrid size={18}/>,    label: 'Dashboard', end: true },
  { to: '/admin/user-management', icon: <Users size={18}/>,  label: 'User Management' },
  { to: '/admin/riders',   icon: <Users size={18}/>,         label: 'Riders' },
  { to: '/admin/drivers',  icon: <Car size={18}/>,           label: 'Drivers' },
  { to: '/admin/rides',    icon: <Navigation size={18}/>,    label: 'Rides' },
  { to: '/admin/payments', icon: <Wallet size={18}/>,        label: 'Payments' },
  { to: '/admin/back-office', icon: <ShieldCheck size={18}/>, label: 'Back Office' },
  { to: '/admin/kyc-access',  icon: <FileSearch size={18}/>,  label: 'KYC Access Log' },
  { to: '/admin/feedback', icon: <MessageSquare size={18}/>,  label: 'Feedback' },
  { to: '/admin/routes',   icon: <Map size={18}/>,           label: 'Routes' },
  { to: '/admin/stops',    icon: <MapPin size={18}/>,        label: 'Stops' },
  { to: '/admin/pricing',  icon: <Tag size={18}/>,           label: 'Pricing' },
  { to: '/admin/alerts',   icon: <AlertTriangle size={18}/>, label: 'Alerts' },
  { to: '/admin/move-waitlist', icon: <PackageOpen size={18}/>, label: 'Move Waitlist' },
  { to: '/admin/reports',  icon: <BarChart3 size={18}/>,     label: 'Reports' },
  { to: '/admin/settings', icon: <Settings size={18}/>,      label: 'Settings' },
]

export default function AdminLayout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // Long date on desktop, compact on phones (the long one truncated in narrow headers)
  const todayLong  = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const todayShort = new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })

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
            <p style={{ margin:0, fontSize:16, fontWeight:900, color:SB_TEXT }}>FeaziMove</p>
            <p style={{ margin:0, fontSize:14.5, color:SB_MUTED }}>Admin Panel</p>
          </div>
        </div>
      </div>

      <nav style={{ flex:1, padding:'16px 12px', overflowY:'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:10,
              marginBottom:4, textDecoration:'none', fontWeight:600, fontSize:15.5, transition:'all 0.15s',
              background: isActive ? SB_ACTIVE_BG : 'transparent',
              color: isActive ? SB_ACTIVE : SB_TEXT,
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('204')) e.currentTarget.style.background = SB_HOVER }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('204')) e.currentTarget.style.background = 'transparent' }}>
            {item.icon}{item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding:'14px 16px', borderTop:`1px solid ${SB_BORDER}` }}>
        <p style={{ color:SB_TEXT, fontSize:15, fontWeight:600, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {user?.email || user?.name}
        </p>
        <p style={{ color:SB_MUTED, fontSize:14.5, margin:'2px 0 12px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Admin</p>
        <button onClick={handleLogout}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px',
            borderRadius:10, background:'rgba(255,255,255,0.06)', border:`1px solid ${SB_BORDER}`,
            color:SB_TEXT, fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
          <LogOut size={15}/> Sign Out
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

      <div style={{ flex:1, minWidth:0, marginLeft:230, display:'flex', flexDirection:'column', minHeight:'100vh' }} className="admin-main-content">
        <header style={{ position:'sticky', top:0, zIndex:30, background:HEADER, borderBottom:`1px solid ${SB_BORDER}`,
          padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <button onClick={() => setOpen(!open)}
              style={{ display:'none', background:CHIP, border:`1px solid ${SB_BORDER}`, borderRadius:10,
                cursor:'pointer', color:TEXT, width:38, height:38, alignItems:'center',
                justifyContent:'center', flexShrink:0, padding:0 }}
              className="admin-mobile-menu-btn" aria-label="Toggle menu">
              <Menu size={20}/>
            </button>
            <p style={{ fontSize:15.5, color:TEXT, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}><span className="fm-date-long">{todayLong}</span><span className="fm-date-short">{todayShort}</span></p>
          </div>
          <p style={{ fontSize:15, color:'#6b7280', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {user?.email || user?.name}
          </p>
        </header>

        <main style={{ flex:1, minWidth:0, padding:24, width:'100%', boxSizing:'border-box' }}>
          <h1 style={{ fontWeight:800, fontSize:26, color:TEXT, letterSpacing:'-0.02em', margin:'4px 0 6px' }}>{title}</h1>
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
