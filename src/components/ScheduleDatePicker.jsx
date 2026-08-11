import { CARD, BORDER, TEXT, MUTED, BG, ACCENT as OLIVE, MOSS, NEON, ON_NEON } from '../theme/palette'
import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { usePanelPlacement } from './RouteDropdowns'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

// Rides can only be scheduled inside the coming week — today plus the next six
// days. The backend enforces the same window; this just makes it impossible to
// pick a day it would reject.
export const SCHEDULE_DAYS = 7

const WEEKDAYS = ['S','M','T','W','T','F','S']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

// yyyy-mm-dd for a Date, in the device's own timezone — never toISOString(),
// which converts to UTC and can hand back yesterday for a Nigerian evening.
export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO() {
  return toISODate(new Date())
}

// The selectable window as ISO strings, earliest first.
export function scheduleWindow(days = SCHEDULE_DAYS) {
  const out = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    out.push(toISODate(d))
  }
  return out
}

// 'Today', 'Tomorrow', or 'Fri 14 Aug' — how a scheduled day is named in the UI.
export function formatScheduleDate(iso, { long = false } = {}) {
  if (!iso) return ''
  const window = scheduleWindow(2)
  if (iso === window[0]) return 'Today'
  if (iso === window[1]) return 'Tomorrow'
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-NG', {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  })
}

// Calendar month grid, with everything outside the booking window disabled.
function MonthGrid({ monthDate, value, allowed, onPick }) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 }}>
      {WEEKDAYS.map((w, i) => (
        <div key={`w${i}`} style={{ textAlign:'center', fontSize:10, fontWeight:800, color:MUTED,
          textTransform:'uppercase', paddingBottom:4 }}>{w}</div>
      ))}
      {cells.map((day, i) => {
        if (day === null) return <div key={`e${i}`}/>
        const iso = toISODate(new Date(year, month, day))
        const selectable = allowed.includes(iso)
        const selected = value === iso
        return (
          <button key={iso} type="button" disabled={!selectable}
            onClick={() => onPick(iso)}
            aria-label={formatScheduleDate(iso, { long:true })}
            aria-current={selected ? 'date' : undefined}
            style={{
              aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center',
              borderRadius:9, fontFamily:'inherit', fontSize:13,
              fontWeight: selected ? 800 : selectable ? 700 : 400,
              border: selected ? `1.5px solid ${OLIVE}` : selectable ? `1.5px solid ${BORDER}` : '1.5px solid transparent',
              background: selected ? NEON : selectable ? CARD : 'transparent',
              color:selected ? ON_NEON : selectable ? TEXT : '#aab0b7',
              cursor: selectable ? 'pointer' : 'not-allowed',
              transition:'background 0.12s, border-color 0.12s',
            }}>
            {day}
          </button>
        )
      })}
    </div>
  )
}

export default function ScheduleDatePicker({ label = 'Ride Date', value, onChange, days = SCHEDULE_DAYS }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { openUpward, maxHeight } = usePanelPlacement(open, ref)

  const allowed = scheduleWindow(days)
  const firstDay = allowed[0]
  const lastDay = allowed[allowed.length - 1]

  // The window spans at most two calendar months, so paging is limited to those.
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = (value || firstDay).split('-').map(Number)
    return new Date(y, m - 1, 1)
  })

  const monthStartOf = iso => { const [y, m] = iso.split('-').map(Number); return new Date(y, m - 1, 1) }
  const minMonth = monthStartOf(firstDay)
  const maxMonth = monthStartOf(lastDay)
  const canGoBack    = viewMonth > minMonth
  const canGoForward = viewMonth < maxMonth

  useEffect(() => {
    function handleClick(e){ if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // A stale selection (the app left open overnight, so "today" moved on) can't
  // be submitted — clear it rather than letting the server reject the booking.
  useEffect(() => {
    if (value && !allowed.includes(value)) onChange('')
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:TEXT, marginBottom:6 }}>{label}</label>
      <div ref={ref} style={{ position:'relative' }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{
            width:'100%', padding:'13px 16px', paddingLeft:42, paddingRight:40,
            borderRadius:10, fontSize:15,
            border:`1.5px solid ${open ? MOSS : BORDER}`,
            background:CARD, color:value ? TEXT : MUTED,
            fontFamily:'inherit', boxSizing:'border-box',
            textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center',
            transition:'border-color 0.15s', outline:'none',
          }}>
          <Calendar size={15} style={{ position:'absolute', left:14, color:open ? MOSS : MUTED, transition:'color 0.15s' }}/>
          <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {value ? formatScheduleDate(value, { long:true }) : 'Pick a day this week'}
          </span>
          <ChevronDown size={15} style={{ position:'absolute', right:14, color:MUTED,
            transform:open ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.2s' }}/>
        </button>

        {open && (
          <div style={{
            position:'absolute',
            ...(openUpward ? { bottom:'calc(100% + 6px)' } : { top:'calc(100% + 6px)' }),
            left:0, right:0, zIndex:150,
            // The trigger is a full-width form field, but the panel must NOT be:
            // its day cells are square, so a container-wide panel on desktop
            // gives ~230px cells and a calendar taller than the screen.
            maxWidth:340,
            background:CARD, border:`1.5px solid ${BORDER}`, borderRadius:12,
            boxShadow:'0 8px 24px rgba(36,56,0,0.14)',
            // 472px is the calendar's natural height at this width — anything
            // less puts a scrollbar over a grid that has nothing to scroll to.
            padding:12, maxHeight:Math.max(maxHeight, 480), overflowY:'auto',
          }}>
            {/* Month header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button type="button" onClick={() => canGoBack && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                disabled={!canGoBack} aria-label="Previous month"
                style={{ width:28, height:28, borderRadius:8, border:`1px solid ${BORDER}`, background:CARD,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:canGoBack ? 'pointer' : 'not-allowed', opacity:canGoBack ? 1 : 0.35 }}>
                <ChevronLeft size={14} color={OLIVE}/>
              </button>
              <p style={{ fontSize:13, fontWeight:800, color:TEXT }}>
                {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </p>
              <button type="button" onClick={() => canGoForward && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                disabled={!canGoForward} aria-label="Next month"
                style={{ width:28, height:28, borderRadius:8, border:`1px solid ${BORDER}`, background:CARD,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:canGoForward ? 'pointer' : 'not-allowed', opacity:canGoForward ? 1 : 0.35 }}>
                <ChevronRight size={14} color={OLIVE}/>
              </button>
            </div>

            <MonthGrid monthDate={viewMonth} value={value} allowed={allowed}
              onPick={iso => { onChange(iso); setOpen(false) }}/>

            {/* Quick picks — most schedules are today or tomorrow, and this also
                makes the seven open days obvious at a glance. */}
            <div style={{ display:'flex', gap:6, overflowX:'auto', marginTop:10, paddingTop:10,
              borderTop:`1px solid ${BORDER}` }}>
              {allowed.map(iso => (
                <button key={iso} type="button" onClick={() => { onChange(iso); setOpen(false) }}
                  style={{ flexShrink:0, padding:'6px 10px', borderRadius:50, fontSize:11.5, fontWeight:700,
                    fontFamily:'inherit', cursor:'pointer',
                    border:`1.5px solid ${value === iso ? OLIVE : BORDER}`,
                    background:value === iso ? NEON : BG,
                    color:value === iso ? ON_NEON : MUTED,
                    display:'flex', alignItems:'center', gap:4 }}>
                  {value === iso && <Check size={11}/>}
                  {formatScheduleDate(iso)}
                </button>
              ))}
            </div>
            <p style={{ fontSize:11, color:MUTED, marginTop:8, textAlign:'center' }}>
              Rides can be scheduled up to a week ahead.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
