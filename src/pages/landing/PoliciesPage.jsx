import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import LandingLayout from '../../components/LandingLayout'
import { useTheme } from '../../context/ThemeContext'

// ── Shared style helpers (uses CSS variables — theme-aware) ───────────────────
const S = {
  h2:     { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', color: 'var(--text)', margin: '0 0 6px' },
  date:   { fontSize: '0.82rem', color: '#5a9e00', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '2.4rem', display: 'block' },
  h3:     { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.18rem', color: 'var(--text)', margin: '2.6rem 0 0.7rem', paddingBottom: '6px', borderBottom: '2px solid #ccff00', display: 'inline-block' },
  p:      { color: 'var(--text-muted)', lineHeight: 1.9, marginBottom: '0.7rem', fontSize: '1rem' },
  li:     { color: 'var(--text-muted)', lineHeight: 1.85, marginBottom: '0.55rem', fontSize: '1rem' },
  ul:     { paddingLeft: '1.5rem', marginBottom: '1rem' },
  ol:     { paddingLeft: '1.5rem', marginBottom: '1rem' },
  note:   { background: 'var(--bg-subtle)', border: '1.5px solid #ccff00', borderRadius: 10, padding: '14px 18px', margin: '1.2rem 0', fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.75 },
  strong: { color: 'var(--text)', fontWeight: 700 },
}

function H3({ children }) {
  return <h3 style={S.h3}>{children}</h3>
}
function P({ children }) {
  return <p style={S.p}>{children}</p>
}
function UL({ children }) {
  return <ul style={S.ul}>{children}</ul>
}
function OL({ children }) {
  return <ol style={S.ol}>{children}</ol>
}
function LI({ children }) {
  return <li style={S.li}>{children}</li>
}
function Note({ children }) {
  return <div style={S.note}>{children}</div>
}
function B({ children }) {
  return <strong style={S.strong}>{children}</strong>
}
function A({ href, children }) {
  return <a href={href} style={{ color: '#5a9e00', fontWeight: 600, textDecoration: 'underline' }}>{children}</a>
}

// ── POLICIES ─────────────────────────────────────────────────────────────────

const POLICIES = [

  // ─────────────────────────────── TERMS OF USE ────────────────────────────
  {
    id: 'terms',
    label: 'Terms of Use',
    content: (
      <>
        <h2 style={S.h2}>Terms of Use</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          <B>Please read these Terms carefully.</B> By creating an account or using any part of the FeaziMove platform, you confirm that you have read, understood, and agree to be bound by these Terms of Use and all policies incorporated herein by reference. If you do not agree, you must not use our platform.
        </Note>

        <H3>1. About FeaziMove</H3>
        <P>1.1 FeaziMove Technologies Limited ("FeaziMove", "we", "us", or "our") is a technology company incorporated under the laws of the Federal Republic of Nigeria. We operate a smart urban mobility platform that connects commuters, riders, and goods along shared transport routes in African cities.</P>
        <P>1.2 FeaziMove is a technology intermediary. We do not own or operate transport vehicles, and we do not employ drivers. We provide software tools that enable independent transport providers ("Drivers" or "Partners") to offer pooled transport services to users of our platform ("Riders" or "Commuters").</P>
        <P>1.3 Our registered office is located in Lagos, Nigeria. You may contact us at <A href="mailto:support@feazimove.com">support@feazimove.com</A>.</P>

        <H3>2. Definitions</H3>
        <P>In these Terms, the following definitions apply:</P>
        <UL>
          <LI><B>"Platform"</B> means the FeaziMove website, mobile applications (iOS and Android), APIs, and any other digital products operated by FeaziMove.</LI>
          <LI><B>"User"</B> means any individual who accesses or uses the Platform, including Riders, Commuters, Drivers, and Business Users.</LI>
          <LI><B>"Rider / Commuter"</B> means a User who books or uses pooled transport or delivery services through the Platform.</LI>
          <LI><B>"Driver / Partner"</B> means an independent transport operator who uses the Platform to offer transport or logistics services.</LI>
          <LI><B>"Trip"</B> means a journey booked and completed (or partially completed) using the Platform.</LI>
          <LI><B>"Booking"</B> means a confirmed reservation for a Trip or delivery service made through the Platform.</LI>
          <LI><B>"Fare"</B> means the amount payable by a Rider for a Trip as displayed on the Platform at the time of booking.</LI>
          <LI><B>"Wallet"</B> means the in-app digital wallet associated with a User's account for making and receiving payments.</LI>
          <LI><B>"FeaziHaul"</B> means our goods and package delivery service.</LI>
        </UL>

        <H3>3. Eligibility</H3>
        <P>3.1 To use the Platform, you must:</P>
        <UL>
          <LI>Be at least <B>18 years of age</B>;</LI>
          <LI>Have the legal capacity to enter into a binding contract under Nigerian law;</LI>
          <LI>Not be prohibited from using the Platform under any applicable law or regulation;</LI>
          <LI>Provide accurate, truthful, and complete registration information.</LI>
        </UL>
        <P>3.2 If you are using the Platform on behalf of a company or organisation, you represent that you have the authority to bind that entity to these Terms.</P>
        <P>3.3 FeaziMove reserves the right to refuse access to or terminate the account of any User who does not meet the eligibility requirements set out above.</P>

        <H3>4. Account Registration & Security</H3>
        <P>4.1 To access most features of the Platform, you must register an account. During registration, you must provide:</P>
        <UL>
          <LI>Your full legal name;</LI>
          <LI>A valid, active email address;</LI>
          <LI>A valid Nigerian mobile phone number;</LI>
          <LI>A secure password meeting our minimum requirements;</LI>
          <LI>Any additional verification information we request.</LI>
        </UL>
        <P>4.2 <B>Account Security:</B> You are solely responsible for maintaining the confidentiality of your login credentials. You must:</P>
        <UL>
          <LI>Use a strong, unique password and not share it with any third party;</LI>
          <LI>Enable two-factor authentication (2FA) where offered;</LI>
          <LI>Log out of your account on shared or public devices;</LI>
          <LI>Immediately notify FeaziMove at <A href="mailto:support@feazimove.com">support@feazimove.com</A> if you suspect unauthorised access to your account.</LI>
        </UL>
        <P>4.3 FeaziMove will never ask you for your password via email, phone, or any channel outside the Platform itself.</P>
        <P>4.4 You may only maintain one personal account on the Platform. Operating multiple accounts to abuse promotions or circumvent restrictions is prohibited and will result in all such accounts being suspended.</P>

        <H3>5. Bookings & Trip Terms</H3>
        <P>5.1 <B>How Bookings Work:</B> When you submit a booking request on the Platform, you are making an offer to purchase transport services. A binding contract between you and the relevant Driver is formed only when FeaziMove confirms the booking and assigns a vehicle to your trip.</P>
        <P>5.2 <B>Shared Rides:</B> FeaziMove operates a pooled transport model. By booking a shared ride, you expressly consent to sharing the vehicle with other passengers travelling along the same or similar route. Passengers may be picked up or dropped off at intermediate points along your journey.</P>
        <P>5.3 <B>Punctuality:</B> You must be at your designated pickup point at the scheduled departure time. Drivers are permitted to leave after a waiting period of <B>5 minutes</B> from the scheduled departure time without obligation to refund the fare.</P>
        <P>5.4 <B>Route Changes:</B> Drivers must follow the route confirmed at booking. Any material deviation from the agreed route must be communicated to the passenger and approved before proceeding. Unauthorised route deviations may be reported via the app.</P>
        <P>5.5 <B>Luggage:</B> Each passenger is permitted one standard carry-on bag that can fit under the seat or on the lap. Oversized luggage, additional bags, or bulky items must be declared at booking. Drivers may refuse to carry undeclared oversized items.</P>
        <P>5.6 <B>Pets:</B> Pets are not permitted in FeaziMove vehicles unless the trip is booked under a pet-friendly option (where available).</P>

        <H3>6. Fares, Payments & Pricing</H3>
        <P>6.1 <B>Fare Display:</B> All fares are displayed in Nigerian Naira (NGN) on the Platform before you confirm a booking. The displayed fare is the total amount payable including applicable taxes and service fees.</P>
        <P>6.2 <B>Payment Methods:</B> FeaziMove accepts the following payment methods:</P>
        <UL>
          <LI>Bank transfer to your secure FeaziMove funding account;</LI>
          <LI>FeaziMove Wallet balance;</LI>
          <LI>Any other method made available on the Platform from time to time.</LI>
        </UL>
        <P>6.3 <B>Surge Pricing:</B> During periods of high demand, fares may increase above the standard rate. The Platform will clearly display the surge multiplier before you confirm your booking. You are under no obligation to proceed with a booking at surge pricing.</P>
        <P>6.4 <B>Service Fees:</B> FeaziMove charges a platform service fee on each completed trip. This fee is included in the displayed fare and is not separately itemised unless specifically required by applicable law.</P>
        <P>6.5 <B>Promotions & Discount Codes:</B> Promotional offers, discount codes, and referral credits are subject to their own specific terms and conditions. Unless stated otherwise, promotions are non-transferable, cannot be combined with other offers, and have no cash redemption value.</P>
        <P>6.6 <B>Wallet Top-up & Withdrawal:</B> Funds loaded to the FeaziMove Wallet are non-refundable to an external account except in the event of account closure. All wallet transactions are subject to our Anti-Money Laundering (AML) and Know Your Customer (KYC) requirements.</P>

        <H3>7. Driver & Partner Obligations</H3>
        <P>7.1 Drivers and Partners using the FeaziMove platform agree to the following obligations in addition to these Terms:</P>
        <UL>
          <LI>Maintain a valid driver's licence appropriate for the class of vehicle operated;</LI>
          <LI>Maintain current, valid third-party or comprehensive vehicle insurance;</LI>
          <LI>Comply with all applicable road traffic laws and regulations;</LI>
          <LI>Keep the vehicle clean, roadworthy, and in a condition suitable for passenger transport;</LI>
          <LI>Complete all accepted trips honestly and without abandonment except in genuine emergencies;</LI>
          <LI>Provide accurate real-time location data to the Platform during trips;</LI>
          <LI>Not carry more passengers than the licensed seating capacity of the vehicle;</LI>
          <LI>Not use the Platform to engage in fraudulent activities including GPS spoofing, fake trips, or manipulation of ratings;</LI>
          <LI>Comply with all FeaziMove policies including the Behaviour Policy and Safety Policy.</LI>
        </UL>
        <P>7.2 Drivers acknowledge that they are independent contractors and not employees, agents, or partners of FeaziMove. FeaziMove does not direct or control how Drivers perform transport services beyond the minimum standards required for platform quality and safety.</P>

        <H3>8. Prohibited Uses</H3>
        <P>8.1 You must not use the Platform for any of the following purposes:</P>
        <UL>
          <LI>Transporting illegal substances, weapons, explosive materials, or any item prohibited by Nigerian law;</LI>
          <LI>Conducting commercial activities unrelated to FeaziMove services;</LI>
          <LI>Recruiting drivers or users away from FeaziMove to competing platforms;</LI>
          <LI>Attempting to reverse-engineer, scrape, copy, or replicate any part of the Platform or its data;</LI>
          <LI>Using bots, scripts, or automated tools to access the Platform;</LI>
          <LI>Circumventing security features or access controls;</LI>
          <LI>Submitting false, misleading, or defamatory reviews or reports;</LI>
          <LI>Impersonating another user, FeaziMove employee, or any other person;</LI>
          <LI>Sharing your account credentials with or using another person's account;</LI>
          <LI>Engaging in any activity that violates any applicable local, national, or international law.</LI>
        </UL>

        <H3>9. Intellectual Property</H3>
        <P>9.1 All content on the Platform including but not limited to logos, trademarks, software, interface designs, text, photographs, graphics, and data is the exclusive property of FeaziMove Technologies Limited or its licensors and is protected by Nigerian and international intellectual property laws.</P>
        <P>9.2 You are granted a limited, non-exclusive, non-transferable, revocable licence to use the Platform solely for its intended purpose of booking transport and logistics services.</P>
        <P>9.3 You must not reproduce, modify, distribute, publish, scrape, or commercially exploit any content from the Platform without prior written consent from FeaziMove.</P>

        <H3>10. User-Generated Content</H3>
        <P>10.1 By submitting ratings, reviews, feedback, photos, or any other content to the Platform, you grant FeaziMove a worldwide, royalty-free, perpetual, irrevocable licence to use, reproduce, modify, and display that content for the purpose of operating and improving the Platform.</P>
        <P>10.2 You represent that any content you submit does not infringe the intellectual property rights of any third party and does not contain defamatory, obscene, or unlawful material.</P>
        <P>10.3 FeaziMove reserves the right to remove any user-generated content that violates these Terms or our community standards, at our sole discretion.</P>

        <H3>11. Disclaimers & Limitation of Liability</H3>
        <P>11.1 <B>Platform "As Is":</B> The Platform is provided on an "as is" and "as available" basis. FeaziMove makes no warranties, express or implied, regarding the Platform's availability, accuracy, reliability, or fitness for a particular purpose.</P>
        <P>11.2 <B>Third-Party Services:</B> FeaziMove is not responsible for the actions, conduct, or omissions of Drivers, Partners, or any third-party service providers. Transport contracts are between Riders and Drivers; FeaziMove facilitates but is not a party to those contracts.</P>
        <P>11.3 <B>Limitation of Liability:</B> To the maximum extent permitted by applicable law, FeaziMove shall not be liable for:</P>
        <UL>
          <LI>Indirect, incidental, consequential, special, or punitive damages;</LI>
          <LI>Loss of profit, revenue, data, or business opportunity;</LI>
          <LI>Personal injury or property damage caused by a Driver;</LI>
          <LI>Delays, route deviations, or service interruptions beyond FeaziMove's direct control.</LI>
        </UL>
        <P>11.4 Our total aggregate liability to you for any claim arising under these Terms shall not exceed the amount you paid to FeaziMove in the <B>three (3) calendar months</B> immediately preceding the event giving rise to the claim.</P>

        <H3>12. Indemnification</H3>
        <P>12.1 You agree to indemnify, defend, and hold harmless FeaziMove, its directors, officers, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:</P>
        <UL>
          <LI>Your violation of these Terms;</LI>
          <LI>Your use of the Platform in an unlawful or unauthorised manner;</LI>
          <LI>Your infringement of any third-party intellectual property rights;</LI>
          <LI>Your conduct towards other users, Drivers, or third parties;</LI>
          <LI>Any false or misleading information you provide to FeaziMove.</LI>
        </UL>

        <H3>13. Suspension & Termination</H3>
        <P>13.1 FeaziMove may suspend or terminate your account at any time, with or without notice, if:</P>
        <UL>
          <LI>You breach any provision of these Terms;</LI>
          <LI>We reasonably believe your account is being used fraudulently;</LI>
          <LI>We receive credible safety complaints about your conduct;</LI>
          <LI>We are required to do so by law or regulatory directive;</LI>
          <LI>Your account has been inactive for more than 24 consecutive months.</LI>
        </UL>
        <P>13.2 You may terminate your account at any time by submitting a deletion request through the Platform settings or by emailing <A href="mailto:support@feazimove.com">support@feazimove.com</A>. Outstanding balances must be settled before deletion is processed.</P>
        <P>13.3 Termination does not affect any rights or obligations that arose before the termination date.</P>

        <H3>14. Dispute Resolution</H3>
        <P>14.1 <B>Internal Resolution First:</B> In the event of any dispute, you agree to first contact FeaziMove's support team at <A href="mailto:support@feazimove.com">support@feazimove.com</A> and allow us at least <B>30 days</B> to attempt to resolve the matter informally.</P>
        <P>14.2 <B>Arbitration:</B> If a dispute is not resolved informally, both parties agree to submit the dispute to binding arbitration under the rules of the Lagos Court of Arbitration. The arbitration shall be conducted in English in Lagos, Nigeria.</P>
        <P>14.3 <B>No Class Actions:</B> You agree that any dispute resolution shall be conducted on an individual basis and not as a class action, collective action, or representative proceeding.</P>

        <H3>15. Governing Law</H3>
        <P>15.1 These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to conflict of law principles.</P>
        <P>15.2 Subject to Clause 14, any legal proceedings shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.</P>

        <H3>16. Changes to These Terms</H3>
        <P>16.1 FeaziMove may revise these Terms at any time. We will notify you of material changes via email, in-app notification, or by posting a prominent notice on the Platform at least <B>14 days</B> before the changes take effect.</P>
        <P>16.2 Your continued use of the Platform after the effective date of any changes constitutes your acceptance of the revised Terms.</P>

        <H3>17. Severability & Waiver</H3>
        <P>17.1 If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</P>
        <P>17.2 FeaziMove's failure to enforce any provision of these Terms shall not constitute a waiver of our right to enforce that provision in the future.</P>

        <H3>18. Contact Information</H3>
        <P>For all enquiries: <A href="mailto:support@feazimove.com">support@feazimove.com</A></P>
      </>
    ),
  },

  // ─────────────────────────────── PRIVACY POLICY ──────────────────────────
  {
    id: 'privacy',
    label: 'Privacy Policy',
    content: (
      <>
        <h2 style={S.h2}>Privacy Policy</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          FeaziMove Technologies Limited is committed to protecting your personal data in compliance with the Nigerian Data Protection Act 2023 (NDPA) and the Nigeria Data Protection Regulation (NDPR). This Privacy Policy explains exactly what data we collect, why we collect it, how we use it, and your rights over it.
        </Note>

        <H3>1. Data Controller Information</H3>
        <P>The data controller responsible for your personal information is:</P>
        <P><B>FeaziMove Technologies Limited</B><br />Lagos, Nigeria<br />Email: <A href="mailto:support@feazimove.com">support@feazimove.com</A><br />Data Protection Officer (DPO): <A href="mailto:support@feazimove.com">support@feazimove.com</A></P>

        <H3>2. Information We Collect</H3>
        <P>We collect different categories of personal data depending on how you use the Platform:</P>
        <P><B>2.1 Information You Provide Directly:</B></P>
        <UL>
          <LI><B>Identity Data:</B> Full name, date of birth, gender, profile photograph;</LI>
          <LI><B>Contact Data:</B> Email address, phone number, home or work address;</LI>
          <LI><B>Authentication Data:</B> Password (stored as a one-way hash — we never see your plain-text password), security questions;</LI>
          <LI><B>Vehicle & Licence Data (Drivers):</B> Driver's licence number, vehicle registration, insurance certificate, vehicle photos;</LI>
          <LI><B>Bank & Payment Data:</B> Bank account details or card details (processed and tokenised by our PCI-DSS compliant payment providers — not stored on FeaziMove servers);</LI>
          <LI><B>Communication Data:</B> Messages sent through our in-app chat, support tickets, or email correspondence with our team.</LI>
        </UL>
        <P><B>2.2 Information We Collect Automatically:</B></P>
        <UL>
          <LI><B>Location Data:</B> Precise GPS coordinates collected in real time during active trips or when the app is open. Background location is collected only if you explicitly grant this permission;</LI>
          <LI><B>Trip Data:</B> Pickup point, drop-off point, route taken, trip duration, trip distance, fare paid, and driver rating;</LI>
          <LI><B>Device Data:</B> Device model, operating system version, app version, unique device identifiers (IMEI, IDFA, or GAID), mobile network, and IP address;</LI>
          <LI><B>Usage Data:</B> Pages and screens visited, features used, time spent on the Platform, search queries, buttons clicked, and error logs;</LI>
          <LI><B>Cookie & Tracking Data:</B> Please see our Cookie Policy for details.</LI>
        </UL>
        <P><B>2.3 Information From Third Parties:</B></P>
        <UL>
          <LI>Identity verification data from third-party KYC providers;</LI>
          <LI>Social login data if you register using Google or Apple Sign-In;</LI>
          <LI>Fraud signals from payment processors;</LI>
          <LI>Background check data for Drivers from authorised verification agencies.</LI>
        </UL>

        <H3>3. Legal Basis for Processing</H3>
        <P>We process your personal data on the following legal grounds under the NDPA 2023:</P>
        <UL>
          <LI><B>Contract Performance:</B> Processing necessary to provide you with the transport and logistics services you requested;</LI>
          <LI><B>Legitimate Interests:</B> Analytics, fraud prevention, platform security, and improving our services — where our interests do not override your fundamental rights;</LI>
          <LI><B>Legal Obligation:</B> Where we are required by Nigerian law or regulatory directive to process your data;</LI>
          <LI><B>Consent:</B> For marketing communications and non-essential analytics cookies. You may withdraw consent at any time without affecting lawfulness of prior processing.</LI>
        </UL>

        <H3>4. How We Use Your Information</H3>
        <UL>
          <LI>To verify your identity and create and manage your account;</LI>
          <LI>To match you with available shared routes and Drivers;</LI>
          <LI>To process payments, issue refunds, and manage your Wallet;</LI>
          <LI>To provide real-time trip tracking to you and your emergency contacts;</LI>
          <LI>To enforce our Terms, Behaviour Policy, and Safety Policy;</LI>
          <LI>To detect, investigate, and prevent fraud, abuse, and security incidents;</LI>
          <LI>To send you booking confirmations, trip receipts, and service-critical notifications (cannot be opted out);</LI>
          <LI>To send promotional offers and product updates (only with your consent, and you can unsubscribe at any time);</LI>
          <LI>To conduct research and analytics to understand usage patterns and improve features;</LI>
          <LI>To comply with legal obligations and respond to lawful requests from authorities;</LI>
          <LI>To train and improve our machine learning models for route optimisation and demand forecasting (using anonymised or aggregated data only).</LI>
        </UL>

        <H3>5. How We Share Your Information</H3>
        <P><B>We do not sell your personal data.</B> We share data only in the following limited circumstances:</P>
        <UL>
          <LI><B>With Drivers:</B> Your first name, pickup point, drop-off point, and phone number are shared with your assigned Driver to complete the trip;</LI>
          <LI><B>With Co-Passengers:</B> Only your first name and pickup point are visible to other passengers in a shared ride;</LI>
          <LI><B>With Payment Processors:</B> We share payment data with our regulated banking and payment partners (e.g., Anchor, a CBN-regulated banking-as-a-service provider) solely for transaction processing and identity verification;</LI>
          <LI><B>With Service Providers:</B> We use third-party providers for cloud hosting, analytics, customer support tooling, and push notifications under strict data processing agreements;</LI>
          <LI><B>With Regulators & Law Enforcement:</B> We disclose data when required by valid court order, subpoena, or applicable law. We will notify you of such requests where legally permissible;</LI>
          <LI><B>In a Business Transfer:</B> In the event of a merger, acquisition, or asset sale, your data may be transferred to the successor entity under equivalent privacy protections;</LI>
          <LI><B>With Your Consent:</B> For any other purpose not listed above, only with your explicit prior consent.</LI>
        </UL>

        <H3>6. Data Retention</H3>
        <P>We retain your personal data only for as long as necessary for the purposes described in this Policy:</P>
        <UL>
          <LI><B>Active account data:</B> Retained for the lifetime of your account;</LI>
          <LI><B>Trip records:</B> Retained for 5 years after the trip date (required for tax and regulatory compliance);</LI>
          <LI><B>Payment records:</B> Retained for 7 years in line with Nigerian financial record-keeping requirements;</LI>
          <LI><B>Support communications:</B> Retained for 3 years;</LI>
          <LI><B>Inactive accounts:</B> Accounts inactive for more than 24 months may be automatically deleted after 30 days' notice;</LI>
          <LI><B>Deleted accounts:</B> Core data is deleted within 30 days of account deletion, except where retention is legally required.</LI>
        </UL>

        <H3>7. Your Rights</H3>
        <P>Under the NDPA 2023 and NDPR, you have the following rights:</P>
        <UL>
          <LI><B>Right of Access:</B> Request a copy of all personal data we hold about you;</LI>
          <LI><B>Right to Rectification:</B> Correct inaccurate or incomplete personal data;</LI>
          <LI><B>Right to Erasure:</B> Request deletion of your personal data where it is no longer necessary for the purposes for which it was collected;</LI>
          <LI><B>Right to Restrict Processing:</B> Ask us to pause processing of your data in certain circumstances;</LI>
          <LI><B>Right to Data Portability:</B> Receive your data in a structured, machine-readable format;</LI>
          <LI><B>Right to Object:</B> Object to processing based on legitimate interests, including direct marketing;</LI>
          <LI><B>Right to Withdraw Consent:</B> Withdraw any consent you have given at any time, without affecting prior processing;</LI>
          <LI><B>Right to Lodge a Complaint:</B> File a complaint with the Nigeria Data Protection Commission (NDPC) at <A href="https://ndpc.gov.ng">ndpc.gov.ng</A>.</LI>
        </UL>
        <P>To exercise any of these rights, email our DPO at <A href="mailto:support@feazimove.com">support@feazimove.com</A>. We will respond within <B>30 days</B>.</P>

        <H3>8. Data Security</H3>
        <P>We implement robust technical and organisational measures to protect your personal data, including:</P>
        <UL>
          <LI>Encryption of all data in transit using TLS 1.2 or higher;</LI>
          <LI>Encryption of sensitive data at rest using AES-256;</LI>
          <LI>Bcrypt hashing of all passwords — plain-text passwords are never stored;</LI>
          <LI>Role-based access control (RBAC) limiting staff access to data on a need-to-know basis;</LI>
          <LI>Regular third-party penetration testing and security audits;</LI>
          <LI>Continuous monitoring for intrusion, anomalies, and data breaches;</LI>
          <LI>Vendor security assessments for all third-party processors.</LI>
        </UL>
        <P>In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the NDPC within 72 hours and affected users without undue delay.</P>

        <H3>9. Children's Privacy</H3>
        <P>9.1 The Platform is not directed at children under 18 years of age. We do not knowingly collect personal data from children.</P>
        <P>9.2 If we become aware that we have inadvertently collected personal data from a child under 18, we will promptly delete such data. If you believe a child has provided us with personal information, contact us at <A href="mailto:support@feazimove.com">support@feazimove.com</A>.</P>

        <H3>10. International Transfers</H3>
        <P>10.1 Where we transfer personal data outside Nigeria (e.g., to cloud providers with servers in other countries), we ensure appropriate safeguards are in place, including standard contractual clauses or adequacy decisions recognised under Nigerian law.</P>

        <H3>11. Updates to This Policy</H3>
        <P>11.1 We may update this Privacy Policy periodically. We will notify you of material changes with at least 14 days' notice via email or in-app notification. The "Last Updated" date at the top of this Policy reflects the most recent version.</P>
      </>
    ),
  },

  // ─────────────────────────────── BEHAVIOUR POLICY ────────────────────────
  {
    id: 'behaviour',
    label: 'Behaviour Policy',
    content: (
      <>
        <h2 style={S.h2}>Behaviour Policy</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          FeaziMove is built on the belief that everyone — regardless of background, gender, or status — deserves to move through their city safely and with dignity. This Behaviour Policy sets out the minimum standards of conduct we expect from every person who uses our platform.
        </Note>

        <H3>1. Our Community Values</H3>
        <P>Every person who uses FeaziMove — whether as a Rider, Commuter, Driver, or Partner — becomes part of the FeaziMove community. We expect all community members to uphold the following values:</P>
        <UL>
          <LI><B>Respect:</B> Treat every person on the platform with courtesy, dignity, and consideration;</LI>
          <LI><B>Responsibility:</B> Take personal responsibility for your conduct and its impact on others;</LI>
          <LI><B>Honesty:</B> Be truthful in all interactions with FeaziMove and other users;</LI>
          <LI><B>Safety:</B> Prioritise the safety of yourself and others at all times;</LI>
          <LI><B>Inclusion:</B> Respect and welcome people of all backgrounds, identities, and abilities.</LI>
        </UL>

        <H3>2. Rider & Commuter Standards</H3>
        <P><B>2.1 Punctuality & Pickup Conduct:</B></P>
        <UL>
          <LI>Be at your designated pickup location <B>at least 2 minutes before</B> your scheduled departure time;</LI>
          <LI>Do not make the Driver or co-passengers wait unnecessarily;</LI>
          <LI>If you need to cancel, do so through the app as early as possible to avoid disrupting others.</LI>
        </UL>
        <P><B>2.2 In-Vehicle Conduct:</B></P>
        <UL>
          <LI>Wear your seatbelt at all times — this is both a legal requirement and a safety obligation;</LI>
          <LI>Keep noise to a considerate level; use headphones for music, videos, or calls when in a shared vehicle;</LI>
          <LI>Do not consume food or drinks with strong smells that may be offensive to co-passengers;</LI>
          <LI>Do not smoke, vape, or use any substance inside the vehicle;</LI>
          <LI>Do not litter or leave rubbish inside the vehicle;</LI>
          <LI>Do not distract the Driver from operating the vehicle safely.</LI>
        </UL>
        <P><B>2.3 Respect for Others:</B></P>
        <UL>
          <LI>Do not engage in discriminatory language, behaviour, or harassment based on gender, ethnicity, religion, sexual orientation, disability, or any other characteristic;</LI>
          <LI>Do not invade the personal space of co-passengers or the Driver;</LI>
          <LI>Do not record, photograph, or film other passengers or the Driver without their explicit consent;</LI>
          <LI>Do not solicit personal contact information from Drivers or co-passengers.</LI>
        </UL>

        <H3>3. Driver & Partner Standards</H3>
        <P><B>3.1 Professional Standards:</B></P>
        <UL>
          <LI>Maintain a polite, professional, and welcoming manner with all passengers at all times;</LI>
          <LI>Greet passengers by their first name where appropriate and confirm the destination before departing;</LI>
          <LI>Keep the vehicle clean, odour-free, and well-maintained at all times;</LI>
          <LI>Ensure the vehicle is in a roadworthy condition before every trip — check tyres, brakes, lights, and fuel;</LI>
          <LI>Wear clean, presentable clothing; a FeaziMove-branded vest or ID is strongly encouraged.</LI>
        </UL>
        <P><B>3.2 Driving Standards:</B></P>
        <UL>
          <LI>Comply with all applicable road traffic laws, speed limits, and traffic signals at all times;</LI>
          <LI>Never use a mobile phone while driving unless connected to a legally compliant hands-free system;</LI>
          <LI>Never drive under the influence of alcohol, narcotics, prescription medication that impairs driving ability, or any other substance;</LI>
          <LI>Do not operate the vehicle for more than the maximum consecutive hours permitted under applicable law without taking an adequate rest break;</LI>
          <LI>Follow the route confirmed at booking. If a detour is necessary, communicate clearly with passengers and obtain their agreement.</LI>
        </UL>
        <P><B>3.3 Non-Discrimination:</B></P>
        <UL>
          <LI>Drivers must not refuse service to any passenger on the basis of gender, ethnicity, religion, nationality, disability, sexual orientation, or any other protected characteristic;</LI>
          <LI>Drivers must not refuse to transport a passenger with a visible disability, including those using wheelchairs, crutches, or guide dogs (where the vehicle is capable of accommodating them);</LI>
          <LI>Any documented pattern of discriminatory trip cancellations will result in immediate account suspension.</LI>
        </UL>

        <H3>4. Zero-Tolerance Conduct</H3>
        <P>The following behaviours will result in <B>immediate and permanent account suspension</B> and may be referred to the Nigerian Police Force or other relevant authorities:</P>
        <UL>
          <LI>Physical assault, battery, or threats of violence against any person;</LI>
          <LI>Sexual assault, harassment, or any form of non-consensual physical contact;</LI>
          <LI>Verbal abuse, threats, intimidation, or sustained harassment of any kind;</LI>
          <LI>Discriminatory abuse including racist, sexist, homophobic, or religious hate speech;</LI>
          <LI>Transporting or facilitating the transport of illegal substances, weapons, or prohibited items;</LI>
          <LI>Theft, fraud, damage to property, or extortion;</LI>
          <LI>Deliberately providing false information to FeaziMove's safety or legal teams;</LI>
          <LI>Refusing to stop the vehicle when a passenger reasonably requests to exit safely.</LI>
        </UL>

        <H3>5. Ratings & Feedback System</H3>
        <P>5.1 After every completed trip, both Riders and Drivers are invited to rate each other on a scale of 1 to 5 stars and leave optional written feedback.</P>
        <P>5.2 Ratings are anonymous and contribute to a user's overall platform rating. Consistently low ratings may trigger a review of an account and may result in restrictions or suspension.</P>
        <P>5.3 Minimum rating thresholds apply:</P>
        <UL>
          <LI>Drivers with an average rating below <B>3.8 stars</B> (calculated over 50+ rated trips) will receive a formal performance warning and mandatory remediation guidance;</LI>
          <LI>Drivers who do not improve above <B>3.5 stars</B> within 30 days of a warning may be offboarded from the platform;</LI>
          <LI>Riders with an average rating below <B>3.5 stars</B> may be subject to trip restrictions.</LI>
        </UL>
        <P>5.4 Ratings manipulation — including coercing others to leave positive ratings, leaving retaliatory ratings, or creating fake accounts to rate — is strictly prohibited.</P>

        <H3>6. Reporting Misconduct</H3>
        <P>6.1 We encourage all users to report misconduct through the following channels:</P>
        <UL>
          <LI><B>In-App:</B> Via the "Report a Problem" option in your Trip History within 72 hours of the incident;</LI>
          <LI><B>Email:</B> <A href="mailto:support@feazimove.com">support@feazimove.com</A> for safety concerns and misconduct reports.</LI>
        </UL>
        <P>6.2 All reports are treated with strict confidentiality. We do not disclose the identity of the reporting party to the subject of the report without consent.</P>
        <P>6.3 False or malicious reports made in bad faith are themselves a violation of this Policy.</P>

        <H3>7. Investigation & Consequences</H3>
        <P>7.1 FeaziMove will investigate all credible misconduct reports. During an active investigation, the account(s) in question may be temporarily suspended pending resolution.</P>
        <P>7.2 Consequences for policy violations, depending on severity and frequency, include:</P>
        <UL>
          <LI>A formal written warning issued to the account;</LI>
          <LI>Temporary suspension (1–30 days) with mandatory acknowledgement of policy;</LI>
          <LI>Permanent deactivation of the account;</LI>
          <LI>Reporting of the incident to relevant law enforcement authorities.</LI>
        </UL>
        <P>7.3 <B>Appeals:</B> If you believe your account was suspended in error, you may appeal by emailing <A href="mailto:support@feazimove.com">support@feazimove.com</A> within 14 days of suspension. Appeals are reviewed by a dedicated team and are separate from the original investigating team. We aim to respond to all appeals within 10 business days.</P>
      </>
    ),
  },

  // ─────────────────────────────── SAFETY POLICY ───────────────────────────
  {
    id: 'safety',
    label: 'Safety Policy',
    content: (
      <>
        <h2 style={S.h2}>Safety Policy</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          Safety is FeaziMove's highest priority. Every design decision, product feature, and operational standard we implement is evaluated through the lens of safety first. This Policy explains how we build and maintain safety on our platform and what we expect from all users.
        </Note>

        <H3>1. Driver Verification & Onboarding</H3>
        <P>Before any Driver is permitted to accept trips on FeaziMove, they must pass a multi-stage verification process:</P>
        <UL>
          <LI><B>Identity Verification:</B> Government-issued photo ID (NIN card, International Passport, or Driver's Licence) verified against a live selfie using facial recognition technology;</LI>
          <LI><B>Driver's Licence:</B> Valid Nigerian driver's licence for the appropriate vehicle class, verified against FRSC records where possible;</LI>
          <LI><B>Vehicle Documentation:</B> Current vehicle registration (Hackney permit or private use permit), comprehensive or third-party insurance, and valid roadworthiness certificate;</LI>
          <LI><B>Vehicle Age Limit:</B> Vehicles must not be older than <B>10 years</B> from the year of manufacture;</LI>
          <LI><B>Vehicle Inspection:</B> Vehicles must pass FeaziMove's remote or in-person inspection checklist covering tyres, brakes, lights, mirrors, seatbelts, and general interior cleanliness;</LI>
          <LI><B>Background Screening:</B> Where technically feasible, Drivers undergo a background check with authorised third-party agencies to identify serious criminal history;</LI>
          <LI><B>Onboarding Training:</B> All new Drivers must complete FeaziMove's digital safety and service standards training before going live on the platform.</LI>
        </UL>

        <H3>2. Passenger Safety Guidelines</H3>
        <P>We recommend all passengers follow these safety best practices:</P>
        <UL>
          <LI><B>Verify before you board:</B> Confirm the vehicle plate number, Driver's name, and photo match the details in your app before entering;</LI>
          <LI><B>Share your trip:</B> Use the trip sharing feature to let a trusted contact know your route and estimated arrival time;</LI>
          <LI><B>Sit in the rear seat</B> where possible for additional safety distance;</LI>
          <LI><B>Wear your seatbelt</B> as soon as you enter the vehicle;</LI>
          <LI><B>Do not distract the Driver</B> with conversation that takes their attention from the road;</LI>
          <LI><B>Trust your instincts:</B> If anything feels wrong, you may ask the Driver to stop at a safe, public location and exit the vehicle. Immediately report the incident in the app;</LI>
          <LI><B>Keep valuables secure</B> and do not display expensive items openly in the vehicle.</LI>
        </UL>

        <H3>3. Children & Vulnerable Passengers</H3>
        <UL>
          <LI>Children under <B>12 years of age</B> must be accompanied by an adult at all times;</LI>
          <LI>Drivers must not accept a booking for an unaccompanied minor;</LI>
          <LI>Children who require a car seat must have one provided by the booking adult. FeaziMove does not supply car seats;</LI>
          <LI>Passengers with disabilities or special mobility needs should indicate this at booking using the accessibility options in the app. We will endeavour to match them with an appropriate vehicle.</LI>
        </UL>

        <H3>4. Incident Reporting & Response</H3>
        <P>4.1 Any accident, near-miss, or safety incident during a FeaziMove trip must be reported:</P>
        <UL>
          <LI>Via the in-app incident report tool within <B>24 hours</B> of the event;</LI>
          <LI>By emailing <A href="mailto:support@feazimove.com">support@feazimove.com</A> with your trip reference and a description of the incident.</LI>
        </UL>
        <P>4.2 <B>Accident Response:</B> In the event of a road traffic accident involving a FeaziMove trip:</P>
        <UL>
          <LI>Ensure the safety of all persons involved and call emergency services (199 or 112) if required;</LI>
          <LI>Do not move seriously injured persons unless there is an immediate risk to life;</LI>
          <LI>Notify FeaziMove via the SOS button or by calling our emergency line immediately;</LI>
          <LI>Do not accept liability or make any admissions on FeaziMove's behalf at the scene;</LI>
          <LI>Preserve all evidence including photographs, witness contacts, and police report reference numbers.</LI>
        </UL>
        <P>4.3 All reported incidents are investigated by our dedicated safety team. We cooperate fully with the Nigerian Police Force, FRSC, and relevant regulatory bodies in all investigations.</P>

        <H3>5. Hygiene & Health Standards</H3>
        <UL>
          <LI>Drivers must maintain a clean vehicle interior at all times — floors, seats, and surfaces must be free of dirt, rubbish, and offensive odours;</LI>
          <LI>Drivers are encouraged to provide hand sanitiser for passengers;</LI>
          <LI>Drivers or passengers who are visibly unwell with communicable symptoms are strongly encouraged not to use the platform until they have recovered;</LI>
          <LI>FeaziMove reserves the right to implement additional health protocols during declared public health emergencies.</LI>
        </UL>

        <H3>6. Safety Team Contact</H3>
        <P>Our 24/7 safety team is available at:</P>
        <P>Email: <A href="mailto:support@feazimove.com">support@feazimove.com</A></P>
        <P>For genuine emergencies, always call 199 or 112 first before contacting FeaziMove.</P>
      </>
    ),
  },

  // ─────────────────────────────── COOKIE POLICY ───────────────────────────
  {
    id: 'cookie',
    label: 'Cookie Policy',
    content: (
      <>
        <h2 style={S.h2}>Cookie Policy</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          This Cookie Policy explains what cookies and similar tracking technologies we use on the FeaziMove website and app, why we use them, and how you can manage your preferences. It should be read alongside our Privacy Policy.
        </Note>

        <H3>1. What Are Cookies?</H3>
        <P>Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website or use an app. They are widely used to make websites and applications work more efficiently, to personalise your experience, and to provide information to the site owner.</P>
        <P>Similar tracking technologies we use include:</P>
        <UL>
          <LI><B>Local Storage:</B> Data stored in your browser's local storage that persists between sessions;</LI>
          <LI><B>Session Storage:</B> Temporary data storage that is cleared when you close the browser tab;</LI>
          <LI><B>Pixels & Web Beacons:</B> Tiny, invisible images embedded in emails or web pages that track whether the content was opened or interacted with;</LI>
          <LI><B>Mobile Device Identifiers:</B> Device-level identifiers (IDFA on iOS, GAID on Android) used for analytics and advertising attribution in our mobile app.</LI>
        </UL>

        <H3>2. Types of Cookies We Use</H3>
        <P><B>2.1 Strictly Necessary Cookies</B></P>
        <P>These cookies are essential for the Platform to function. Without them, services like login, booking, and payment processing cannot work. They cannot be disabled.</P>
        <UL>
          <LI>Session authentication tokens (maintain your logged-in state);</LI>
          <LI>CSRF protection tokens (security against cross-site request forgery attacks);</LI>
          <LI>Load balancer cookies (ensure consistent server routing);</LI>
          <LI>User preference cookies (e.g., accepted terms version, theme setting).</LI>
        </UL>
        <P><B>Retention:</B> Session duration or up to 30 days for "Stay logged in" tokens.</P>

        <P><B>2.2 Performance & Analytics Cookies</B></P>
        <P>These cookies help us understand how visitors use the Platform, which pages are visited most, and where errors occur. All data collected is aggregated and anonymised — no individual user is identified.</P>
        <UL>
          <LI>Google Analytics (page views, session duration, traffic sources);</LI>
          <LI>Internal error monitoring (crash reports, API error logs);</LI>
          <LI>A/B testing tools (to compare design or feature variants).</LI>
        </UL>
        <P><B>Retention:</B> Up to 26 months. You may opt out via our cookie preference centre.</P>

        <P><B>2.3 Functional Cookies</B></P>
        <P>These cookies enable enhanced functionality and personalisation, remembering choices you make to improve your experience.</P>
        <UL>
          <LI>Saved home and work addresses;</LI>
          <LI>Language and regional preferences;</LI>
          <LI>Preferred payment method;</LI>
          <LI>In-app notification preferences.</LI>
        </UL>
        <P><B>Retention:</B> Up to 12 months. Disabling these may affect personalised features.</P>

        <P><B>2.4 Marketing & Attribution Cookies</B></P>
        <P>These cookies are used to measure the effectiveness of our advertising campaigns and to deliver relevant promotions. We only use these with your consent.</P>
        <UL>
          <LI>Google Ads conversion tracking;</LI>
          <LI>Meta Pixel (Facebook and Instagram ad attribution);</LI>
          <LI>Referral and affiliate tracking codes.</LI>
        </UL>
        <P><B>Retention:</B> Up to 90 days. You can withdraw consent at any time via the cookie preference centre.</P>

        <H3>3. Third-Party Cookies</H3>
        <P>Some features of our Platform involve third-party services that set their own cookies. We do not control these cookies. Key third parties include:</P>
        <UL>
          <LI><B>Google Maps API:</B> For route display and location search (subject to Google's Privacy Policy);</LI>
          <LI><B>Anchor:</B> For secure payment processing, virtual accounts, and BVN identity verification (subject to their privacy policy);</LI>
          <LI><B>Intercom / Zendesk:</B> For in-app customer support chat (subject to their privacy policies);</LI>
          <LI><B>Firebase:</B> For push notifications and app performance monitoring (Google's Privacy Policy).</LI>
        </UL>
        <P>We recommend reviewing the privacy policies of these third-party providers for full details on their data practices.</P>

        <H3>4. Managing Your Cookie Preferences</H3>
        <P><B>4.1 Cookie Preference Centre:</B> You can review and change your cookie preferences at any time by visiting the Cookie Settings option in the app or website footer.</P>
        <P><B>4.2 Browser Controls:</B> Most browsers allow you to manage cookies via settings. Common options include:</P>
        <UL>
          <LI>Block all cookies;</LI>
          <LI>Block third-party cookies only;</LI>
          <LI>Delete cookies on browser close;</LI>
          <LI>Receive notifications before cookies are placed.</LI>
        </UL>
        <P>Note: disabling strictly necessary cookies will prevent you from using core Platform features including login and booking.</P>
        <P><B>4.3 Opt-Out of Analytics:</B> You can install the <A href="https://tools.google.com/dlpage/gaoptout">Google Analytics Opt-Out Browser Add-on</A> to prevent Google Analytics from collecting data about your visits.</P>

        <H3>5. Do Not Track (DNT)</H3>
        <P>Some browsers offer a "Do Not Track" setting that sends a signal to websites requesting that they not track you. Currently, there is no universal standard for how websites should respond to DNT signals. FeaziMove does not currently alter its data collection practices in response to DNT signals, but we honour opt-out choices made through our Cookie Preference Centre.</P>

        <H3>6. Updates to This Policy</H3>
        <P>We may update this Cookie Policy to reflect changes in technology, law, or our business practices. Material changes will be communicated to you via in-app notification or email. The "Last Updated" date at the top of this page reflects the most recent revision.</P>
      </>
    ),
  },

  // ─────────────────────────────── CANCELLATION POLICY ────────────────────
  {
    id: 'cancellation',
    label: 'Trip Cancellation Policy',
    content: (
      <>
        <h2 style={S.h2}>Trip Cancellation Policy</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          We understand that plans change. This policy is designed to be fair to both Riders and Drivers. Please read it carefully before booking, as cancellation fees may apply depending on when a cancellation is made.
        </Note>

        <H3>1. Cancellation by Rider — Time-Based Tiers</H3>
        <P>FeaziMove operates a tiered cancellation policy based on how far in advance the cancellation is made relative to the scheduled departure time:</P>

        <P><B>Tier 1 — Full Refund Window (more than 60 minutes before departure):</B></P>
        <UL>
          <LI>100% refund of the full fare paid;</LI>
          <LI>Refund processed within 3–5 business days to the original payment method;</LI>
          <LI>No cancellation fee applied;</LI>
          <LI>Cancellation is free and does not count against your cancellation rate.</LI>
        </UL>

        <P><B>Tier 2 — Partial Refund Window (15 to 60 minutes before departure):</B></P>
        <UL>
          <LI>50% refund of the full fare paid;</LI>
          <LI>The remaining 50% is retained as a late cancellation fee to compensate the Driver for the confirmed allocation;</LI>
          <LI>Refund processed within 3–5 business days;</LI>
          <LI>This cancellation counts against your cancellation rate.</LI>
        </UL>

        <P><B>Tier 3 — No Refund Window (less than 15 minutes before departure or after departure):</B></P>
        <UL>
          <LI>0% refund. The full fare is retained;</LI>
          <LI>No exceptions apply in this window unless the cancellation is caused by a FeaziMove system error, Driver no-show, or force majeure event;</LI>
          <LI>This cancellation counts against your cancellation rate and may result in temporary booking restrictions if it occurs frequently.</LI>
        </UL>

        <P><B>No-Show:</B></P>
        <UL>
          <LI>A no-show occurs when the Rider fails to appear at the pickup point within 5 minutes of the scheduled departure time and has not cancelled in the app;</LI>
          <LI>0% refund applies. The full fare is retained;</LI>
          <LI>Three no-shows within any rolling 30-day period will trigger a temporary 7-day booking suspension.</LI>
        </UL>

        <H3>2. Cancellation by Driver or FeaziMove</H3>
        <P>2.1 If a Driver cancels a confirmed booking, or if FeaziMove cancels a trip for operational reasons:</P>
        <UL>
          <LI>You will receive a <B>full 100% refund</B> to your original payment method within 3–5 business days, regardless of how close to the departure time the cancellation occurs;</LI>
          <LI>FeaziMove will make every reasonable effort to arrange an alternative vehicle or route at no additional cost to you;</LI>
          <LI>Where an alternative cannot be found, a credit equivalent to 110% of the fare may be offered to your FeaziMove Wallet as compensation for the inconvenience.</LI>
        </UL>
        <P>2.2 Driver-initiated cancellations are logged and monitored. Drivers with excessive cancellation rates will face warnings, reduced trip allocations, or suspension.</P>

        <H3>3. Repeated Cancellations by Riders</H3>
        <P>3.1 Cancellation Rate Thresholds — FeaziMove monitors each user's cancellation rate (defined as the percentage of bookings cancelled after the Tier 2 or Tier 3 window):</P>
        <UL>
          <LI><B>Below 15%</B> — No action. This is within normal range;</LI>
          <LI><B>15%–25%</B> — A formal in-app warning is issued;</LI>
          <LI><B>Above 25%</B> within any rolling 30-day period — A 7-day booking restriction is applied;</LI>
          <LI><B>Persistent high cancellation rate</B> despite warnings — Permanent booking restrictions may be applied at FeaziMove's discretion.</LI>
        </UL>

        <H3>4. Force Majeure & Exceptional Circumstances</H3>
        <P>4.1 FeaziMove may cancel trips and issue full refunds without liability to either party in the following circumstances:</P>
        <UL>
          <LI>Declared natural disasters, flooding, or extreme weather events;</LI>
          <LI>Government-imposed movement restrictions, curfews, or lockdowns;</LI>
          <LI>Civil unrest, protests, or road blockades preventing safe transit;</LI>
          <LI>Prolonged Platform outages or technical failures beyond FeaziMove's control;</LI>
          <LI>Death or serious illness of the Driver.</LI>
        </UL>
        <P>4.2 Riders seeking refunds under force majeure circumstances must contact <A href="mailto:support@feazimove.com">support@feazimove.com</A> with supporting evidence within 7 days of the affected trip date.</P>

        <H3>5. How to Cancel a Booking</H3>
        <P>5.1 All cancellations must be made through the FeaziMove app:</P>
        <OL>
          <LI>Open the FeaziMove app and navigate to <B>"My Trips"</B> or <B>"Upcoming Trips"</B>;</LI>
          <LI>Select the booking you wish to cancel;</LI>
          <LI>Tap <B>"Cancel Booking"</B> and select a cancellation reason from the dropdown;</LI>
          <LI>Confirm the cancellation. You will receive an in-app notification and email confirmation;</LI>
          <LI>If eligible for a refund, the amount and estimated processing time will be displayed immediately.</LI>
        </OL>
        <P>5.2 Phone or email cancellations are <B>not accepted</B> for scheduled trips unless the Platform is confirmed to be experiencing a technical outage.</P>

        <H3>6. Refund Processing Times</H3>
        <UL>
          <LI><B>FeaziMove Wallet:</B> Instant;</LI>
          <LI><B>Debit/Credit Card:</B> 3–5 business days (may take longer depending on your bank);</LI>
          <LI><B>Bank Transfer:</B> 3–7 business days.</LI>
        </UL>

        <H3>7. Special Bookings</H3>
        <P>7.1 <B>FeaziHaul Deliveries:</B> Package delivery bookings may only be cancelled before a Driver accepts the delivery request. Once accepted, standard cancellation tiers apply. If goods have been collected, no refund is applicable until the goods are returned in their original condition.</P>
      </>
    ),
  },

  // ─────────────────────────────── REFUND POLICY ───────────────────────────
  {
    id: 'refund',
    label: 'Refund Policy',
    content: (
      <>
        <h2 style={S.h2}>Refund Policy</h2>
        <span style={S.date}>Effective Date: 1 July 2026 &nbsp;|&nbsp; Last Updated: 17 June 2026</span>

        <Note>
          FeaziMove is committed to fair and transparent refund practices. This Policy sets out exactly when you are entitled to a refund, how to request one, and how long the process takes.
        </Note>

        <H3>1. When You Are Entitled to a Refund</H3>
        <P>You are eligible for a full or partial refund in the following circumstances:</P>
        <UL>
          <LI><B>Driver Cancellation:</B> Your assigned Driver cancelled the trip after you received a booking confirmation — full refund;</LI>
          <LI><B>FeaziMove Cancellation:</B> FeaziMove cancelled your trip for operational or technical reasons — full refund;</LI>
          <LI><B>Driver No-Show:</B> Your assigned Driver did not arrive within 10 minutes of the scheduled departure time and you were unable to reach them — full refund;</LI>
          <LI><B>Overcharging:</B> You were charged an incorrect amount due to a Platform error or billing bug — full refund of the overcharged amount;</LI>
          <LI><B>Duplicate Charge:</B> Your account was charged twice for the same trip — full refund of the duplicate charge;</LI>
          <LI><B>Significant Route Deviation:</B> The Driver took a materially different route resulting in a significantly longer trip than quoted, without your prior consent — partial refund of the difference;</LI>
          <LI><B>Service Not Rendered:</B> You paid but the trip was not completed due to vehicle breakdown, Driver misconduct, or Platform failure — full refund;</LI>
          <LI><B>Rider Cancellation within Tier 1 window:</B> See our Trip Cancellation Policy — full refund;</LI>
          <LI><B>Rider Cancellation within Tier 2 window:</B> See our Trip Cancellation Policy — 50% refund.</LI>
        </UL>

        <H3>2. When You Are NOT Entitled to a Refund</H3>
        <P>Refunds will not be issued in the following circumstances:</P>
        <UL>
          <LI>You were a no-show and did not appear at the pickup location within the permitted waiting window;</LI>
          <LI>You cancelled within the Tier 3 window (less than 15 minutes before departure) — except for force majeure events;</LI>
          <LI>You voluntarily exited the vehicle before your destination without a valid safety reason;</LI>
          <LI>You were removed from the vehicle by the Driver due to a breach of our Behaviour Policy;</LI>
          <LI>Dissatisfaction with the travel experience that does not constitute a breach of FeaziMove's service standards (e.g., minor traffic delays, air conditioning preference);</LI>
          <LI>Amounts paid with promotional credits, discount codes, or bonus wallet credits (these are non-refundable to external payment methods);</LI>
          <LI>Wallet top-up amounts (once loaded to the Wallet, funds are not refundable to the original source except on account closure);</LI>
          <LI>Requests submitted more than <B>30 days</B> after the trip date without extenuating circumstances;</LI>
          <LI>Trips completed successfully where the rating given was below 3 stars — a low rating alone does not constitute grounds for a refund.</LI>
        </UL>

        <H3>3. How to Request a Refund</H3>
        <P>Step-by-step process for submitting a refund request:</P>
        <OL>
          <LI>Open the FeaziMove app and go to <B>"My Trips"</B> → <B>"Trip History"</B>;</LI>
          <LI>Select the relevant trip and tap <B>"Get Help"</B> or <B>"Request a Refund"</B>;</LI>
          <LI>Select the most appropriate reason from the dropdown menu;</LI>
          <LI>Provide a written description of the issue and attach any supporting evidence (screenshots, photos, or communications);</LI>
          <LI>Submit the request. You will receive a confirmation reference number by email;</LI>
          <LI>Our support team will review the request and respond within <B>3 business days</B>.</LI>
        </OL>
        <P>Alternatively, email <A href="mailto:support@feazimove.com">support@feazimove.com</A> with your trip reference, the issue description, and any supporting evidence. Please include "Refund Request" in the subject line.</P>

        <H3>4. Refund Processing Times</H3>
        <P>Once a refund has been approved, the time to receive the funds depends on the original payment method:</P>
        <UL>
          <LI><B>FeaziMove Wallet Credit:</B> Instant — available immediately upon approval;</LI>
          <LI><B>FeaziMove Wallet:</B> instant once approved;</LI>
          <LI><B>Bank Transfer:</B> 3–7 business days from approval date.</LI>
        </UL>
        <P>FeaziMove will always notify you by email and in-app notification when a refund is approved and when it has been disbursed.</P>

        <H3>5. Partial Refunds</H3>
        <P>5.1 In cases where only part of a trip was not delivered (e.g., a route deviation that added material journey time), FeaziMove may issue a partial refund calculated on a pro-rata basis relative to the proportion of the agreed service that was not delivered.</P>
        <P>5.2 Partial refund calculations are made by our support team based on the trip data recorded in our system (GPS route, distance, and duration).</P>

        <H3>6. Wallet Refunds vs External Refunds</H3>
        <P>6.1 FeaziMove may offer refunds as either a credit to your FeaziMove Wallet or a return to the original payment method. Where applicable law requires refund to the original payment source, we will comply.</P>
        <P>6.2 Wallet credits from refunds:</P>
        <UL>
          <LI>Are available for immediate use on any FeaziMove service;</LI>
          <LI>Do not expire for a period of 12 months from the date of credit;</LI>
          <LI>Are non-transferable between accounts;</LI>
          <LI>Are non-refundable back to an external payment method once placed in the Wallet, except upon account closure.</LI>
        </UL>

        <H3>7. Chargeback & Dispute Escalation</H3>
        <P>7.1 We strongly encourage you to contact FeaziMove's support team before initiating a chargeback or payment dispute with your bank. Most issues can be resolved faster and more simply through our internal process.</P>
        <P>7.2 If you initiate a chargeback without first contacting FeaziMove, we reserve the right to:</P>
        <UL>
          <LI>Suspend your account pending resolution of the dispute;</LI>
          <LI>Provide evidence to your bank or payment processor to contest the chargeback;</LI>
          <LI>Apply a chargeback processing fee if the chargeback is found to be unwarranted.</LI>
        </UL>
        <P>7.3 <B>Escalation Path:</B> If you are dissatisfied with our refund decision, you may escalate by replying to your refund decision email at <A href="mailto:support@feazimove.com">support@feazimove.com</A>. Escalation reviews are independent of the initial decision. We aim to respond to escalations within <B>10 business days</B>.</P>

        <H3>8. Fraud Prevention</H3>
        <P>8.1 FeaziMove monitors all refund requests for patterns of abuse. The following activities are considered refund fraud and will result in permanent account suspension and potential legal action:</P>
        <UL>
          <LI>Submitting false claims of driver no-show or overcharging;</LI>
          <LI>Requesting refunds for trips that were legitimately completed and enjoyed;</LI>
          <LI>Creating multiple accounts to circumvent refund limits or abuse promotional credits;</LI>
          <LI>Initiating chargebacks for valid, completed transactions.</LI>
        </UL>
      </>
    ),
  },
]

// ── Page Component ─────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam    = searchParams.get('tab')
  const fromReg     = searchParams.get('from') === 'register'
  const initialTab  = POLICIES.find(p => p.id === tabParam)?.id || POLICIES[0].id
  const [activeTab, setActiveTab] = useState(initialTab)
  const { isDark } = useTheme()

  useEffect(() => {
    const id = searchParams.get('tab')
    if (id && POLICIES.find(p => p.id === id)) setActiveTab(id)
  }, [searchParams])

  const handleTab = (id) => {
    setActiveTab(id)
    setSearchParams({ tab: id, ...(fromReg ? { from: 'register' } : {}) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const active = POLICIES.find(p => p.id === activeTab)

  return (
    <LandingLayout hideNav={fromReg} hideFooter={fromReg}>
      {/* ── Go back banner — shown only when opened from registration ── */}
      {fromReg && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: '#243800', padding: '12px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            📋 Opened from <strong style={{ color: '#ccff00' }}>Registration</strong> — your progress is saved in the other tab
          </span>
          <button
            onClick={() => window.close()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 999,
              background: '#ccff00', color: '#243800',
              fontWeight: 800, fontSize: 13, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(204,255,0,0.35)',
            }}
          >
            ← Go back to Registration
          </button>
        </div>
      )}
      <style>{`
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
          color: var(--text-muted);
          font-family: inherit;
        }
        .tab-btn:hover { color: var(--text); border-color: var(--border-mid); }
        .tab-btn.active {
          background: #0a0a0a;
          color: #ccff00;
          border-color: #0a0a0a;
        }
      `}</style>

      {/* ── Hero ── */}
      <section style={{ background: isDark ? '#0a0a0a' : '#f8f8f6', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e8e8e4', padding: 'clamp(48px,6vw,80px) clamp(20px,6vw,80px) clamp(36px,4vw,60px)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.18em', color: '#5a9e00', textTransform: 'uppercase', marginBottom: 16 }}>
            FeaziMove · Legal
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.6rem,5vw,4rem)', color: 'var(--text)', margin: '0 0 20px', lineHeight: 1.08 }}>
            FeaziMove Policies
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto' }}>
            Our policies form the legal agreement between you and FeaziMove Technologies Limited, governing how you access and use our platform and the services we provide. Please read each policy carefully.
          </p>
        </div>
      </section>

      {/* ── Tab bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: isDark ? '#111111' : '#ffffff', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e8e8e4', padding: '0 clamp(20px,4vw,60px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', overflowX: 'auto', display: 'flex', gap: 4, padding: '12px 0', scrollbarWidth: 'none' }}>
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
      <section style={{ background: 'var(--bg)', padding: '60px clamp(20px,6vw,80px) 100px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {active?.content}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{ background: isDark ? '#0a0a0a' : '#f8f8f6', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e8e8e4', padding: '60px clamp(20px,6vw,80px)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.6rem', color: 'var(--text)', marginBottom: 12 }}>
            Have questions about our policies?
          </h3>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/contact"
              style={{ display: 'inline-block', background: 'transparent', color: '#0f0f0f', fontWeight: 700, fontSize: '0.95rem', padding: '13px 32px', borderRadius: 999, textDecoration: 'none', border: '1.5px solid #0f0f0f', letterSpacing: '0.02em' }}
            >
              General Support
            </a>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
