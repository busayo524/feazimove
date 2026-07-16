import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { ShieldCheck, X, AlertCircle } from 'lucide-react'

const NEON = '#ccff00', OLIVE = '#243800', CARD = '#ffffff', BORDER = '#e9ecef', TEXT = '#1a2800', MUTED = '#4C6900'

/**
 * Step-up 2FA modal. Requests an emailed code for `purpose` on mount, collects
 * the 6-digit code, then calls onVerify(challengeId, code) — which should run
 * the real action and THROW on failure (so this modal shows the error and stays
 * open) or resolve on success (the parent then unmounts this modal).
 */
export default function StepUpModal({ purpose, title = 'Confirm it’s you', actionText, onVerify, onClose }) {
  const [challengeId, setChallengeId] = useState(null)
  const [masked, setMasked] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(true)
  const [sendError, setSendError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function requestCode() {
    setSending(true); setSendError(''); setError(''); setCode('')
    try {
      const res = await api.post('/auth/request-action-code', { purpose })
      setChallengeId(res.data.challengeId)
      setMasked(res.data.maskedEmail || '')
    } catch (e) {
      setSendError(e.data?.message || 'Could not send a code. Please try again.')
    } finally { setSending(false) }
  }
  useEffect(() => { requestCode() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault()
    if (busy || !challengeId || code.length !== 6) return
    setBusy(true); setError('')
    try {
      await onVerify(challengeId, code)
      // success → parent unmounts this modal
    } catch (err) {
      setError(err.data?.message || 'Verification failed. Please try again.')
    } finally { setBusy(false) }
  }

  const inp = { width: '100%', padding: '13px 14px', borderRadius: 10, border: `1.5px solid ${BORDER}`, fontSize: 22, letterSpacing: 8, textAlign: 'center', fontFamily: 'inherit', background: CARD, color: TEXT, boxSizing: 'border-box', colorScheme: 'light' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: CARD, borderRadius: 20, padding: 26, maxWidth: 380, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: NEON, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={18} color={OLIVE} />
            </span>
            <p style={{ fontWeight: 800, fontSize: 16, color: TEXT }}>{title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}><X size={18} /></button>
        </div>

        {sending ? (
          <p style={{ fontSize: 13.5, color: MUTED, padding: '18px 0', textAlign: 'center' }}>Sending a code to your email…</p>
        ) : sendError ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: 13.5, color: '#ef4444', marginBottom: 14 }}>{sendError}</p>
            <button onClick={requestCode} style={{ padding: '10px 22px', borderRadius: 50, background: NEON, color: OLIVE, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: '2px 0 16px' }}>
              For your security, we emailed a 6-digit code to <strong style={{ color: TEXT }}>{masked}</strong>
              {actionText ? ` to confirm you want to ${actionText}.` : '.'} Enter it below.
            </p>
            <input value={code} inputMode="numeric" maxLength={6} autoFocus placeholder="000000"
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))} style={inp} />
            {error && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, margin: '12px 0 0' }}>
                <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
              </div>
            )}
            <button type="submit" disabled={busy || code.length !== 6}
              style={{ width: '100%', marginTop: 16, padding: '13px', borderRadius: 50, background: (busy || code.length !== 6) ? BORDER : NEON, color: (busy || code.length !== 6) ? MUTED : OLIVE, fontWeight: 800, fontSize: 15, border: 'none', cursor: (busy || code.length !== 6) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {busy ? 'Verifying…' : 'Confirm'}
            </button>
            <button type="button" onClick={requestCode} disabled={busy}
              style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 50, background: 'transparent', color: MUTED, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
