// Loads Mapbox GL JS + CSS from CDN exactly once, however many components need it.
// A failed previous attempt is torn down and re-created so calling this again
// (e.g. from a "Retry" button) actually retries instead of polling forever.
let pendingLoad = null

export function loadMapbox() {
  if (window.mapboxgl) return Promise.resolve()
  if (pendingLoad) return pendingLoad

  pendingLoad = new Promise((resolve, reject) => {
    if (!document.getElementById('mapbox-gl-css')) {
      const link = document.createElement('link')
      link.id = 'mapbox-gl-css'
      link.rel = 'stylesheet'
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css'
      document.head.appendChild(link)
    }

    document.getElementById('mapbox-gl-js')?.remove()

    const script = document.createElement('script')
    script.id = 'mapbox-gl-js'
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js'
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  }).finally(() => { pendingLoad = null })

  return pendingLoad
}
