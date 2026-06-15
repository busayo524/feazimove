# FeaziMove — Smart Urban Mobility Platform

> Making Mobility Feasible. Making Everyday Life Easy. **It's Feazi.**

Full-stack web application — React + Vite frontend, Node.js + Express backend, PostgreSQL database.

---

## Complete Project Structure

```
feazimove/
│
├── ── FRONTEND (React + Vite + Tailwind) ──────────────────────────────────────
│
├── index.html                        ← Security headers (CSP, X-Frame-Options…)
├── package.json                      ← Frontend dependencies
├── vite.config.js                    ← Vite build config
├── tailwind.config.js                ← FeaziMove brand colors & fonts
├── postcss.config.js
├── .env.example                      ← Copy to .env.local
├── .gitignore
│
├── public/
│   └── favicon.svg
│
└── src/
    ├── main.jsx                      ← Entry point
    ├── App.jsx                       ← Router + protected routes
    ├── index.css                     ← Tailwind + custom utilities
    │
    ├── context/
    │   └── AuthContext.jsx           ← Global auth state (JWT)
    │
    ├── services/
    │   └── api.js                    ← All API calls + auto JWT attach
    │
    ├── components/                   ← Reusable components
    │   ├── AppLayout.jsx             ← Sidebar layout for app pages
    │   ├── Navbar.jsx                ← Landing page nav
    │   ├── Hero.jsx                  ← Hero section
    │   ├── Stats.jsx                 ← Key metrics
    │   ├── HowItWorks.jsx            ← 4-step explainer
    │   ├── Features.jsx              ← Feature grid
    │   ├── Services.jsx              ← FeaziPool / FeaziSend / FeaziBiz
    │   ├── About.jsx                 ← About + FEAZI values
    │   ├── Testimonials.jsx          ← Reviews carousel
    │   ├── DownloadCTA.jsx           ← App download section
    │   └── Footer.jsx                ← Full footer
    │
    └── pages/
        ├── LandingPage.jsx           ← Public marketing page (/)
        │
        ├── auth/
        │   ├── Login.jsx             ← /login
        │   ├── Register.jsx          ← /register (rider or driver)
        │   └── ForgotPassword.jsx    ← /forgot-password
        │
        ├── rider/
        │   ├── BookRide.jsx          ← /book
        │   ├── TrackRide.jsx         ← /track/:rideId
        │   ├── TripHistory.jsx       ← /history
        │   ├── SendPackage.jsx       ← /send
        │   └── Wallet.jsx            ← /wallet
        │
        ├── driver/
        │   ├── DriverDashboard.jsx   ← /driver
        │   ├── ActiveRide.jsx        ← /driver/ride/:rideId
        │   └── Earnings.jsx          ← /driver/earnings
        │
        └── shared/
            ├── RateRide.jsx          ← /rate/:rideId
            └── Profile.jsx           ← /profile


├── ── BACKEND (Node.js + Express + PostgreSQL) ─────────────────────────────────
│
└── backend/
    ├── server.js                     ← Express app + security middleware
    ├── package.json                  ← Backend dependencies
    ├── .env.example                  ← Copy to .env
    │
    ├── db/
    │   ├── index.js                  ← PostgreSQL pool + query helper
    │   └── migrate.js                ← Creates all tables (run once)
    │
    ├── middleware/
    │   ├── auth.js                   ← JWT verification + role check
    │   └── validate.js               ← express-validator error handler
    │
    └── routes/
        ├── auth.js                   ← /api/auth (register, login, me, profile)
        ├── rides.js                  ← /api/rides (book, track, cancel, rate)
        ├── wallet.js                 ← /api/wallet (balance, fund, webhook)
        └── driver.js                 ← /api/driver (stats, requests, earnings)
```

---

## How to Run

### 1. Frontend
```bash
cd feazimove
cp .env.example .env.local        # add your API URL
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend
```bash
cd feazimove/backend
cp .env.example .env              # fill in DB URL, JWT secret, Flutterwave keys
npm install

# Set up database (PostgreSQL must be running)
node db/migrate.js

# Start server
npm run dev
# → http://localhost:4000
```

---

## Systematic Git Commits

### Phase 1 — Landing Page
```
feat(init): scaffold Vite + React project with Tailwind CSS
chore(security): add CSP and security meta headers to index.html
feat(landing): add Navbar, Hero, Stats, HowItWorks components
feat(landing): add Features, Services, About, Testimonials components
feat(landing): add DownloadCTA and Footer components
style(theme): configure FeaziMove brand colors in tailwind config
```

### Phase 2 — Routing & Auth
```
feat(routing): add React Router v6 with protected route wrapper
feat(auth): add AuthContext with JWT login/register/logout
feat(services): add centralised API service with auto JWT headers
feat(auth): add Login page with sanitized inputs and error handling
feat(auth): add Register page with role selection (rider/driver)
feat(auth): add ForgotPassword with phone enumeration protection
```

### Phase 3 — App Pages
```
feat(layout): add AppLayout sidebar with role-based navigation
feat(rider): add BookRide page with 2-step booking flow
feat(rider): add TrackRide with live status polling and driver card
feat(rider): add TripHistory with filters and summary stats
feat(rider): add SendPackage with multi-step form and validation
feat(rider): add Wallet with Flutterwave top-up and transaction history
feat(shared): add RateRide with star ratings for driver and co-riders
feat(shared): add Profile page with name editing and logout
feat(driver): add DriverDashboard with online toggle and ride requests
feat(driver): add ActiveRide with step-by-step ride progression
feat(driver): add Earnings with daily chart and payout history
```

### Phase 4 — Backend
```
feat(backend): init Express server with helmet, CORS, rate limiting
feat(db): add PostgreSQL pool with parameterized query helper
feat(db): add migration script for users, rides, transactions, ratings
feat(auth-api): add register and login routes with bcrypt + JWT
feat(auth-api): add /me and profile update endpoints
feat(rides-api): add booking, tracking, cancel, and rating routes
feat(wallet-api): add balance, fund, and Flutterwave webhook routes
feat(driver-api): add stats, requests, status toggle, earnings routes
chore(security): add JWT middleware with requireAuth and requireRole
chore(config): add .env.example files for frontend and backend
docs: update README with full structure and setup instructions
```

---

## Security Summary (OWASP Top 10)

| Risk | What we did |
|------|------------|
| Injection | Parameterized queries everywhere — no string interpolation in SQL |
| Broken Auth | bcrypt (12 rounds) · JWT with expiry · timing-safe login |
| Sensitive Data | Wallet stored in kobo (int) · password_hash never returned · no sourcemaps in prod |
| XSS | Input sanitization on all forms · CSP header · `express-validator` escape |
| CSRF | JWT in Authorization header (not cookies) — CSRF not applicable |
| Security Misconfiguration | helmet.js · strict CORS allowlist · no stack traces in prod |
| Rate Limiting | 100 req/15 min global · 10 req/15 min on /auth |
| Access Control | `requireAuth` + `requireRole` on every protected route |
| Clickjacking | `X-Frame-Options: DENY` via helmet |
| Phone Enumeration | ForgotPassword always returns 200 · Login uses timing-safe comparison |

---

## Testing Checklist

```bash
# Frontend
npm run dev
# ✓ Landing page loads at /
# ✓ /register — try registering as rider then as driver
# ✓ /login — try wrong password (should get generic error)
# ✓ /book — try same pickup/destination (should error)
# ✓ /wallet — try amount < 100 (should error)
# ✓ /profile — edit name, click logout

# Backend
cd backend && npm run dev
curl http://localhost:4000/health          # → {"status":"ok"}
curl http://localhost:4000/api/rides       # → 401 (no token)
curl http://localhost:4000/api/auth/me     # → 401 (no token)

# Security
# Try entering <script>alert(1)</script> in any form field → sanitized
# Check no .js.map files in dist/ after npm run build
```

---

## Brand

- **Green:** `#0D7A3E` | **Dark:** `#0A1628` | **Accent:** `#FFB800`
- *"Making Mobility Feasible. Making Everyday Life Easy."*
- *"It's Feazi."*
