import React, { useState } from 'react'
import { Smartphone, ArrowRight } from 'lucide-react'

// Input sanitization helper — prevents XSS in controlled inputs
function sanitizePhone(val) {
  return val.replace(/[^0-9+\-\s()]/g, '').slice(0, 20)
}

export default function DownloadCTA() {
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // Basic validation — real validation happens server-side
    const cleaned = phone.replace(/\s/g, '').replace(/-/g, '')
    if (cleaned.length < 10) {
      setError('Please enter a valid phone number.')
      return
    }
    setError('')
    setSent(true)
    setPhone('')
  }

  return (
    <section id="download" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-feazi-green/20 via-feazi-dark to-feazi-dark pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-feazi-green/40 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-feazi-green mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-green-900/50 glow">
          <Smartphone size={36} className="text-white" />
        </div>

        <h2 className="section-title mb-4">
          Start Moving the <span className="gradient-text">Feazi Way</span>
        </h2>
        <p className="section-sub mx-auto text-center mb-10">
          Download the app today and make your first trip. Available on iOS and Android — free to download, free to register.
        </p>

        {/* Phone SMS CTA */}
        {!sent ? (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-8" noValidate>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="phone-cta" className="sr-only">Phone number</label>
                <input
                  id="phone-cta"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(sanitizePhone(e.target.value))}
                  placeholder="+234 800 000 0000"
                  autoComplete="tel"
                  className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-white placeholder-white/40 text-sm focus:outline-none focus:border-feazi-green/60 focus:bg-white/15 transition"
                  aria-describedby={error ? 'phone-error' : undefined}
                />
              </div>
              <button type="submit" className="btn-primary px-6 py-4 whitespace-nowrap">
                Get Link <ArrowRight size={16} />
              </button>
            </div>
            {error && (
              <p id="phone-error" className="text-red-400 text-sm mt-2 text-left px-4" role="alert">{error}</p>
            )}
          </form>
        ) : (
          <div className="max-w-md mx-auto mb-8 bg-feazi-green/15 border border-feazi-green/30 rounded-2xl px-6 py-4 text-feazi-green font-semibold" role="status">
            ✅ Download link sent! Check your phone.
          </div>
        )}

        {/* Store badges */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <a href="#" className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-2xl px-6 py-4 hover:bg-white/10 hover:border-white/30 transition group" aria-label="Download on the App Store">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-white/50 text-xs">Download on the</div>
              <div className="text-white font-semibold text-sm">App Store</div>
            </div>
          </a>

          <a href="#" className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-2xl px-6 py-4 hover:bg-white/10 hover:border-white/30 transition group" aria-label="Get it on Google Play">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M3.18 23.77A2 2 0 0 1 2 22V2a2 2 0 0 1 1.18-1.77l11.09 11.64zm15.88-10.51L16.43 12l2.63-1.26 3.5 2.09a1 1 0 0 1 0 1.75zM3.85 1.16 15.6 12 3.85 22.84 3 22V2z"/>
            </svg>
            <div className="text-left">
              <div className="text-white/50 text-xs">Get it on</div>
              <div className="text-white font-semibold text-sm">Google Play</div>
            </div>
          </a>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap justify-center gap-8 text-sm text-white/40">
          <span>🔒 Secure & encrypted</span>
          <span>🌍 Available in Nigeria & more</span>
          <span>💳 No hidden charges</span>
        </div>
      </div>
    </section>
  )
}
