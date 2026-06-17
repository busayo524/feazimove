import React from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Instagram, Linkedin, Mail, MapPin } from 'lucide-react'
import Logo from './Logo'

const links = {
  Product:  [
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'Services',     to: '/services' },
    { label: 'For Drivers',  to: '/register' },
    { label: 'FeaziBiz',     to: '/services' },
  ],
  Company:  [
    { label: 'About Us',  to: '/about' },
    { label: 'Careers',   to: '#' },
    { label: 'Blog',      to: '#' },
    { label: 'Press',     to: '#' },
  ],
  Support:  [
    { label: 'Contact',     to: '/contact' },
    { label: 'Help Center', to: '#' },
    { label: 'Safety',      to: '/safety' },
    { label: 'Community',   to: '#' },
  ],
  Legal:    [
    { label: 'Terms of Use',          to: '/policies?tab=terms' },
    { label: 'Privacy Policy',        to: '/policies?tab=privacy' },
    { label: 'Behaviour Policy',      to: '/policies?tab=behaviour' },
    { label: 'Safety Policy',         to: '/policies?tab=safety' },
    { label: 'Cookie Policy',         to: '/policies?tab=cookie' },
    { label: 'Trip Cancellation',     to: '/policies?tab=cancellation' },
    { label: 'Refund Policy',         to: '/policies?tab=refund' },
  ],
}

export default function Footer() {
  return (
    <footer style={{ background: '#000000', borderTop: '1px solid rgba(204,255,0,0.15)' }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            {/* Footer logo — neon green mark on black */}
            <Logo forceVariant="green" />

            <p className="mt-4 text-sm leading-relaxed mb-5" style={{ color: 'rgba(245,245,240,0.55)', maxWidth: '260px' }}>
              Making mobility feasible, affordable, and easy across African cities — the Feazi Way.
            </p>
            <div className="space-y-2 text-sm mb-6" style={{ color: 'rgba(245,245,240,0.5)' }}>
              <a href="mailto:support@feazimove.com"
                className="flex items-center gap-2 transition-colors"
                style={{ color: 'rgba(245,245,240,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ccff00'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,245,240,0.5)'}
              >
                <Mail size={13} /> support@feazimove.com
              </a>
              <a href="tel:+2349029723224"
                className="flex items-center gap-2 transition-colors"
                style={{ color: 'rgba(245,245,240,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ccff00'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,245,240,0.5)'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-.77a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                +234 902 972 3224
              </a>
              <div className="flex items-center gap-2" style={{ color: 'rgba(245,245,240,0.5)' }}>
                <MapPin size={13} /> Lagos, Nigeria
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { Icon: Facebook,  href: 'https://web.facebook.com/profile.php?id=61590273165597', label: 'Facebook' },
                { Icon: Instagram, href: 'https://www.instagram.com/feazimove/', label: 'Instagram' },
                { Icon: Linkedin,  href: 'https://www.linkedin.com/company/feazimove/', label: 'LinkedIn' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(245,245,240,0.5)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#ccff00'; e.currentTarget.style.color = '#0a0a0a' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(245,245,240,0.5)' }}
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="font-bold text-sm mb-4" style={{ color: '#f5f5f0' }}>{group}</h4>
              <ul className="space-y-2.5">
                {items.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm transition-colors"
                      style={{ color: 'rgba(245,245,240,0.45)' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ccff00'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,245,240,0.45)'}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-sm" style={{ color: 'rgba(245,245,240,0.35)' }}>
            © {new Date().getFullYear()} FeaziMove. All rights reserved.
          </p>
          <p className="text-sm font-semibold" style={{ color: '#ccff00' }}>
            Making Mobility Feasible. Making Everyday Life Easy.
          </p>
        </div>
      </div>
    </footer>
  )
}
