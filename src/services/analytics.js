/**
 * Mixpanel analytics — thin, fail-safe wrapper.
 * Every call is a silent no-op if the token is missing or Mixpanel is
 * unreachable, so analytics can never break the app itself.
 */
import mixpanel from 'mixpanel-browser'

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN
let ready = false

export function initAnalytics() {
  if (!TOKEN || ready) return
  try {
    mixpanel.init(TOKEN, {
      autocapture: true,                 // clicks, form submits, page views — for free
      track_pageview: 'url-with-path',   // SPA route changes count as page views
      persistence: 'localStorage',
    })
    ready = true

    // pwa_installed profile flag — running in standalone mode means the app
    // was launched from the home screen; 'appinstalled' fires at install time
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
      if (standalone) mixpanel.people.set({ pwa_installed: true })
      window.addEventListener('appinstalled', () => {
        try {
          mixpanel.track('pwa_installed')
          mixpanel.people.set({ pwa_installed: true })
        } catch { /* ignore */ }
      })
    } catch { /* ignore */ }
  } catch { /* analytics must never break the app */ }
}

export function track(event, props) {
  if (!ready) return
  try { mixpanel.track(event, props) } catch { /* ignore */ }
}

// Tie events to the logged-in account (role makes rider/driver/admin filterable)
export function identifyUser(user) {
  if (!ready || !user?.id) return
  try {
    mixpanel.identify(user.id)
    mixpanel.people.set({
      $name: user.name,
      role: user.activeRole || user.role,
      city: user.city || undefined,
    })
  } catch { /* ignore */ }
}

export function resetAnalytics() {
  if (!ready) return
  try { mixpanel.reset() } catch { /* ignore */ }
}
