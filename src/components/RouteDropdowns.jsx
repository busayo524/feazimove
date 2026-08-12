import { CARD, BORDER, TEXT, MUTED, BG, MOSS, ACCENT } from '../theme/palette'
import React, { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Clock } from 'lucide-react'

/* palette: themed tokens — see src/theme/palette.js */
/* palette: themed tokens — see src/theme/palette.js */

// Riders and drivers are matched on an EXACT time_slot string, so both sides
// must produce byte-identical labels — they share these constants rather than
// formatting times independently.
// 5-minute granularity. Every old 30-minute slot ('7:30 AM') is still a member
// of this list, so availability and bookings saved before the change stay valid.
function buildSlots(startHour24, endHour24, stepMinutes = 5) {
  const out = []
  for (let mins = startHour24 * 60; mins <= endHour24 * 60; mins += stepMinutes) {
    const h24 = Math.floor(mins / 60)
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12
    out.push(`${h12}:${String(mins % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`)
  }
  return out
}

export const MORNING_SLOTS = buildSlots(5, 10)   // 5:00 AM – 10:00 AM
export const EVENING_SLOTS = buildSlots(15, 22)  // 3:00 PM – 10:00 PM

// One list for the whole day. Riders and drivers pick AM/PM and then a TIME;
// nobody picks a "period" any more.
export const ALL_RIDE_SLOTS = [...MORNING_SLOTS, ...EVENING_SLOTS]

export const MERIDIEMS = ['AM', 'PM']

// The times offered for one half of the day. Empty is impossible for AM/PM
// here, but the filter keeps the two lists in sync with ALL_RIDE_SLOTS rather
// than restating the ranges anywhere else.
export function slotsForMeridiem(half) {
  return ALL_RIDE_SLOTS.filter(s => s.endsWith(half))
}

// Routes are still priced per morning/evening period, and rider↔driver matching
// still keys on it — so the period did not go away, it stopped being a question
// we ask. The two ranges never overlap (5–10 AM, 3–10 PM), so the chosen time
// always answers it on its own. Same rule SendPackage already uses.
export function periodForSlot(slot) {
  return String(slot).includes('PM') ? 'evening' : 'morning'
}

// Decides whether an open dropdown should drop down or flip upward, and how
// tall it can safely be, based on the trigger's actual position on screen —
// so the list never gets cut off or pushed past the viewport edge.
export function usePanelPlacement(open, triggerRef) {
  const [placement, setPlacement] = useState({ openUpward: false, maxHeight: 260 })

  useEffect(() => {
    if (!open || !triggerRef.current) return
    function measure() {
      const rect = triggerRef.current.getBoundingClientRect()
      const margin = 12
      const spaceBelow = window.innerHeight - rect.bottom - margin
      const spaceAbove = rect.top - margin
      const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow
      const maxHeight = Math.max(140, Math.min(280, (openUpward ? spaceAbove : spaceBelow)))
      setPlacement({ openUpward, maxHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return placement
}

// Pickup/drop-off picker sourced from GET /routes — shared by Book Ride and
// Move an Item so both use the exact same route structure.
export function LocationDropdown({ label, options, value, onChange, placeholder, forceUpward, compact = false }){
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { openUpward: autoUpward, maxHeight } = usePanelPlacement(open, ref)
  const openUpward = forceUpward || autoUpward

  useEffect(()=>{
    function handleClick(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return ()=> document.removeEventListener('mousedown', handleClick)
  },[])

  return(
    <div>
      <label style={{display:'block',fontSize:15,fontWeight:600,color:TEXT,marginBottom:6}}>{label}</label>
      <div ref={ref} style={{position:'relative'}}>
        <button type="button" onClick={()=>setOpen(o=>!o)}
          style={{
            width:'100%',padding:'13px 16px',
          paddingLeft:compact?32:42,paddingRight:compact?26:40,
            borderRadius:10,fontSize:16,
            border:`1.5px solid ${open?MOSS:BORDER}`,
            background:CARD,color:value?TEXT:MUTED,
            fontFamily:'inherit',boxSizing:'border-box',
            textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',
            transition:'border-color 0.15s',outline:'none',
          }}>
          <MapPin size={15} style={{position:'absolute',left:14,color:open?MOSS:MUTED,transition:'color 0.15s'}}/>
          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {value || placeholder}
          </span>
          <ChevronDown size={15} style={{position:'absolute',right:compact?8:14,color:MUTED,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}/>
        </button>

        {open&&(
          <div style={{
            position:'absolute',
            ...(openUpward ? { bottom:'calc(100% + 6px)' } : { top:'calc(100% + 6px)' }),
            left:0,right:0,zIndex:100,
            background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:12,
            boxShadow:'0 8px 24px rgba(36,56,0,0.12)',
            maxHeight,overflowY:'auto',
          }}>
            {options.map((opt,i)=>(
              <button key={opt} type="button"
                onClick={()=>{ onChange(opt); setOpen(false) }}
                style={{
                  width:'100%',padding:'12px 16px',
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:value===opt?BG:CARD,
                  borderBottom:i<options.length-1?`1px solid ${BORDER}`:'none',
                  border:'none',cursor:'pointer',textAlign:'left',
                  fontFamily:'inherit',fontSize:15.5,
                  color:value===opt?ACCENT:TEXT,fontWeight:value===opt?700:400,
                  transition:'background 0.1s',
                }}
                onMouseEnter={e=>{ if(value!==opt) e.currentTarget.style.background=BG }}
                onMouseLeave={e=>{ if(value!==opt) e.currentTarget.style.background=CARD }}>
                <span style={{display:'flex',alignItems:'center',gap:10}}>
                  <MapPin size={13} color={value===opt?MOSS:MUTED}/>
                  {opt}
                </span>
                {value===opt&&<Check size={14} color={MOSS}/>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Generic single-column picker. Used for the time slot and, with
// slots={MERIDIEMS}, for the AM/PM field that narrows it — the two are separate
// fields, so the panel here stays a plain list.
// `compact` trims the icon/chevron gutters. The full-width field can afford
// 42px+40px of them; the narrow AM/PM field beside it cannot — on a 390px phone
// that leaves about 8px for the label, which renders "AM" as "A".
export function TimeDropdown({ slots, value, onChange, placeholder = 'Select a time slot', icon, compact = false }){
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { openUpward, maxHeight } = usePanelPlacement(open, ref)

  const shown = slots

  useEffect(()=>{
    function handleClick(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return ()=> document.removeEventListener('mousedown', handleClick)
  },[])

  return(
    <div ref={ref} style={{position:'relative'}}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        style={{
          width:'100%',padding:'13px 16px',
          paddingLeft:compact?32:42,paddingRight:compact?26:40,
          borderRadius:10,fontSize:16,
          border:`1.5px solid ${open?MOSS:BORDER}`,
          background:CARD,color:value?TEXT:MUTED,
          fontFamily:'inherit',boxSizing:'border-box',
          textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',
          transition:'border-color 0.15s',outline:'none',
        }}>
        <span style={{position:'absolute',left:compact?10:14,display:'flex',color:open?MOSS:MUTED,transition:'color 0.15s'}}>
          {icon || <Clock size={15}/>}
        </span>
        <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value || placeholder}</span>
        <ChevronDown size={15} style={{position:'absolute',right:compact?8:14,color:MUTED,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}/>
      </button>

      {open&&(
        <div style={{
          position:'absolute',
          ...(openUpward ? { bottom:'calc(100% + 6px)' } : { top:'calc(100% + 6px)' }),
          left:0,right:0,zIndex:100,
          background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:12,
          boxShadow:'0 8px 24px rgba(36,56,0,0.12)',
          maxHeight,overflowY:'auto',
        }}>
          {shown.map((s,i)=>(
            <button key={s} type="button"
              onClick={()=>{ onChange(s); setOpen(false) }}
              style={{
                width:'100%',padding:'12px 16px',
                display:'flex',alignItems:'center',justifyContent:'space-between',
                background:value===s?BG:CARD,
                borderBottom:i<shown.length-1?`1px solid ${BORDER}`:'none',
                border:'none',cursor:'pointer',textAlign:'left',
                fontFamily:'inherit',fontSize:15.5,
                color:value===s?ACCENT:TEXT,fontWeight:value===s?700:400,
                transition:'background 0.1s',
              }}
              onMouseEnter={e=>{ if(value!==s) e.currentTarget.style.background=BG }}
              onMouseLeave={e=>{ if(value!==s) e.currentTarget.style.background=CARD }}>
              <span style={{display:'flex',alignItems:'center',gap:10}}>
                {/* A clock beside "AM"/"PM" reads as decoration, not meaning —
                    only actual times get one. */}
                {/\d/.test(s) && <Clock size={13} color={value===s?MOSS:MUTED}/>}
                {s}
              </span>
              {value===s&&<Check size={14} color={MOSS}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
