import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import logoMark from '../assets/favicon.png'

export { logoMark as greenMark }

const fontSizes = { sm: 16, md: 22, lg: 28 }
const iconSizes = { sm: 30, md: 38, lg: 50 }

export default function Logo({ size = 'md', linkTo = '/', forceVariant }) {
  const { isDark } = useTheme()

  const s  = iconSizes[size]  ?? iconSizes.md
  const fs = fontSizes[size] ?? fontSizes.md

  const textColor =
    forceVariant === 'green' ? '#ffffff' :
    forceVariant === 'dark'  ? '#ffffff' :
    forceVariant === 'light' ? '#0a0a0a' :
    isDark ? '#ffffff' : '#0a0a0a'

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={logoMark}
        alt=""
        aria-hidden="true"
        style={{
          width: s, height: s,
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
      <span style={{
        fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
        fontSize: fs,
        fontStyle: 'normal',
        letterSpacing: '-0.01em',
        lineHeight: 1,
        color: textColor,
      }}>
        <span style={{ fontWeight: 500 }}>Feazi</span>
        <span style={{ fontWeight: 900 }}>Move</span>
      </span>
    </div>
  )

  if (!linkTo) return content

  return (
    <Link to={linkTo} aria-label="FeaziMove home"
      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
      {content}
    </Link>
  )
}
