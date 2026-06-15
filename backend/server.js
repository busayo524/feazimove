/**
 * FeaziMove API Server
 * Security: helmet, CORS allowlist, rate limiting, no stack traces in prod
 */
require('dotenv').config()
const express    = require('express')
const helmet     = require('helmet')
const cors       = require('cors')
const rateLimit  = require('express-rate-limit')

const authRoutes   = require('./routes/auth')
const rideRoutes   = require('./routes/rides')
const walletRoutes = require('./routes/wallet')
const driverRoutes = require('./routes/driver')

const app  = express()
const PORT = process.env.PORT || 4000

// ── Security headers (OWASP) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))

// ── CORS — only allow frontend origin ────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

// In development also always allow localhost variants
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true)
    const allowed = [...ALLOWED_ORIGINS, ...(process.env.NODE_ENV !== 'production' ? DEV_ORIGINS : [])]
    if (allowed.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10kb' })) // Prevent large payload attacks

// ── Global rate limit ────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
}))

// ── Stricter rate limit for auth endpoints ───────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
})

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',   authLimiter, authRoutes)
app.use('/api/rides',  rideRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/driver', driverRoutes)

// ── Health check (public, no sensitive info) ─────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ message: 'Not found' }))

// ── Global error handler — NEVER expose stack traces in production ────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // Log internally (use a real logger like Winston in production)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`)

  const status = err.status || 500
  res.status(status).json({
    message: process.env.NODE_ENV === 'production'
      ? status === 500 ? 'An internal error occurred.' : err.message
      : err.message,
  })
})

app.listen(PORT, () => {
  console.log(`FeaziMove API running on http://localhost:${PORT}`)
})

module.exports = app
