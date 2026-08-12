import React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { MUTED } from '../theme/palette'

const KEY = 'fm_hide_balance'

/**
 * Wallet balance with a show/hide toggle.
 *
 * The preference is deliberately remembered across sessions and shared by every
 * place a balance appears — hiding it on the wallet page and then having the
 * header shout the number would defeat the point of hiding it. Riders and
 * drivers both use this.
 */
export function useHiddenBalance() {
  const [hidden, setHidden] = React.useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  // Keep every mounted copy in step, including across tabs.
  React.useEffect(() => {
    const sync = () => {
      try { setHidden(localStorage.getItem(KEY) === '1') } catch { /* private mode */ }
    }
    window.addEventListener('storage', sync)
    window.addEventListener('fm-balance-visibility', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('fm-balance-visibility', sync)
    }
  }, [])
  const toggle = React.useCallback(() => {
    setHidden(h => {
      const next = !h
      try { localStorage.setItem(KEY, next ? '1' : '0') } catch { /* private mode */ }
      window.dispatchEvent(new Event('fm-balance-visibility'))
      return next
    })
  }, [])
  return [hidden, toggle]
}

// The masked form keeps roughly the shape of a number so the layout does not
// jump when it is toggled.
export function maskAmount() { return '••••••' }

export function EyeToggle({ hidden, onToggle, size = 18, color = MUTED, style }) {
  const Icon = hidden ? EyeOff : Eye
  return (
    <button type="button" onClick={onToggle}
      aria-label={hidden ? 'Show balance' : 'Hide balance'}
      title={hidden ? 'Show balance' : 'Hide balance'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color, lineHeight: 0, ...style }}>
      <Icon size={size}/>
    </button>
  )
}
