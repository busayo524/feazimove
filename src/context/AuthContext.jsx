import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { identifyUser, resetAnalytics, track } from '../services/analytics'
import { useIdleLogout, sessionIsStale, ACTIVITY_KEY, IDLE_LOGOUT_FLAG } from '../hooks/useIdleLogout'

const AuthContext = createContext(null)

// Split "Full Name" → { firstName, lastName } for UI components that expect separate fields
function normalizeUser(user) {
  if (!user) return null
  if (user.firstName) return user  // already split
  const parts = (user.name || '').trim().split(/\s+/)
  return {
    ...user,
    firstName: parts[0] || '',
    lastName:  parts.slice(1).join(' ') || '',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fm_token')
    if (!token) { setLoading(false); return }
    // Session sat idle past the limit while the app was closed — don't restore it
    if (sessionIsStale()) {
      localStorage.removeItem('fm_token')
      localStorage.removeItem('fm_refresh')
      localStorage.removeItem('fm_user')
      localStorage.removeItem(ACTIVITY_KEY)
      sessionStorage.setItem(IDLE_LOGOUT_FLAG, '1')
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then(res => {
        const restored = normalizeUser(res.data.user)
        setUser(restored)
        identifyUser(restored)
      })
      .catch(() => {
        localStorage.removeItem('fm_token')
        localStorage.removeItem('fm_refresh')
        localStorage.removeItem('fm_user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    const { token, refreshToken, user } = res.data
    const normalized = normalizeUser(user)
    localStorage.setItem('fm_token', token)
    if (refreshToken) localStorage.setItem('fm_refresh', refreshToken)
    localStorage.setItem('fm_user', JSON.stringify(normalized))
    setUser(normalized)
    identifyUser(normalized)
    track('Logged In', { role: normalized.activeRole || normalized.role })
    return normalized
  }, [])

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data)
    // Registration now returns { pending: true } — no token yet
    if (res.data.pending) return { pending: true }
    const { token, refreshToken, user } = res.data
    const normalized = normalizeUser(user)
    localStorage.setItem('fm_token', token)
    if (refreshToken) localStorage.setItem('fm_refresh', refreshToken)
    localStorage.setItem('fm_user', JSON.stringify(normalized))
    setUser(normalized)
    return normalized
  }, [])

  const switchRole = useCallback(async (role) => {
    const res = await api.post('/auth/switch-role', { role })
    const normalized = normalizeUser(res.data.user)
    if (res.data.token) localStorage.setItem('fm_token', res.data.token)
    localStorage.setItem('fm_user', JSON.stringify(normalized))
    setUser(normalized)
    return normalized
  }, [])

  const addRole = useCallback(async (role) => {
    const res = await api.post('/auth/add-role', { role })
    const normalized = normalizeUser(res.data.user)
    if (res.data.token) localStorage.setItem('fm_token', res.data.token)
    localStorage.setItem('fm_user', JSON.stringify(normalized))
    setUser(normalized)
    return normalized
  }, [])

  const logout = useCallback(() => {
    // Best-effort server-side revoke of this device's refresh-token family
    const rt = localStorage.getItem('fm_refresh')
    if (rt) api.post('/auth/logout', { refreshToken: rt }).catch(() => {})
    localStorage.removeItem('fm_token')
    localStorage.removeItem('fm_refresh')
    localStorage.removeItem('fm_user')
    localStorage.removeItem(ACTIVITY_KEY)
    setUser(null)
    resetAnalytics()
  }, [])

  // Auto-logout after 45 minutes of inactivity
  useIdleLogout(user, logout)

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('fm_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, switchRole, addRole }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
