import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import LandingLayout from '../../components/LandingLayout'

// ── Policy content ────────────────────────────────────────────────────────────

const POLICIES = [
  {
    id: 'terms',
    label: 'Terms of Use',
    content: (
      <>
        <h2 className="policy-heading">Terms of Use</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. Contractual Relationship</h3>
        <p>1.1 These Terms of Use are a legal agreement between you ("User", "you", or "your") and FeaziMove Technologies Limited ("FeaziMove", "we", "us", or "our"). By accessing or using the FeaziMove platform — including our website, mobile app, and any related services — you agree to be bound by these Terms.</p>
        <p>1.2 If you do not agree to these Terms, you must immediately stop using our platform and services.</p>
        <p>1.3 We may update these Terms from time to time. Continued use of our platform after changes are published constitutes your acceptance of the updated Terms.</p>

        <h3>2. Use of the Platform</h3>
        <p>2.1 You must be at least 18 years old to create an account and use FeaziMove services.</p>
        <p>2.2 You agree to provide accurate, current, and complete information during registration and to keep your account information updated.</p>
        <p>2.3 You are responsible for safeguarding your account credentials. FeaziMove will not be liable for any loss arising from unauthorised access to your account resulting from your failure to secure your credentials.</p>
        <p>2.4 You agree not to use the platform for any unlawful purpose or in any way that violates these Terms.</p>

        <h3>3. Pooled Transport & Shared Rides</h3>
        <p>3.1 FeaziMove facilitates pooled transport services connecting commuters and goods along shared routes. By booking a shared ride or delivery, you agree to share the vehicle with other users.</p>
        <p>3.2 All bookings are subject to availability and are confirmed only upon receipt of payment or booking confirmation.</p>
        <p>3.3 FeaziMove reserves the right to cancel or modify any booking where it is necessary to ensure safety, legal compliance, or operational efficiency.</p>

        <h3>4. Payments & Fees</h3>
        <p>4.1 All fares and fees are displayed clearly on the platform before booking. By completing a booking, you authorise FeaziMove to charge the applicable fare to your selected payment method.</p>
        <p>4.2 FeaziMove may apply surge pricing during high-demand periods. You will be notified of any price changes before confirming a booking.</p>
        <p>4.3 Refunds are governed by our Refund Policy.</p>

        <h3>5. Prohibited Conduct</h3>
        <p>5.1 You agree not to: (a) use the platform to harass, abuse, or harm other users or drivers; (b) provide false information or impersonate another person; (c) use the platform to transport illegal goods or substances; (d) attempt to reverse-engineer, scrape, or disrupt the platform; (e) engage in fraudulent activity, including chargeback abuse.</p>

        <h3>6. Limitation of Liability</h3>
        <p>6.1 FeaziMove is a technology platform connecting riders, commuters, and transport providers. To the fullest extent permitted by law, FeaziMove shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        <p>6.2 Our total liability to you for any claim shall not exceed the total amount paid by you to FeaziMove in the three (3) months preceding the event giving rise to the claim.</p>

        <h3>7. Governing Law</h3>
        <p>7.1 These Terms shall be governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.</p>

        <h3>8. Contact</h3>
        <p>For questions about these Terms, contact us at <a href="mailto:legal@feazimove.com">legal@feazimove.com</a>.</p>
      </>
    ),
  },
  {
    id: 'privacy',
    label: 'Privacy Policy',
    content: (
      <>
        <h2 className="policy-heading">Privacy Policy</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. Introduction</h3>
        <p>FeaziMove Technologies Limited ("FeaziMove") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, share, and protect your data when you use our platform.</p>

        <h3>2. Information We Collect</h3>
        <p>2.1 <strong>Account Information:</strong> Name, email address, phone number, and profile photo provided during registration.</p>
        <p>2.2 <strong>Location Data:</strong> Real-time GPS location when you use the app for bookings and route matching.</p>
        <p>2.3 <strong>Trip Data:</strong> Pickup and drop-off points, route history, and trip duration.</p>
        <p>2.4 <strong>Payment Information:</strong> Card details are processed securely via our payment partners and are not stored on our servers.</p>
        <p>2.5 <strong>Device Information:</strong> IP address, device type, operating system, and app version.</p>
        <p>2.6 <strong>Communications:</strong> Messages sent through our in-app support or to our team.</p>

        <h3>3. How We Use Your Information</h3>
        <p>3.1 To provide, operate, and improve our platform and services.</p>
        <p>3.2 To match you with available shared rides along your route.</p>
        <p>3.3 To process payments and prevent fraud.</p>
        <p>3.4 To send service-related notifications, updates, and promotional communications (with your consent).</p>
        <p>3.5 To comply with legal obligations and enforce our policies.</p>

        <h3>4. Sharing Your Information</h3>
        <p>4.1 We do not sell your personal data to third parties.</p>
        <p>4.2 We may share your data with: (a) Drivers and co-passengers for the purpose of completing your trip; (b) Payment processors for secure transaction handling; (c) Analytics providers to improve our services; (d) Law enforcement or regulatory authorities when required by law.</p>

        <h3>5. Data Retention</h3>
        <p>5.1 We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us.</p>

        <h3>6. Your Rights</h3>
        <p>6.1 You have the right to: access your personal data; correct inaccurate information; request deletion of your data; withdraw consent for marketing communications; and lodge a complaint with the Nigerian Data Protection Commission (NDPC).</p>

        <h3>7. Security</h3>
        <p>7.1 We implement industry-standard security measures including encryption in transit (TLS), hashed password storage, and access controls to protect your data.</p>

        <h3>8. Contact</h3>
        <p>For privacy-related queries, contact our Data Protection Officer at <a href="mailto:privacy@feazimove.com">privacy@feazimove.com</a>.</p>
      </>
    ),
  },
  {
    id: 'behaviour',
    label: 'Behaviour Policy',
    content: (
      <>
        <h2 className="policy-heading">Behaviour Policy</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. Our Community Standards</h3>
        <p>FeaziMove is committed to creating a safe, respectful, and inclusive mobility experience for all users — riders, commuters, and drivers alike. This Behaviour Policy sets out the standards of conduct expected on our platform.</p>

        <h3>2. Expected Conduct — Riders & Commuters</h3>
        <p>2.1 Treat all drivers, co-passengers, and FeaziMove staff with courtesy and respect.</p>
        <p>2.2 Be ready at your pickup point at the scheduled time to avoid delays for other passengers.</p>
        <p>2.3 Do not bring illegal substances, weapons, or hazardous materials on board any FeaziMove vehicle.</p>
        <p>2.4 Keep noise to a reasonable level and avoid playing loud music or engaging in disruptive behaviour.</p>
        <p>2.5 Wear your seatbelt at all times when in the vehicle.</p>
        <p>2.6 Do not eat strong-smelling food or engage in behaviour that may make co-passengers uncomfortable.</p>

        <h3>3. Expected Conduct — Drivers & Partners</h3>
        <p>3.1 Maintain a clean, roadworthy, and properly insured vehicle at all times.</p>
        <p>3.2 Follow all applicable traffic laws and drive safely and responsibly.</p>
        <p>3.3 Do not use mobile phones without a hands-free device while driving.</p>
        <p>3.4 Treat all passengers with courtesy and professionalism.</p>
        <p>3.5 Do not discriminate against any passenger on grounds of gender, ethnicity, religion, disability, or any other protected characteristic.</p>

        <h3>4. Zero-Tolerance Conduct</h3>
        <p>The following behaviours will result in immediate account suspension and may be reported to law enforcement:</p>
        <p>4.1 Physical or verbal assault of any person on the platform.</p>
        <p>4.2 Sexual harassment or inappropriate behaviour of any kind.</p>
        <p>4.3 Fraud, theft, or damage to property.</p>
        <p>4.4 Discrimination or hate speech.</p>

        <h3>5. Reporting Misconduct</h3>
        <p>5.1 Report any breach of this policy in-app or by emailing <a href="mailto:safety@feazimove.com">safety@feazimove.com</a>. All reports are treated confidentially and investigated promptly.</p>

        <h3>6. Consequences</h3>
        <p>6.1 Violations of this policy may result in a warning, temporary suspension, or permanent ban from the platform, depending on the severity of the conduct.</p>
      </>
    ),
  },
  {
    id: 'safety',
    label: 'Safety Policy',
    content: (
      <>
        <h2 className="policy-heading">Safety Policy</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. Our Commitment to Safety</h3>
        <p>Safety is at the core of the FeaziMove experience. We take proactive steps to ensure that every trip on our platform is as safe as possible for riders, drivers, and the communities we serve.</p>

        <h3>2. Driver Verification</h3>
        <p>2.1 All drivers on the FeaziMove platform must provide valid government-issued identification, a valid driver's licence, and proof of vehicle insurance before onboarding.</p>
        <p>2.2 Vehicles must meet our minimum roadworthiness standards and must not exceed 10 years of age.</p>
        <p>2.3 Drivers are subject to ongoing performance monitoring based on rider ratings and safety reports.</p>

        <h3>3. In-Trip Safety Features</h3>
        <p>3.1 <strong>Real-time Tracking:</strong> Every trip is tracked in real-time via GPS and can be shared with a trusted contact.</p>
        <p>3.2 <strong>Emergency SOS:</strong> The FeaziMove app includes an in-app SOS button that alerts emergency contacts and our safety team.</p>
        <p>3.3 <strong>Trip Recording:</strong> Trip route data is recorded and stored securely for safety and dispute resolution purposes.</p>

        <h3>4. Passenger Safety</h3>
        <p>4.1 All passengers are required to wear seatbelts for the duration of the trip.</p>
        <p>4.2 Passengers must not distract the driver or interfere with the vehicle controls.</p>
        <p>4.3 Passengers are encouraged to rate their trip and report any safety concerns immediately after the ride.</p>

        <h3>5. Incident Reporting</h3>
        <p>5.1 Any accident, incident, or unsafe situation must be reported via the app or to <a href="mailto:safety@feazimove.com">safety@feazimove.com</a> within 24 hours.</p>
        <p>5.2 FeaziMove will investigate all safety reports and take appropriate action.</p>

        <h3>6. Children & Vulnerable Persons</h3>
        <p>6.1 Children under 12 must be accompanied by an adult on all FeaziMove trips.</p>
        <p>6.2 Drivers must not transport unaccompanied minors.</p>
      </>
    ),
  },
  {
    id: 'cookie',
    label: 'Cookie Policy',
    content: (
      <>
        <h2 className="policy-heading">Cookie Policy</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. What Are Cookies?</h3>
        <p>Cookies are small text files placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our platform.</p>

        <h3>2. Types of Cookies We Use</h3>
        <p>2.1 <strong>Strictly Necessary Cookies:</strong> Required for the platform to function. These cannot be disabled. They include session management and security tokens.</p>
        <p>2.2 <strong>Performance Cookies:</strong> Help us understand how visitors interact with our platform (e.g., pages visited, errors encountered). Data is aggregated and anonymised.</p>
        <p>2.3 <strong>Functional Cookies:</strong> Remember your preferences such as language, theme, and login status.</p>
        <p>2.4 <strong>Analytics Cookies:</strong> Used by third-party analytics tools (e.g., Google Analytics) to measure traffic and improve our platform. You may opt out of these.</p>

        <h3>3. Managing Cookies</h3>
        <p>3.1 You can control cookies through your browser settings. Disabling certain cookies may affect your experience on the platform.</p>
        <p>3.2 To opt out of analytics cookies, use our cookie preference centre or configure your browser to block third-party cookies.</p>

        <h3>4. Third-Party Cookies</h3>
        <p>4.1 Some features on our platform may be provided by third parties who set their own cookies (e.g., payment providers, maps). We do not control these cookies and recommend reviewing the relevant third-party privacy policies.</p>

        <h3>5. Updates to This Policy</h3>
        <p>5.1 We may update this Cookie Policy periodically. We will notify you of material changes via the platform or by email.</p>

        <h3>6. Contact</h3>
        <p>For questions about our use of cookies, contact <a href="mailto:privacy@feazimove.com">privacy@feazimove.com</a>.</p>
      </>
    ),
  },
  {
    id: 'cancellation',
    label: 'Trip Cancellation Policy',
    content: (
      <>
        <h2 className="policy-heading">Trip Cancellation Policy</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. Cancellation by Rider</h3>
        <p>1.1 You may cancel a booking at any time before the scheduled pickup time through the FeaziMove app.</p>
        <p>1.2 Cancellations made more than 60 minutes before the scheduled departure: Full refund to the original payment method.</p>
        <p>1.3 Cancellations made between 15 and 60 minutes before departure: 50% refund. The remaining 50% is retained as a late cancellation fee.</p>
        <p>1.4 Cancellations made less than 15 minutes before departure or no-shows: No refund. The full fare is retained.</p>

        <h3>2. Cancellation by Driver / FeaziMove</h3>
        <p>2.1 In the event that FeaziMove or a driver cancels your trip, you will receive a full refund to your original payment method within 3–5 business days.</p>
        <p>2.2 FeaziMove will endeavour to find an alternative vehicle or route where possible.</p>

        <h3>3. Repeated Cancellations</h3>
        <p>3.1 Repeated cancellations by a user may result in temporary restrictions on booking privileges, at FeaziMove's discretion.</p>

        <h3>4. How to Cancel</h3>
        <p>4.1 Cancellations must be made through the FeaziMove app. Phone or email cancellations are not accepted for scheduled trips.</p>

        <h3>5. Force Majeure</h3>
        <p>5.1 In cases of extreme weather, civil unrest, government directives, or other circumstances beyond our control, FeaziMove may cancel trips with full refunds and without liability to either party.</p>

        <h3>6. Contact</h3>
        <p>For cancellation queries, contact <a href="mailto:support@feazimove.com">support@feazimove.com</a>.</p>
      </>
    ),
  },
  {
    id: 'refund',
    label: 'Refund Policy',
    content: (
      <>
        <h2 className="policy-heading">Refund Policy</h2>
        <p className="policy-date">Document effective: January 1, 2025</p>

        <h3>1. Eligibility for Refunds</h3>
        <p>1.1 You may be eligible for a full or partial refund in the following circumstances:</p>
        <p>(a) Your trip was cancelled by FeaziMove or the driver;</p>
        <p>(b) You cancelled within the eligible window as described in our Trip Cancellation Policy;</p>
        <p>(c) You were charged incorrectly due to a platform error;</p>
        <p>(d) The trip was significantly delayed or the route materially deviated from what was booked.</p>

        <h3>2. Non-Refundable Situations</h3>
        <p>2.1 Refunds will not be issued in the following situations:</p>
        <p>(a) Late cancellations or no-shows (as per the Trip Cancellation Policy);</p>
        <p>(b) Dissatisfaction with the service that does not amount to a policy breach;</p>
        <p>(c) Promotions, discount codes, or wallet credits applied to the booking.</p>

        <h3>3. Refund Process</h3>
        <p>3.1 Approved refunds are returned to the original payment method within 5–10 business days, depending on your bank or payment provider.</p>
        <p>3.2 Alternatively, refunds may be credited to your FeaziMove wallet for immediate use on future trips.</p>

        <h3>4. How to Request a Refund</h3>
        <p>4.1 Submit a refund request through the app under "Trip History" or contact our support team at <a href="mailto:support@feazimove.com">support@feazimove.com</a> within 7 days of the trip date.</p>
        <p>4.2 Include your trip reference, booking date, and the reason for your refund request.</p>

        <h3>5. Dispute Resolution</h3>
        <p>5.1 If you disagree with our refund decision, you may escalate the matter to <a href="mailto:legal@feazimove.com">legal@feazimove.com</a>. We aim to resolve all disputes within 14 business days.</p>
      </>
    ),
  },
]

// ── Page Component ─────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = POLICIES.find(p => p.id === tabParam)?.id || POLICIES[0].id
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const id = searchParams.get('tab')
    if (id && POLICIES.find(p => p.id === id)) setActiveTab(id)
  }, [searchParams])

  const handleTab = (id) => {
    setActiveTab(id)
    setSearchParams({ tab: id })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const active = POLICIES.find(p => p.id === activeTab)

  return (
    <LandingLayout>
      <style>{`
        .policy-content h3 {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.1rem;
          color: #0f0f0f;
          margin: 2rem 0 0.6rem;
        }
        .policy-content p {
          color: #444;
          line-height: 1.85;
          margin-bottom: 0.6rem;
          font-size: 1rem;
        }
        .policy-content a {
          color: #2d7a00;
          font-weight: 600;
          text-decoration: underline;
        }
        .policy-content a:hover { color: #ccff00; }
        .policy-heading {
          font-family: var(--font-display) !important;
          font-weight: 900 !important;
          font-size: clamp(2rem, 4vw, 3rem) !important;
          color: #0f0f0f !important;
          margin: 0 0 0.25rem !important;
        }
        .policy-date {
          font-size: 0.82rem !important;
          color: #2d7a00 !important;
          font-weight: 700 !important;
          letter-spacing: 0.04em !important;
          margin-bottom: 2rem !important;
        }
        .tab-btn {
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 600;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
          background: transparent;
          color: #555;
        }
        .tab-btn:hover { color: #0f0f0f; border-color: #ddd; }
        .tab-btn.active {
          background: #0f0f0f;
          color: #ccff00;
          border-color: #0f0f0f;
        }
      `}</style>

      {/* ── Hero ── */}
      <section style={{ background: '#f8f8f6', borderBottom: '1px solid #e8e8e4', padding: '80px clamp(20px,6vw,80px) 60px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', color: '#2d7a00', textTransform: 'uppercase', marginBottom: 16 }}>
            FeaziMove · Legal
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.6rem,5vw,4rem)', color: '#0f0f0f', margin: '0 0 20px', lineHeight: 1.08 }}>
            FeaziMove Policies
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>
            Our policies form the legal agreement between you and FeaziMove Technologies Limited, governing how you use our platform and the services we provide.
          </p>
        </div>
      </section>

      {/* ── Tab bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: '#ffffff', borderBottom: '1px solid #e8e8e4', padding: '0 clamp(20px,4vw,60px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', overflowX: 'auto', display: 'flex', gap: 4, padding: '12px 0', scrollbarWidth: 'none' }}>
          {POLICIES.map(p => (
            <button
              key={p.id}
              className={`tab-btn${activeTab === p.id ? ' active' : ''}`}
              onClick={() => handleTab(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <section style={{ background: '#ffffff', padding: '60px clamp(20px,6vw,80px) 100px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div className="policy-content">
            {active?.content}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{ background: '#f8f8f6', borderTop: '1px solid #e8e8e4', padding: '60px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: '#0f0f0f', marginBottom: 12 }}>
            Have questions about our policies?
          </h3>
          <p style={{ color: '#666', fontSize: '1rem', lineHeight: 1.7, marginBottom: 28 }}>
            Our team is happy to clarify anything. Reach out to us and we'll respond within 24 hours.
          </p>
          <a
            href="mailto:legal@feazimove.com"
            style={{ display: 'inline-block', background: '#0f0f0f', color: '#ccff00', fontWeight: 700, fontSize: '0.95rem', padding: '14px 32px', borderRadius: 999, textDecoration: 'none', letterSpacing: '0.02em' }}
          >
            Contact Legal Team
          </a>
        </div>
      </section>
    </LandingLayout>
  )
}
