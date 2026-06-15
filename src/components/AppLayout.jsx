import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import faviconImg from '../assets/favicon.png'
import { Home, MapPin, Package, Clock, Wallet, User, LogOut, Menu, X, Car, TrendingUp, Bell, ChevronRight } from 'lucide-react'

function NavItem({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12,
      fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'all 0.18s',
      background: active ? 'rgba(204,255,0,0.12)' : 'transparent',
      color: active ? '#ccff00' : 'rgba(255,255,255,0.5)',
      border: active ? '1px solid rgba(204,255,0,0.20)' : '1px solid transparent',
    }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#ffffff' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' } }}
    >
      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
      <span>{label}</span>
      {active && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
    </Link>
  )
}

function Sidebar({ user, navItems, onLogout, onClose }) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#080808', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px 16px', width: 256 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, paddingLeft: 4 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={faviconImg} alt="FeaziMove" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontStyle: 'italic', fontSize: 17, letterSpacing: '-0.01em', color: '#ffffff' }}>
            <span style={{ fontWeight: 500 }}>Feazi</span>
            <span style={{ fontWeight: 900 }}>Move</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(204,255,0,0.15)', border: '1.5px solid rgba(204,255,0,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, color: '#ccff00', flexShrink: 0 }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#ffffff', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'capitalize', marginTop: 1 }}>{user?.role || 'rider'}</p>
          </div>
        </div>
        {user?.role === 'rider' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(204,255,0,0.08)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Wallet</span>
            <span style={{ color: '#ccff00', fontWeight: 800, fontSize: 14 }}>\u20a6{(user?.walletBalance || 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

      <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid transparent', cursor: 'pointer', width: '100%', transition: 'all 0.18s' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'none' }}>
        <LogOut size={17} /> Sign Out
      </button>
    </aside>
  )
}

export default function AppLayout({ children, title }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const riderNav = [
    { to: '/book',    icon: Home,    label: 'Book a Ride' },
    { to: '/send',    icon: Package, label: 'Send Package' },
    { to: '/history', icon: Clock,   label: 'Trip History' },
    { to: '/wallet',  icon: Wallet,  label: 'My Wallet'   },
    { to: '/profile', icon: User,    label: 'Profile'     },
  ]
  const driverNav = [
    { to: '/driver',          icon: Car,       label: 'Dashboard' },
    { to: '/driver/earnings', icon: TrendingUp, label: 'Earnings'  },
    { to: '/wallet',          icon: Wallet,    label: 'My Wallet' },
    { to: '/profile',         icon: User,      label: 'Profile'   },
  ]
  const navItems = (user?.role === 'driver' ? driverNav : riderNav).map(item => ({ ...item, active: location.pathname === item.to }))

  function handleLogout() { logout(); navigate('/') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0a0a' }}>
      <div className="hidden lg:flex" style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: 256, zIndex: 40, flexDirection: 'column' }}>
        <Sidebar user={user} navItems={navItems} onLogout={handleLogout} />
      </div>

      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }} className="lg:hidden">
          <Sidebar user={user} navItems={navItems} onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="lg:ml-64">
        <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: 8, color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <h1 style={{ color: '#ffffff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>{title}</h1>
          </div>
          <button style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Notifications">
            <Bell size={18} />
            <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, background: '#ccff00', borderRadius: '50%' }} />
          </button>
        </header>
        <main style={{ flex: 1, padding: '24px 16px' }} className="sm:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
