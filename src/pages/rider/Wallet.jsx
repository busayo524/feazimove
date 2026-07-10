import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw, AlertCircle } from 'lucide-react'

const NEON='#ccff00', OLIVE='#243800', MOSS='#4C6900'
const CARD='#ffffff', BORDER='#e9ecef', TEXT='#1a2800', MUTED='#4C6900', BG='#f6f7f9'

const QUICK = [1000, 2000, 5000, 10000]
const POLL_INTERVAL = 2500
const POLL_MAX = 24 // ~60s total

export default function Wallet() {
  const { user } = useAuth()
  const location = useLocation()

  const [balance, setBalance]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loadingData, setLoadingData]   = useState(true)
  const [dataError, setDataError]       = useState('')

  const [amount, setAmount]       = useState('')
  const [funding, setFunding]     = useState(false)
  const [fundError, setFundError] = useState('')

  const [successMsg, setSuccessMsg] = useState('')
  const [polling, setPolling]       = useState(false)

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

  // Poll until a pending payment reference is confirmed completed
  const pollPaymentStatus = useCallback(async (reference) => {
    setPolling(true)
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await api.get(`/wallet/fund/status/${reference}`)
        if (res.data.status === 'completed') {
          clearInterval(interval)
          sessionStorage.removeItem('fm_pending_ref')
          await fetchWallet()
          setSuccessMsg(`₦${res.data.amount.toLocaleString()} added to your wallet!`)
          setPolling(false)
          setTimeout(() => setSuccessMsg(''), 5000)
        }
      } catch { /* keep polling */ }
      if (attempts >= POLL_MAX) {
        clearInterval(interval)
        setPolling(false)
        // Refresh anyway in case the webhook was just slow
        fetchWallet()
      }
    }, POLL_INTERVAL)
  }, [fetchWallet])

  // On mount: fetch wallet data; if returning from Flutterwave, start polling
  useEffect(() => {
    fetchWallet()
    const params = new URLSearchParams(location.search)
    const pendingRef = sessionStorage.getItem('fm_pending_ref')
    if (params.get('funded') === '1' && pendingRef) {
      pollPaymentStatus(pendingRef)
    }
  }, [fetchWallet, location.search, pollPaymentStatus])

  function sanitize(val) { return val.replace(/[^0-9]/g, '') }

  async function handleFund(e) {
    e.preventDefault()
    const num = parseInt(amount, 10)
    if (!num || num < 100) { setFundError('Minimum top-up is ₦100'); return }
    setFunding(true)
    setFundError('')
    try {
      const res = await api.post('/wallet/fund', { amount: num })
      sessionStorage.setItem('fm_pending_ref', res.data.reference)
      window.location.href = res.data.paymentUrl
    } catch (err) {
      setFundError(err.data?.message || 'Could not initiate payment. Please try again.')
      setFunding(false)
    }
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
          {polling && <span style={{ fontSize: 12, color: MOSS, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Confirming payment…
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
            <Plus size={16} />{funding ? 'Opening…' : 'Add'}
          </button>
        </form>
        {fundError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px' }}>
            <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ color: '#ef4444', fontSize: 13 }}>{fundError}</span>
          </div>
        )}
      </div>

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
