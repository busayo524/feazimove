// Fetches a real, road-following driving route between two points via the
// Mapbox Directions API — used instead of a straight as-the-crow-flies line
// so the map shows the actual streets being travelled.
export async function fetchDrivingRoute(from, to, token) {
  if (!from || !to || !token) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?geometries=geojson&overview=full&access_token=${token}`
    )
    const data = await res.json()
    return data.routes?.[0]?.geometry?.coordinates || null
  } catch {
    return null
  }
}
