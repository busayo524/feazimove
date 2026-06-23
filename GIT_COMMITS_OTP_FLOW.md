# Git Commit Guide — OTP Email Verification Flow

Run these in order after verifying each change works.

---

## Commit 1 — Database schema

```bash
git add backend/db/migrate.js
git commit -m "feat(db): add email_otps table and email verification columns to users

- Add email_verified, is_pending, registration_token, reg_token_expires to users
- Add email_otps table with bcrypt-hashed OTPs, expiry, and single-use flag
- Add indexes on user_id and expires_at for efficient OTP lookups

Security: OTPs stored as bcrypt hashes — raw code never persisted to DB"
```

---

## Commit 2 — Email service

```bash
git add backend/services/emailService.js
git commit -m "feat(email): add Nodemailer email service with OTP and registration link templates

- generateOtp() uses crypto.randomInt to avoid modulo bias
- sendOtpEmail() sends branded 6-digit OTP with 10-min expiry notice
- sendRegistrationLink() sends role-specific continuation email with 24h token link
- Emails include HTML + plain-text fallback and FeaziMove branding

Security: raw OTP passed to template only; caller hashes before DB storage"
```

---

## Commit 3 — Backend auth routes

```bash
git add backend/routes/auth.js
git commit -m "feat(auth): implement 4-step OTP email verification signup flow

New endpoints:
  POST /api/auth/signup        — creates pending user, sends OTP email
  POST /api/auth/verify-otp   — verifies OTP, sends registration link email
  POST /api/auth/resend-otp   — invalidates old OTP and sends new one
  GET  /api/auth/validate-reg-token — validates 24h registration token from email link
  POST /api/auth/register     — now token-gated; activates verified pending user

Security hardening:
  - Generic responses on signup to prevent email/phone enumeration
  - OTP compared with bcrypt.compare (timing-safe, prevents oracle attacks)
  - OTPs are single-use — marked used=true immediately after verification
  - Registration tokens are UUIDs with 24h expiry, cleared after use
  - Stale pending signups cleaned before new signup attempt
  - All endpoints rate-limited via existing authLimiter in server.js"
```

---

## Commit 4 — Install nodemailer

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore(deps): install nodemailer@9 for SMTP email delivery"
```

---

## Commit 5 — Signup page

```bash
git add src/pages/auth/Signup.jsx
git commit -m "feat(ui): add Signup.jsx — beautiful initial registration form

Fields: full name, email, phone, password (with strength meter), confirm password
Features:
  - Role selector (rider / driver) with animated toggle
  - Real-time password strength indicator (5 levels)
  - Inline validation with clear error messages
  - On submit: POST /api/auth/signup → redirects to /verify-otp with userId in nav state
  - Input sanitization on all fields
  - Mobile responsive layout"
```

---

## Commit 6 — OTP verification page

```bash
git add src/pages/auth/VerifyOtp.jsx
git commit -m "feat(ui): add VerifyOtp.jsx — 6-digit OTP entry with countdown timer

Features:
  - 6 individual digit input boxes with auto-advance on entry
  - Paste support — paste a 6-digit code and it fills all boxes
  - Keyboard navigation (arrow keys, backspace)
  - 10-minute countdown timer (turns red under 60s)
  - Resend button with 60-second cooldown
  - Success animation before redirect to /email-sent
  - Guards against direct URL access (redirects to /signup if no state)

Security: userId passed via navigation state — never exposed in URL"
```

---

## Commit 7 — Email sent page

```bash
git add src/pages/auth/EmailSent.jsx
git commit -m "feat(ui): add EmailSent.jsx — post-verification confirmation screen

Shows:
  - Animated success checkmark
  - Masked email address confirmation
  - Step-by-step guide of what happens next (role-specific)
  - Spam folder reminder
  - Open email app CTA button"
```

---

## Commit 8 — Wire routes in App.jsx

```bash
git add src/App.jsx
git commit -m "feat(router): add /signup, /verify-otp, /email-sent routes

- /signup and /signup/:role → Signup component
- /verify-otp → VerifyOtp component (guarded by nav state)
- /email-sent → EmailSent component (guarded by nav state)
- Existing /register/:role preserved for legacy and token-link flow"
```

---

## Commit 9 — Register.jsx token gate

```bash
git add src/pages/auth/Register.jsx
git commit -m "feat(auth): gate Register.jsx behind email verification token

- On mount, validates ?token= query param via GET /api/auth/validate-reg-token
- Shows loading spinner while validating
- Shows expired-link screen with link back to /signup if token invalid
- Passes registrationToken to register() on final submit
- Adds useSearchParams import for token extraction"
```

---

## Commit 10 — Environment config

```bash
git add backend/.env.example 2>/dev/null || true
git commit -m "chore(config): add SMTP email environment variables

Variables added:
  APP_URL        — frontend URL for email links
  SMTP_HOST      — SMTP server hostname
  SMTP_PORT      — SMTP port (587 for TLS, 465 for SSL)
  SMTP_SECURE    — true for port 465 (SSL), false for STARTTLS
  SMTP_USER      — SMTP username / email address
  SMTP_PASS      — App password (NOT your real email password)
  SMTP_FROM      — Display name and address for outgoing emails

Note: .env is in .gitignore — never commit real credentials"
```

---

## After all commits

```bash
# Run DB migration to add new columns/tables
cd backend && node db/migrate.js

# Start backend
npm run dev

# In another terminal — start frontend
cd .. && npm run dev
```

## Testing checklist

```
[ ] POST /api/auth/signup with valid data → 201, OTP email arrives
[ ] POST /api/auth/signup with same email again → 409 or cleans up old pending
[ ] POST /api/auth/verify-otp with correct OTP → 200, registration link email arrives
[ ] POST /api/auth/verify-otp with wrong OTP → 400 "Invalid or expired code"
[ ] POST /api/auth/verify-otp after 10 min → 400 "Invalid or expired code"
[ ] POST /api/auth/verify-otp after using it once → 400 (single-use enforced)
[ ] POST /api/auth/resend-otp → new OTP email, old OTP invalidated
[ ] GET  /api/auth/validate-reg-token?token=valid → { valid: true }
[ ] GET  /api/auth/validate-reg-token?token=expired → { valid: false }
[ ] Click registration link in email → Register.jsx loads with pre-filled role
[ ] Complete all 3 steps → account activated, JWT returned, redirected to /book or /driver
[ ] /verify-otp accessed directly (no nav state) → redirected to /signup
[ ] /email-sent accessed directly (no nav state)  → redirected to /signup
[ ] Rate limiting: 10+ rapid signup attempts → 429 response
```
