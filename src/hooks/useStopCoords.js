import { useEffect, useState } from 'react'
import { api } from '../services/api'

// Module-level cache + in-flight dedupe so multiple components mounting at
// once (e.g. a map + a dropdown) only trigger one fetch, not one each.
let cache = null
let pending = null

function fetchStopCoords() {
  if (cache) return Promise.resolve(cache)
  if (pending) return pending
  pending = api.get('/routes/stops')
    .then(res => {
      cache = {}
      for (const s of res.data.stops) {
        cache[s.name] = { lat: s.lat, lng: s.lng }
      }
      return cache
    })
    .finally(() => { pending = null })
  return pending
}

// Replaces the old static utils/locations.js LOCATION_COORDS dictionary —
// same shape ({ [stopName]: { lat, lng } }), now sourced from the admin-
// managed stops table instead of a hardcoded file.
export function useStopCoords() {
  const [coords, setCoords] = useState(cache || {})
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) { setCoords(cache); setLoading(false); return }
    fetchStopCoords()
      .then(setCoords)
      .catch(() => setCoords({}))
      .finally(() => setLoading(false))
  }, [])

  return { coords, loading }
}
