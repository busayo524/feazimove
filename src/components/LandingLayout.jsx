import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export default function LandingLayout({ children, hideNav = false, hideFooter = false }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      {!hideNav && <Navbar />}
      <main>{children}</main>
      {!hideFooter && <Footer />}
    </div>
  )
}
