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

initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
