import { useEffect } from 'react'

// Auto-logout after a period without any user activity — 2 hours for riders
// and drivers, 45 minutes for admin (payouts, pricing and user management
// live there, so an unattended admin tab expires sooner).
// Last-activity timestamp lives in localStorage so activity in one tab keeps
// every tab alive, and so a session can't be resumed by reopening the browser
// after sitting idle past the limit.
const IDLE_LIMIT_MS       = 2 * 60 * 60 * 1000
const ADMIN_IDLE_LIMIT_MS = 45 * 60 * 1000
const CHECK_INTERVAL_MS   = 60 * 1000
const WRITE_THROTTLE_MS   = 30 * 1000 // don't rewrite localStorage on every mousemove

export const ACTIVITY_KEY     = 'fm_last_activity'
export const IDLE_LOGOUT_FLAG = 'fm_idle_logout' // sessionStorage — login page shows a notice

const limitForRole = role => (role === 'admin' ? ADMIN_IDLE_LIMIT_MS : IDLE_LIMIT_MS)

// True when the stored session already sat idle past the limit (e.g. the tab
// was closed hours ago) — checked before restoring a session on load. The
// user isn't loaded yet at that point, so the role comes from the stored copy.
export function sessionIsStale() {
  const last = Number(localStorage.getItem(ACTIVITY_KEY))
  let role = null
  try { role = JSON.parse(localStorage.getItem('fm_user') || 'null')?.role } catch { /* corrupted copy — use default limit */ }
  return !!last && Date.now() - last > limitForRole(role)
}

export function useIdleLogout(user, logout) {
  useEffect(() => {
    if (!user) return
    const idleLimit = limitForRole(user.role)

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
      if (Date.now() - last > idleLimit) {
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
