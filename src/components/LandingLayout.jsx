import React from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export default function LandingLayout({ children }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
