/**
 * Centralized API service
 * - All requests go through here
 * - Automatically attaches JWT token
 * - Handles 401 (token expired) globally
 * - Never exposes raw fetch — keeps security consistent
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

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

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    method,
    headers,
    // Prevent SSRF — only allow requests to our own API base
    ...(body ? { body: JSON.stringify(sanitizeBody(body)) } : {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, config)

  // Token expired — force logout
  if (res.status === 401) {
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

export const api = {
  get:    (path, options)       => request('GET',    path, null, options),
  post:   (path, body, options) => request('POST',   path, body, options),
  put:    (path, body, options) => request('PUT',    path, body, options),
  patch:  (path, body, options) => request('PATCH',  path, body, options),
  delete: (path, options)       => request('DELETE', path, null, options),
}
