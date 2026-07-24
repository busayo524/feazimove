/**
 * Wallet ledger — the single place money enters a FeaziMove wallet from an
 * external gateway, plus the AML rule checks that run on every movement.
 * Used by routes/wallet.js (status polling) and routes/anchor.js (webhooks).
 */
const { query } = require('../db')
const analytics = require('./analytics')

// Credits a still-pending transaction and marks it completed — guarded by the
// 'pending' check in the UPDATE so a transaction is never credited twice, and
// by the amount check so a short-paid transfer never credits the full amount.
async function creditTransaction(reference, { paymentMethod, paidKobo, currency, gateway } = {}) {
  if (currency != null && currency !== 'NGN') return false
  const txRes = await query(
    `UPDATE wallet_transactions SET status = 'completed', gateway = COALESCE($3, gateway)
      WHERE reference = $1 AND status = 'pending'
        AND ($2::bigint IS NULL OR amount_kobo <= $2::bigint)
      RETURNING user_id, amount_kobo`,
    [reference, paidKobo ?? null, gateway ?? null]
  )
  if (!txRes.rows[0]) return false // already credited, unknown reference, or short-paid
  const { user_id, amount_kobo } = txRes.rows[0]
  const balRes = await query(
    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
    [amount_kobo, user_id]
  )

  analytics.track(user_id, 'fund_wallet', {
    amount_loaded: Math.round(amount_kobo / 100),
    payment_gateway: gateway === 'anchor' ? 'Anchor' : 'Paystack',
    payment_method: paymentMethod || 'bank_transfer',
  })
  analytics.setProfile(user_id, {
    current_wallet_balance: Math.round(balRes.rows[0].wallet_balance / 100),
  })

  runAmlChecksOnCredit(user_id, Number(amount_kobo), reference).catch(() => {})
  return true
}

// Virtual-NUBAN payments carry no per-payment reference, only "which account
// number was paid" → "which user". Settle that user's OLDEST pending top-up
// the payment can cover; the poller watching that reference then completes.
async function creditPendingForUser(userId, paidKobo, currency) {
  if (currency != null && currency !== 'NGN') return false
  // Prefer the pending top-up whose amount EXACTLY matches the payment (the
  // rider almost always transfers the exact figure shown), falling back to
  // the oldest one the payment can cover.
  const txRes = await query(
    `UPDATE wallet_transactions SET status = 'completed'
      WHERE id = (
        SELECT id FROM wallet_transactions
         WHERE user_id = $1 AND type = 'credit' AND status = 'pending'
           AND gateway = 'anchor' AND amount_kobo <= $2
         ORDER BY (amount_kobo = $2) DESC, created_at ASC LIMIT 1
      ) RETURNING amount_kobo`,
    [userId, paidKobo]
  )
  if (!txRes.rows[0]) return false
  const amountKobo = Number(txRes.rows[0].amount_kobo)
  const balRes = await query(
    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
    [amountKobo, userId]
  )
  analytics.track(userId, 'fund_wallet', {
    amount_loaded: Math.round(amountKobo / 100),
    payment_gateway: 'Anchor', payment_method: 'bank_transfer',
  })
  analytics.setProfile(userId, { current_wallet_balance: Math.round(balRes.rows[0].wallet_balance / 100) })
  runAmlChecksOnCredit(userId, amountKobo, null).catch(() => {})
  return true
}

// Credit that did NOT start from a pending row — e.g. a rider transferred
// straight into their permanent reserved account. Idempotent per reference.
async function directCredit(userId, amountKobo, reference, description, gateway = 'anchor') {
  const inserted = await query(
    `INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status, gateway)
     VALUES ($1, 'credit', $2, $3, $4, 'completed', $5)
     ON CONFLICT (reference) DO NOTHING RETURNING id`,
    [userId, amountKobo, description, reference, gateway]
  )
  if (!inserted.rows[0]) return false // duplicate webhook delivery
  const balRes = await query(
    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
    [amountKobo, userId]
  )
  analytics.track(userId, 'fund_wallet', {
    amount_loaded: Math.round(amountKobo / 100),
    payment_gateway: 'Anchor', payment_method: 'reserved_account',
  })
  analytics.setProfile(userId, { current_wallet_balance: Math.round(balRes.rows[0].wallet_balance / 100) })
  runAmlChecksOnCredit(userId, amountKobo, reference).catch(() => {})
  return true
}

// ── AML rules ────────────────────────────────────────────────────────────────
// Rule-based monitoring; hits land in aml_flags for admin review in the back
// office. Thresholds are env-tunable so compliance can adjust without a deploy.
const LARGE_TOPUP_KOBO   = Number(process.env.AML_LARGE_TOPUP_KOBO)   || 200_000_00  // ₦200k single credit
const RAPID_TOPUP_COUNT  = Number(process.env.AML_RAPID_TOPUP_COUNT)  || 5           // credits per 24h
const WEEKLY_VOLUME_KOBO = Number(process.env.AML_WEEKLY_VOLUME_KOBO) || 1_000_000_00 // ₦1m per 7d
const FAST_OUT_MINUTES   = Number(process.env.AML_FAST_OUT_MINUTES)   || 60          // top-up → payout window

async function flag(userId, rule, severity, detail, reference) {
  // One open flag per (user, rule, reference) — repeated webhooks don't spam
  const existing = await query(
    `SELECT 1 FROM aml_flags WHERE user_id = $1 AND rule = $2 AND reference IS NOT DISTINCT FROM $3 AND status = 'open'`,
    [userId, rule, reference || null]
  )
  if (existing.rows[0]) return
  await query(
    'INSERT INTO aml_flags (user_id, rule, severity, detail, reference) VALUES ($1, $2, $3, $4, $5)',
    [userId, rule, severity, detail.slice(0, 300), reference || null]
  )
}

async function runAmlChecksOnCredit(userId, amountKobo, reference) {
  if (amountKobo >= LARGE_TOPUP_KOBO) {
    await flag(userId, 'large-topup', 'high',
      `Single top-up of ₦${Math.round(amountKobo / 100).toLocaleString()} (threshold ₦${Math.round(LARGE_TOPUP_KOBO / 100).toLocaleString()})`, reference)
  }
  const day = await query(
    `SELECT COUNT(*)::int AS n FROM wallet_transactions
      WHERE user_id = $1 AND type = 'credit' AND gateway IS NOT NULL
        AND status = 'completed' AND created_at >= NOW() - INTERVAL '24 hours'`,
    [userId]
  )
  if (day.rows[0].n > RAPID_TOPUP_COUNT) {
    await flag(userId, 'rapid-topups', 'medium',
      `${day.rows[0].n} gateway top-ups within 24 hours (threshold ${RAPID_TOPUP_COUNT})`, reference)
  }
  const week = await query(
    `SELECT COALESCE(SUM(amount_kobo),0) AS s FROM wallet_transactions
      WHERE user_id = $1 AND type = 'credit' AND gateway IS NOT NULL
        AND status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'`,
    [userId]
  )
  if (Number(week.rows[0].s) >= WEEKLY_VOLUME_KOBO) {
    await flag(userId, 'high-weekly-volume', 'high',
      `₦${Math.round(Number(week.rows[0].s) / 100).toLocaleString()} funded in the last 7 days (threshold ₦${Math.round(WEEKLY_VOLUME_KOBO / 100).toLocaleString()})`, reference)
  }
}

// Called when a driver requests a payout — pass-through funds (deposit then
// immediate withdrawal with little/no ride activity) are a classic layering
// pattern, so a fast in-out gets flagged for review (payout still proceeds
// through the normal admin approval, where the flag is visible).
async function runAmlChecksOnPayout(userId, amountKobo) {
  const recent = await query(
    `SELECT COALESCE(SUM(amount_kobo),0) AS s FROM wallet_transactions
      WHERE user_id = $1 AND type = 'credit' AND gateway IS NOT NULL
        AND status = 'completed' AND created_at >= NOW() - ($2 || ' minutes')::interval`,
    [userId, FAST_OUT_MINUTES]
  )
  if (Number(recent.rows[0].s) > 0) {
    await flag(userId, 'fast-in-out', 'high',
      `Payout of ₦${Math.round(amountKobo / 100).toLocaleString()} requested within ${FAST_OUT_MINUTES} minutes of funding ₦${Math.round(Number(recent.rows[0].s) / 100).toLocaleString()}`, null)
  }
}

module.exports = { creditTransaction, creditPendingForUser, directCredit, runAmlChecksOnPayout }
