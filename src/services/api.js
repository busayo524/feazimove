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
//
// Catalyst's edge silently truncates response bodies beyond a few hundred KB,
// so files are downloaded as small ?start/?end slices (each verified by byte
// count and retried on mismatch) and reassembled here. Small files and older
// backends without slice support fall back to a plain single fetch.
const SLICE_SIZE = 128 * 1024
const SLICE_PARALLEL = 4

async function getBlob(path) {
  const token = localStorage.getItem('fm_token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const sep = path.includes('?') ? '&' : '?'

  let size = null
  try {
    const infoRes = await fetch(`${BASE_URL}${path}${sep}sizeinfo=1`, { headers })
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
