/**
 * JWT Authentication Middleware
 * - Verifies token on every protected route
 * - Principle of least privilege: passes only user id + role
 * - Checks is_active so a suspension takes effect immediately, not at next login
 */
const jwt = require('jsonwebtoken')
const { query } = require('../db')

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  const token = authHeader.split(' ')[1]
  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' })
    }
    return res.status(401).json({ message: 'Invalid token.' })
  }

  try {
    // A valid token isn't enough — suspended accounts are locked out of every
    // action even if their session is still live, and any token issued before
    // the account's session cut-off (set on password change) is rejected so a
    // password change invalidates every other session, stolen tokens included.
    const result = await query('SELECT is_active, token_version FROM users WHERE id = $1', [decoded.id])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' })
    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' })
    }
    // Token generation must match the account's current one — a password change
    // bumps it, instantly invalidating every older token (stolen ones included).
    if ((decoded.tv || 0) !== (user.token_version || 0)) {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' })
    }
    // Only attach minimum needed — never full DB row
    req.user = { id: decoded.id, role: decoded.role }
    next()
  } catch (err) { next(err) }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    next()
  }
}

module.exports = { requireAuth, requireRole }
