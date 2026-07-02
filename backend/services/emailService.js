/**
 * FeaziMove Email Service
 * All credentials come from environment variables — NEVER hardcoded.
 */
const nodemailer = require('nodemailer')
const crypto     = require('crypto')

// ── Transport ────────────────────────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  })
}

// ── OTP generator ─────────────────────────────────────────────────────────────
function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const transporter = createTransport()
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"FeaziMove" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  })
}

// ── Shared disclaimer footer ──────────────────────────────────────────────────
const DISCLAIMER = `
  <tr>
    <td style="padding:0 0 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px solid #cccccc;padding-top:16px;">
          <p style="margin:0 0 12px;font-size:12px;color:#444;line-height:1.7;">
            We want to hear from you. For information, requests, suggestions and complaints, please contact us:
            <br/>📧 <a href="mailto:support@feazimove.com" style="color:#2a6048;">support@feazimove.com</a>
            &nbsp;|&nbsp; 🌐 <a href="https://feazimove.com" style="color:#2a6048;">www.feazimove.com</a>
          </p>
          <p style="margin:0;font-size:11px;color:#888;line-height:1.7;border-top:1px solid #eeeeee;padding-top:12px;">
            <strong>FeaziMove Disclaimer and Confidentiality Notice:</strong> This e-mail and any attachments are confidential and intended solely for the addressee. If you have received this e-mail in error, please notify the sender immediately and delete it. Do not disclose or use the contents in any way. FeaziMove does not warrant that this email is free from errors, viruses, or interference, and accepts no liability for any loss or damage arising from its use or transmission. Views expressed are those of the sender and do not necessarily represent those of FeaziMove Technologies Ltd.
          </p>
        </td></tr>
      </table>
    </td>
  </tr>
`

// ── Email shell — Stanbic-style corporate layout ──────────────────────────────
function emailShell(headerAccentColor = '#2a6048', bodyHtml) {
  const now = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>FeaziMove</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#ffffff;">

          <!-- Top accent bar -->
          <tr>
            <td style="background:#ccff00;height:6px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- Header: wordmark + timestamp -->
          <tr>
            <td style="padding:26px 40px;border-bottom:1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <span style="font-size:26px;font-weight:400;color:#0a1f15;letter-spacing:-0.5px;font-family:Arial,sans-serif;">Feazi</span><span style="font-size:26px;font-weight:900;color:#0a1f15;letter-spacing:-0.5px;font-family:Arial,sans-serif;">Move</span>
                  </td>
                  <td align="right" style="font-size:13px;color:#999;">${now} (WAT)</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Disclaimer -->
          <tr>
            <td style="padding:0 40px 40px;">
              ${DISCLAIMER}
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;padding:18px 0;">
          <tr>
            <td align="center" style="font-size:12px;color:#aaa;">
              © ${new Date().getFullYear()} FeaziMove Technologies Ltd. | Making Mobility Feasible. Making Everyday Life Easy.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── OTP email ─────────────────────────────────────────────────────────────────
async function sendOtpEmail(to, fullName, otp) {
  const firstName = (fullName || '').split(' ')[0] || null
  const now = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const body = `
    <p style="margin:0 0 22px;font-size:17px;color:#222;">${firstName ? `Dear ${firstName},` : 'Hello,'}</p>

    <p style="margin:0 0 18px;font-size:16px;color:#333;line-height:1.8;">
      We refer to your account verification request initiated on <strong>${now} (WAT)</strong>.
      Kindly find below the One-Time Password (OTP) required to complete the request:
    </p>

    <p style="margin:28px 0;font-size:42px;font-weight:900;color:#0a1f15;letter-spacing:10px;text-align:center;">
      ${otp}
    </p>

    <p style="margin:0 0 18px;font-size:16px;color:#333;line-height:1.8;">
      This code expires in <strong>5 minutes</strong>. In the event that this request was not initiated by you, please contact our support team immediately via any of the channels listed below.
    </p>

    <p style="margin:0 0 18px;font-size:16px;color:#333;line-height:1.8;">
      For your security, never share this code with anyone. FeaziMove staff will never ask for your OTP.
    </p>

    <p style="margin:36px 0 8px;font-size:16px;color:#333;">Best Regards,</p>
    <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0a1f15;">The FeaziMove Team</p>
    <p style="margin:0;font-size:14px;color:#666;">
      FeaziMove Technologies Ltd. | Lagos, Nigeria<br/>
      📧 <a href="mailto:support@feazimove.com" style="color:#2a6048;">support@feazimove.com</a>
      &nbsp;|&nbsp; 🌐 <a href="https://feazimove.com" style="color:#2a6048;">www.feazimove.com</a>
    </p>
  `

  await sendEmail({
    to,
    subject: `Your FeaziMove Verification Code: ${otp}`,
    html: emailShell('#2a6048', body),
  })
}

// ── Registration link email ───────────────────────────────────────────────────
async function sendRegistrationLink(to, fullName, token, role) {
  const firstName = fullName.split(' ')[0]
  const APP_URL   = process.env.APP_URL || 'http://localhost:5173'
  const link      = `${APP_URL}/register/${role}?token=${encodeURIComponent(token)}`
  const roleLabel = role === 'driver' ? 'Driver' : 'Rider'

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="padding:6px 0;">
          <p style="margin:0;font-size:26px;font-weight:900;color:#0a1f15;letter-spacing:-0.3px;">
            Account Verified ✅
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 20px;font-size:15px;color:#222;">Hello ${firstName},</p>

    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.7;">
      Your email has been successfully verified. Click the button below to complete your FeaziMove <strong>${roleLabel}</strong> registration — it only takes a few minutes.
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#ccff00;border-radius:50px;">
          <a href="${link}" style="display:inline-block;padding:15px 36px;font-size:16px;font-weight:900;color:#0a1f15;text-decoration:none;letter-spacing:-0.2px;">
            Complete Registration →
          </a>
        </td>
      </tr>
    </table>

    <!-- What to expect -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:18px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.08em;">What to expect next</p>
          ${role === 'rider' ? `
            <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Step 1</strong> — Review your personal details</p>
            <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Step 2</strong> — Upload your government-issued ID</p>
            <p style="margin:0;font-size:14px;color:#333;"><strong>Step 3</strong> — Agree to terms &amp; go live</p>
          ` : `
            <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Step 1</strong> — Review your personal details</p>
            <p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Step 2</strong> — Add vehicle info &amp; upload documents</p>
            <p style="margin:0;font-size:14px;color:#333;"><strong>Step 3</strong> — Certify &amp; submit driver application</p>
          `}
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:13px;color:#888;word-break:break-all;">
      Button not working? Copy and paste this link into your browser:<br/>
      <a href="${link}" style="color:#2a6048;">${link}</a>
    </p>

    <p style="margin:0 0 24px;font-size:13px;color:#aaa;">
      This link expires in <strong>24 hours</strong>. If you did not initiate this request, please contact our support team immediately.
    </p>

    <p style="margin:0 0 4px;font-size:15px;color:#333;">Best Regards,</p>
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a1f15;">The FeaziMove Team</p>
    <p style="margin:0;font-size:13px;color:#666;">
      FeaziMove Technologies Ltd. | Lagos, Nigeria<br/>
      📧 <a href="mailto:support@feazimove.com" style="color:#2a6048;">support@feazimove.com</a>
      &nbsp;|&nbsp; 🌐 <a href="https://feazimove.com" style="color:#2a6048;">www.feazimove.com</a>
    </p>
  `

  await sendEmail({
    to,
    subject: `Complete your FeaziMove ${roleLabel} Registration`,
    html: emailShell('#2a6048', body),
  })
}

// ── Welcome email — sent once profile is complete ─────────────────────────────
async function sendWelcomeEmail(to, fullName, role) {
  const firstName = (fullName || '').split(' ')[0] || 'there'
  const isDriver  = role === 'driver'
  const roleLabel = isDriver ? 'Driver' : 'Rider'
  const APP_URL   = process.env.APP_URL || 'http://localhost:5173'
  const dashLink  = isDriver ? `${APP_URL}/driver` : `${APP_URL}/book`

  const body = `
    <!-- Hero block -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="border-bottom:4px solid #ccff00;padding-bottom:22px;">
          <p style="margin:0 0 6px;font-size:24px;font-weight:900;color:#0a1f15;font-family:Arial,sans-serif;">
            Welcome to FeaziMove, ${firstName}!
          </p>
          <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
            Your ${roleLabel} profile is complete. You are all set to go.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 20px;font-size:15px;color:#222;">Hello ${firstName},</p>

    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.8;">
      We are pleased to have you on board. Your <strong>FeaziMove ${roleLabel}</strong> account is now active and ready to use.
      ${isDriver
        ? 'You can now go online, accept rides, and start earning — the Feazi Way.'
        : 'You can now book rides and send packages — making everyday movement feasible, easy, and affordable.'}
    </p>

    ${isDriver ? `
    <!-- Driver quick-start -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:18px 0;">
          <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Getting started as a Driver</p>
          <p style="margin:0 0 10px;font-size:14px;color:#333;"><strong>Go Online</strong> — Open your driver dashboard and set yourself as available</p>
          <p style="margin:0 0 10px;font-size:14px;color:#333;"><strong>Accept Rides</strong> — Pick up riders along your route and earn per trip</p>
          <p style="margin:0 0 10px;font-size:14px;color:#333;"><strong>Track Earnings</strong> — View your daily earnings and payout history</p>
          <p style="margin:0;font-size:14px;color:#333;"><strong>Build Your Rating</strong> — Great service earns great ratings and more bookings</p>
        </td>
      </tr>
    </table>
    ` : `
    <!-- Rider quick-start -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:18px 0;">
          <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Getting started as a Rider</p>
          <p style="margin:0 0 10px;font-size:14px;color:#333;"><strong>Book a Ride</strong> — Enter your pickup and destination to find available drivers</p>
          <p style="margin:0 0 10px;font-size:14px;color:#333;"><strong>Send a Package</strong> — Ship goods along shared routes quickly and affordably</p>
          <p style="margin:0 0 10px;font-size:14px;color:#333;"><strong>Fund Your Wallet</strong> — Top up your FeaziMove wallet for seamless payments</p>
          <p style="margin:0;font-size:14px;color:#333;"><strong>Rate Your Trip</strong> — Your feedback helps keep FeaziMove safe and reliable</p>
        </td>
      </tr>
    </table>
    `}

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#ccff00;border-radius:50px;">
          <a href="${dashLink}" style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:900;color:#0a1f15;text-decoration:none;letter-spacing:-0.2px;">
            ${isDriver ? 'Go to Driver Dashboard →' : 'Book Your First Ride →'}
          </a>
        </td>
      </tr>
    </table>

    <!-- Brand tagline -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="border-left:4px solid #ccff00;padding:10px 18px;">
          <p style="margin:0;font-size:14px;color:#555;font-style:italic;line-height:1.7;">
            "Making Mobility Feasible. Making Everyday Life Easy." — <strong>It's Feazi.</strong>
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px;font-size:15px;color:#333;">Warm regards,</p>
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a1f15;">The FeaziMove Team</p>
    <p style="margin:0;font-size:13px;color:#666;">
      FeaziMove Technologies Ltd. | Lagos, Nigeria<br/>
      📧 <a href="mailto:support@feazimove.com" style="color:#2a6048;">support@feazimove.com</a>
      &nbsp;|&nbsp; 🌐 <a href="https://feazimove.com" style="color:#2a6048;">www.feazimove.com</a>
    </p>
  `

  await sendEmail({
    to,
    subject: `Welcome to FeaziMove, ${firstName}! Your ${roleLabel} account is ready 🎉`,
    html: emailShell('#2a6048', body),
  })
}

// ── Credentials welcome email — admin-created accounts ───────────────────────
// Sent when an admin creates a user directly: welcomes them and delivers their
// login details with the temporary password they must change on first login.
async function sendAccountCredentialsEmail(to, fullName, role, tempPassword) {
  const firstName = (fullName || '').split(' ')[0] || 'there'
  const roleLabel = role === 'driver' ? 'Driver' : role === 'admin' ? 'Administrator' : 'Rider'
  const APP_URL   = process.env.APP_URL || 'http://localhost:5173'
  const loginLink = `${APP_URL}/login`

  const body = `
    <!-- Hero block -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="border-bottom:4px solid #ccff00;padding-bottom:22px;">
          <p style="margin:0 0 6px;font-size:24px;font-weight:900;color:#0a1f15;font-family:Arial,sans-serif;">
            Welcome to FeaziMove, ${firstName}!
          </p>
          <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
            A FeaziMove <strong>${roleLabel}</strong> account has been created for you.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 20px;font-size:15px;color:#222;">Hello ${firstName},</p>

    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.8;">
      We are pleased to have you on board. Your account is active and ready to use —
      sign in with the credentials below.
    </p>

    <!-- Credentials block -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f6f7f9;border:1px solid #e9ecef;border-radius:10px;padding:20px 22px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Email</p>
          <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0a1f15;">${to}</p>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Temporary Password</p>
          <p style="margin:0;font-size:18px;font-weight:900;color:#0a1f15;font-family:'Courier New',monospace;letter-spacing:1px;">${tempPassword}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#333;line-height:1.8;">
      For your security, you will be asked to <strong>set a new password</strong> the first time you sign in.
      Never share your password with anyone — FeaziMove staff will never ask for it.
    </p>

    <!-- CTA Button -->
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#ccff00;border-radius:50px;">
          <a href="${loginLink}" style="display:inline-block;padding:15px 40px;font-size:16px;font-weight:900;color:#0a1f15;text-decoration:none;letter-spacing:-0.2px;">
            Sign In to FeaziMove →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px;font-size:15px;color:#333;">Warm regards,</p>
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0a1f15;">The FeaziMove Team</p>
    <p style="margin:0;font-size:13px;color:#666;">
      FeaziMove Technologies Ltd. | Lagos, Nigeria<br/>
      📧 <a href="mailto:support@feazimove.com" style="color:#2a6048;">support@feazimove.com</a>
      &nbsp;|&nbsp; 🌐 <a href="https://feazimove.com" style="color:#2a6048;">www.feazimove.com</a>
    </p>
  `

  await sendEmail({
    to,
    subject: `Welcome to FeaziMove — Your ${roleLabel} account is ready`,
    html: emailShell('#2a6048', body),
  })
}

module.exports = { generateOtp, sendOtpEmail, sendRegistrationLink, sendWelcomeEmail, sendAccountCredentialsEmail }
