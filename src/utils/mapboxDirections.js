// Fetches a real, road-following driving route between two points via the
// Mapbox Directions API — used instead of a straight as-the-crow-flies line
// so the map shows the actual streets being travelled. Also returns the
// route's estimated duration, used to show a live ETA for the current stage.
export async function fetchDrivingRoute(from, to, token) {
  if (!from || !to || !token) return null
  try {
    const res = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?geometries=geojson&overview=full&access_token=${token}`
    )
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) return null
    return { coordinates: route.geometry.coordinates, durationSeconds: route.duration }
  } catch {
    return null
  }
}
