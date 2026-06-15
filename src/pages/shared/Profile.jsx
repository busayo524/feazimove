import React, { useState } from 'react'
import { User, Phone, Shield, LogOut, ChevronRight, Bell, HelpCircle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

function sanitize(val) { return val.replace(/[<>"']/g, '').trim() }

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    const clean = sanitize(name)
    if (!clean || clean.length < 2) return
    setSaving(true)
    try {
      await api.patch('/auth/profile', { name: clean })
      updateUser({ name: clean })
      setEditing(false)
      setSaveMsg('Profile updated.')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch {
      setSaveMsg('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const menuItems = [
    { icon: Bell,       label: 'Notifications',    sub: 'Manage alerts and ride updates' },
    { icon: Shield,     label: 'Privacy & Security', sub: 'Password, 2FA, data settings' },
    { icon: HelpCircle, label: 'Help & Support',   sub: 'FAQs, contact us, report issue' },
  ]

  return (
    <AppLayout title="My Profile">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Avatar + name */}
        <div className="card text-center py-8">
          <div className="w-20 h-20 rounded-2xl bg-feazi-green/20 border-2 border-feazi-green/40 flex items-center justify-center font-black text-feazi-green text-4xl mx-auto mb-4">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-3 max-w-xs mx-auto">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-center text-sm focus:outline-none focus:border-feazi-green/60 transition"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(false); setName(user?.name || '') }} className="btn-outline flex-1 justify-center py-2 text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2 text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h2 className="font-display font-bold text-white text-2xl mb-1">{user?.name || 'User'}</h2>
              <p className="text-white/50 text-sm capitalize mb-1">{user?.role || 'rider'}</p>
              <p className="text-white/40 text-sm mb-4">{user?.phone || ''}</p>
              <button onClick={() => setEditing(true)} className="text-feazi-green text-sm font-semibold hover:underline">
                Edit name
              </button>
              {saveMsg && <p className="text-feazi-green text-xs mt-2">{saveMsg}</p>}
            </>
          )}
        </div>

        {/* Info card */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-white">Account Details</h3>
          {[
            { icon: User,  label: 'Full Name',    value: user?.name || '—' },
            { icon: Phone, label: 'Phone Number', value: user?.phone || '—' },
            { icon: Shield, label: 'Account Type', value: user?.role === 'driver' ? '🚗 Driver' : '👤 Rider' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-white/50" />
              </div>
              <div className="flex-1">
                <p className="text-white/40 text-xs">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="card space-y-1 p-2">
          {menuItems.map(({ icon: Icon, label, sub }) => (
            <button key={label} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition text-left group">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-feazi-green/20 transition">
                <Icon size={16} className="text-white/50 group-hover:text-feazi-green transition" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-white/40 text-xs">{sub}</p>
              </div>
              <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition font-semibold"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </AppLayout>
  )
}
