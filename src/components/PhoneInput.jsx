import React, { useState, useRef, useEffect } from 'react'

export const COUNTRIES = [
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria',        dial: '+234' },
  { code: 'GH', flag: '🇬🇭', name: 'Ghana',          dial: '+233' },
  { code: 'KE', flag: '🇰🇪', name: 'Kenya',          dial: '+254' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa',   dial: '+27'  },
  { code: 'SN', flag: '🇸🇳', name: 'Senegal',        dial: '+221' },
  { code: 'CI', flag: '🇨🇮', name: "Côte d'Ivoire",  dial: '+225' },
  { code: 'ET', flag: '🇪🇹', name: 'Ethiopia',       dial: '+251' },
  { code: 'TZ', flag: '🇹🇿', name: 'Tanzania',       dial: '+255' },
  { code: 'UG', flag: '🇺🇬', name: 'Uganda',         dial: '+256' },
  { code: 'RW', flag: '🇷🇼', name: 'Rwanda',         dial: '+250' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44'  },
  { code: 'US', flag: '🇺🇸', name: 'United States',  dial: '+1'   },
]

/**
 * PhoneInput — styled country code selector + number input
 *
 * Props:
 *   value    {string}   — full number e.g. "+2348012345678"
 *   onChange {fn}       — called with full number string
 *   error    {boolean}  — highlights border red
 *   disabled {boolean}  — locks the field (used when pre-filled from OTP flow)
 *   focusColor {string} — border colour on focus (default '#ccff00')
 */
export default function PhoneInput({ value = '', onChange, error, disabled, focusColor = '#ccff00' }) {
  const initCountry = COUNTRIES.find(c => value?.startsWith(c.dial)) || COUNTRIES[0]
  const initLocal   = value ? value.replace(initCountry.dial, '').replace(/^0/, '') : ''

  const [country,  setCountry]  = useState(initCountry)
  const [localNum, setLocalNum] = useState(initLocal)
  const [open,     setOpen]     = useState(false)
  const [focused,  setFocused]  = useState(false)
  const [search,   setSearch]   = useState('')
  const dropRef = useRef()

  useEffect(() => {
    function onOut(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [])

  function pick(c) { setCountry(c); setOpen(false); setSearch(''); fire(c, localNum) }
  function fire(c, n) { onChange(n ? `${c.dial}${n.replace(/^0/, '')}` : '') }
  function onNumChange(e) {
    const v = e.target.value.replace(/[^\d\s\-()]/g, '')
    setLocalNum(v); fire(country, v)
  }

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  const borderColor = error ? '#ef4444' : focused || open ? focusColor : '#e0e0e0'

  return (
    <div style={{ position: 'relative' }} ref={dropRef}>
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10, background: disabled ? '#f5f5f5' : '#fff',
        overflow: 'hidden', transition: 'border-color 0.2s',
      }}>
        {/* Country selector trigger */}
        <button
          type="button"
          onClick={() => { if (!disabled) setOpen(o => !o) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '13px 10px 13px 14px',
            background: 'none', border: 'none',
            borderRight: `1.5px solid ${borderColor}`,
            cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
            fontFamily: 'inherit', userSelect: 'none',
            transition: 'border-color 0.2s',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{country.flag}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555', letterSpacing: '0.04em' }}>{country.code}</span>
          {!disabled && (
            <svg width="10" height="6" viewBox="0 0 10 6" style={{ color: '#aaa', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* Dial code */}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#444', padding: '0 8px 0 10px', flexShrink: 0, userSelect: 'none' }}>
          {country.dial}
        </span>

        {/* Divider */}
        <span style={{ width: 1, height: 20, background: '#e0e0e0', flexShrink: 0 }} />

        {/* Local number */}
        <input
          type="tel"
          value={localNum}
          onChange={onNumChange}
          placeholder="800 000 0000"
          disabled={disabled}
          autoComplete="tel-national"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, padding: '13px 10px 13px 10px', fontSize: 15,
            background: 'none', border: 'none', outline: 'none',
            color: '#1a1a1a', fontFamily: 'inherit',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />

        {/* Clear */}
        {localNum && !disabled && (
          <button type="button" onClick={() => { setLocalNum(''); onChange('') }}
            style={{ padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 15, lineHeight: 1, flexShrink: 0 }}
            aria-label="Clear phone number">✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999,
          background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 270, maxHeight: 270,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country…" autoFocus
              style={{
                width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 7,
                border: '1px solid #e0e0e0', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(c => (
              <button key={c.code} type="button" onClick={() => pick(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px',
                  background: c.code === country.code ? '#f5fff0' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
                onMouseLeave={e => { e.currentTarget.style.background = c.code === country.code ? '#f5fff0' : 'transparent' }}
              >
                <span style={{ fontSize: 20 }}>{c.flag}</span>
                <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>{c.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 16, margin: 0 }}>No results</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
