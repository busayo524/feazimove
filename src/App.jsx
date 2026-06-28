import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

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
import PoliciesPage    from './pages/landing/PoliciesPage'
import SafetyPage      from './pages/landing/SafetyPage'

// ── Auth ──────────────────────────────────────────────────────────────────────
import Login           from './pages/auth/Login'
import Signup          from './pages/auth/Signup'
import VerifyOtp       from './pages/auth/VerifyOtp'
import EmailSent       from './pages/auth/EmailSent'
import Register        from './pages/auth/Register'
import RoleSelect      from './pages/auth/RoleSelect'
import ForgotPassword  from './pages/auth/ForgotPassword'

// ── Rider ─────────────────────────────────────────────────────────────────────
import BookRide        from './pages/rider/BookRide'
import TripHistory     from './pages/rider/TripHistory'
import SendPackage     from './pages/rider/SendPackage'
import Wallet          from './pages/rider/Wallet'

// ── Driver ────────────────────────────────────────────────────────────────────
import DriverDashboard  from './pages/driver/DriverDashboard'
import Earnings         from './pages/driver/Earnings'
import DriverTripHistory from './pages/driver/TripHistory'

// ── Shared ────────────────────────────────────────────────────────────────────
import RateRide        from './pages/shared/RateRide'
import Profile         from './pages/shared/Profile'

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminDashboard     from './pages/admin/AdminDashboard'
import AdminRiders        from './pages/admin/AdminRiders'
import AdminRiderDetail   from './pages/admin/AdminRiderDetail'
import AdminDrivers       from './pages/admin/AdminDrivers'
import AdminDriverDetail  from './pages/admin/AdminDriverDetail'
import AdminRides         from './pages/admin/AdminRides'
import AdminPayments      from './pages/admin/AdminPayments'
import AdminAlerts        from './pages/admin/AdminAlerts'
import AdminReports       from './pages/admin/AdminReports'
import AdminRoutesPage    from './pages/admin/AdminRoutes'
import AdminStops         from './pages/admin/AdminStops'
import AdminPricing       from './pages/admin/AdminPricing'
import AdminUsers         from './pages/admin/AdminUsers'
import AdminSettings      from './pages/admin/AdminSettings'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--lime)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />
  // Admin must set their own password before touching anything else
  if (user.role === 'admin' && user.forcePasswordChange && location.pathname !== '/admin/settings') {
    return <Navigate to="/admin/settings" replace />
  }
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Marketing pages */}
          <Route path="/"             element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/services"     element={<ServicesPage />} />
          <Route path="/about"        element={<AboutPage />} />
          <Route path="/contact"      element={<ContactPage />} />
          <Route path="/policies"     element={<PoliciesPage />} />
          <Route path="/safety"       element={<SafetyPage />} />

          {/* Auth — signup flow */}
          <Route path="/login"              element={<Login />} />
          <Route path="/signup"             element={<Signup />} />
          <Route path="/signup/:role"       element={<Signup />} />
          <Route path="/verify-otp"         element={<VerifyOtp />} />
          <Route path="/email-sent"         element={<EmailSent />} />
          {/* Role selection page — two cards: Rider and Driver */}
          <Route path="/register"           element={<RoleSelect />} />
          {/* Multi-step registration wizard — reached after OTP verification */}
          <Route path="/register/:role"     element={<Register />} />
          <Route path="/forgot-password"    element={<ForgotPassword />} />

          {/* Rider */}
          <Route path="/book"          element={<ProtectedRoute requiredRole="rider"><BookRide /></ProtectedRoute>} />
          <Route path="/history"       element={<ProtectedRoute requiredRole="rider"><TripHistory /></ProtectedRoute>} />
          <Route path="/send"          element={<ProtectedRoute requiredRole="rider"><SendPackage /></ProtectedRoute>} />
          <Route path="/wallet"        element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/rate/:rideId"  element={<ProtectedRoute><RateRide /></ProtectedRoute>} />

          {/* Driver */}
          <Route path="/driver"              element={<ProtectedRoute requiredRole="driver"><DriverDashboard /></ProtectedRoute>} />
          <Route path="/driver/earnings"     element={<ProtectedRoute requiredRole="driver"><Earnings /></ProtectedRoute>} />
          <Route path="/driver/history"      element={<ProtectedRoute requiredRole="driver"><DriverTripHistory /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin"                element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/riders"         element={<ProtectedRoute requiredRole="admin"><AdminRiders /></ProtectedRoute>} />
          <Route path="/admin/riders/:id"     element={<ProtectedRoute requiredRole="admin"><AdminRiderDetail /></ProtectedRoute>} />
          <Route path="/admin/drivers"        element={<ProtectedRoute requiredRole="admin"><AdminDrivers /></ProtectedRoute>} />
          <Route path="/admin/drivers/:id"    element={<ProtectedRoute requiredRole="admin"><AdminDriverDetail /></ProtectedRoute>} />
          <Route path="/admin/rides"          element={<ProtectedRoute requiredRole="admin"><AdminRides /></ProtectedRoute>} />
          <Route path="/admin/payments"       element={<ProtectedRoute requiredRole="admin"><AdminPayments /></ProtectedRoute>} />
          <Route path="/admin/routes"         element={<ProtectedRoute requiredRole="admin"><AdminRoutesPage /></ProtectedRoute>} />
          <Route path="/admin/stops"          element={<ProtectedRoute requiredRole="admin"><AdminStops /></ProtectedRoute>} />
          <Route path="/admin/pricing"        element={<ProtectedRoute requiredRole="admin"><AdminPricing /></ProtectedRoute>} />
          <Route path="/admin/alerts"         element={<ProtectedRoute requiredRole="admin"><AdminAlerts /></ProtectedRoute>} />
          <Route path="/admin/reports"        element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/users"          element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/settings"       element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}
