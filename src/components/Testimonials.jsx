import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Adaeze Okonkwo',
    role: 'Daily Commuter, Lagos',
    avatar: 'AO',
    rating: 5,
    text: 'FeaziMove has changed my morning routine completely. I used to spend ₦2,000 daily just getting to work. Now I spend less than ₦800 and share the ride with nice people heading the same way. It\'s honestly a lifesaver.',
    color: 'bg-feazi-green',
  },
  {
    name: 'Emeka Nwosu',
    role: 'Small Business Owner, Abuja',
    avatar: 'EN',
    rating: 5,
    text: 'FeaziMove is incredible for my business. I can send goods to my customers without hiring a separate delivery person. The tracking feature is top-notch and my customers love getting updates. Highly recommend.',
    color: 'bg-blue-500',
  },
  {
    name: 'Fatima Suleiman',
    role: 'HR Manager, Kano',
    avatar: 'FS',
    rating: 5,
    text: 'We enrolled our entire team on FeaziBiz and the savings have been remarkable. The dashboard makes it easy to manage bookings and the analytics help us optimize our commute policies.',
    color: 'bg-feazi-accent',
  },
  {
    name: 'Chukwudi Eze',
    role: 'University Student, Enugu',
    avatar: 'CE',
    rating: 5,
    text: 'As a student, every naira matters. FeaziPool makes it possible for me to move around the city affordably. The app is so simple to use and the drivers are always polite and professional.',
    color: 'bg-purple-500',
  },
]

export default function Testimonials() {
  const [idx, setIdx] = useState(0)
  const prev = () => setIdx((idx - 1 + testimonials.length) % testimonials.length)
  const next = () => setIdx((idx + 1) % testimonials.length)

  return (
    <section className="py-24 md:py-32 bg-feazi-dark bg-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-feazi-green/15 border border-feazi-green/30 text-feazi-green text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Real People, Real Results
          </span>
          <h2 className="section-title mb-4">
            What Our <span className="gradient-text">Riders Say</span>
          </h2>
        </div>

        {/* Featured testimonial */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="card gradient-border p-8 md:p-10 text-center">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(testimonials[idx].rating)].map((_, i) => (
                <Star key={i} size={18} className="text-feazi-accent fill-feazi-accent" />
              ))}
            </div>

            <blockquote className="text-white/90 text-lg md:text-xl leading-relaxed mb-8 italic">
              "{testimonials[idx].text}"
            </blockquote>

            <div className="flex items-center justify-center gap-4">
              <div className={`w-12 h-12 rounded-full ${testimonials[idx].color} flex items-center justify-center font-bold text-white text-sm`}>
                {testimonials[idx].avatar}
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">{testimonials[idx].name}</div>
                <div className="text-white/50 text-sm">{testimonials[idx].role}</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <button onClick={prev} className="w-10 h-10 rounded-full bg-white/10 hover:bg-feazi-green/30 border border-white/10 flex items-center justify-center text-white transition">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={`transition-all duration-300 rounded-full ${i === idx ? 'w-6 h-2 bg-feazi-green' : 'w-2 h-2 bg-white/20'}`} />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 rounded-full bg-white/10 hover:bg-feazi-green/30 border border-white/10 flex items-center justify-center text-white transition">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Mini cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {testimonials.map(({ name, role, avatar, color, rating }, i) => (
            <button
              key={name}
              onClick={() => setIdx(i)}
              className={`card text-left transition-all duration-200 ${i === idx ? 'border-feazi-green/50 bg-feazi-green/10' : 'hover:border-white/20'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center font-bold text-white text-xs flex-shrink-0`}>
                  {avatar}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{name}</div>
                  <div className="text-white/40 text-xs">{role}</div>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[...Array(rating)].map((_, j) => (
                  <Star key={j} size={12} className="text-feazi-accent fill-feazi-accent" />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
