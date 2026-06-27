import React, { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { api } from '../services/api'

const NEON='#ccff00', NT='#0a0a0a'
const CARD='#ffffff', BORDER='#e8eaed', TEXT='#111827', MUTED='#6b7280', BG='#f5f7fa'

// In-ride chat between the rider and driver of a single ride.
// Used by both the driver's Active Ride screen and the rider's Track Ride screen.
export default function ChatModal({ rideId, title, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  async function load() {
    try {
      const res = await api.get(`/rides/${rideId}/messages`)
      setMessages(res.data.messages || [])
    } catch { /* keep last known messages on transient failure */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 6000)
    return () => clearInterval(id)
  }, [rideId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText('')
    try {
      const res = await api.post(`/rides/${rideId}/messages`, { body })
      setMessages(m => [...m, res.data.message])
    } catch { setText(body) /* restore on failure so nothing is lost */ }
    finally { setSending(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:CARD, width:'100%', maxWidth:480, height:'70vh', borderRadius:'20px 20px 0 0', display:'flex', flexDirection:'column', boxShadow:'0 -8px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${BORDER}` }}>
          <p style={{ fontWeight:700, fontSize:15, color:TEXT }}>{title}</p>
          <button onClick={onClose} aria-label="Close chat" style={{ background:'none', border:'none', cursor:'pointer', color:MUTED, padding:4 }}>
            <X size={20}/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
          {loading && <p style={{ textAlign:'center', color:MUTED, fontSize:13 }}>Loading messages…</p>}
          {!loading && messages.length === 0 && (
            <p style={{ textAlign:'center', color:MUTED, fontSize:13, marginTop:20 }}>No messages yet — say hello!</p>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ display:'flex', justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth:'75%', padding:'9px 14px', borderRadius:14, fontSize:14,
                background: m.mine ? NT : BG, color: m.mine ? NEON : TEXT,
              }}>
                <p style={{ margin:0, wordBreak:'break-word' }}>{m.body}</p>
                <p style={{ margin:'3px 0 0', fontSize:10, opacity:0.6 }}>{m.time}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
        <div style={{ display:'flex', gap:8, padding:'12px 16px', borderTop:`1px solid ${BORDER}` }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Type a message…"
            style={{ flex:1, padding:'11px 14px', borderRadius:50, border:`1.5px solid ${BORDER}`, fontSize:14, outline:'none', fontFamily:'inherit' }}
          />
          <button onClick={send} disabled={!text.trim() || sending} aria-label="Send"
            style={{ width:42, height:42, borderRadius:'50%', border:'none', background: text.trim() ? NT : BORDER, color:NEON, display:'flex', alignItems:'center', justifyContent:'center', cursor: text.trim() ? 'pointer' : 'not-allowed', flexShrink:0 }}>
            <Send size={16}/>
          </button>
        </div>
      </div>
    </div>
  )
}
