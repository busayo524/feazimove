/**
 * Mixpanel analytics — thin, fail-safe wrapper.
 * Every call is a silent no-op if the token is missing or Mixpanel is
 * unreachable, so analytics can never break the app itself.
 *
 * The SDK is loaded as its own lazy chunk AFTER the page becomes interactive
 * — it's ~50KB of gzip that has no business delaying first paint. Calls made
 * before it arrives are queued and flushed once it's ready.
 */
const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN
let mixpanel = null
let ready = false
const queue = [] // [fnName, args] recorded before the SDK arrives

function flushQueue() {
  while (queue.length) {
    const [fn, args] = queue.shift()
    try { RUNNERS[fn](...args) } catch { /* ignore */ }
  }
}

const RUNNERS = {
  track: (event, props) => mixpanel.track(event, props),
  identifyUser: (user) => {
    mixpanel.identify(user.id)
    mixpanel.people.set({
      $name: user.name,
      role: user.activeRole || user.role,
      city: user.city || undefined,
    })
  },
  resetAnalytics: () => mixpanel.reset(),
}

export function initAnalytics() {
  if (!TOKEN || ready || mixpanel) return
  import('mixpanel-browser').then(mod => {
    try {
      mixpanel = mod.default
      mixpanel.init(TOKEN, {
        autocapture: true,                 // clicks, form submits, page views — for free
        track_pageview: 'url-with-path',   // SPA route changes count as page views
        persistence: 'localStorage',
      })
      ready = true
      flushQueue()

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
  }).catch(() => { /* offline / blocked — analytics stays a no-op */ })
}

function call(fn, ...args) {
  if (ready) {
    try { RUNNERS[fn](...args) } catch { /* ignore */ }
  } else if (TOKEN) {
    queue.push([fn, args])
    if (queue.length > 100) queue.shift() // never grow unbounded
  }
}

export function track(event, props) { call('track', event, props) }

// Tie events to the logged-in account (role makes rider/driver/admin filterable)
export function identifyUser(user) {
  if (!user?.id) return
  call('identifyUser', user)
}

export function resetAnalytics() { call('resetAnalytics') }
