import { CARD, BORDER, TEXT, MUTED, BG, NEON, ACCENT as OLIVE, MOSS, ON_NEON, DANGER_SOFT, NEON_SOFT, ACCENT_FILL, ON_ACCENT_FILL, WARN_SOFT, WARN_BORDER } from '../../theme/palette'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '../../components/AppLayout'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { track } from '../../services/analytics'
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw, AlertCircle, Landmark, ShieldCheck, X } from 'lucide-react'
import TransferDetails, { CopyBtn } from '../../components/TransferDetails'
import StepUpModal from '../../components/StepUpModal'
import { useHiddenBalance, EyeToggle, maskAmount } from '../../components/BalanceAmount'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

const QUICK = [1000, 2000, 5000, 10000]
const POLL_INTERVAL = 4000
const PENDING_KEY = 'fm_pending_fund' // survives switching to the bank app

/* Optional permanent funding account (requires BVN — sent in full to our
   banking partner for verification; only its last 4 digits are kept here, for
   admin confirmation in the back office). Presented as "set up"
   only after the BVN step — the setup funnel is the product goal, so an
   auto-created payment account never short-circuits it. */
function ReservedAccountCard({ showForm, setShowForm, onStatus }) {
  const [account, setAccount] = useState(null)
  const [pending, setPending] = useState(false)
  const [kyc, setKyc] = useState(null) // { status, reason, isNamed, verifying, canReverify }
  const [bvn, setBvn] = useState('')
  const [address, setAddress] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    api.get('/wallet/funding-account')
      .then(res => {
        setAccount(res.data.account)
        setPending(res.data.pending)
        setKyc({
          status: res.data.kycStatus || null,
          reason: res.data.kycReason || null,
          isNamed: !!res.data.accountIsNamed,
          verifying: !!res.data.verificationPending,
          canReverify: !!res.data.canReverify,
        })
        onStatus?.(!!res.data.bvnSetUp)
      })
      .catch(() => {})
  }, [onStatus])
  useEffect(() => { load() }, [load])

  // While Anchor finishes creating the account, refresh every few seconds.
  // Also poll while verification is in flight: the decision arrives from Anchor
  // asynchronously, and each poll is what completes the upgrade server-side.
  useEffect(() => {
    if (!((pending && !account) || kyc?.verifying)) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [pending, account, kyc?.verifying, load])

  // Mirrors the server's validators on POST /wallet/reserved-account, which
  // requires all four fields. Date of birth and gender were missing here, so
  // the button could enable on a request the API would reject.
  // `missing` exists because a silently greyed-out button is indistinguishable
  // from a broken one — it names whatever is still outstanding.
  const today = new Date().toISOString().slice(0, 10)
  const missing = []
  if (bvn.length !== 11)             missing.push('BVN (11 digits)')
  if (address.trim().length < 5)     missing.push('residential address')
  if (!dob)                          missing.push('date of birth')
  else if (dob >= today)             missing.push('a valid date of birth')
  if (!gender)                       missing.push('gender')
  const canSubmit = !busy && missing.length === 0

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.post('/wallet/reserved-account', {
        bvn, dateOfBirth: dob, gender, address: address.trim(),
      })
      setShowForm(false)
      setBvn('') // don't leave a BVN sitting in component state after submit
      setNotice(res.data.message || '')
      if (res.data.account) setAccount(res.data.account)
      onStatus?.(true)
      load() // pull the authoritative verification state back
      track('Reserved Account Requested', {})
    } catch (err) {
      setError(err.data?.message || 'Could not create your account. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div id="funding-account-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Landmark size={15} color={MOSS}/>
        <p style={{ fontWeight: 700, fontSize: 15, color: MOSS, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Personal Funding Account</p>
      </div>

      {/* An account that is not yet in the rider's own name is a half-finished
          state they can act on. Without this they saw a company-named account,
          no explanation, and no way back to the form — the setup card only ever
          appears when there is NO account at all. A rejected BVN lands here
          too: people mistype it, or register under a name their bank does not
          hold, and they must be able to correct it and try again. */}
      {account && kyc && !kyc.isNamed && kyc.canReverify && !showForm && (
        <div style={{ background: kyc.verifying ? NEON_SOFT : WARN_SOFT,
          border: `1px solid ${kyc.verifying ? NEON : WARN_BORDER}`,
          borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6 }}>
            {kyc.verifying
              ? <RefreshCw size={13} color={MOSS} style={{ animation:'spin 1.2s linear infinite' }}/>
              : <AlertCircle size={13} color="#c2410c"/>}
            <p style={{ fontSize:15, fontWeight:800, color: kyc.verifying ? MOSS : '#9a3412' }}>
              {kyc.verifying ? 'Verifying your identity…' : 'This account is not in your name yet'}
            </p>
          </div>
          <p style={{ fontSize:15, color:MUTED, lineHeight:1.5, marginBottom: kyc.verifying ? 0 : 10 }}>
            {kyc.verifying
              ? 'Our banking partner is checking your BVN. This account works normally in the meantime — it moves into your own name as soon as they approve it.'
              // 'verification_unsent' means the check never reached our banking
              // partner — our problem. Blaming the rider's BVN for it would
              // send them off re-typing details that were never read.
              : kyc.status === 'verification_unsent'
                ? `${kyc.reason || 'We could not complete the check with our banking partner.'} Your wallet works normally in the meantime.`
                : kyc.reason
                  ? `Our banking partner could not verify your details: ${kyc.reason}. Check your BVN, and that your name and phone number here match your bank records.`
                  : 'Your details have not been verified yet, so this account is still in FeaziMove’s name. It works normally — but you can verify to get one in your own name.'}
          </p>
          {!kyc.verifying && (
            <button onClick={() => setShowForm(true)}
              style={{ padding:'9px 16px', borderRadius:10, background:'none', border:`1.5px solid ${OLIVE}`, color:OLIVE, fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
              {kyc.status === 'rejected' ? 'Try Again' : 'Verify My Identity'}
            </button>
          )}
        </div>
      )}

      {/* showForm wins over everything: a rider re-verifying already HAS an
          account, so checking `account` first would render the details and
          never let them back to the form. */}
      {!showForm && account ? (
        <>
          {[['Bank', account.bankName], ['Account Number', account.accountNumber, true], ['Account Name', account.accountName]].map(([label, value, copy]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #f2f4ee' }}>
              <span style={{ fontSize:15, color:MUTED }}>{label}</span>
              <span style={{ display:'flex', alignItems:'center', gap:2, fontSize:15.5, fontWeight:700, color:TEXT }}>
                {value || '—'}{copy && value && <CopyBtn text={String(value)}/>}
              </span>
            </div>
          ))}
          <p style={{ fontSize:15, color:MUTED, marginTop:10 }}>
            Transfer any amount to this account any time — it lands in your FeaziMove wallet automatically.
          </p>
        </>
      ) : !showForm && pending ? (
        <p style={{ fontSize:15, color:MOSS, display:'flex', alignItems:'center', gap:8 }}>
          <RefreshCw size={13} style={{ animation:'spin 1.2s linear infinite' }}/>
          {notice || 'Your account is being created — it will appear here shortly.'}
        </p>
      ) : showForm ? (
        // Mirrors the server's validators so the button never enables a
        // request the API will reject (address must be at least 5 chars).
        <form onSubmit={submit}>
          <p style={{ fontSize:15, color:MUTED, marginBottom:12, lineHeight:1.5 }}>
            {account
              ? 'Re-enter your details to try verification again. Your BVN must match the name and phone number on your bank records — a single wrong digit is enough to fail the check.'
              : 'Get a permanent account number in your own name — fund your wallet by transferring to it any time. Your BVN is required by CBN KYC policy; it is verified by our banking partner.'}
          </p>
          <input value={bvn} onChange={e => setBvn(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))} placeholder="BVN (11 digits)" inputMode="numeric" required
            style={{ width:'100%', padding:'11px 14px', borderRadius:10, fontSize:15.5, border:`1.5px solid ${BORDER}`, marginBottom:10, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}/>
          <input value={address} onChange={e => setAddress(e.target.value.slice(0, 200))}
            placeholder="Residential address" autoComplete="street-address" required
            style={{ width:'100%', padding:'11px 14px', borderRadius:10, fontSize:15.5, border:`1.5px solid ${BORDER}`, marginBottom:10, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}/>
          {/* Labelled rather than placeheld: type="date" ignores placeholder,
              so this field rendered as a blank box with nothing telling the
              user what it wanted. Gender is labelled too, to keep the two
              columns aligned. */}
          {/* auto-fit + a 150px floor so the pair sits side by side when there
              is room and stacks on narrow phones instead of colliding.
              minWidth:0 on the cells is what actually stops the overlap: grid
              items default to min-width:auto, and type="date" has a wide
              intrinsic minimum (it must fit dd/mm/yyyy plus the picker icon),
              so without it the cell pushes past its track onto its neighbour. */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(150px,100%), 1fr))', gap:10, marginBottom:10 }}>
            <div style={{ minWidth:0 }}>
              <label htmlFor="wallet-dob" style={{ display:'block', fontSize:15, fontWeight:600, color:MUTED, marginBottom:5 }}>
                Date of Birth
              </label>
              <input id="wallet-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} required max={today}
                style={{ width:'100%', minWidth:0, maxWidth:'100%', padding:'11px 12px', borderRadius:10, fontSize:15.5, border:`1.5px solid ${BORDER}`, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit', WebkitAppearance:'none', appearance:'none' }}/>
            </div>
            <div style={{ minWidth:0 }}>
              <label htmlFor="wallet-gender" style={{ display:'block', fontSize:15, fontWeight:600, color:MUTED, marginBottom:5 }}>
                Gender
              </label>
              <select id="wallet-gender" value={gender} onChange={e => setGender(e.target.value)} required
                style={{ width:'100%', minWidth:0, maxWidth:'100%', padding:'11px 12px', borderRadius:10, fontSize:15.5, border:`1.5px solid ${BORDER}`, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          {error && <p style={{ fontSize:15, color:'#ef4444', marginBottom:10 }}>{error}</p>}
          {!busy && missing.length > 0 && (
            <p style={{ fontSize:15, color:MUTED, marginBottom:10, lineHeight:1.5 }}>
              Still needed: {missing.join(', ')}.
            </p>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" disabled={!canSubmit}
              style={{ flex:1, padding:'11px', borderRadius:10, background:!canSubmit?BORDER:NEON, color:!canSubmit?MUTED:ON_NEON, border:'none', fontWeight:800, fontSize:15.5, cursor:!canSubmit?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {busy ? (account ? 'Verifying…' : 'Creating…') : (account ? 'Try Again' : 'Create My Account')}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding:'11px 16px', borderRadius:10, background:'none', border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:700, fontSize:15.5, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p style={{ fontSize:15, color:MUTED, marginBottom:12, lineHeight:1.5 }}>
            Skip entering amounts — get a permanent account number in your name and fund your wallet by
            simple bank transfer, any amount, any time.
          </p>
          <button onClick={() => setShowForm(true)}
            style={{ padding:'10px 18px', borderRadius:10, background:'none', border:`1.5px solid ${OLIVE}`, color:OLIVE, fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>
            Set Up My Account
          </button>
        </>
      )}
    </div>
  )
}

export default function Wallet() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Mirrors the server's rule so the UI never offers a request it will refuse.
  const hasBankDetails = !!(user?.bankName || '').trim() && /^\d{10}$/.test((user?.bankAccountNumber || '').trim())

  const [hideBalance, toggleBalance] = useHiddenBalance()
  const [balance, setBalance]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loadingData, setLoadingData]   = useState(true)
  const [dataError, setDataError]       = useState('')

  const [amount, setAmount]       = useState('')
  const [funding, setFunding]     = useState(false)
  const [fundError, setFundError] = useState('')

  const [successMsg, setSuccessMsg] = useState('')
  const [pendingFund, setPendingFund] = useState(null) // { reference, transfer, expiresAt }
  const [secondsLeft, setSecondsLeft] = useState(0)
  const pollRef = useRef(null)

  // Wallet-setup funnel: false until the user completes the BVN step; the
  // top-up card shows a gentle reminder linking into the setup form below.
  const [bvnSetUp, setBvnSetUp] = useState(null) // null = unknown yet
  const [setupFormOpen, setSetupFormOpen] = useState(false)

  // Withdrawals (BVN-verified riders): mirrors the driver flow — emailed
  // code → escrow → admin approval — with a 5% processing fee for riders.
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')
  const [showWithdrawStepUp, setShowWithdrawStepUp] = useState(false)
  const wAmount = parseInt(withdrawAmount, 10) || 0
  const wNetKobo = wAmount * 100 - Math.round(wAmount * 100 * 0.05)

  function startWithdraw(e) {
    e.preventDefault()
    if (!wAmount || wAmount < 100) { setWithdrawError('Minimum withdrawal is ₦100.'); return }
    if (wAmount > (balance || 0)) { setWithdrawError('Amount exceeds your available balance.'); return }
    setWithdrawError('')
    setShowWithdrawStepUp(true)
  }
  async function verifyAndWithdraw(challengeId, code) {
    const res = await api.post('/wallet/withdraw', { amount: wAmount, challengeId, code })
    setShowWithdrawStepUp(false)
    setWithdrawSuccess(res.data?.message || 'Withdrawal requested — pending admin approval.')
    setWithdrawAmount('')
    await fetchWallet()
    setTimeout(() => { setShowWithdraw(false); setWithdrawSuccess('') }, 3000)
  }
  function goToSetup() {
    setSetupFormOpen(true)
    setTimeout(() => document.getElementById('funding-account-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  const fetchWallet = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions'),
      ])
      setBalance(balRes.data.balance)
      setTransactions(txRes.data.transactions)
      setDataError('')
    } catch {
      setDataError('Could not load wallet data.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  // Poll the reference until the incoming transfer is confirmed (the webhook
  // credits it server-side; we just watch for the flip to 'completed').
  const watchPending = useCallback((pending) => {
    setSecondsLeft(Math.round((pending.expiresAt - Date.now()) / 1000)) // no stale first frame
    setPendingFund(pending)
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/wallet/fund/status/${pending.reference}`)
        if (res.data.status === 'completed') {
          stopPolling()
          sessionStorage.removeItem(PENDING_KEY)
          setPendingFund(null)
          track('Wallet Topup Completed', { amount: res.data.amount })
          await fetchWallet()
          setSuccessMsg(`₦${res.data.amount.toLocaleString()} added to your wallet!`)
          setTimeout(() => setSuccessMsg(''), 6000)
        }
      } catch (err) {
        // 404 = the server says this reference is not this account's (or no
        // longer exists) — kill the panel immediately rather than display
        // payment details that don't belong to the logged-in user.
        if (err?.status === 404) {
          stopPolling()
          sessionStorage.removeItem(PENDING_KEY)
          setPendingFund(null)
          return
        }
        /* transient error — keep polling */
      }
      if (Date.now() > pending.expiresAt + 60_000) { // grace past expiry
        stopPolling()
        sessionStorage.removeItem(PENDING_KEY)
        setPendingFund(null)
        fetchWallet()
      }
    }, POLL_INTERVAL)
  }, [fetchWallet, stopPolling])

  // Countdown shown on the transfer panel
  useEffect(() => {
    if (!pendingFund) return
    const tick = () => setSecondsLeft(Math.round((pendingFund.expiresAt - Date.now()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pendingFund])

  // On mount: fetch wallet; resume a pending top-up (e.g. the rider switched
  // to their bank app and came back)
  useEffect(() => {
    fetchWallet()
    try {
      const saved = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null')
      const mine = saved?.userId && user?.id && saved.userId === user.id
      if (saved?.reference && saved?.transfer && mine && Date.now() < saved.expiresAt + 60_000) {
        watchPending(saved)
      } else if (saved) {
        sessionStorage.removeItem(PENDING_KEY) // expired — or another account's
      }
    } catch { sessionStorage.removeItem(PENDING_KEY) }
    return stopPolling
  }, [fetchWallet, watchPending, stopPolling, user?.id])

  function sanitize(val) { return val.replace(/[^0-9]/g, '') }

  async function handleFund(e) {
    e.preventDefault()
    const num = parseInt(amount, 10)
    if (!num || num < 100) { setFundError('Minimum top-up is ₦100'); return }
    setFunding(true)
    setFundError('')
    try {
      const res = await api.post('/wallet/fund', { amount: num })
      track('Wallet Topup Started', { amount: num })
      const pending = {
        userId: user?.id || null, // never restore this panel for a different account
        reference: res.data.reference,
        transfer: res.data.transfer,
        expiresAt: Date.now() + (res.data.transfer.expiresInSeconds || 1800) * 1000,
      }
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
      setAmount('')
      watchPending(pending)
    } catch (err) {
      setFundError(err.data?.message || 'Could not start the top-up. Please try again.')
      // The server turns away a top-up from a rider who never completed wallet
      // setup. Leaving them with only the sentence would be a dead end — the
      // form they need is further down the same page, so open it and take them
      // there instead of making them hunt for it.
      if (err.data?.needsWalletSetup) goToSetup()
    } finally {
      setFunding(false)
    }
  }

  function cancelPending() {
    // Hiding the panel just stops watching — if they DID pay, the webhook
    // still credits the wallet and the balance refresh will show it.
    stopPolling()
    sessionStorage.removeItem(PENDING_KEY)
    setPendingFund(null)
    fetchWallet()
  }

  return (
    <AppLayout title="Wallet">

      {/* Balance card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(204,255,0,0.18)' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 50, width: 90, height: 90, borderRadius: '50%', background: 'rgba(204,255,0,0.1)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
          <p style={{ color:MUTED, fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Balance</p>
          <EyeToggle hidden={hideBalance} onToggle={toggleBalance} size={17}/>
        </div>
        <p style={{ color: OLIVE, fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {balance === null ? '—' : hideBalance ? maskAmount() : `₦${balance.toLocaleString()}`}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <p style={{ color:MUTED, fontSize: 15 }}>{user?.phone || '••• ••• ••••'}</p>
          {pendingFund && <span style={{ fontSize: 15, color: MOSS, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Waiting for transfer…
          </span>}
        </div>
        {successMsg && (
          <div style={{ marginTop: 12, background: NEON, color:ON_NEON, fontWeight: 700, fontSize: 15, padding: '8px 14px', borderRadius: 8, display: 'inline-block' }}>
            ✓ {successMsg}
          </div>
        )}
        {bvnSetUp === true && (
          <button onClick={() => { setWithdrawError(''); setShowWithdraw(true) }}
            style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10,
              background:ACCENT_FILL, color:ON_ACCENT_FILL, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowUpRight size={15}/> Withdraw
          </button>
        )}
      </div>

      {/* Top up */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: MOSS, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Top Up Wallet</p>
        {!pendingFund && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => setAmount(String(q))}
                  style={{ padding: '8px 16px', borderRadius: 50, fontSize: 15, fontWeight: 700, border: `1.5px solid ${amount === String(q) ? NEON : BORDER}`, background: amount === String(q) ? NEON : BG, color: amount === String(q) ? ON_NEON : MOSS, cursor: 'pointer', transition: 'all 0.15s' }}>
                  ₦{q.toLocaleString()}
                </button>
              ))}
            </div>
            <form onSubmit={handleFund} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input value={amount} onChange={e => setAmount(sanitize(e.target.value))} placeholder="Enter amount (₦)" inputMode="numeric"
                style={{ flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 10, fontSize: 16, border: `1.5px solid ${BORDER}`, outline: 'none', background: CARD, color: TEXT, fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = MOSS}
                onBlur={e => e.target.style.borderColor = BORDER} />
              <button type="submit" disabled={funding}
                style={{ padding: '12px 20px', borderRadius: 10, background: funding ? BORDER : NEON, color: funding ? MUTED : ON_NEON, border: 'none', fontWeight: 800, fontSize: 15.5, cursor: funding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} />{funding ? 'Preparing…' : 'Add'}
              </button>
            </form>
          </>
        )}
        {pendingFund && (
          <div style={{ marginTop: 14 }}>
            <TransferDetails transfer={pendingFund.transfer} secondsLeft={secondsLeft} onCancel={cancelPending}/>
            <p style={{ fontSize:14.5, color:MUTED, marginTop:8 }}>
              Your wallet updates automatically once the transfer arrives — usually within seconds.
            </p>
          </div>
        )}
        {bvnSetUp === false && !pendingFund && (
          <button onClick={goToSetup}
            style={{ display:'flex', alignItems:'flex-start', gap:8, width:'100%', textAlign:'left', marginTop:12,
              background:NEON_SOFT, border:'1px solid rgba(36,56,0,0.12)', borderRadius:10, padding:'10px 12px',
              cursor:'pointer', fontFamily:'inherit' }}>
            <ShieldCheck size={15} color={MOSS} style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:15, color:TEXT, lineHeight:1.45 }}>
              Finish setting up your wallet — verify with your BVN to get a permanent funding account in
              your name. <span style={{ fontWeight:800, color:OLIVE, textDecoration:'underline' }}>Set up now</span>
            </span>
          </button>
        )}
        {fundError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: DANGER_SOFT, border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ color: '#ef4444', fontSize: 15 }}>{fundError}</span>
          </div>
        )}
      </div>

      {/* Permanent funding account (riders only need it, but harmless for all) */}
      <ReservedAccountCard showForm={setupFormOpen} setShowForm={setSetupFormOpen} onStatus={setBvnSetUp}/>

      {/* Transactions */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: MOSS, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction History</p>
          <span style={{ fontSize: 15, color: MUTED }}>{transactions.length} records</span>
        </div>

        {loadingData ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 15.5 }}>Loading…</div>
        ) : dataError ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#ef4444', fontSize: 15.5 }}>{dataError}</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 15.5 }}>No transactions yet.</div>
        ) : transactions.map((txn, i) => {
          const isCredit = txn.type === 'credit'
          return (
            <div key={txn.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < transactions.length - 1 ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = BG}
              onMouseLeave={e => e.currentTarget.style.background = CARD}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: isCredit ? NEON : DANGER_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCredit ? <ArrowDownLeft size={17} color={OLIVE} /> : <ArrowUpRight size={17} color='#ef4444' />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: TEXT, fontWeight: 600, fontSize: 15.5 }}>{txn.description}</p>
                <span style={{ color: MUTED, fontSize: 15 }}>{txn.date}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15.5, flexShrink: 0, background: isCredit ? NEON : DANGER_SOFT, color:isCredit ? ON_NEON : '#ef4444', padding: '3px 12px', borderRadius: 20 }}>
                {isCredit ? '+' : '-'}₦{txn.amount.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Withdrawal popup — mirrors the driver flow, with the rider fee caveat */}
      {showWithdraw && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setShowWithdraw(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:CARD, borderRadius:16, padding:24, maxWidth:340, width:'100%', boxShadow:'0 12px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <p style={{ fontWeight:800, fontSize:16, color:TEXT }}>Withdraw to Bank</p>
              <button onClick={() => setShowWithdraw(false)} style={{ background:'none', border:'none', cursor:'pointer', color:MUTED }}><X size={18}/></button>
            </div>
            <p style={{ fontSize:15, color:MUTED, marginBottom:4 }}>
              Available: ₦{(balance ?? 0).toLocaleString()}. Requests are reviewed by an admin and paid
              only to a bank account in your registered name.
            </p>
            <p style={{ fontSize:15, color:MUTED, marginBottom:14 }}>A 5% processing fee applies to withdrawals.</p>
            {!hasBankDetails ? (
              /* Requesting without these debits the wallet for a payout that can
                 never be sent, so the form is not offered until they exist. */
              <div style={{ background:WARN_SOFT, border:`1px solid ${WARN_BORDER}`, borderRadius:12, padding:14 }}>
                <p style={{ fontSize:15.5, fontWeight:800, color:TEXT, marginBottom:6 }}>
                  Add your bank details first
                </p>
                <p style={{ fontSize:15, color:MUTED, marginBottom:12, lineHeight:1.5 }}>
                  We pay withdrawals to a bank account in your own name. Add your bank
                  name and 10-digit account number in your profile, then come back.
                </p>
                <button type="button" onClick={() => navigate('/profile')}
                  style={{ padding:'10px 18px', borderRadius:10, border:'none', background:NEON,
                    color:ON_NEON, fontWeight:800, fontSize:15.5, cursor:'pointer', fontFamily:'inherit' }}>
                  Add bank details
                </button>
              </div>
            ) : (
            <form onSubmit={startWithdraw}>
              <label style={{ display:'block', fontSize:15, fontWeight:600, color:TEXT, marginBottom:6 }}>Amount (₦)</label>
              <input type="number" min="100" max={balance ?? 0} value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)} required placeholder={`Up to ${(balance ?? 0).toLocaleString()}`}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1.5px solid ${BORDER}`, fontSize:15.5, marginBottom:6, fontFamily:'inherit', boxSizing:'border-box', background:CARD, color:TEXT, caretColor:TEXT }}/>
              {wAmount >= 100 && (
                <p style={{ fontSize:15, color:MOSS, fontWeight:700, marginBottom:10 }}>
                  You'll receive ₦{(wNetKobo / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} after the 5% fee.
                </p>
              )}
              {withdrawError && <p style={{ fontSize:15, color:'#ef4444', marginBottom:10 }}>{withdrawError}</p>}
              {withdrawSuccess && <p style={{ fontSize:15, color:'#15803d', marginBottom:10 }}>{withdrawSuccess}</p>}
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setShowWithdraw(false)}
                  style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${BORDER}`, background:CARD, color:TEXT, fontWeight:700, fontSize:15.5, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:NEON, color:ON_NEON, fontWeight:700, fontSize:15.5, cursor:'pointer', fontFamily:'inherit' }}>
                  Withdraw
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
      {showWithdrawStepUp && (
        <StepUpModal purpose="wallet_withdraw" actionText="withdraw from your wallet"
          onVerify={verifyAndWithdraw} onClose={() => setShowWithdrawStepUp(false)}/>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  )
}
