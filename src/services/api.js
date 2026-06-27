/**
 * Centralized API service
 * - All requests go through here
 * - Automatically attaches JWT token
 * - Handles 401 (token expired) globally
 * - Never exposes raw fetch — keeps security consistent
 */

// In dev, Vite proxies /api → localhost:4000 so no CORS issues.
// In production, set VITE_API_URL to your deployed backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Input sanitization for all outgoing string values
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .trim()
  }
  return val
}

function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, sanitizeValue(v)])
  )
}

async function request(method, path, body, options = {}) {
  const token = localStorage.getItem('fm_token')
  const isFormData = body instanceof FormData

  const headers = {
    // Skip Content-Type for FormData — the browser sets the multipart boundary itself
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    method,
    headers,
    // Prevent SSRF — only allow requests to our own API base
    ...(body ? { body: isFormData ? body : JSON.stringify(sanitizeBody(body)) } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, config)

  // Token expired — force logout
  // Skip this for auth routes (login/signup) — a 401 there means wrong credentials, not expired token
  const isAuthRoute = path.startsWith('/auth/')
  if (res.status === 401 && !isAuthRoute) {
    localStorage.removeItem('fm_token')
    localStorage.removeItem('fm_user')
    window.location.href = '/login'
    return
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.message || 'An error occurred')
    err.status = res.status
    err.data = data
    throw err
  }

  return { data, status: res.status }
}

// Fetches a binary resource (e.g. an uploaded document) with the auth header attached —
// needed because plain <img>/<a> tags can't send an Authorization header themselves.
async function getBlob(path) {
  const token = localStorage.getItem('fm_token')
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Could not load file.')
  return res.blob()
}

export const api = {
  get:    (path, options)       => request('GET',    path, null, options),
  post:   (path, body, options) => request('POST',   path, body, options),
  put:    (path, body, options) => request('PUT',    path, body, options),
  patch:  (path, body, options) => request('PATCH',  path, body, options),
  delete: (path, options)       => request('DELETE', path, null, options),
  getBlob,
}
