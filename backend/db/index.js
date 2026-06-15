/**
 * PostgreSQL connection pool
 * Uses parameterized queries throughout — SQL injection prevention
 */
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30000,
})

pool.on('error', (err) => {
  // Log but never expose DB errors to the client
  console.error('Unexpected DB error:', err.message)
})

/**
 * Parameterized query helper — ALWAYS use this, never string interpolation
 * @param {string} text  - SQL with $1, $2 placeholders
 * @param {Array}  params - Values for placeholders
 */
async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  // Only log slow queries in dev — never log param values (may contain PII)
  if (process.env.NODE_ENV !== 'production' && duration > 200) {
    console.log(`Slow query (${duration}ms):`, text)
  }
  return res
}

module.exports = { query, pool }
