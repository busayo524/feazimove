import React, { useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { useAuth } from '../../context/AuthContext'
import { Wallet as WalletIcon, Plus, ArrowDownLeft, ArrowUpRight, CreditCard, Clock } from 'lucide-react'

const MOCK_TXN = [
  { id: 'x1', type: 'credit', label: 'Wallet top-up', amount: 5000, date: 'Today, 9:02 AM', method: 'Card •••• 4521' },
  { id: 'x2', type: 'debit',  label: 'Trip: Ikeja → VI', amount: 1800, date: 'Today, 9:14 AM', method: 'Wallet' },
  { id: 'x3', type: 'debit',  label: 'Package: Surulere → Lekki', amount: 2400, date: 'Yesterday, 2:30 PM', method: 'Wallet' },
  { id: 'x4', type: 'credit', label: 'Wallet top-up', amount: 10000, date: 'Jun 8, 10:00 AM', method: 'Bank Transfer' },
  { id: 'x5', type: 'debit',  label: 'Trip: Ikeja GRA → Eko Hotel', amount: 2100, date: 'Jun 8, 6:15 PM', method: 'Wallet' },
]

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000]

function TxnRow({ txn }) {
  const isCredit = txn.type === 'credit'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: isCredit ? 'rgba(204,255,0,0.10)' : 'rgba(248,113,113,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isCredit ? <ArrowDownLeft size={18} color={'#ccff00'} /> : <ArrowUpRight size={18} color={'#f87171'} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#ffffff', fontWeight: 600, fontSize: 14 }}>{txn.label}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{txn.date}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{txn.method}</span>
        </div>
      </div>
      <p style={{ fontWeight: 800, fontSize: 15, color: isCredit ? '#ccff00' : '#f87171', flexShrink: 0 }}>
        {isCredit ? '+' : '-'}₦{txn.amount.toLocaleString()}
      </p>
    </div>
  )
}

export default function Wallet() {
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [funding, setFunding] = useState(false)
  const [success, setSuccess] = useState(false)

  const balance = user?.walletBalance ?? 4700

  function sanitize(val) { return val.replace(/[^0-9]/g, '') }

  function handleFund(e) {
    e.preventDefault()
    const num = parseInt(amount, 10)
    if (!num || num < 100 || num > 500000) return
    setFunding(true)
    // Redirect to Flutterwave (in production use real API)
    setTimeout(() => {
      setFunding(false)
      setSuccess(true)
      setAmount('')
    }, 1800)
  }

  return (
    <AppLayout title="My Wallet">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Balance card */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', border: '1px solid rgba(204,255,0,0.20)', borderRadius: 24, padding: '32px 28px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(204,255,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WalletIcon size={18} color={'#ccff00'} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 14 }}>FeaziMove Wallet</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Available Balance</p>
          <p style={{ color: '#ccff00', fontWeight: 900, fontSize: 'clamp(2.2rem,6vw,3rem)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            ₦{balance.toLocaleString()}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12 }}>
            Use your balance to pay for rides and deliveries instantly.
          </p>
        </div>

        {/* Fund wallet */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: '#ffffff', fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Top Up Wallet</h3>

          {success && (
            <div style={{ background: 'rgba(204,255,0,0.10)', border: '1px solid rgba(204,255,0,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#ccff00', fontSize: 14, fontWeight: 600 }}>
              ✓ Payment successful! Your balance has been updated.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {QUICK_AMOUNTS.map(q => (
              <button key={q} onClick={() => { setAmount(String(q)); setSuccess(false) }} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: amount === String(q) ? '#ccff00' : 'rgba(255,255,255,0.07)', color: amount === String(q) ? '#000000' : 'rgba(255,255,255,0.6)' }}>
                ₦{q.toLocaleString()}
              </button>
            ))}
          </div>

          <form onSubmit={handleFund} style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 700 }}>₦</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={e => { setAmount(sanitize(e.target.value)); setSuccess(false) }}
                placeholder="Enter amount"
                maxLength={7}
                style={{ width: '100%', paddingLeft: 32, paddingRight: 16, paddingTop: 13, paddingBottom: 13, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.10)', color: '#ffffff', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(204,255,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'}
              />
            </div>
            <button
              type="submit"
              disabled={funding || !amount || parseInt(amount) < 100}
              style={{ padding: '13px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: (funding || !amount || parseInt(amount) < 100) ? 'not-allowed' : 'pointer', border: 'none', transition: 'all 0.18s', background: (funding || !amount || parseInt(amount) < 100) ? 'rgba(204,255,0,0.3)' : '#ccff00', color: '#000000', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              {funding ? (
                <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              ) : <Plus size={16} />}
              Fund
            </button>
          </form>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 10 }}>Powered by Flutterwave. Min ₦100, Max ₦500,000.</p>
        </div>

        {/* Transaction history */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Clock size={16} color={'rgba(255,255,255,0.4)'} />
            <h3 style={{ color: '#ffffff', fontWeight: 800, fontSize: 16 }}>Recent Transactions</h3>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 16 }}>Last 5 transactions</p>
          {MOCK_TXN.map(txn => <TxnRow key={txn.id} txn={txn} />)}
        </div>

      </div>
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
    </AppLayout>
  )
}
