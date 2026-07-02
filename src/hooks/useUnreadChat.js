import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

// Tracks whether a ride's chat has a message from the other party that this
// user hasn't opened the chat to see yet. There's no server-side read-receipt
// table, so "seen" is tracked client-side per ride in localStorage.
export function useUnreadChat(rideId) {
  const [hasUnread, setHasUnread] = useState(false)
  const latestOtherIdRef = useRef(null)

  useEffect(() => {
    if (!rideId) return
    let cancelled = false
    function check() {
      api.get(`/rides/${rideId}/messages`).then(res => {
        if (cancelled) return
        const messages = res.data.messages || []
        const lastFromOther = [...messages].reverse().find(m => !m.mine)
        if (!lastFromOther) return
        latestOtherIdRef.current = lastFromOther.id
        const seenId = localStorage.getItem(`fm_chat_seen_${rideId}`)
        setHasUnread(seenId !== lastFromOther.id)
      }).catch(() => {})
    }
    check()
    const id = setInterval(check, 8000)
    return () => { cancelled = true; clearInterval(id) }
  }, [rideId])

  const markSeen = useCallback(() => {
    if (latestOtherIdRef.current) {
      localStorage.setItem(`fm_chat_seen_${rideId}`, latestOtherIdRef.current)
    }
    setHasUnread(false)
  }, [rideId])

  return { hasUnread, markSeen }
}
