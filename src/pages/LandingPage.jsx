import React from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Stats from '../components/Stats'
import HowItWorks from '../components/HowItWorks'
import Features from '../components/Features'
import Services from '../components/Services'
import About from '../components/About'
import Testimonials from '../components/Testimonials'
import DownloadCTA from '../components/DownloadCTA'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-feazi-dark">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Services />
        <About />
        <Testimonials />
        <DownloadCTA />
      </main>
      <Footer />
    </div>
  )
}
