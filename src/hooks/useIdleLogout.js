import { useEffect } from 'react'

// Auto-logout after 45 minutes without any user activity.
// Last-activity timestamp lives in localStorage so activity in one tab keeps
// every tab alive, and so a session can't be resumed by reopening the browser
// after sitting idle past the limit.
const IDLE_LIMIT_MS     = 45 * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 1000
const WRITE_THROTTLE_MS = 30 * 1000 // don't rewrite localStorage on every mousemove

export const ACTIVITY_KEY     = 'fm_last_activity'
export const IDLE_LOGOUT_FLAG = 'fm_idle_logout' // sessionStorage — login page shows a notice

// True when the stored session already sat idle past the limit (e.g. the tab
// was closed 45+ minutes ago) — checked before restoring a session on load.
export function sessionIsStale() {
  const last = Number(localStorage.getItem(ACTIVITY_KEY))
  return !!last && Date.now() - last > IDLE_LIMIT_MS
}

export function useIdleLogout(user, logout) {
  useEffect(() => {
    if (!user) return

    let lastWrite = Date.now()
    localStorage.setItem(ACTIVITY_KEY, String(lastWrite))

    const recordActivity = () => {
      const now = Date.now()
      if (now - lastWrite < WRITE_THROTTLE_MS) return
      lastWrite = now
      localStorage.setItem(ACTIVITY_KEY, String(now))
    }

    const expireIfIdle = () => {
      // Read the shared stamp, not the local one — another tab may be active
      const last = Number(localStorage.getItem(ACTIVITY_KEY)) || lastWrite
      if (Date.now() - last > IDLE_LIMIT_MS) {
        sessionStorage.setItem(IDLE_LOGOUT_FLAG, '1')
        logout()
      }
    }

    // capture: true so scrolls inside nested scrollable panes count too
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, recordActivity, { passive: true, capture: true }))
    const interval = setInterval(expireIfIdle, CHECK_INTERVAL_MS)
    // A backgrounded tab's timers are throttled — re-check the moment it's visible again
    document.addEventListener('visibilitychange', expireIfIdle)

    return () => {
      events.forEach(e => window.removeEventListener(e, recordActivity, { capture: true }))
      clearInterval(interval)
      document.removeEventListener('visibilitychange', expireIfIdle)
    }
  }, [user, logout])
}
