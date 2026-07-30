/**
 * Public contact form (landing page → support).
 *
 * The message is STORED FIRST and emailed second: an SMTP hiccup must never
 * lose a customer's message, and support needs a queue it can work through
 * (Admin → Feedback) rather than relying on an inbox. `emailed` records whether
 * the notification actually went out, so a silent mail failure is visible.
 *
 * Unauthenticated by design — anyone can reach it — so it is rate limited and
 * every field is length-capped.
 */
const express = require('express')
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const { query } = require('../db')
const { validate } = require('../middleware/validate')
const { sendContactMessageEmail } = require('../services/emailService')

const router = express.Router()

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // per IP — enough for a genuine sender who mistypes, useless for spam
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many messages sent. Please wait a few minutes and try again.' },
})

const TOPICS = ['General Enquiry', 'Driver Partnership', 'Press & Media', 'Bug Report', 'Other']

router.post('/',
  contactLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Enter your name.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
    body('topic').trim().isIn(TOPICS).withMessage('Select a topic.'),
    body('message').trim().isLength({ min: 10, max: 1000 })
      .withMessage('Message must be between 10 and 1000 characters.'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, email, topic, message } = req.body
      const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null
      const ua = (req.headers['user-agent'] || '').slice(0, 300) || null

      const saved = await query(
        `INSERT INTO contact_messages (name, email, topic, message, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
        [name, email, topic, message, ip, ua]
      )
      const row = saved.rows[0]

      // Emailed after the write. A failure here is logged and flagged on the
      // row, but the sender still gets a success — their message IS safe.
      try {
        await sendContactMessageEmail({
          name, email, topic, message,
          receivedAt: new Date(row.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
        })
        await query('UPDATE contact_messages SET emailed = true WHERE id = $1', [row.id])
      } catch (mailErr) {
        console.error('Contact email failed (message still saved):', mailErr.message)
      }

      res.status(201).json({ message: "Thanks for reaching out — we'll get back to you shortly." })
    } catch (err) { next(err) }
  }
)

module.exports = router
