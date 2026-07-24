/**
 * Wallet ledger — the single place money enters or leaves a FeaziMove wallet
 * on the gateway rails, plus the AML rule checks that run on every movement.
 * Every mutation here is a BEGIN/COMMIT transaction: the ledger row and the
 * balance change land together or not at all (a crash mid-sequence must never
 * leave a row without its balance effect, or vice versa).
 * Used by routes/wallet.js and routes/anchor.js (webhooks).
 */
const { query, pool } = require('../db')
const analytics = require('./analytics')

// Run fn(client) inside a transaction on a dedicated connection.
async function tx(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

function trackCredit(userId, amountKobo, balanceKobo, method) {
  analytics.track(userId, 'fund_wallet', {
    amount_loaded: Math.round(amountKobo / 100),
    payment_gateway: 'Anchor',
    payment_method: method || 'bank_transfer',
  })
  analytics.setProfile(userId, { current_wallet_balance: Math.round(balanceKobo / 100) })
}

// Credits a still-pending transaction and marks it completed — guarded by the
// 'pending' check in the UPDATE (concurrency-safe: re-checked after any lock
// wait) and by the amount check so a short-paid transfer never credits.
async function creditTransaction(reference, { paymentMethod, paidKobo, currency, gateway } = {}) {
  if (currency != null && currency !== 'NGN') return false
  const result = await tx(async client => {
    const txRes = await client.query(
      `UPDATE wallet_transactions SET status = 'completed', gateway = COALESCE($3, gateway)
        WHERE reference = $1 AND status = 'pending'
          AND ($2::bigint IS NULL OR amount_kobo <= $2::bigint)
        RETURNING user_id, amount_kobo`,
      [reference, paidKobo ?? null, gateway ?? null]
    )
    if (!txRes.rows[0]) return null
    const { user_id, amount_kobo } = txRes.rows[0]
    const balRes = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
      [amount_kobo, user_id]
    )
    return { userId: user_id, amountKobo: Number(amount_kobo), balance: Number(balRes.rows[0].wallet_balance) }
  })
  if (!result) return false
  trackCredit(result.userId, result.amountKobo, result.balance, paymentMethod)
  runAmlChecksOnCredit(result.userId, result.amountKobo, reference).catch(() => {})
  return true
}

// Virtual-NUBAN payments carry no per-payment reference, only "which account
// was paid" → "which user". Settle the user's pending top-up whose amount
// EXACTLY matches the payment (newest first — the rider paying now is almost
// certainly paying the panel they just opened, not an abandoned older one).
// Anything that doesn't match exactly is handled by the caller via
// directCredit of the full paid amount, so no remainder can ever evaporate.
// Concurrency-safe: the status guard sits in the OUTER WHERE so a lock-wait
// re-check prevents two deliveries from completing the same row.
async function creditPendingForUser(userId, paidKobo, currency, payRef) {
  if (currency != null && currency !== 'NGN') return false
  const result = await tx(async client => {
    const txRes = await client.query(
      `UPDATE wallet_transactions SET status = 'completed'
        WHERE status = 'pending' AND id = (
          SELECT id FROM wallet_transactions
           WHERE user_id = $1 AND type = 'credit' AND status = 'pending'
             AND gateway = 'anchor' AND amount_kobo = $2
           ORDER BY created_at DESC LIMIT 1
        ) RETURNING amount_kobo`,
      [userId, paidKobo]
    )
    if (!txRes.rows[0]) return null
    const amountKobo = Number(txRes.rows[0].amount_kobo)
    const balRes = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
      [amountKobo, userId]
    )
    return { amountKobo, balance: Number(balRes.rows[0].wallet_balance) }
  })
  if (!result) return false
  trackCredit(userId, result.amountKobo, result.balance, 'bank_transfer')
  runAmlChecksOnCredit(userId, result.amountKobo, payRef || null).catch(() => {})
  return true
}

// Credit that did NOT start from a pending row — e.g. a rider transferred
// straight into their permanent funding account, or an amount that matches no
// pending top-up. Idempotent per reference (UNIQUE + ON CONFLICT).
async function directCredit(userId, amountKobo, reference, description, gateway = 'anchor') {
  const result = await tx(async client => {
    const inserted = await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status, gateway)
       VALUES ($1, 'credit', $2, $3, $4, 'completed', $5)
       ON CONFLICT (reference) DO NOTHING RETURNING id`,
      [userId, amountKobo, description, reference, gateway]
    )
    if (!inserted.rows[0]) return null // duplicate delivery
    const balRes = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
      [amountKobo, userId]
    )
    return { balance: Number(balRes.rows[0].wallet_balance) }
  })
  if (!result) return false
  trackCredit(userId, amountKobo, result.balance, 'reserved_account')
  runAmlChecksOnCredit(userId, amountKobo, reference).catch(() => {})
  return true
}

// Return escrowed payout money to a driver's wallet — exactly once per
// reference, atomically with the balance change.
async function refundPayout(driverId, amountKobo, reference, description = 'Payout failed — funds returned') {
  return tx(async client => {
    const inserted = await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference, status)
       VALUES ($1, 'credit', $2, $3, $4, 'completed')
       ON CONFLICT (reference) DO NOTHING RETURNING id`,
      [driverId, amountKobo, description, reference]
    )
    if (!inserted.rows[0]) return false
    await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amountKobo, driverId])
    return true
  })
}

// Escrow a withdrawal atomically: the conditional decrement makes overdraw
// impossible even under concurrent requests, and the payout + ledger rows
// commit together with it. Returns { payoutId } or null if balance short.
async function escrowWithdrawal(driverId, amountKobo) {
  return tx(async client => {
    const dec = await client.query(
      `UPDATE users SET wallet_balance = wallet_balance - $1
        WHERE id = $2 AND wallet_balance >= $1 RETURNING wallet_balance`,
      [amountKobo, driverId]
    )
    if (!dec.rows[0]) return null // insufficient — nothing changed
    const payout = await client.query(
      'INSERT INTO payout_requests (driver_id, amount_kobo) VALUES ($1, $2) RETURNING id, requested_at',
      [driverId, amountKobo]
    )
    await client.query(
      'INSERT INTO wallet_transactions (user_id, type, amount_kobo, description, reference) VALUES ($1, $2, $3, $4, $5)',
      [driverId, 'debit', amountKobo, 'Withdrawal request — pending approval', `payout-${payout.rows[0].id}`]
    )
    return { payoutId: payout.rows[0].id, requestedAt: payout.rows[0].requested_at }
  })
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

module.exports = {
  creditTransaction,
  creditPendingForUser,
  directCredit,
  refundPayout,
  escrowWithdrawal,
  runAmlChecksOnPayout,
}
