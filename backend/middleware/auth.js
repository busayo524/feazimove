/**
 * JWT Authentication Middleware
 * - Verifies token on every protected route
 * - Principle of least privilege: passes only user id + role
 */
const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // Only attach minimum needed — never full DB row
    req.user = { id: decoded.id, role: decoded.role }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please sign in again.' })
    }
    return res.status(401).json({ message: 'Invalid token.' })
  }
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
