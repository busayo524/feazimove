import { useState, useEffect } from 'react'
import { api } from '../services/api'

// Active, priced routes for a given period — the single source of truth for
// pickup/dropoff options, shared by Book Ride and Move an Item so both use
// the exact same route structure.
export function useRoutes(period) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/routes?period=${period}`)
      .then(res => setRoutes(res.data.routes))
      .catch(() => setRoutes([]))
      .finally(() => setLoading(false))
  }, [period])

  const pickupOptions = [...new Set(routes.map(r => r.pickup))].sort()
  const dropoffOptionsFor = pickup => [...new Set(
    routes.filter(r => !pickup || r.pickup === pickup).map(r => r.dropoff)
  )].sort()

  return { routes, loading, pickupOptions, dropoffOptionsFor }
}
