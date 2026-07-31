import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { initAnalytics } from './services/analytics.js'
import './index.css'

// After each deploy, a browser still running the previous build asks for
// lazy chunks whose hashed filenames no longer exist and crashes with
// "Failed to fetch dynamically imported module". One reload gets the new
// build — do it automatically (once, to avoid loops if it's a real outage).
window.addEventListener('vite:preloadError', event => {
  if (sessionStorage.getItem('fm_chunk_reload')) return // second failure — let it surface
  sessionStorage.setItem('fm_chunk_reload', '1')
  event.preventDefault()
  window.location.reload()
})
window.addEventListener('load', () => {
  // successful boot — clear the guard so the NEXT deploy can auto-recover too
  setTimeout(() => sessionStorage.removeItem('fm_chunk_reload'), 10000)
})

/* ── Keep every open tab on the newest deploy ─────────────────────────────────
   The service worker serves the app from its own cache, so a tab that was open
   before a deploy keeps running the OLD build — refreshing does not help,
   because the refresh is answered from that same cache. (An incognito window
   has no worker yet, which is why it always looked correct.)

   Two things are needed, and neither was happening:
     1. ASK whether a new build exists. Browsers only check on navigation, so a
        tab left open all day never finds out. We poll, and check again whenever
        the tab comes back to the foreground.
     2. RELOAD once the new worker takes over. It calls skipWaiting +
        clientsClaim so it controls the page immediately, but the page is still
        running the JavaScript it loaded earlier — only a reload swaps that.

   None of this touches the API or the database: sw.js is a static file, so the
   update check costs nothing in Neon compute. */
if ('serviceWorker' in navigator) {
  // Captured BEFORE registering: if the page started with no controller, the
  // first controllerchange is just this worker taking charge for the first
  // time — not a new version, so it must not trigger a reload.
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
      .then(reg => {
        const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
        // A minute is frequent enough that a launch-day fix reaches people
        // quickly, and cheap enough to be invisible — it is one static request.
        setInterval(check, 60_000)
        document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
        window.addEventListener('focus', check)
      })
      .catch(() => { /* no worker — the app still works, just without offline */ })
  })
}

initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
