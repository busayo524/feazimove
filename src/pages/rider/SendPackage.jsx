import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { Package, MapPin, Phone, User, AlertCircle, ArrowRight } from 'lucide-react'

function sanitize(val) { return val.replace(/[<>"']/g, '').trim() }

export default function SendPackage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ from: '', to: '', recipientName: '', recipientPhone: '', description: '', size: 'small', fragile: false })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(field, val) {
    setForm(p => ({ ...p, [field]: typeof val === 'string' ? sanitize(val) : val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.from.trim()) e.from = 'Enter pickup location'
    if (!form.to.trim()) e.to = 'Enter delivery location'
    if (form.from.trim() === form.to.trim()) e.to = 'Pickup and delivery must be different'
    if (!form.recipientName.trim()) e.recipientName = 'Enter recipient name'
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(form.recipientPhone.replace(/\s/g, ''))) e.recipientPhone = 'Enter a valid Nigerian phone number'
    if (!form.description.trim()) e.description = 'Describe what you are sending'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSubmitted(true)
  }

  const inputStyle = (hasErr) => ({
    width: '100%', padding: '13px 14px', borderRadius: 12, fontSize: 15, fontFamily: 'inherit',
    background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${hasErr ? '#f87171' : 'rgba(255,255,255,0.10)'}`,
    color: '#ffffff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s',
  })

  const FARES = { small: 1200, medium: 2400, large: 3800 }

  if (submitted) return (
    <AppLayout title="Send Package">
      <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(204,255,0,0.12)', border: '2px solid rgba(204,255,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Package size={32} color="#ccff00" />
        </div>
        <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: 28, letterSpacing: '-0.02em', marginBottom: 12 }}>Package booked!</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.65, marginBottom: 32 }}>
          A driver heading to <strong style={{ color: '#ffffff' }}>{form.to}</strong> will collect your parcel shortly. You'll receive a tracking link by SMS.
        </p>
        <button onClick={() => { setSubmitted(false); setForm({ from: '', to: '', recipientName: '', recipientPhone: '', description: '', size: 'small', fragile: false }) }}
          style={{ background: '#ccff00', color: '#000', fontWeight: 800, fontSize: 15, padding: '14px 28px', borderRadius: 50, border: 'none', cursor: 'pointer' }}>
          Send Another
        </button>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout title="Send Package">
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: '#ffffff', fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,1.8rem)', letterSpacing: '-0.02em', marginBottom: 4 }}>Send a Package</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>We match your parcel with a driver already heading that way</p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Route */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Route</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Pickup location</label>
                <input value={form.from} onChange={e => set('from', e.target.value)} placeholder="e.g. 12 Awolowo Road, Ikeja"
                  style={inputStyle(!!errors.from)}
                  onFocus={e => { if (!errors.from) e.target.style.borderColor = 'rgba(204,255,0,0.4)' }}
                  onBlur={e => { if (!errors.from) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }} />
                {errors.from && <p style={{ color: '#f87171', fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.from}</p>}
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Delivery location</label>
                <input value={form.to} onChange={e => set('to', e.target.value)} placeholder="e.g. Lekki Phase 1, Lagos"
                  style={inputStyle(!!errors.to)}
                  onFocus={e => { if (!errors.to) e.target.style.borderColor = 'rgba(204,255,0,0.4)' }}
                  onBlur={e => { if (!errors.to) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }} />
                {errors.to && <p style={{ color: '#f87171', fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.to}</p>}
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Recipient</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Full name</label>
                <input value={form.recipientName} onChange={e => set('recipientName', e.target.value)} placeholder="Adaeze Okonkwo" autoComplete="name"
                  style={inputStyle(!!errors.recipientName)}
                  onFocus={e => { if (!errors.recipientName) e.target.style.borderColor = 'rgba(204,255,0,0.4)' }}
                  onBlur={e => { if (!errors.recipientName) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }} />
                {errors.recipientName && <p style={{ color: '#f87171', fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.recipientName}</p>}
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone number</label>
                <input value={form.recipientPhone} onChange={e => set('recipientPhone', e.target.value)} placeholder="+234 800 000 0000" type="tel" autoComplete="tel"
                  style={inputStyle(!!errors.recipientPhone)}
                  onFocus={e => { if (!errors.recipientPhone) e.target.style.borderColor = 'rgba(204,255,0,0.4)' }}
                  onBlur={e => { if (!errors.recipientPhone) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }} />
                {errors.recipientPhone && <p style={{ color: '#f87171', fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.recipientPhone}</p>}
              </div>
            </div>
          </div>

          {/* Package */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Package details</p>

            {/* Size */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10 }}>Size</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[
                  { id: 'small',  label: 'Small',  sub: 'Up to 2kg',  emoji: '📄' },
                  { id: 'medium', label: 'Medium', sub: 'Up to 10kg', emoji: '📦' },
                  { id: 'large',  label: 'Large',  sub: 'Up to 20kg', emoji: '🛍️' },
                ].map(s => (
                  <button key={s.id} type="button" onClick={() => set('size', s.id)} style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer', border: `1.5px solid ${form.size === s.id ? 'rgba(204,255,0,0.4)' : 'rgba(255,255,255,0.08)'}`, background: form.size === s.id ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
                    <p style={{ color: form.size === s.id ? '#ccff00' : '#ffffff', fontWeight: 700, fontSize: 12 }}>{s.label}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>{s.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>What are you sending?</label>
              <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Shoes, documents, phone charger"
                style={inputStyle(!!errors.description)}
                onFocus={e => { if (!errors.description) e.target.style.borderColor = 'rgba(204,255,0,0.4)' }}
                onBlur={e => { if (!errors.description) e.target.style.borderColor = 'rgba(255,255,255,0.10)' }} />
              {errors.description && <p style={{ color: '#f87171', fontSize: 12, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{errors.description}</p>}
            </div>

            {/* Fragile toggle */}
            <button type="button" onClick={() => set('fragile', !form.fragile)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ width: 40, height: 22, borderRadius: 99, background: form.fragile ? '#ccff00' : 'rgba(255,255,255,0.10)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: form.fragile ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: form.fragile ? '#000' : 'rgba(255,255,255,0.5)', transition: 'left 0.2s' }} />
              </div>
              <span style={{ color: form.fragile ? '#ccff00' : 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 600 }}>This item is fragile</span>
            </button>
          </div>

          {/* Fare estimate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: 14 }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Estimated fare</span>
            <span style={{ color: '#ccff00', fontWeight: 900, fontSize: 22 }}>₦{FARES[form.size].toLocaleString()}</span>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', borderRadius: 50, fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(204,255,0,0.4)' : '#ccff00', border: 'none', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {loading ? <><span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Booking...</> : <> Book Delivery <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </AppLayout>
  )
}
