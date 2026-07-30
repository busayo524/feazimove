import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, ArrowRight } from 'lucide-react'
import LandingLayout from '../../components/LandingLayout'
import { useTheme } from '../../context/ThemeContext'

const NEON = '#ccff00'

/* ── Content ──────────────────────────────────────────────────────────────────
   Grouped so a reader can scan to the section they care about rather than
   hunting one long list. Answers describe how FeaziMove actually behaves —
   fixed commuter routes, wallet-funded fares, first-party payouts — so this
   page stays true if someone reads it instead of contacting support. */
const CATEGORIES = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is FeaziMove?',
        a: `FeaziMove is a commuter mobility platform for African cities. Instead of hailing a
            car and paying alone, you are matched with a car owner already driving your route at
            the time you travel — to work every morning and home every evening. Seats in that car
            are shared between riders heading the same way, which is what keeps the fare low.
            We also move items: "Move an Item" lets you send a package along the same routes.`,
      },
      {
        q: 'Where does FeaziMove operate?',
        a: `We are in beta in Lagos, running a growing set of fixed commuter routes between
            mainland pickup points and island destinations. You can see the live routes on the
            Routes & Coverage page. New corridors are added as more drivers join a route, so if
            yours is not listed yet, create an account — demand on a route is what opens it.`,
      },
      {
        q: 'How do I create an account?',
        a: `Tap Create account, choose whether you are joining as a rider or a driver, and enter
            your name, email and phone number. You will get a one-time code by email to confirm
            the address, then you complete a short registration form. Riders provide a valid ID;
            drivers additionally provide their licence, vehicle details and vehicle documents.`,
      },
      {
        q: 'Why does my account say "pending approval"?',
        a: `Every account is reviewed by our team before it goes live. We check that the details
            and documents you submitted are complete and legible — this is what keeps unverified
            people out of shared cars. Approval is usually quick. You will be able to sign in as
            soon as it is done, and we will email you if anything needs re-uploading.`,
      },
      {
        q: 'How do I install FeaziMove on my phone like a normal app?',
        a: 'PWA_INSTALL', // rendered by a dedicated component below
      },
    ],
  },
  {
    title: 'Rides',
    items: [
      {
        q: 'How does a pooled ride actually work?',
        a: `You choose your route and the time slot you travel in — mornings and evenings each
            have their own slots. Drivers going that way at that time publish the seats they have
            free. When your route, direction and time slot line up with a driver's, you are
            matched, and up to eight riders heading the same way can share the trip. Everyone is
            picked up along the driver's chain of stops rather than diverted door to door, which
            is what keeps the journey direct.`,
      },
      {
        q: 'How do I book a ride?',
        a: `Open Schedule Ride, pick your pickup point, your drop-off and your time slot, and
            confirm. You will see the fare before you commit, along with the drivers currently
            live on your route. Your request stays open while we look for a match — you do not
            have to keep the app in the foreground. If you close it and come back, your search
            is still running.`,
      },
      {
        q: 'What happens if no driver matches my route?',
        a: `Nothing is charged. Your fare is only taken from your wallet once a driver confirms
            the trip. If no one is going your way in that slot, the search simply ends and you
            can try another slot or another day. Drivers can also extend their pickup chain to
            nearby stops, so a match sometimes arrives a few minutes in.`,
      },
      {
        q: 'Can I cancel a ride?',
        a: `Yes. You can cancel while you are still being matched, and while a driver is on the
            way to you. If a driver cancels on you, we tell you straight away and put you back
            into matching automatically so you are not left stranded — you do not have to
            rebook from scratch.`,
      },
      {
        q: 'How are fares decided?',
        a: `Fares are set per route rather than by a meter, so the price you see is the price you
            pay — no surge, no estimate that changes at the end. A solo ride, where you take the
            whole car rather than share it, is priced at the pooled fare multiplied by the seats
            you are taking up.`,
      },
    ],
  },
  {
    title: 'Wallet & payments',
    items: [
      {
        q: 'How do I pay for a trip?',
        a: `Trips are paid from your FeaziMove wallet, so there is no card to fish out at the end
            of a journey. Top the wallet up before you travel and the fare is deducted when your
            ride is confirmed. You can see every credit and debit in Wallet → Transaction History.`,
      },
      {
        q: 'How do I fund my wallet?',
        a: `Two ways. You can enter an amount in the Wallet page and pay by bank transfer, or you
            can set up your own permanent funding account — a dedicated account number in your
            name that you can transfer to at any time, from any bank app. Anything you send to
            that account lands in your FeaziMove wallet automatically, usually within seconds.`,
      },
      {
        q: 'Why do you ask for my BVN?',
        a: `Only to create your permanent funding account. Nigerian banking rules (CBN KYC policy)
            require a verified identity before an account can be issued in your name, and your BVN
            is how our licensed banking partner performs that check. It is verified by them, not
            by us. You can use FeaziMove and pay for rides without ever providing it — it is
            needed only for the personal funding account.`,
      },
      {
        q: 'How do I withdraw money from my wallet?',
        a: `Add your bank details in your Profile, then use Withdraw on the Wallet page. For your
            security a withdrawal asks you to confirm it with a one-time code before it is
            submitted. Payouts are reviewed and then sent by bank transfer.`,
      },
      {
        q: 'Why must my bank account be in my own name?',
        a: `We only pay out to an account whose name matches the name on your FeaziMove account.
            This is deliberate: it stops earnings being routed to someone else's account if your
            login is ever compromised, and it is why your registered name cannot be edited after
            verification. If your name is genuinely wrong on your account, contact support and we
            will correct it against your ID.`,
      },
    ],
  },
  {
    title: 'Driving with FeaziMove',
    items: [
      {
        q: 'How do I drive with FeaziMove?',
        a: `You need your own car, a valid driver's licence, vehicle registration and proof of
            roadworthiness. Sign up as a driver, upload those documents, and our team reviews
            them. Once approved you set the route you already drive, the time slot and how many
            seats you can offer — you are not dispatched anywhere you were not already going.`,
      },
      {
        q: 'Do I have to drive full time?',
        a: `No. FeaziMove is built around the commute you already make. You go live when you are
            about to set off, take riders heading your way, and go offline when you arrive. There
            are no shifts, no targets and no obligation to accept anything.`,
      },
      {
        q: 'How and when do I get paid?',
        a: `Your share of each fare lands in your FeaziMove wallet as soon as the trip completes —
            you can see it under Earnings. Request a withdrawal whenever you want it in your bank
            account; it is reviewed and then sent by transfer to the account registered in your
            name. A small processing fee is shown before you confirm, so you always know the net
            amount.`,
      },
      {
        q: 'Can I be both a rider and a driver?',
        a: `Yes. If you drive in the morning but want to ride home, you can add the second role to
            your existing account and switch between them — one account, one wallet, one identity.
            Adding a role is something you choose; it is never switched on for you.`,
      },
    ],
  },
  {
    title: 'Safety & support',
    items: [
      {
        q: 'How do you keep trips safe?',
        a: `Every rider and driver is identity-checked and manually approved before their first
            trip, so nobody in the car is anonymous. You see your driver's name, photo, rating and
            vehicle — including the plate number — before the trip starts, and you can message
            them in the app without sharing your phone number. Both sides rate each other after
            every trip, and we act on low ratings.`,
      },
      {
        q: 'Something went wrong on a trip. What do I do?',
        a: `Contact us through the Contact page or email support@feazimove.com with the date and
            route, and we will pull up the trip. Every ride, message and payment is recorded, so
            we can see what happened rather than take one side's word for it.`,
      },
      {
        q: 'How is my personal data handled?',
        a: `We collect what is needed to run a safe, regulated service and no more. Identity
            documents are stored securely and are visible only to the small team that reviews
            them, with every access recorded. Your BVN is passed to our licensed banking partner
            for verification and is never stored by FeaziMove in readable form. Full detail is in
            our Privacy Policy.`,
      },
    ],
  },
]

/* The install answer is a real, followable procedure rather than prose — the
   steps differ per browser and getting them wrong is the whole reason people
   give up on installing a PWA. */
function PwaInstallAnswer({ c }) {
  const Step = ({ n, children }) => (
    <li style={{ marginBottom: 8, lineHeight: 1.6 }}>
      <strong style={{ color: c.text }}>{n}</strong> {children}
    </li>
  )
  const Block = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontWeight: 800, fontSize: 14, color: c.text, marginBottom: 8 }}>{title}</p>
      <ol style={{ paddingLeft: 18, margin: 0, fontSize: 14.5, color: c.textMid }}>{children}</ol>
    </div>
  )
  return (
    <div>
      <p style={{ fontSize: 14.5, color: c.textMid, lineHeight: 1.7, marginBottom: 16 }}>
        FeaziMove installs straight from your browser — there is nothing to download from an app
        store. Once installed it opens full screen with its own icon, exactly like a normal app.
      </p>
      <Block title="On Android (Chrome)">
        <Step n="1.">Open <strong style={{ color: c.text }}>www.feazimove.com/app</strong> in Chrome.</Step>
        <Step n="2.">Tap the three-dot menu <strong style={{ color: c.text }}>⋮</strong> at the top right.</Step>
        <Step n="3.">Choose <strong style={{ color: c.text }}>Install app</strong> (on some phones it reads <strong style={{ color: c.text }}>Add to Home screen</strong>).</Step>
        <Step n="4.">Confirm with <strong style={{ color: c.text }}>Install</strong>. The FeaziMove icon appears on your home screen.</Step>
      </Block>
      <Block title="On iPhone or iPad (Safari)">
        <Step n="1.">Open <strong style={{ color: c.text }}>www.feazimove.com/app</strong> in <strong style={{ color: c.text }}>Safari</strong>. This does not work in Chrome on iOS — Apple only allows Safari to install web apps.</Step>
        <Step n="2.">Tap the <strong style={{ color: c.text }}>Share</strong> button — the square with an arrow pointing up, at the bottom of the screen.</Step>
        <Step n="3.">Scroll down the list and tap <strong style={{ color: c.text }}>Add to Home Screen</strong>.</Step>
        <Step n="4.">Tap <strong style={{ color: c.text }}>Add</strong> at the top right.</Step>
      </Block>
      <Block title="On a laptop (Chrome or Edge)">
        <Step n="1.">Open <strong style={{ color: c.text }}>www.feazimove.com/app</strong>.</Step>
        <Step n="2.">Click the install icon in the address bar — a small screen with a downward arrow.</Step>
        <Step n="3.">Click <strong style={{ color: c.text }}>Install</strong>.</Step>
      </Block>
      <p style={{ fontSize: 13.5, color: c.textMid, lineHeight: 1.65, background: c.hint,
        border: `1px solid ${c.border}`, borderRadius: 10, padding: '11px 14px' }}>
        Signed in already? You stay signed in after installing. If you do not see the install
        option, make sure you are on the <strong style={{ color: c.text }}>/app</strong> address
        and that the page has finished loading.
      </p>
    </div>
  )
}

/* Neon burst behind the title — the angular shape from the reference. Purely
   decorative, so it is hidden from screen readers and never intercepts taps. */
function NeonBurst() {
  return (
    <svg viewBox="0 0 900 420" aria-hidden="true" focusable="false"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0 }}>
      <polygon fill={NEON}
        points="0,236 286,150 232,52 402,104 470,0 548,120 742,44 654,190 900,150 690,262 828,352 596,310 610,420 470,318 402,404 348,306 150,330 244,246"/>
    </svg>
  )
}

function FaqItem({ item, open, onToggle, c, id }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14,
      marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-answer`}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'inherit' }}>
        {/* Arrow sits in FRONT of the question and rotates down when open. */}
        <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
          background: open ? NEON : c.dot, display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'transform 0.22s ease, background 0.22s ease',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ChevronRight size={17} color={open ? '#0a0a0a' : c.dotIcon} strokeWidth={2.6}/>
        </span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15.5, color: c.text, lineHeight: 1.4 }}>
          {item.q}
        </span>
      </button>
      {open && (
        <div id={`${id}-answer`} style={{ padding: '0 20px 20px 64px' }}>
          {item.a === 'PWA_INSTALL'
            ? <PwaInstallAnswer c={c}/>
            : <p style={{ fontSize: 14.5, color: c.textMid, lineHeight: 1.75 }}>{item.a}</p>}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  const { isDark } = useTheme()
  // One open at a time, keyed "categoryIndex-itemIndex".
  const [open, setOpen] = useState(null)

  const c = {
    heroBg:  isDark ? '#0a0a0a' : '#f2f2ec',
    pageBg:  isDark ? '#111111' : '#ffffff',
    card:    isDark ? '#1a1a1a' : '#ffffff',
    border:  isDark ? '#2a2a2a' : '#e5e7eb',
    text:    isDark ? '#ffffff' : '#0f0f0f',
    textMid: isDark ? 'rgba(255,255,255,0.72)' : '#4a4a4a',
    dot:     isDark ? '#2a2a2a' : '#1a1a1a',
    dotIcon: isDark ? '#ffffff' : '#ffffff',
    hint:    isDark ? '#161616' : '#f7f8f3',
  }

  return (
    <LandingLayout>
      {/* ── Hero ── */}
      <section style={{ background: c.heroBg, position: 'relative', overflow: 'hidden',
        padding: '72px 20px 88px' }}>
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <NeonBurst/>
          <h1 style={{ position: 'relative', zIndex: 1, fontWeight: 900, color: c.text,
            fontSize: 'clamp(2.3rem, 7vw, 4.2rem)', lineHeight: 1.03,
            letterSpacing: '-0.035em', marginBottom: 20 }}>
            Frequently Asked<br/>Questions
          </h1>
          <p style={{ position: 'relative', zIndex: 1, fontSize: 'clamp(0.95rem, 2vw, 1.05rem)',
            color: c.textMid, lineHeight: 1.65, maxWidth: 460, margin: '0 auto', fontWeight: 500 }}>
            New to FeaziMove, or getting the most out of your commute? Everything about rides,
            wallets, driving and safety — answered.
          </p>
        </div>
      </section>

      {/* ── Questions ── */}
      <section style={{ background: c.pageBg, padding: '56px 20px 72px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {CATEGORIES.map((cat, ci) => (
            <div key={cat.title} style={{ marginBottom: 44 }}>
              <h2 style={{ fontWeight: 900, fontSize: 21, color: c.text,
                letterSpacing: '-0.02em', marginBottom: 16 }}>
                {cat.title}
              </h2>
              {cat.items.map((item, ii) => {
                const key = `${ci}-${ii}`
                return (
                  <FaqItem key={key} id={`faq-${key}`} item={item} c={c}
                    open={open === key}
                    onToggle={() => setOpen(open === key ? null : key)}/>
                )
              })}
            </div>
          ))}

          {/* ── Still stuck ── */}
          <div style={{ background: NEON, borderRadius: 18, padding: '32px 28px',
            textAlign: 'center', marginTop: 8 }}>
            <h3 style={{ fontWeight: 900, fontSize: 'clamp(1.3rem, 3.4vw, 1.7rem)', color: '#0a0a0a',
              letterSpacing: '-0.02em', marginBottom: 8 }}>
              Still have a question?
            </h3>
            <p style={{ fontSize: 14.5, color: 'rgba(10,10,10,0.72)', lineHeight: 1.6,
              maxWidth: 420, margin: '0 auto 20px' }}>
              If your answer is not here, our team will get back to you.
            </p>
            <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 26px', borderRadius: 50, background: '#0a0a0a', color: '#ffffff',
              fontWeight: 700, fontSize: 14.5, textDecoration: 'none' }}>
              Contact us <ArrowRight size={16}/>
            </Link>
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}
