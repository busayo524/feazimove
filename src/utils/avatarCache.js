/**
 * Avatar image cache. Every round trip to the API costs ~1s from West Africa,
 * so photos are fetched once, converted to data URLs, and reused:
 *  - in-memory for the rest of the session (instant on every page change)
 *  - in localStorage for the user's own avatar (instant on the next visit too)
 */
const mem = new Map()            // cache key → data URL
const fetchedThisSession = new Set() // keys already refreshed from the server

export function cachedAvatar(key) {
  if (mem.has(key)) return mem.get(key)
  try {
    const v = localStorage.getItem(key)
    if (v) { mem.set(key, v); return v }
  } catch { /* storage unavailable — memory cache still works */ }
  return null
}

export function rememberAvatar(key, dataUrl, { persist = true } = {}) {
  mem.set(key, dataUrl)
  fetchedThisSession.add(key)
  if (persist) {
    try { localStorage.setItem(key, dataUrl) } catch { /* quota full — skip */ }
  }
}

export function isFreshThisSession(key) {
  return fetchedThisSession.has(key)
}

// Several components can mount at once (header + profile card) — share one
// in-flight download per key instead of firing duplicates.
const inflight = new Map()
export function dedupeFetch(key, fn) {
  if (inflight.has(key)) return inflight.get(key)
  const p = Promise.resolve().then(fn).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
