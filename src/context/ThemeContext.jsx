import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'fm_theme'
export const THEME_CHOICES = ['light', 'dark', 'system']

// What the user picked ('system' included) vs what is actually painted
// ('light' | 'dark'). Everything visual keys off the resolved value; only the
// Appearance screen cares which of the three is selected.
function readChoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (THEME_CHOICES.includes(saved)) return saved
    return 'dark' // long-standing default for anyone with nothing stored
  } catch { return 'dark' }
}

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
}

function resolve(choice) {
  return choice === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : choice
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(readChoice)
  const [resolved, setResolved] = useState(() => resolve(readChoice()))

  // Paint the resolved theme and remember the CHOICE, so 'system' survives a
  // reload as 'system' rather than freezing to whatever it resolved to once.
  useEffect(() => {
    const next = resolve(choice)
    setResolved(next)
    document.documentElement.setAttribute('data-theme', next)
    // Lets the browser style native UI (form controls, scrollbars) to match.
    document.documentElement.style.colorScheme = next
    try { localStorage.setItem(STORAGE_KEY, choice) } catch { /* private mode */ }
  }, [choice])

  // On 'system', follow the device live — a phone flipping to dark at sunset
  // should carry the app with it without a reload.
  useEffect(() => {
    if (choice !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = systemPrefersDark() ? 'dark' : 'light'
      setResolved(next)
      document.documentElement.setAttribute('data-theme', next)
      document.documentElement.style.colorScheme = next
    }
    // addEventListener is unsupported on older Safari, which still has addListener.
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [choice])

  const setTheme = useCallback(next => {
    if (THEME_CHOICES.includes(next)) setChoice(next)
  }, [])

  // Kept for the marketing navbar's existing light/dark switch. It flips what
  // is currently on screen, which also settles 'system' onto a fixed choice.
  const toggle = useCallback(() => {
    setChoice(c => (resolve(c) === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: choice, resolved, setTheme, toggle, isDark: resolved === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
