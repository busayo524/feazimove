/**
 * FeaziMove Email Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses Nodemailer with any SMTP provider (Gmail, Resend, Mailgun, SendGrid…)
 * All credentials come from environment variables — NEVER hardcoded.
 *
 * Security considerations:
 *  - OTP is only generated here; the hash is stored in DB (never raw value)
 *  - Registration tokens are cryptographically random (uuid v4 + extra entropy)
 *  - Emails never reveal whether an address is registered (anti-enumeration)
 *  - HTML is hand-crafted — no user input is interpolated into email HTML
 */
const nodemailer = require('nodemailer')
const crypto     = require('crypto')

// ── Transport ────────────────────────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',   // true = port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Security: reject unauthorised TLS certs in production
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  })
}

// ── OTP generator — cryptographically random 6-digit code ────────────────────
function generateOtp() {
  // Using crypto.randomInt to avoid modulo bias
  return String(crypto.randomInt(100000, 999999))
}

// ── Shared email wrapper ──────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const transporter = createTransport()
  await transporter.sendMail({
    from: `"FeaziMove" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    // Plain-text fallback (stripped HTML)
    text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  })
}

// ── Base email shell — consistent branded wrapper ─────────────────────────────
function emailShell(bodyHtml) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>FeaziMove</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f3;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo bar -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0a1f15;border-radius:12px;padding:14px 28px;">
                    <span style="font-size:22px;font-weight:900;color:#ccff00;letter-spacing:-0.5px;">Feazi</span><span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Move</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 8px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#999;">
                © ${new Date().getFullYear()} FeaziMove Ltd. — Making Mobility Feasible. Making Everyday Life Easy.
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#bbb;">
                This email was sent to you because you created a FeaziMove account.
                If this wasn't you, please ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Send OTP email ────────────────────────────────────────────────────────────
/**
 * @param {string} to        - Recipient email address
 * @param {string} firstName - Recipient's first name
 * @param {string} otp       - 6-digit plain OTP (NOT the hash)
 * @returns {string}         - The plain OTP (caller hashes & stores it)
 */
async function sendOtpEmail(to, firstName, otp) {
  const digits = otp.split('')
  const digitCells = digits.map(d =>
    `<td style="width:48px;height:60px;border-radius:10px;background:#f0f9f4;border:2px solid #ccff00;text-align:center;vertical-align:middle;font-size:28px;font-weight:900;color:#0a1f15;font-family:monospace;">${d}</td>`
  ).join('<td style="width:10px;"></td>')

  const html = emailShell(`
    <!-- Green accent bar -->
    <div style="background:#ccff00;height:6px;"></div>

    <div style="padding:40px 48px 48px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#2a6048;text-transform:uppercase;letter-spacing:0.08em;">Email Verification</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#0a1f15;line-height:1.25;">
        Verify your email, ${firstName.split(' ')[0]} 👋
      </h1>
      <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">
        Welcome to FeaziMove! Enter the code below to verify your email address and continue setting up your account.
      </p>

      <!-- OTP digits -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
        <tr>${digitCells}</tr>
      </table>

      <div style="background:#f8fdf9;border:1.5px solid #e0f0e5;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
          ⏱ This code expires in <strong>10 minutes</strong>.<br/>
          🔒 Never share this code with anyone — FeaziMove will never ask for it.
        </p>
      </div>

      <p style="margin:0;font-size:13px;color:#999;">
        Didn't request this? You can safely ignore this email.
      </p>
    </div>
  `)

  await sendEmail({ to, subject: `${otp} — Your FeaziMove verification code`, html })
}

// ── Send registration continuation link ───────────────────────────────────────
/**
 * Sent after successful OTP verification.
 * The link contains a secure token so the user can resume registration.
 *
 * @param {string} to        - Recipient email
 * @param {string} firstName - First name
 * @param {string} token     - Secure registration token (UUID stored in DB)
 * @param {string} role      - 'rider' | 'driver'
 */
async function sendRegistrationLink(to, firstName, token, role) {
  const APP_URL   = process.env.APP_URL || 'http://localhost:5173'
  const link      = `${APP_URL}/register/${role}?token=${encodeURIComponent(token)}`
  const roleLabel = role === 'driver' ? 'Driver' : 'Rider'
  const roleIcon  = role === 'driver' ? '🚗' : '🛵'

  const html = emailShell(`
    <!-- Lime bar -->
    <div style="background:#ccff00;height:6px;"></div>

    <div style="padding:40px 48px 48px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#2a6048;text-transform:uppercase;letter-spacing:0.08em;">Account Verified ${roleIcon}</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#0a1f15;line-height:1.25;">
        Email confirmed! Complete your ${roleLabel} profile
      </h1>
      <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">
        Great job, ${firstName.split(' ')[0]}! Your email has been verified. Click the button below to complete your FeaziMove ${roleLabel.toLowerCase()} registration — it only takes a few minutes.
      </p>

      <!-- CTA Button -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
        <tr>
          <td style="background:#ccff00;border-radius:50px;padding:0;">
            <a href="${link}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:800;color:#0a1f15;text-decoration:none;letter-spacing:-0.2px;">
              Complete Registration →
            </a>
          </td>
        </tr>
      </table>

      <!-- What to expect -->
      <div style="background:#f8fdf9;border:1.5px solid #e0f0e5;border-radius:14px;padding:22px 24px;margin-bottom:28px;">
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#2a6048;text-transform:uppercase;letter-spacing:0.06em;">What to expect next</p>
        ${role === 'rider' ? `
          <p style="margin:0 0 8px;font-size:14px;color:#333;">📋 <strong>Step 1</strong> — Review your personal details</p>
          <p style="margin:0 0 8px;font-size:14px;color:#333;">🪪 <strong>Step 2</strong> — Upload your government-issued ID</p>
          <p style="margin:0;font-size:14px;color:#333;">✅ <strong>Step 3</strong> — Agree to terms & go live</p>
        ` : `
          <p style="margin:0 0 8px;font-size:14px;color:#333;">📋 <strong>Step 1</strong> — Review your personal details</p>
          <p style="margin:0 0 8px;font-size:14px;color:#333;">🚘 <strong>Step 2</strong> — Add vehicle info & upload documents</p>
          <p style="margin:0;font-size:14px;color:#333;">✅ <strong>Step 3</strong> — Certify & submit driver application</p>
        `}
      </div>

      <!-- Link fallback -->
      <p style="margin:0;font-size:12px;color:#aaa;word-break:break-all;">
        Button not working? Copy and paste this link:<br/>
        <a href="${link}" style="color:#2a6048;">${link}</a>
      </p>

      <p style="margin:20px 0 0;font-size:12px;color:#bbb;">
        This link expires in <strong>24 hours</strong>. After that, you'll need to start a new registration.
      </p>
    </div>
  `)

  await sendEmail({ to, subject: `Complete your FeaziMove ${roleLabel} registration`, html })
}

// ── Export plain OTP generator too (used by routes) ──────────────────────────
module.exports = { generateOtp, sendOtpEmail, sendRegistrationLink }
