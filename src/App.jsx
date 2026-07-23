import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StandaloneGate, StandaloneSplash } from './components/StandaloneApp'

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

// ── Pages ─────────────────────────────────────────────────────────────────────
// Only the homepage ships in the entry bundle — every other page is a lazy
// chunk fetched on navigation, so a first-time marketing visitor doesn't
// download the rider app and admin panel just to read the landing page.
const lazy = React.lazy

// Marketing / Public
import HomePage        from './pages/landing/HomePage'
const HowItWorksPage  = lazy(() => import('./pages/landing/HowItWorksPage'))
const ServicesPage    = lazy(() => import('./pages/landing/ServicesPage'))
const AboutPage       = lazy(() => import('./pages/landing/AboutPage'))
const ContactPage     = lazy(() => import('./pages/landing/ContactPage'))
const PoliciesPage    = lazy(() => import('./pages/landing/PoliciesPage'))
const SafetyPage      = lazy(() => import('./pages/landing/SafetyPage'))

// Auth
const Login           = lazy(() => import('./pages/auth/Login'))
const Signup          = lazy(() => import('./pages/auth/Signup'))
const VerifyOtp       = lazy(() => import('./pages/auth/VerifyOtp'))
const EmailSent       = lazy(() => import('./pages/auth/EmailSent'))
const Register        = lazy(() => import('./pages/auth/Register'))
const RegisterPending = lazy(() => import('./pages/auth/RegisterPending'))
const RoleSelect      = lazy(() => import('./pages/auth/RoleSelect'))
const ForgotPassword  = lazy(() => import('./pages/auth/ForgotPassword'))

// Rider
const BookRide        = lazy(() => import('./pages/rider/BookRide'))
const TripHistory     = lazy(() => import('./pages/rider/TripHistory'))
const SendPackage     = lazy(() => import('./pages/rider/SendPackage'))
const Wallet          = lazy(() => import('./pages/rider/Wallet'))

// Driver
const DriverDashboard   = lazy(() => import('./pages/driver/DriverDashboard'))
const Earnings          = lazy(() => import('./pages/driver/Earnings'))
const DriverTripHistory = lazy(() => import('./pages/driver/TripHistory'))

// Shared
const RateRide        = lazy(() => import('./pages/shared/RateRide'))
const Profile         = lazy(() => import('./pages/shared/Profile'))

// Admin
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminRiders         = lazy(() => import('./pages/admin/AdminRiders'))
const AdminRiderDetail    = lazy(() => import('./pages/admin/AdminRiderDetail'))
const AdminDrivers        = lazy(() => import('./pages/admin/AdminDrivers'))
const AdminDriverDetail   = lazy(() => import('./pages/admin/AdminDriverDetail'))
const AdminRides          = lazy(() => import('./pages/admin/AdminRides'))
const AdminPayments       = lazy(() => import('./pages/admin/AdminPayments'))
const AdminBackOffice     = lazy(() => import('./pages/admin/AdminBackOffice'))
const AdminAlerts         = lazy(() => import('./pages/admin/AdminAlerts'))
const AdminMoveWaitlist   = lazy(() => import('./pages/admin/AdminMoveWaitlist'))
const AdminReports        = lazy(() => import('./pages/admin/AdminReports'))
const AdminRoutesPage     = lazy(() => import('./pages/admin/AdminRoutes'))
const AdminStops          = lazy(() => import('./pages/admin/AdminStops'))
const AdminPricing        = lazy(() => import('./pages/admin/AdminPricing'))
const AdminUserDetail     = lazy(() => import('./pages/admin/AdminUserDetail'))
const AdminUserManagement = lazy(() => import('./pages/admin/AdminUserManagement'))
const AdminSettings       = lazy(() => import('./pages/admin/AdminSettings'))

// Shown while a lazy page chunk downloads
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--lime)', borderTopColor: 'transparent' }} />
    </div>
  )
}

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
  // Admins should never land on rider/driver pages — send them to the admin panel
  if (user.role === 'admin' && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />
  }
  // Admin must set their own password before touching anything else
  if (user.role === 'admin' && user.forcePasswordChange && location.pathname !== '/admin/settings') {
    return <Navigate to="/admin/settings" replace />
  }
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
    {/* basename follows Vite's `base` so the same code works at the domain
        root (feazimove.com) and under Catalyst's /app/ development path */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        {/* Installed-app behavior: branded splash, then straight to the
            internal experience — marketing pages redirect to login/dashboard */}
        <StandaloneGate />
        <StandaloneSplash />
        <React.Suspense fallback={<PageLoader />}>
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
          <Route path="/register/pending"   element={<RegisterPending />} />
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
          <Route path="/admin/back-office"    element={<ProtectedRoute requiredRole="admin"><AdminBackOffice /></ProtectedRoute>} />
          <Route path="/admin/routes"         element={<ProtectedRoute requiredRole="admin"><AdminRoutesPage /></ProtectedRoute>} />
          <Route path="/admin/stops"          element={<ProtectedRoute requiredRole="admin"><AdminStops /></ProtectedRoute>} />
          <Route path="/admin/pricing"        element={<ProtectedRoute requiredRole="admin"><AdminPricing /></ProtectedRoute>} />
          <Route path="/admin/alerts"         element={<ProtectedRoute requiredRole="admin"><AdminAlerts /></ProtectedRoute>} />
          <Route path="/admin/move-waitlist"  element={<ProtectedRoute requiredRole="admin"><AdminMoveWaitlist /></ProtectedRoute>} />
          <Route path="/admin/reports"        element={<ProtectedRoute requiredRole="admin"><AdminReports /></ProtectedRoute>} />
          {/* Old Users page merged into User Management */}
          <Route path="/admin/users"             element={<Navigate to="/admin/user-management" replace />} />
          <Route path="/admin/users/:id"         element={<ProtectedRoute requiredRole="admin"><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/user-management"   element={<ProtectedRoute requiredRole="admin"><AdminUserManagement /></ProtectedRoute>} />
          <Route path="/admin/settings"       element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </React.Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
