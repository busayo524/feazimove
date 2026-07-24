import React, { useState, useEffect, useCallback, useRef } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { track } from '../../services/analytics'
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw, AlertCircle, Landmark, ShieldCheck } from 'lucide-react'
import TransferDetails, { CopyBtn } from '../../components/TransferDetails'

const NEON='#ccff00', OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

const QUICK = [1000, 2000, 5000, 10000]
const POLL_INTERVAL = 4000
const PENDING_KEY = 'fm_pending_fund' // survives switching to the bank app

/* Optional permanent funding account (requires BVN — sent to our banking
   partner for verification, never stored by FeaziMove). Presented as "set up"
   only after the BVN step — the setup funnel is the product goal, so an
   auto-created payment account never short-circuits it. */
function ReservedAccountCard({ showForm, setShowForm, onStatus }) {
  const [account, setAccount] = useState(null)
  const [pending, setPending] = useState(false)
  const [bvn, setBvn] = useState('')
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
        onStatus?.(!!res.data.bvnSetUp)
      })
      .catch(() => {})
  }, [onStatus])
  useEffect(() => { load() }, [load])

  // While Anchor finishes creating the account, refresh every few seconds
  useEffect(() => {
    if (!pending || account) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [pending, account, load])

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await api.post('/wallet/reserved-account', { bvn, dateOfBirth: dob, gender })
      setShowForm(false)
      if (res.data.account) setAccount(res.data.account)
      else { setPending(true); setNotice(res.data.message) }
      onStatus?.(true)
      track('Reserved Account Requested', {})
    } catch (err) {
      setError(err.data?.message || 'Could not create your account. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div id="funding-account-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Landmark size={15} color={MOSS}/>
        <p style={{ fontWeight: 700, fontSize: 13, color: MOSS, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Personal Funding Account</p>
      </div>

      {account ? (
        <>
          {[['Bank', account.bankName], ['Account Number', account.accountNumber, true], ['Account Name', account.accountName]].map(([label, value, copy]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid #f2f4ee' }}>
              <span style={{ fontSize:12, color:MUTED }}>{label}</span>
              <span style={{ display:'flex', alignItems:'center', gap:2, fontSize:14, fontWeight:700, color:TEXT }}>
                {value || '—'}{copy && value && <CopyBtn text={String(value)}/>}
              </span>
            </div>
          ))}
          <p style={{ fontSize:12, color:MUTED, marginTop:10 }}>
            Transfer any amount to this account any time — it lands in your FeaziMove wallet automatically.
          </p>
        </>
      ) : pending ? (
        <p style={{ fontSize:13, color:MOSS, display:'flex', alignItems:'center', gap:8 }}>
          <RefreshCw size={13} style={{ animation:'spin 1.2s linear infinite' }}/>
          {notice || 'Your account is being created — it will appear here shortly.'}
        </p>
      ) : showForm ? (
        <form onSubmit={submit}>
          <p style={{ fontSize:12.5, color:MUTED, marginBottom:12, lineHeight:1.5 }}>
            Get a permanent account number in your own name — fund your wallet by transferring to it any time.
            Your BVN is required by CBN rules; it is verified by our banking partner and never stored by FeaziMove.
          </p>
          <input value={bvn} onChange={e => setBvn(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))} placeholder="BVN (11 digits)" inputMode="numeric" required
            style={{ width:'100%', padding:'11px 14px', borderRadius:10, fontSize:14, border:`1.5px solid ${BORDER}`, marginBottom:10, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10, marginBottom:10 }}>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} required
              style={{ padding:'11px 14px', borderRadius:10, fontSize:14, border:`1.5px solid ${BORDER}`, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}/>
            <select value={gender} onChange={e => setGender(e.target.value)} required
              style={{ padding:'11px 14px', borderRadius:10, fontSize:14, border:`1.5px solid ${BORDER}`, boxSizing:'border-box', background:CARD, color:TEXT, fontFamily:'inherit' }}>
              <option value="">Gender…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          {error && <p style={{ fontSize:12.5, color:'#ef4444', marginBottom:10 }}>{error}</p>}
          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" disabled={busy || bvn.length !== 11}
              style={{ flex:1, padding:'11px', borderRadius:10, background:(busy || bvn.length !== 11)?BORDER:NEON, color:(busy || bvn.length !== 11)?MUTED:OLIVE, border:'none', fontWeight:800, fontSize:13.5, cursor:(busy || bvn.length !== 11)?'not-allowed':'pointer', fontFamily:'inherit' }}>
              {busy ? 'Creating…' : 'Create My Account'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding:'11px 16px', borderRadius:10, background:'none', border:`1.5px solid ${BORDER}`, color:MUTED, fontWeight:700, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p style={{ fontSize:13, color:MUTED, marginBottom:12, lineHeight:1.5 }}>
            Skip entering amounts — get a permanent account number in your name and fund your wallet by
            simple bank transfer, any amount, any time.
          </p>
          <button onClick={() => setShowForm(true)}
            style={{ padding:'10px 18px', borderRadius:10, background:'none', border:`1.5px solid ${OLIVE}`, color:OLIVE, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            Set Up My Account
          </button>
        </>
      )}
    </div>
  )
}

export default function Wallet() {
  const { user } = useAuth()

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
        <p style={{ color: 'rgba(36,56,0,0.6)', fontSize: 13, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Balance</p>
        <p style={{ color: OLIVE, fontWeight: 900, fontSize: 'clamp(2rem,5vw,3rem)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {balance === null ? '—' : `₦${balance.toLocaleString()}`}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <p style={{ color: 'rgba(36,56,0,0.45)', fontSize: 13 }}>{user?.phone || '••• ••• ••••'}</p>
          {pendingFund && <span style={{ fontSize: 12, color: MOSS, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Waiting for transfer…
          </span>}
        </div>
        {successMsg && (
          <div style={{ marginTop: 12, background: NEON, color: OLIVE, fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 8, display: 'inline-block' }}>
            ✓ {successMsg}
          </div>
        )}
      </div>

      {/* Top up */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: MOSS, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Top Up Wallet</p>
        {!pendingFund && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => setAmount(String(q))}
                  style={{ padding: '8px 16px', borderRadius: 50, fontSize: 13, fontWeight: 700, border: `1.5px solid ${amount === String(q) ? NEON : BORDER}`, background: amount === String(q) ? NEON : BG, color: amount === String(q) ? OLIVE : MOSS, cursor: 'pointer', transition: 'all 0.15s' }}>
                  ₦{q.toLocaleString()}
                </button>
              ))}
            </div>
            <form onSubmit={handleFund} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input value={amount} onChange={e => setAmount(sanitize(e.target.value))} placeholder="Enter amount (₦)" inputMode="numeric"
                style={{ flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 10, fontSize: 15, border: `1.5px solid ${BORDER}`, outline: 'none', background: CARD, color: TEXT, fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = MOSS}
                onBlur={e => e.target.style.borderColor = BORDER} />
              <button type="submit" disabled={funding}
                style={{ padding: '12px 20px', borderRadius: 10, background: funding ? BORDER : NEON, color: funding ? MUTED : OLIVE, border: 'none', fontWeight: 800, fontSize: 14, cursor: funding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} />{funding ? 'Preparing…' : 'Add'}
              </button>
            </form>
          </>
        )}
        {pendingFund && (
          <div style={{ marginTop: 14 }}>
            <TransferDetails transfer={pendingFund.transfer} secondsLeft={secondsLeft} onCancel={cancelPending}/>
            <p style={{ fontSize:11.5, color:MUTED, marginTop:8 }}>
              Your wallet updates automatically once the transfer arrives — usually within seconds.
            </p>
          </div>
        )}
        {bvnSetUp === false && !pendingFund && (
          <button onClick={goToSetup}
            style={{ display:'flex', alignItems:'flex-start', gap:8, width:'100%', textAlign:'left', marginTop:12,
              background:'#f7ffe0', border:'1px solid rgba(36,56,0,0.12)', borderRadius:10, padding:'10px 12px',
              cursor:'pointer', fontFamily:'inherit' }}>
            <ShieldCheck size={15} color={MOSS} style={{ flexShrink:0, marginTop:1 }}/>
            <span style={{ fontSize:12.5, color:TEXT, lineHeight:1.45 }}>
              Finish setting up your wallet — verify with your BVN to get a permanent funding account in
              your name. <span style={{ fontWeight:800, color:OLIVE, textDecoration:'underline' }}>Set up now</span>
            </span>
          </button>
        )}
        {fundError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ color: '#ef4444', fontSize: 13 }}>{fundError}</span>
          </div>
        )}
      </div>

      {/* Permanent funding account (riders only need it, but harmless for all) */}
      <ReservedAccountCard showForm={setupFormOpen} setShowForm={setSetupFormOpen} onStatus={setBvnSetUp}/>

      {/* Transactions */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(36,56,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: MOSS, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Transaction History</p>
          <span style={{ fontSize: 12, color: MUTED }}>{transactions.length} records</span>
        </div>

        {loadingData ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 14 }}>Loading…</div>
        ) : dataError ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#ef4444', fontSize: 14 }}>{dataError}</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: MUTED, fontSize: 14 }}>No transactions yet.</div>
        ) : transactions.map((txn, i) => {
          const isCredit = txn.type === 'credit'
          return (
            <div key={txn.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < transactions.length - 1 ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = BG}
              onMouseLeave={e => e.currentTarget.style.background = CARD}>
              <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: isCredit ? NEON : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCredit ? <ArrowDownLeft size={17} color={OLIVE} /> : <ArrowUpRight size={17} color='#ef4444' />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: TEXT, fontWeight: 600, fontSize: 14 }}>{txn.description}</p>
                <span style={{ color: MUTED, fontSize: 12 }}>{txn.date}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, flexShrink: 0, background: isCredit ? NEON : '#fef2f2', color: isCredit ? OLIVE : '#ef4444', padding: '3px 12px', borderRadius: 20 }}>
                {isCredit ? '+' : '-'}₦{txn.amount.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  )
}
