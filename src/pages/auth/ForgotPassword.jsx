import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { api } from '../../services/api'

function sanitizePhone(val) {
  return val.replace(/[^0-9+\-\s()]/g, '').slice(0, 20)
}

export default function ForgotPassword() {
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone) { setError('Please enter your phone number.'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { phone })
      setSent(true)
    } catch {
      // Always show the same message — prevents phone enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-feazi-dark bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-feazi-green flex items-center justify-center">
              <span className="font-display font-black text-white text-xl">F</span>
            </div>
            <span className="font-display font-bold text-white text-xl">Feazi<span className="text-feazi-green">Move</span></span>
          </Link>
          <h1 className="font-display font-bold text-3xl text-white mb-2">Reset Password</h1>
          <p className="text-white/50 text-sm">We'll send an OTP to your number</p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-feazi-green mx-auto mb-4" />
              <h3 className="font-display font-bold text-white text-xl mb-2">Check your phone</h3>
              <p className="text-white/60 text-sm mb-6">
                If that number is registered, you'll receive an OTP shortly. Enter it to reset your password.
              </p>
              <Link to="/login" className="btn-primary justify-center w-full">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="fp-phone" className="block text-white/70 text-sm font-medium mb-2">Phone Number</label>
                <input
                  id="fp-phone"
                  type="tel"
                  value={phone}
                  onChange={e => { setPhone(sanitizePhone(e.target.value)); setError('') }}
                  placeholder="+234 800 000 0000"
                  autoComplete="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-feazi-green/60 transition"
                />
                {error && <p className="text-red-400 text-xs mt-1.5" role="alert">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset OTP'}
              </button>
            </form>
          )}
        </div>

        <Link to="/login" className="flex items-center justify-center gap-2 text-white/50 hover:text-white text-sm mt-6 transition">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </div>
  )
}
