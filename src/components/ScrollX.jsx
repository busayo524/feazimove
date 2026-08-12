import React, { useRef, useState, useEffect, useCallback } from 'react'
import { BORDER, MOSS, CHIP } from '../theme/palette'

/**
 * Horizontal scroller with a scrollbar you can actually see and drag.
 *
 * WHY NOT JUST CSS: iOS Safari ignores ::-webkit-scrollbar entirely and hides
 * the native overlay bar until a scroll is already in progress. So on a phone —
 * exactly where the admin tables overflow — there was no sign the content
 * continued past the edge, and nothing to grab. This renders the bar as real
 * DOM instead, so it is visible at rest and works the same on every browser.
 *
 * It disappears on its own when the content fits, so wrapping something that
 * does not overflow costs nothing visually.
 */
export default function ScrollX({ children, style, className = '' }) {
  const boxRef = useRef(null)
  const [state, setState] = useState({ overflowing: false, ratio: 1, pos: 0 })
  const drag = useRef(null)

  const measure = useCallback(() => {
    const el = boxRef.current
    if (!el) return
    const { scrollWidth, clientWidth, scrollLeft } = el
    const overflowing = scrollWidth - clientWidth > 2
    const ratio = overflowing ? clientWidth / scrollWidth : 1
    const max = scrollWidth - clientWidth
    setState({ overflowing, ratio, pos: max > 0 ? scrollLeft / max : 0 })
  }, [])

  useEffect(() => {
    measure()
    const el = boxRef.current
    if (!el) return
    el.addEventListener('scroll', measure, { passive: true })
    // Content can arrive after the first paint (a table waiting on its fetch),
    // and the box resizes on rotate — both change whether the bar is needed.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, children])

  // Dragging the thumb maps 1:1 onto the track, so the content follows the finger.
  useEffect(() => {
    function move(e) {
      const d = drag.current
      if (!d) return
      const x = (e.touches ? e.touches[0].clientX : e.clientX)
      const trackFree = d.trackW * (1 - state.ratio)
      if (trackFree <= 0) return
      const next = Math.min(1, Math.max(0, d.startPos + (x - d.startX) / trackFree))
      const el = boxRef.current
      el.scrollLeft = next * (el.scrollWidth - el.clientWidth)
    }
    function up() { drag.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [state.ratio])

  function startDrag(e) {
    const track = e.currentTarget
    drag.current = {
      startX: e.touches ? e.touches[0].clientX : e.clientX,
      startPos: state.pos,
      trackW: track.getBoundingClientRect().width,
    }
  }

  const thumbPct = Math.max(state.ratio * 100, 12)   // never a dot you can't grab
  const leftPct = state.pos * (100 - thumbPct)

  return (
    <div style={style}>
      <div ref={boxRef} className={`fm-hide-native-scrollbar ${className}`}
        style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain' }}>
        {children}
      </div>
      {state.overflowing && (
        <div onMouseDown={startDrag} onTouchStart={startDrag}
          role="scrollbar" aria-orientation="horizontal" aria-label="Scroll content sideways"
          style={{ position: 'relative', height: 10, marginTop: 8, borderRadius: 999,
            background: CHIP, border: `1px solid ${BORDER}`, cursor: 'grab', touchAction: 'none' }}>
          <div style={{ position: 'absolute', top: 1, bottom: 1, left: `${leftPct}%`,
            width: `${thumbPct}%`, borderRadius: 999, background: MOSS, opacity: 0.85 }}/>
        </div>
      )}
    </div>
  )
}
