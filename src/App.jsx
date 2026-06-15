import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff', color: '#c00' }}>
        <h2>Runtime Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{String(this.state.error)}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#666' }}>{this.state.error?.stack}</pre>
      </div>
    )
    return this.props.children
  }
}

// ── Marketing / Public pages ──────────────────────────────────────────────────
import HomePage        from './pages/landing/HomePage'
import HowItWorksPage  from './pages/landing/HowItWorksPage'
import ServicesPage    from './pages/landing/ServicesPage'
import AboutPage       from './pages/landing/AboutPage'
import ContactPage     from './pages/landing/ContactPage'

// ── Auth ──────────────────────────────────────────────────────────────────────
import Login           from './pages/auth/Login'
import Register        from './pages/auth/Register'
import ForgotPassword  from './pages/auth/ForgotPassword'

// ── Rider ─────────────────────────────────────────────────────────────────────
import BookRide        from './pages/rider/BookRide'
import TrackRide       from './pages/rider/TrackRide'
import TripHistory     from './pages/rider/TripHistory'
import SendPackage     from './pages/rider/SendPackage'
import Wallet          from './pages/rider/Wallet'

// ── Driver ────────────────────────────────────────────────────────────────────
import DriverDashboard from './pages/driver/DriverDashboard'
import ActiveRide      from './pages/driver/ActiveRide'
import Earnings        from './pages/driver/Earnings'

// ── Shared ────────────────────────────────────────────────────────────────────
import RateRide        from './pages/shared/RateRide'
import Profile         from './pages/shared/Profile'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--lime)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Marketing pages */}
          <Route path="/"             element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/services"     element={<ServicesPage />} />
          <Route path="/about"        element={<AboutPage />} />
          <Route path="/contact"      element={<ContactPage />} />

          {/* Auth */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Rider */}
          <Route path="/book"          element={<ProtectedRoute requiredRole="rider"><BookRide /></ProtectedRoute>} />
          <Route path="/track/:rideId" element={<ProtectedRoute requiredRole="rider"><TrackRide /></ProtectedRoute>} />
          <Route path="/history"       element={<ProtectedRoute requiredRole="rider"><TripHistory /></ProtectedRoute>} />
          <Route path="/send"          element={<ProtectedRoute requiredRole="rider"><SendPackage /></ProtectedRoute>} />
          <Route path="/wallet"        element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/rate/:rideId"  element={<ProtectedRoute><RateRide /></ProtectedRoute>} />

          {/* Driver */}
          <Route path="/driver"              element={<ProtectedRoute requiredRole="driver"><DriverDashboard /></ProtectedRoute>} />
          <Route path="/driver/ride/:rideId" element={<ProtectedRoute requiredRole="driver"><ActiveRide /></ProtectedRoute>} />
          <Route path="/driver/earnings"     element={<ProtectedRoute requiredRole="driver"><Earnings /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
