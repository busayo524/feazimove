import { NEON, ACCENT as OLIVE, MOSS, TEXT, MUTED, NEON_SOFT } from '../theme/palette'
import React, { useState } from 'react'
import { Copy, Check, RefreshCw, X } from 'lucide-react'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

export function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{ background:'none', border:'none', cursor:'pointer', color: copied ? '#15803d' : MOSS, padding:4, lineHeight:0 }}
      aria-label="Copy">
      {copied ? <Check size={15}/> : <Copy size={15}/>}
    </button>
  )
}

/* Bank-transfer instructions for a pending payment — the user transfers the
   EXACT amount to this temporary account; our webhook confirms it the moment
   the money lands. Used by the Wallet top-up card and the ride payment modal. */
export default function TransferDetails({ transfer, secondsLeft, onCancel, waitingLabel }) {
  const mins = Math.max(0, Math.floor(secondsLeft / 60))
  const secs = Math.max(0, secondsLeft % 60)
  return (
    <div style={{ background:NEON_SOFT, border:`1.5px solid ${NEON}`, borderRadius:14, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <p style={{ fontWeight:800, fontSize:15, color:OLIVE }}>Transfer to this account</p>
          {/* This number is good for ONE payment and dies with the countdown
              below. It carries the rider's own name, so it reads like an
              account they own — save it, transfer to it next week, and the
              money goes nowhere anyone can find. Say so where they are
              reading the number, not in a footnote. */}
          <p style={{ fontSize:14.5, color:MUTED, marginTop:2, lineHeight:1.4 }}>
            One-time payment account — it expires below. Don’t save it for later.
          </p>
        </div>
        {onCancel && (
          <button onClick={onCancel} aria-label="Dismiss" style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:2, flexShrink:0 }}><X size={15}/></button>
        )}
      </div>
      {[['Bank', transfer.bankName], ['Account Number', transfer.accountNumber, true], ['Account Name', transfer.accountName]].map(([label, value, copy]) => (
        <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(36,56,0,0.08)' }}>
          <span style={{ fontSize:15, color:MUTED, flexShrink:0 }}>{label}</span>
          <span style={{ display:'flex', alignItems:'center', gap:2, fontSize:15.5, fontWeight:700, color:TEXT, minWidth:0, textAlign:'right' }}>
            {value || '—'}{copy && value && <CopyBtn text={String(value)}/>}
          </span>
        </div>
      ))}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0' }}>
        <span style={{ fontSize:15, color:MUTED }}>Amount — transfer exactly</span>
        <span style={{ display:'flex', alignItems:'center', gap:2, fontSize:16, fontWeight:900, color:OLIVE }}>
          ₦{Number(transfer.amount).toLocaleString()}<CopyBtn text={String(transfer.amount)}/>
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
        <RefreshCw size={12} color={MOSS} style={{ animation:'spin 1.2s linear infinite' }}/>
        <p style={{ fontSize:15, color:MOSS, fontWeight:600 }}>
          {waitingLabel || 'Waiting for your transfer…'} {secondsLeft > 0 ? `· expires in ${mins}:${String(secs).padStart(2, '0')}` : '· expired'}
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
