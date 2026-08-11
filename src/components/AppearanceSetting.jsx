import React from 'react'
import { Sun, Moon, Smartphone } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { CARD, BORDER, TEXT, MUTED, BG, MOSS, NEON, ON_NEON, ACCENT, CHIP, SHADOW } from '../theme/palette'

/**
 * Light / Dark / System default.
 *
 * Shared by the rider-and-driver profile and the admin settings page, so the
 * three options can never drift apart between them.
 *
 * 'System default' follows the device's own setting and keeps following it, so
 * the subtitle names what that currently resolves to — "System default" on its
 * own tells you nothing about what you are about to get.
 */
export default function AppearanceSetting({ surface = CARD, border = BORDER, text = TEXT, muted = MUTED }) {
  const { theme, resolved, setTheme } = useTheme()

  const OPTIONS = [
    { key: 'light',  icon: <Sun size={17}/>,        label: 'Light',
      sub: 'Bright background, dark text' },
    { key: 'dark',   icon: <Moon size={17}/>,       label: 'Dark',
      sub: 'Easier on the eyes and saves battery' },
    { key: 'system', icon: <Smartphone size={17}/>, label: 'System default',
      sub: `Follows your device — currently ${resolved}` },
  ]

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16,
      overflow: 'hidden', marginBottom: 16, boxShadow: `0 2px 8px ${SHADOW}` }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: MOSS, textTransform: 'uppercase',
          letterSpacing: '0.06em' }}>Appearance</p>
      </div>
      {OPTIONS.map((o, i) => {
        const on = theme === o.key
        return (
          <button key={o.key} onClick={() => setTheme(o.key)} aria-pressed={on}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px',
              borderBottom: i < OPTIONS.length - 1 ? `1px solid ${border}` : 'none',
              background: surface, border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = BG}
            onMouseLeave={e => e.currentTarget.style.background = surface}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: on ? NEON : CHIP, color: on ? ON_NEON : MOSS }}>{o.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, color: text, fontWeight: on ? 800 : 600 }}>{o.label}</p>
              <p style={{ fontSize: 14, color: muted, marginTop: 1 }}>{o.sub}</p>
            </div>
            {/* Radio drawn rather than a real input, so it themes with everything else */}
            <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${on ? ACCENT : border}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'border-color 0.15s' }}>
              {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT }}/>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
