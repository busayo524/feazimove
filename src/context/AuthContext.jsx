import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

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
    api.get('/auth/me')
      .then(res => setUser(normalizeUser(res.data.user)))
      .catch(() => {
        localStorage.removeItem('fm_token')
        localStorage.removeItem('fm_user')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password })
    const { token, user } = res.data
    const normalized = normalizeUser(user)
    localStorage.setItem('fm_token', token)
    localStorage.setItem('fm_user', JSON.stringify(normalized))
    setUser(normalized)
    return normalized
  }, [])

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data)
    // Registration now returns { pending: true } — no token yet
    if (res.data.pending) return { pending: true }
    const { token, user } = res.data
    const normalized = normalizeUser(user)
    localStorage.setItem('fm_token', token)
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
    localStorage.removeItem('fm_token')
    localStorage.removeItem('fm_user')
    setUser(null)
  }, [])

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
