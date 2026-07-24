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

// ── Silent access-token renewal ───────────────────────────────────────────────
// Access tokens are short-lived (15m). When one expires mid-session, we exchange
// the long-lived refresh token for a fresh pair and retry — transparently, so
// the user never sees a logout. Single-flighted: if many requests 401 at once,
// only ONE /auth/refresh runs and they all await it.
let refreshPromise = null

async function tryRefresh() {
  const refreshToken = localStorage.getItem('fm_refresh')
  if (!refreshToken) return false
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const r = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!r.ok) return false
        const d = await r.json().catch(() => ({}))
        if (!d.token || !d.refreshToken) return false
        localStorage.setItem('fm_token', d.token)
        localStorage.setItem('fm_refresh', d.refreshToken)
        return true
      } catch { return false }
      finally { /* cleared by caller below */ }
    })()
    // Clear the single-flight latch once it settles
    refreshPromise.finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

function forceLogout() {
  localStorage.removeItem('fm_token')
  localStorage.removeItem('fm_refresh')
  localStorage.removeItem('fm_user')
  // Base-aware: under the Catalyst /app/ package a bare '/login' would 404
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  window.location.href = `${base}/login`
}

async function doFetch(method, path, body, options) {
  const token = localStorage.getItem('fm_token')
  const isFormData = body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: isFormData ? body : JSON.stringify(sanitizeBody(body)) } : {}),
  })
}

// Endpoints where a 401 means "wrong credentials", NOT "access token expired" —
// so they must never trigger a refresh-and-retry. Everything else (including
// /auth/me, /auth/change-password) does refresh on 401.
const NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/signup',
  '/auth/google', '/auth/register', '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password']

async function request(method, path, body, options = {}) {
  const skipRefresh = NO_REFRESH.some(p => path.startsWith(p))
  let res = await doFetch(method, path, body, options)

  // Access token expired mid-session — refresh once and retry transparently.
  if (res.status === 401 && !skipRefresh) {
    const ok = await tryRefresh()
    if (ok) {
      res = await doFetch(method, path, body, options)
    }
    // Still (or newly) unauthorized after the refresh attempt → session is done.
    if (res.status === 401) {
      forceLogout()
      // Reject (rather than return undefined) so in-flight callers reading
      // res.data don't crash with TypeErrors during the redirect.
      const err = new Error('Session expired.')
      err.status = 401
      err.data = {}
      throw err
    }
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
//
// Catalyst's edge silently truncates response bodies beyond a few hundred KB,
// so files are downloaded as small ?start/?end slices (each verified by byte
// count and retried on mismatch) and reassembled here. Small files and older
// backends without slice support fall back to a plain single fetch.
const SLICE_SIZE = 128 * 1024
const SLICE_PARALLEL = 8

function authHeaders() {
  const token = localStorage.getItem('fm_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function getBlob(path) {
  let headers = authHeaders()
  const sep = path.includes('?') ? '&' : '?'

  let size = null
  try {
    let infoRes = await fetch(`${BASE_URL}${path}${sep}sizeinfo=1`, { headers })
    // Access token expired mid-session — refresh once, rebuild headers, retry.
    if (infoRes.status === 401 && await tryRefresh()) {
      headers = authHeaders()
      infoRes = await fetch(`${BASE_URL}${path}${sep}sizeinfo=1`, { headers })
    }
    if (infoRes.ok && (infoRes.headers.get('Content-Type') || '').includes('json')) {
      const info = await infoRes.json()
      if (Number.isFinite(info.size)) size = info.size
    }
  } catch { /* older backend — plain fetch below */ }

  if (size == null) {
    const res = await fetch(`${BASE_URL}${path}`, { headers })
    if (!res.ok) throw new Error('Could not load file.')
    return res.blob()
  }

  const chunks = []
  let type = ''
  for (let batchStart = 0; batchStart < size; batchStart += SLICE_SIZE * SLICE_PARALLEL) {
    const batch = []
    for (let s = batchStart; s < Math.min(batchStart + SLICE_SIZE * SLICE_PARALLEL, size); s += SLICE_SIZE) {
      batch.push(fetchSlice(path, sep, headers, s, Math.min(s + SLICE_SIZE, size)))
    }
    for (const part of await Promise.all(batch)) {
      chunks.push(part.buf)
      type = part.type || type
    }
  }
  return new Blob(chunks, { type })
}

async function fetchSlice(path, sep, headers, start, endExcl, attempt = 1) {
  let buf = null, type = ''
  try {
    const res = await fetch(`${BASE_URL}${path}${sep}start=${start}&end=${endExcl - 1}`, { headers })
    if (res.ok) {
      type = res.headers.get('Content-Type') || ''
      buf = await res.arrayBuffer()
    }
  } catch { /* network hiccup — retried below */ }
  if (!buf || buf.byteLength !== endExcl - start) {
    if (attempt >= 4) throw new Error('Could not load file.')
    return fetchSlice(path, sep, headers, start, endExcl, attempt + 1)
  }
  return { buf, type }
}

export const api = {
  get:    (path, options)       => request('GET',    path, null, options),
  post:   (path, body, options) => request('POST',   path, body, options),
  put:    (path, body, options) => request('PUT',    path, body, options),
  patch:  (path, body, options) => request('PATCH',  path, body, options),
  delete: (path, options)       => request('DELETE', path, null, options),
  getBlob,
}
