import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { api } from '../../services/api'

function sanitize(val) { return val.replace(/[<>"']/g, '').trim() }

const topics = ['General Enquiry', 'Driver Partnership', 'Press & Media', 'Bug Report', 'Other']

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // 'success' | 'error'
  const [loading, setLoading] = useState(false)

  function set(field, val) {
    setForm(p => ({ ...p, [field]: sanitize(val) }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name || form.name.length < 2) e.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (!form.topic)   e.topic   = 'Select a topic.'
    if (!form.message || form.message.length < 10) e.message = 'Message must be at least 10 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await api.post('/contact', form)
      setStatus('success')
      setForm({ name: '', email: '', topic: '', message: '' })
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LandingLayout>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-grid" style={{ background: 'var(--bg)' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <p className="label mb-6 mx-auto" style={{ display:'inline-block' }}>Get in Touch</p>
          <h1 className="section-title mb-6" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}>
            We'd love to hear from you
          </h1>
          <p className="section-sub mx-auto">Have questions about FeaziMove, want to partner with us, or just want to say hello? We're here.</p>
        </div>
      </section>

      <section className="py-20" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-10">

          {/* Contact info */}
          <div className="space-y-6">
            <div>
              <h2 className="font-display font-black text-3xl mb-3" style={{ color: 'var(--text)' }}>Contact us</h2>
              <p className="section-sub">Reach out through any channel. We typically respond within 24 hours.</p>
            </div>

            {[
              { icon: Mail,    label: 'Email',    value: 'support@feazimove.com',  href: 'mailto:support@feazimove.com' },
              { icon: Phone,   label: 'Phone',    value: '+234 902 972 3224',     href: 'tel:+2349029723224' },
              { icon: MapPin,  label: 'Address',  value: 'Lagos, Nigeria',        href: null },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="card flex items-center gap-4 p-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--lime-dim)' }}>
                  <Icon size={18} className="text-lime" />
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  {href
                    ? <a href={href} className="font-semibold text-sm underline-lime" style={{ color: 'var(--text)' }}>{value}</a>
                    : <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{value}</p>
                  }
                </div>
              </div>
            ))}

            {/* Social links */}
            <div className="card p-6">
              <p className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Follow us</p>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Twitter / X', href: 'https://twitter.com/feazimove' },
                  { label: 'Instagram',   href: 'https://www.instagram.com/feazimove/' },
                  { label: 'LinkedIn',    href: 'https://www.linkedin.com/company/feazimove/' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold px-4 py-2 rounded-full transition-all"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--lime-dim)'; e.currentTarget.style.color = 'var(--lime-text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="card p-8">
            {status === 'success' ? (
              <div className="text-center py-10">
                <CheckCircle size={52} className="text-lime mx-auto mb-4" />
                <h3 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text)' }}>Message sent!</h3>
                <p className="section-sub mb-6">We'll get back to you within 24 hours.</p>
                <button onClick={() => setStatus(null)} className="btn-lime">Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <h3 className="font-display font-bold text-xl" style={{ color: 'var(--text)' }}>Send a message</h3>

                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: 'name',  label: 'Name',  type: 'text',  placeholder: 'Your name' },
                    { field: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
                  ].map(({ field, label, type, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{label}</label>
                      <input
                        type={type}
                        value={form[field]}
                        onChange={e => set(field, e.target.value)}
                        placeholder={placeholder}
                        maxLength={100}
                        className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                        style={{
                          background: 'var(--bg-subtle)',
                          border: `1px solid ${errors[field] ? '#EF4444' : 'var(--border)'}`,
                          color: 'var(--text)',
                        }}
                      />
                      {errors[field] && <p className="text-red-400 text-xs mt-1">{errors[field]}</p>}
                    </div>
                  ))}
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Topic</label>
                  <select
                    value={form.topic}
                    onChange={e => set('topic', e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: `1px solid ${errors.topic ? '#EF4444' : 'var(--border)'}`,
                      color: form.topic ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    <option value="">Select a topic</option>
                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.topic && <p className="text-red-400 text-xs mt-1">{errors.topic}</p>}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Tell us how we can help..."
                    rows={5}
                    maxLength={1000}
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition resize-none"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: `1px solid ${errors.message ? '#EF4444' : 'var(--border)'}`,
                      color: 'var(--text)',
                    }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {errors.message
                      ? <p className="text-red-400 text-xs">{errors.message}</p>
                      : <span />
                    }
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{form.message.length}/1000</p>
                  </div>
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }} role="alert">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-sm">Could not send message. Please try again.</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-lime w-full justify-center py-3.5 disabled:opacity-50">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <><Send size={15} /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
