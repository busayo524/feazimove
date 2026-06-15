/**
 * FeaziMove — Flat-vector travel illustration components
 * Style: warm tones, simplified geometry, inspired by Uber/inDrive marketing art
 */

import React from 'react'

/* ── Shared palette ─────────────────────────────────────────────────────────── */
const P = {
  sky:      '#7EC8E3',
  skyDeep:  '#5EB4D4',
  lime:     '#C4FF00',
  limeDeep: '#9DD900',
  terra:    '#C8614A',  // terracotta warm red
  terra2:   '#D4735A',
  mauve:    '#7A3F5C',  // deep mauve purple
  mauve2:   '#9C5572',
  sand:     '#E8C49A',  // skin tone
  sand2:    '#D4A87A',
  dusk:     '#8B7FAA',  // purple dusk
  road:     '#4A4A6A',
  car1:     '#2C4A7A',  // dark navy blue car
  car2:     '#3A5F8A',
  car3:     '#FFFFFF',  // white car
  grass:    '#3D8B5A',
  grass2:   '#4FA870',
  dark:     '#1A1A2A',
  shadow:   'rgba(0,0,0,0.18)',
  white:    '#FFFFFF',
  hat:      '#D4A830',
  hat2:     '#C49020',
  skirt:    '#C8A0C8',  // pink/mauve skirt
  shirt:    '#5CA0C8',  // blue shirt
  hair:     '#2A1A0A',
  teal:     '#2A9D8F',
  teal2:    '#1A8A7A',
  orange:   '#F4A261',
  yellow:   '#E9C46A',
}

/* ── 1. HeroScene — Woman with luggage looking at car (tropical) ─────────────── */
export function HeroScene({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.skyDeep} />
          <stop offset="100%" stopColor="#B8E4F0" />
        </linearGradient>
        <linearGradient id="hs-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A5070" />
          <stop offset="100%" stopColor={P.mauve} />
        </linearGradient>
        <linearGradient id="hs-arch" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#A04030" />
          <stop offset="100%" stopColor={P.terra} />
        </linearGradient>
        <linearGradient id="hs-car" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A3A5A" />
          <stop offset="100%" stopColor={P.road} />
        </linearGradient>
      </defs>

      {/* Sky backdrop */}
      <rect x="60" y="0" width="360" height="230" fill="url(#hs-sky)" />

      {/* Mountains */}
      <ellipse cx="300" cy="210" rx="140" ry="70" fill="#5A7FAA" opacity="0.6" />
      <ellipse cx="350" cy="205" rx="100" ry="60" fill="#6A90BB" opacity="0.5" />

      {/* Ground */}
      <rect x="0" y="200" width="420" height="100" fill="url(#hs-ground)" />
      <rect x="60" y="200" width="360" height="10" fill="#6A3058" opacity="0.4" />

      {/* Palm trees */}
      {/* Left palm */}
      <rect x="195" y="60" width="6" height="130" rx="3" fill="#1A3020" />
      <ellipse cx="198" cy="65" rx="30" ry="14" fill={P.dark} opacity="0.85" transform="rotate(-20,198,65)" />
      <ellipse cx="198" cy="68" rx="28" ry="12" fill="#1E3825" transform="rotate(10,198,68)" />
      <ellipse cx="198" cy="62" rx="25" ry="11" fill="#1A3020" transform="rotate(-35,198,62)" />
      <ellipse cx="198" cy="72" rx="26" ry="11" fill="#243828" transform="rotate(30,198,72)" />

      {/* Right palm */}
      <rect x="328" y="40" width="7" height="150" rx="3" fill="#1A3020" />
      <ellipse cx="331" cy="45" rx="35" ry="15" fill={P.dark} opacity="0.85" transform="rotate(-15,331,45)" />
      <ellipse cx="331" cy="48" rx="32" ry="13" fill="#1E3825" transform="rotate(12,331,48)" />
      <ellipse cx="331" cy="42" rx="30" ry="12" fill="#1A3020" transform="rotate(-40,331,42)" />
      <ellipse cx="331" cy="52" rx="28" ry="12" fill="#243828" transform="rotate(35,331,52)" />

      {/* Far palm */}
      <rect x="255" y="90" width="5" height="100" rx="2" fill="#1A3020" />
      <ellipse cx="257" cy="94" rx="22" ry="10" fill={P.dark} opacity="0.7" transform="rotate(-18,257,94)" />
      <ellipse cx="257" cy="97" rx="20" ry="9" fill="#1E3825" transform="rotate(15,257,97)" />

      {/* Plane */}
      <g transform="translate(370,55)">
        <rect x="-12" y="-2" width="24" height="4" rx="2" fill="white" opacity="0.8" />
        <polygon points="-4,-2 8,-8 8,-2" fill="white" opacity="0.8" />
        <polygon points="-6,2 2,6 2,2" fill="white" opacity="0.6" />
      </g>

      {/* Car (dark sedan) */}
      <g transform="translate(260,185)">
        {/* Shadow */}
        <ellipse cx="40" cy="38" rx="65" ry="8" fill={P.shadow} />
        {/* Body */}
        <rect x="-10" y="18" width="100" height="22" rx="4" fill="url(#hs-car)" />
        {/* Cabin */}
        <path d="M10,18 L20,4 L60,4 L72,18 Z" fill="#2E2E4E" />
        {/* Windows */}
        <rect x="22" y="6" width="16" height="10" rx="2" fill={P.skyDeep} opacity="0.9" />
        <rect x="42" y="6" width="16" height="10" rx="2" fill={P.skyDeep} opacity="0.9" />
        {/* Wheels */}
        <circle cx="10" cy="40" r="9" fill="#1A1A2A" />
        <circle cx="10" cy="40" r="5" fill="#3A3A5A" />
        <circle cx="10" cy="40" r="2" fill="#888" />
        <circle cx="70" cy="40" r="9" fill="#1A1A2A" />
        <circle cx="70" cy="40" r="5" fill="#3A3A5A" />
        <circle cx="70" cy="40" r="2" fill="#888" />
        {/* Headlight */}
        <rect x="88" y="22" width="6" height="4" rx="1" fill={P.yellow} opacity="0.9" />
      </g>

      {/* Arch / doorway frame */}
      <path d="M0,0 L0,300 L75,300 L75,40 Q75,10 50,10 Q25,10 25,40 L25,0 Z" fill="url(#hs-arch)" />
      <rect x="0" y="0" width="25" height="300" fill="#8A3020" />

      {/* Interior shadow */}
      <rect x="0" y="0" width="75" height="300" fill="rgba(0,0,0,0.15)" />

      {/* Tropical plant (left) */}
      {[[-15,180,40], [0,160,35], [-20,145,38], [10,170,32]].map(([dx, y, r], i) => (
        <ellipse key={i} cx={35 + dx} cy={y} rx={r} ry={14} fill="#8B2020" opacity={0.7 + i * 0.05}
          transform={`rotate(${-30 + i * 20},${35 + dx},${y})`} />
      ))}
      <rect x="40" y="200" width="6" height="80" rx="3" fill="#5A1010" />

      {/* Woman */}
      <g transform="translate(90,110)">
        {/* Legs */}
        <rect x="6" y="75" width="9" height="45" rx="4" fill="#C89080" />
        <rect x="19" y="75" width="9" height="48" rx="4" fill="#C89080" />
        {/* Shoes */}
        <ellipse cx="10" cy="122" rx="8" ry="4" fill="#C03030" />
        <ellipse cx="23" cy="125" rx="8" ry="4" fill="#C03030" />
        {/* Skirt */}
        <path d="M2,50 L0,100 L35,100 L33,50 Z" fill={P.skirt} />
        <path d="M2,50 Q17,58 33,50" fill={P.skirt} />
        {/* Body / shirt */}
        <rect x="5" y="25" width="24" height="30" rx="4" fill={P.shirt} />
        {/* Left arm (holding luggage) */}
        <rect x="-2" y="28" width="8" height="25" rx="4" fill={P.sand} transform="rotate(15,-2,28)" />
        {/* Right arm */}
        <rect x="27" y="28" width="8" height="22" rx="4" fill={P.sand} transform="rotate(-10,27,28)" />
        {/* Neck */}
        <rect x="12" y="18" width="10" height="10" rx="4" fill={P.sand} />
        {/* Head */}
        <ellipse cx="17" cy="12" rx="14" ry="15" fill={P.sand} />
        {/* Hair */}
        <path d="M3,10 Q4,0 17,-3 Q30,0 31,10 Q28,4 17,4 Q6,4 3,10 Z" fill={P.hair} />
        <path d="M3,10 Q0,20 4,28 Q6,22 5,15" fill={P.hair} />
        {/* Hat */}
        <ellipse cx="17" cy="5" rx="20" ry="5" fill={P.hat} />
        <rect x="7" y="-5" width="20" height="12" rx="4" fill={P.hat2} />
        {/* Hat band */}
        <rect x="7" y="5" width="20" height="3" fill={P.terra} opacity="0.6" />
      </g>

      {/* Luggage */}
      <g transform="translate(102,183)">
        <rect x="0" y="0" width="22" height="28" rx="3" fill="#8B4A20" />
        <rect x="2" y="2" width="18" height="24" rx="2" fill="#7A3A14" />
        {/* Stripes */}
        <rect x="0" y="10" width="22" height="2" fill="#6A2A08" opacity="0.6" />
        <rect x="0" y="18" width="22" height="2" fill="#6A2A08" opacity="0.6" />
        {/* Handle */}
        <rect x="8" y="-10" width="6" height="12" rx="3" fill="#5A2A08" />
        <rect x="7" y="-11" width="8" height="3" rx="1.5" fill="#6A3A10" />
        {/* Wheels */}
        <circle cx="4" cy="30" r="3" fill="#333" />
        <circle cx="18" cy="30" r="3" fill="#333" />
      </g>

      {/* Sun / horizon glow */}
      <ellipse cx="260" cy="200" rx="60" ry="15" fill={P.yellow} opacity="0.25" />
      <circle cx="260" cy="192" rx="18" fill={P.yellow} opacity="0.3" />
    </svg>
  )
}

/* ── 2. RideSharingScene — Car on coastal/city road ────────────────────────── */
export function RideSharingScene({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="rs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8DD4E8" />
          <stop offset="100%" stopColor="#C8EEFA" />
        </linearGradient>
        <linearGradient id="rs-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A4E68" />
          <stop offset="100%" stopColor="#3A3E58" />
        </linearGradient>
        <linearGradient id="rs-car" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8E8F0" />
          <stop offset="100%" stopColor="#D0D0E0" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="420" height="260" fill="url(#rs-sky)" />

      {/* Ocean / water */}
      <ellipse cx="210" cy="165" rx="250" ry="50" fill="#5AAFC8" opacity="0.5" />
      <ellipse cx="210" cy="160" rx="230" ry="40" fill="#4A9FBC" opacity="0.4" />

      {/* Cliff / coastal land */}
      <path d="M0,145 Q100,130 200,140 Q300,150 420,135 L420,260 L0,260 Z" fill={P.grass} />
      <path d="M0,145 Q100,130 200,140 Q300,150 420,135" fill="none" stroke={P.grass2} strokeWidth="3" />

      {/* Road */}
      <path d="M0,185 Q210,175 420,188 L420,215 Q210,205 0,215 Z" fill="url(#rs-road)" />
      {/* Road lines */}
      <path d="M30,200 L90,198" stroke="#F0C040" strokeWidth="3" strokeDasharray="8,12" opacity="0.8" />
      <path d="M150,198 L210,196" stroke="#F0C040" strokeWidth="3" strokeDasharray="8,12" opacity="0.8" />
      <path d="M270,196 L330,195" stroke="#F0C040" strokeWidth="3" strokeDasharray="8,12" opacity="0.8" />
      <path d="M360,195 L410,194" stroke="#F0C040" strokeWidth="3" strokeDasharray="8,12" opacity="0.8" />

      {/* Curb */}
      <path d="M0,183 Q210,173 420,186" fill="none" stroke="#8A8AAA" strokeWidth="2" />
      <path d="M0,215 Q210,205 420,218" fill="none" stroke="#8A8AAA" strokeWidth="2" />

      {/* White EV Car */}
      <g transform="translate(95,145)">
        {/* Shadow */}
        <ellipse cx="115" cy="62" rx="100" ry="10" fill={P.shadow} />
        {/* Lower body */}
        <rect x="10" y="32" width="210" height="30" rx="5" fill="url(#rs-car)" />
        {/* Upper body/cabin */}
        <path d="M40,32 L60,8 L150,8 L175,32 Z" fill="#E0E0EE" />
        {/* Windscreen */}
        <path d="M62,10 L68,28 L145,28 L148,10 Z" fill={P.skyDeep} opacity="0.85" />
        {/* Rear window */}
        <path d="M42,32 L50,12 L62,10 L62,28 Z" fill={P.skyDeep} opacity="0.7" />
        {/* Side windows */}
        <rect x="78" y="12" width="30" height="14" rx="3" fill={P.sky} opacity="0.6" />
        <rect x="115" y="12" width="28" height="14" rx="3" fill={P.sky} opacity="0.6" />
        {/* Door lines */}
        <line x1="108" y1="32" x2="108" y2="60" stroke="#C0C0D0" strokeWidth="1.5" />
        <line x1="155" y1="32" x2="155" y2="60" stroke="#C0C0D0" strokeWidth="1.5" />
        {/* Handle */}
        <rect x="115" y="44" width="16" height="3" rx="1.5" fill="#A0A0B8" />
        {/* Front */}
        <rect x="208" y="36" width="16" height="6" rx="2" fill="#D8D8E8" />
        <rect x="213" y="28" width="12" height="5" rx="2" fill={P.skyDeep} opacity="0.6" />
        {/* Rear */}
        <rect x="0" y="36" width="12" height="6" rx="2" fill="#C8C8D8" />
        {/* Head + tail lights */}
        <rect x="218" y="34" width="6" height="8" rx="2" fill={P.yellow} opacity="0.9" />
        <rect x="4" y="34" width="6" height="8" rx="2" fill="#EE4444" opacity="0.8" />
        {/* Wheels */}
        {[26, 193].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy={62} r="16" fill="#2A2A3A" />
            <circle cx={cx} cy={62} r="10" fill="#3A3A50" />
            <circle cx={cx} cy={62} r="5" fill="#888" />
            {[0,60,120,180,240,300].map(a => (
              <line key={a} x1={cx} y1={62} x2={cx + 9*Math.cos(a*Math.PI/180)} y2={62 + 9*Math.sin(a*Math.PI/180)}
                stroke="#555" strokeWidth="1.5" />
            ))}
          </g>
        ))}
        {/* FeaziMove badge */}
        <rect x="88" y="55" width="54" height="8" rx="4" fill={P.lime} opacity="0.9" />
        <text x="115" y="62" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#0F0F0F">FeaziMove</text>
        {/* Passengers (silhouettes through window) */}
        <ellipse cx="95" cy="14" rx="8" ry="9" fill={P.sand2} />
        <ellipse cx="130" cy="14" rx="8" ry="9" fill="#8A6040" />
      </g>

      {/* Buildings (background) */}
      {[[320,80,50,90],[340,60,35,100],[360,70,45,80],[380,50,30,110]].map(([x,y,w,h],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill="#6A8AAA" opacity={0.3 + i*0.05} />
      ))}
      {/* Building windows */}
      {[[325,90],[345,70],[365,80]].map(([bx,by],b) =>
        [[0,0],[8,0],[16,0],[0,10],[8,10],[16,10]].map(([wx,wy],w) => (
          <rect key={`${b}-${w}`} x={bx+wx} y={by+wy} width="5" height="6" rx="1" fill={P.yellow} opacity="0.4" />
        ))
      )}

      {/* Trees */}
      {[[60,130],[160,125],[380,128]].map(([x,y],i) => (
        <g key={i}>
          <rect x={x-2} y={y} width="5" height="30" rx="2" fill="#2A4020" />
          <circle cx={x+0.5} cy={y} r="16" fill={P.grass2} opacity="0.9" />
          <circle cx={x+0.5} cy={y-8} r="11" fill={P.grass} opacity="0.8" />
        </g>
      ))}

      {/* Viaduct/bridge suggestion */}
      <path d="M0,155 Q50,148 100,155" fill="none" stroke="#AAB0C0" strokeWidth="3" opacity="0.5" />
      <rect x="10" y="155" width="6" height="20" fill="#AAB0C0" opacity="0.4" />
      <rect x="65" y="150" width="6" height="25" fill="#AAB0C0" opacity="0.4" />
    </svg>
  )
}

/* ── 3. AirportScene — Two people meeting at car, airport backdrop ───────────── */
export function AirportScene({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 420 280" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="ap-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A8AA8" />
          <stop offset="100%" stopColor="#5ABEDC" />
        </linearGradient>
        <linearGradient id="ap-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8888A8" />
          <stop offset="100%" stopColor="#707090" />
        </linearGradient>
        <linearGradient id="ap-car" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A8CD4" />
          <stop offset="100%" stopColor="#2A70BC" />
        </linearGradient>
      </defs>

      {/* Curved terminal backdrop */}
      <ellipse cx="210" cy="60" rx="280" ry="180" fill="url(#ap-bg)" />
      <rect x="0" y="100" width="420" height="180" fill="url(#ap-bg)" />

      {/* Terminal structure curve */}
      <path d="M0,80 Q105,30 210,40 Q315,30 420,80 L420,130 Q315,90 210,100 Q105,90 0,130 Z" fill="#1A6A88" opacity="0.4" />

      {/* Floor */}
      <rect x="0" y="195" width="420" height="85" fill="url(#ap-floor)" />
      <rect x="0" y="193" width="420" height="4" fill="#6A6A8A" />

      {/* Plane in background */}
      <g transform="translate(300,55) rotate(-8)">
        <rect x="-35" y="-7" width="70" height="14" rx="7" fill="white" opacity="0.9" />
        <path d="M-10,-7 L10,-25 L18,-7 Z" fill="white" opacity="0.85" />
        <path d="M-15,7 L-5,20 L5,7 Z" fill="white" opacity="0.7" />
        <rect x="30" y="-3" width="15" height="6" rx="3" fill="white" opacity="0.7" />
      </g>

      {/* Blue pooling car */}
      <g transform="translate(175,155)">
        <ellipse cx="90" cy="50" rx="85" ry="9" fill={P.shadow} />
        <rect x="5" y="22" width="170" height="28" rx="5" fill="url(#ap-car)" />
        <path d="M28,22 L48,4 L122,4 L142,22 Z" fill="#3A80C8" />
        <path d="M50,6 L56,20 L120,20 L118,6 Z" fill={P.sky} opacity="0.9" />
        <rect x="58" y="8" width="24" height="10" rx="2" fill={P.skyDeep} opacity="0.7" />
        <rect x="88" y="8" width="24" height="10" rx="2" fill={P.skyDeep} opacity="0.7" />
        <line x1="88" y1="22" x2="88" y2="48" stroke="#2A68B0" strokeWidth="1.5" />
        <rect x="168" y="26" width="10" height="6" rx="2" fill="#D0E8F0" />
        <rect x="172" y="20" width="8" height="5" rx="1" fill={P.sky} opacity="0.7" />
        {[18, 152].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy={50} r="14" fill="#1A1A2A" />
            <circle cx={cx} cy={50} r="9" fill="#2A2A3A" />
            <circle cx={cx} cy={50} r="4" fill="#666" />
          </g>
        ))}
        <rect x="173" y="24" width="6" height="6" rx="1" fill={P.yellow} opacity="0.85" />
      </g>

      {/* Person 1 — driver/greeter waving */}
      <g transform="translate(168,115)">
        {/* Legs */}
        <rect x="5" y="68" width="10" height="40" rx="5" fill="#4A6090" />
        <rect x="18" y="68" width="10" height="38" rx="5" fill="#4A6090" />
        {/* Shoes */}
        <ellipse cx="10" cy="110" rx="9" ry="5" fill="#2A2A3A" />
        <ellipse cx="23" cy="108" rx="9" ry="5" fill="#2A2A3A" />
        {/* Body */}
        <rect x="3" y="28" width="28" height="44" rx="6" fill="#5ABE8A" />  {/* green jacket */}
        {/* Arm wave up */}
        <g transform="rotate(-60,30,38)">
          <rect x="27" y="28" width="9" height="26" rx="4" fill={P.sand} />
        </g>
        {/* Arm down */}
        <rect x="-2" y="32" width="9" height="22" rx="4" fill={P.sand} />
        {/* Head */}
        <ellipse cx="17" cy="18" rx="14" ry="15" fill={P.sand2} />
        {/* Hair */}
        <path d="M4,14 Q5,2 17,-1 Q29,2 30,14 Q27,7 17,7 Q7,7 4,14Z" fill="#3A2010" />
      </g>

      {/* Person 2 — traveller with luggage */}
      <g transform="translate(270,100)">
        {/* Legs */}
        <rect x="6" y="80" width="10" height="45" rx="5" fill="#C8D0E8" />
        <rect x="19" y="80" width="10" height="48" rx="5" fill="#C8D0E8" />
        <ellipse cx="11" cy="127" rx="9" ry="5" fill="#5A4A30" />
        <ellipse cx="24" cy="130" rx="9" ry="5" fill="#5A4A30" />
        {/* Body */}
        <rect x="4" y="30" width="26" height="55" rx="6" fill="#E8D0A0" />  {/* khaki/beige */}
        {/* Arm — pulling luggage */}
        <rect x="27" y="38" width="9" height="30" rx="4" fill={P.sand} />
        {/* Other arm */}
        <rect x="-2" y="35" width="9" height="24" rx="4" fill={P.sand} transform="rotate(15,-2,35)" />
        {/* Head */}
        <ellipse cx="17" cy="18" rx="14" ry="15" fill={P.sand} />
        {/* Hair ponytail */}
        <path d="M4,14 Q5,2 17,-1 Q29,2 30,14 Q26,7 17,7 Q8,7 4,14Z" fill="#8A5030" />
        <path d="M26,14 Q32,20 28,30" stroke="#8A5030" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>

      {/* Large rolling suitcase */}
      <g transform="translate(295,160)">
        <rect x="0" y="0" width="32" height="42" rx="4" fill="#2A2A3A" />
        <rect x="2" y="2" width="28" height="38" rx="3" fill="#3A3A50" />
        <rect x="0" y="15" width="32" height="3" fill="#222232" />
        <rect x="0" y="28" width="32" height="3" fill="#222232" />
        <rect x="14" y="-14" width="8" height="16" rx="3" fill="#2A2A3A" />
        <rect x="12" y="-15" width="12" height="4" rx="2" fill="#3A3A50" />
        <circle cx="6" cy="44" r="4" fill="#1A1A2A" />
        <circle cx="26" cy="44" r="4" fill="#1A1A2A" />
      </g>

      {/* Small carry-on near person2 */}
      <g transform="translate(265,185)">
        <rect x="0" y="0" width="22" height="18" rx="3" fill="#E08030" />
        <rect x="0" y="8" width="22" height="2" fill="#C06820" />
        <rect x="8" y="-7" width="6" height="9" rx="2" fill="#C06820" />
        <circle cx="4" cy="20" r="3" fill="#333" />
        <circle cx="18" cy="20" r="3" fill="#333" />
      </g>

      {/* Location pin floating */}
      <g transform="translate(220,50)">
        <circle cx="0" cy="0" r="14" fill={P.lime} opacity="0.9" />
        <path d="M0,-6 Q6,0 0,12 Q-6,0 0,-6Z" fill="#0F0F0F" opacity="0.5" />
        <circle cx="0" cy="-1" r="4" fill="#0F0F0F" opacity="0.4" />
      </g>

      {/* "Ride matched" chip */}
      <rect x="155" y="55" width="110" height="30" rx="15" fill="white" opacity="0.92" />
      <circle cx="175" cy="70" r="8" fill={P.lime} opacity="0.9" />
      <text x="215" y="75" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1A1A2A">Ride matched!</text>
    </svg>
  )
}

/* ── 4. UrbanBoardingScene — Person getting into car, city street ──────────── */
export function UrbanBoardingScene({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 420 280" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="ub-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8D8F0" />
          <stop offset="100%" stopColor="#E8EEF8" />
        </linearGradient>
        <linearGradient id="ub-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5A5A78" />
          <stop offset="100%" stopColor="#4A4A68" />
        </linearGradient>
        <linearGradient id="ub-car" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6A90D8" />
          <stop offset="100%" stopColor="#4A70C0" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="420" height="280" fill="url(#ub-sky)" />

      {/* City buildings */}
      {[
        [0,30,60,200],  [55,10,50,220], [100,50,45,180],
        [280,20,55,215],[330,40,50,190],[375,15,45,225],
      ].map(([x,y,w,h],i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="3"
          fill={i%2===0 ? '#8898B8' : '#7080A8'} opacity="0.6" />
      ))}
      {/* Building windows grid */}
      {[20,70,110,295,345,385].map((bx,b) =>
        [0,1,2,3,4].map(row =>
          [0,1,2].map(col => (
            <rect key={`${b}-${row}-${col}`} x={bx+col*14} y={50+row*18} width="8" height="10"
              rx="1" fill={P.yellow} opacity={Math.random()>0.4 ? 0.5 : 0.15} />
          ))
        )
      )}

      {/* Sidewalk */}
      <rect x="0" y="185" width="420" height="95" fill="#8A8AAA" />
      <rect x="0" y="183" width="420" height="5" fill="#7A7A9A" />
      {/* Sidewalk tiles */}
      {[0,40,80,120,160,200,240,280,320,360,400].map((x,i) => (
        <line key={i} x1={x} y1="185" x2={x} y2="280" stroke="#7A7A9A" strokeWidth="1" opacity="0.4" />
      ))}
      {/* Road line */}
      <rect x="0" y="205" width="420" height="2" fill="#6A6A8A" opacity="0.5" />

      {/* Blue car with open door */}
      <g transform="translate(100,150)">
        <ellipse cx="105" cy="58" rx="95" ry="10" fill={P.shadow} />
        {/* Body */}
        <rect x="8" y="24" width="196" height="34" rx="5" fill="url(#ub-car)" />
        {/* Cabin */}
        <path d="M32,24 L52,5 L145,5 L165,24 Z" fill="#5888D0" />
        {/* Windows */}
        <path d="M55,7 L60,22 L140,22 L143,7 Z" fill="#90C8E8" opacity="0.85" />
        <rect x="65" y="9" width="26" height="11" rx="2" fill={P.sky} opacity="0.7" />
        <rect x="98" y="9" width="26" height="11" rx="2" fill={P.sky} opacity="0.7" />
        {/* Door open */}
        <g transform="rotate(-40,110,24)">
          <rect x="110" y="24" width="50" height="34" rx="3" fill="#4A78C0" stroke="#3A68B0" strokeWidth="1" />
          <rect x="120" y="35" width="18" height="3" rx="1.5" fill="#3A68B0" />
        </g>
        {/* Lights */}
        <rect x="202" y="28" width="8" height="8" rx="2" fill={P.yellow} opacity="0.9" />
        <rect x="2" y="28" width="8" height="8" rx="2" fill="#EE4444" opacity="0.8" />
        {/* Wheels */}
        {[24, 180].map((cx,i)=>(
          <g key={i}>
            <circle cx={cx} cy={58} r="16" fill="#1A1A2A" />
            <circle cx={cx} cy={58} r="10" fill="#2A2A3A" />
            <circle cx={cx} cy={58} r="4" fill="#777" />
          </g>
        ))}
        {/* Driver inside */}
        <ellipse cx="75" cy="10" rx="10" ry="11" fill="#D4A870" />
        <path d="M65,10 Q66,3 75,0 Q84,3 85,10 Q81,5 75,5 Q69,5 65,10Z" fill="#3A2010" />
      </g>

      {/* Person boarding — stepping in */}
      <g transform="translate(218,130)">
        {/* Rear leg (inside car) */}
        <rect x="14" y="74" width="10" height="38" rx="5" fill="#7090C0" opacity="0.7" />
        {/* Front leg stepping in */}
        <rect x="4" y="70" width="10" height="42" rx="5" fill="#7090C0" transform="rotate(18,9,70)" />
        <ellipse cx="8" cy="112" rx="9" ry="4" fill="#2A2A3A" />
        {/* Body */}
        <rect x="2" y="28" width="26" height="50" rx="6" fill="#E85050" />  {/* red top */}
        {/* Arms */}
        <rect x="-4" y="32" width="9" height="24" rx="4" fill={P.sand} transform="rotate(25,-4,32)" />
        <rect x="24" y="32" width="9" height="22" rx="4" fill={P.sand} />
        {/* Head */}
        <ellipse cx="15" cy="17" rx="13" ry="14" fill={P.sand} />
        {/* Hair */}
        <path d="M3,13 Q4,1 15,-2 Q26,1 27,13 Q24,6 15,6 Q6,6 3,13Z" fill="#1A1A1A" />
        {/* Backpack */}
        <rect x="22" y="28" width="16" height="22" rx="4" fill="#3A50AA" />
        <rect x="24" y="32" width="12" height="14" rx="2" fill="#4A60BA" />
        <rect x="30" y="28" width="4" height="6" rx="2" fill="#3A50AA" />
      </g>

      {/* Street lamp */}
      <rect x="60" y="80" width="6" height="105" rx="3" fill="#7A7A9A" />
      <path d="M63,80 Q63,65 78,65" fill="none" stroke="#7A7A9A" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="78" cy="65" rx="8" ry="4" fill={P.yellow} opacity="0.7" />
      <ellipse cx="78" cy="67" rx="14" ry="5" fill={P.yellow} opacity="0.15" />

      {/* Second lamp */}
      <rect x="360" y="75" width="6" height="110" rx="3" fill="#7A7A9A" />
      <path d="M363,75 Q363,60 348,60" fill="none" stroke="#7A7A9A" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="348" cy="60" rx="8" ry="4" fill={P.yellow} opacity="0.7" />

      {/* Walking pedestrians (background) */}
      <g transform="translate(340,160)" opacity="0.7">
        <rect x="4" y="50" width="7" height="28" rx="3" fill="#8090A8" />
        <rect x="13" y="50" width="7" height="30" rx="3" fill="#8090A8" />
        <rect x="2" y="24" width="20" height="30" rx="5" fill="#708090" />
        <ellipse cx="12" cy="15" rx="11" ry="12" fill={P.sand2} opacity="0.8" />
      </g>
      <g transform="translate(370,155)" opacity="0.6">
        <rect x="4" y="50" width="6" height="30" rx="3" fill="#9090A8" />
        <rect x="12" y="50" width="6" height="28" rx="3" fill="#9090A8" />
        <rect x="2" y="24" width="18" height="30" rx="5" fill="#8088A0" />
        <ellipse cx="11" cy="14" rx="10" ry="11" fill={P.sand} opacity="0.7" />
      </g>
    </svg>
  )
}

/* ── 5. BusinessDashboardScene — Person at laptop with analytics ──────────────── */
export function BusinessDashboardScene({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 420 280" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="bd-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8A040" />
          <stop offset="100%" stopColor="#D08030" />
        </linearGradient>
        <linearGradient id="bd-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A2A5A" />
          <stop offset="100%" stopColor="#0A1A40" />
        </linearGradient>
        <linearGradient id="bd-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C86030" />
          <stop offset="100%" stopColor="#A84820" />
        </linearGradient>
        <linearGradient id="bd-chart" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={P.lime} stopOpacity="0.3" />
          <stop offset="100%" stopColor={P.lime} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="420" height="280" fill="url(#bd-bg)" />
      {/* Wall panel */}
      <rect x="0" y="0" width="200" height="280" fill="#1A3050" opacity="0.15" />

      {/* Desk */}
      <rect x="0" y="210" width="420" height="70" fill="url(#bd-desk)" />
      <rect x="0" y="208" width="420" height="5" fill="#B85828" />

      {/* Chair (back) */}
      <rect x="165" y="175" width="60" height="8" rx="4" fill="#1A2040" />
      <rect x="172" y="183" width="8" height="30" rx="4" fill="#1A2040" />
      <rect x="240" y="183" width="8" height="30" rx="4" fill="#1A2040" />

      {/* Monitor */}
      <g transform="translate(80,30)">
        {/* Stand */}
        <rect x="115" y="175" width="10" height="30" rx="5" fill="#2A2A3A" />
        <rect x="95" y="203" width="50" height="8" rx="4" fill="#2A2A3A" />
        {/* Screen bezel */}
        <rect x="0" y="0" width="240" height="175" rx="8" fill="#1A1A2A" />
        {/* Screen */}
        <rect x="6" y="6" width="228" height="163" rx="5" fill="url(#bd-screen)" />

        {/* --- Dashboard UI on screen --- */}
        {/* Top nav bar */}
        <rect x="6" y="6" width="228" height="18" rx="5" fill="#0A1030" />
        <circle cx="20" cy="15" r="4" fill={P.lime} opacity="0.8" />
        <rect x="30" y="11" width="50" height="6" rx="3" fill="#3A4A7A" />
        <rect x="190" y="11" width="30" height="6" rx="3" fill="#2A3A6A" />

        {/* Sidebar */}
        <rect x="6" y="24" width="40" height="145" fill="#0E1828" />
        {[35,52,69,86,103].map((y,i) => (
          <g key={i}>
            <rect x="12" y={y} width="7" height="7" rx="2" fill={i===0 ? P.lime : '#3A4A6A'} opacity="0.8" />
            <rect x="22" y={y+1} width="18" height="5" rx="2" fill={i===0 ? '#5A7A1A' : '#2A3A5A'} />
          </g>
        ))}

        {/* Main panel — Header card */}
        <rect x="52" y="24" width="182" height="40" rx="4" fill="#1A2A58" />
        <rect x="60" y="32" width="80" height="7" rx="3" fill="#3A70E8" opacity="0.9" />
        <rect x="60" y="44" width="55" height="5" rx="2" fill="#2A4A7A" />
        {/* Car icon in card */}
        <g transform="translate(180,28)">
          <rect x="0" y="8" width="40" height="14" rx="3" fill="#3A6AE8" />
          <path d="M6,8 L10,2 L30,2 L34,8 Z" fill="#4A7AF8" />
          <circle cx="8" cy="22" r="4" fill="#1A1A3A" />
          <circle cx="32" cy="22" r="4" fill="#1A1A3A" />
        </g>

        {/* Stats row */}
        {[[52,70,P.lime],[112,70,'#60A5FA'],[172,70,'#F472B6']].map(([x,y,color],i) => (
          <g key={i}>
            <rect x={x} y={y} width="55" height="32" rx="3" fill="#152040" />
            <rect x={x+4} y={y+4} width="20" height="5" rx="2" fill={color} opacity="0.6" />
            <rect x={x+4} y={y+13} width="35" height="8" rx="2" fill={color} opacity="0.8" />
            <rect x={x+4} y={y+24} width="25" height="4" rx="2" fill="#2A3A5A" />
          </g>
        ))}

        {/* Chart area */}
        <rect x="52" y="107" width="90" height="62" rx="3" fill="#0E1828" />
        {/* Line chart */}
        <polyline
          points="58,162 68,148 78,155 88,138 98,142 108,125 118,130 128,115 136,118"
          fill="none" stroke={P.lime} strokeWidth="2" strokeLinecap="round" />
        <polyline
          points="58,162 68,148 78,155 88,138 98,142 108,125 118,130 128,115 136,118 136,169 58,169"
          fill="url(#bd-chart)" opacity="0.4" />
        {/* Chart dots */}
        {[[58,162],[78,155],[98,142],[118,130],[136,118]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="2.5" fill={P.lime} />
        ))}

        {/* Table area */}
        <rect x="148" y="107" width="86" height="62" rx="3" fill="#0E1828" />
        {[0,1,2,3].map(i => (
          <g key={i}>
            <rect x="152" y={112+i*13} width="30" height="5" rx="2" fill="#2A3A5A" />
            <rect x="188" y={112+i*13} width="18" height="5" rx="2" fill={i===0?P.lime:'#3A60AA'} opacity="0.7" />
            <rect x="210" y={112+i*13} width="20" height="5" rx="2" fill="#2A3A5A" />
          </g>
        ))}

        {/* Bottom bar */}
        <rect x="52" y="174" width="182" height="18" rx="3" fill="#0E1828" />
        {[62,92,122,152,182,212].map((x,i)=>(
          <rect key={i} x={x} y="180" width={[35,25,30,20,25,15][i]} height="6" rx="3"
            fill={i===0?P.lime:'#2A3A6A'} opacity="0.7" />
        ))}
      </g>

      {/* Person (from behind, red hair) */}
      <g transform="translate(175,115)">
        {/* Torso */}
        <rect x="10" y="30" width="40" height="60" rx="8" fill="#E8E8F0" />
        {/* Left arm */}
        <rect x="0" y="35" width="12" height="45" rx="6" fill="#E8E8F0" transform="rotate(8,6,35)" />
        {/* Right arm */}
        <rect x="38" y="35" width="12" height="42" rx="6" fill="#E8E8F0" transform="rotate(-10,44,35)" />
        {/* Head */}
        <ellipse cx="30" cy="18" rx="20" ry="22" fill={P.sand} />
        {/* Red hair */}
        <path d="M10,18 Q12,0 30,-4 Q48,0 50,18 Q46,8 30,8 Q14,8 10,18Z" fill="#CC3A1A" />
        <path d="M46,14 Q54,22 50,36" stroke="#CC3A1A" strokeWidth="8" fill="none" strokeLinecap="round" />
        {/* Chair back visible */}
        <rect x="4" y="88" width="52" height="6" rx="3" fill="#0A1428" opacity="0.8" />
      </g>

      {/* Keyboard */}
      <rect x="140" y="210" width="120" height="18" rx="4" fill="#2A2A3A" opacity="0.6" />
      {[0,1,2,3,4,5,6,7,8,9].map(i=>(
        <rect key={i} x={146+i*11} y={213} width="8" height="5" rx="1" fill="#3A3A4A" />
      ))}
      {[0,1,2,3,4,5,6,7,8,9].map(i=>(
        <rect key={i} x={148+i*11} y={221} width="8" height="5" rx="1" fill="#3A3A4A" />
      ))}

      {/* Floating chart popup */}
      <g transform="translate(300,55)">
        <rect x="0" y="0" width="100" height="65" rx="8" fill="white" opacity="0.95" />
        <rect x="0" y="0" width="100" height="16" rx="8" fill="#0A1A40" />
        <rect x="0" y="8" width="100" height="8" fill="#0A1A40" />
        <text x="50" y="12" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">Fleet Analytics</text>
        <polyline points="8,55 20,42 32,48 44,35 56,38 68,25 80,28 92,18"
          fill="none" stroke={P.lime} strokeWidth="2" strokeLinecap="round" />
        <text x="50" y="62" textAnchor="middle" fontSize="7" fill="#888">+28% this month</text>
      </g>

      {/* Dotted blue dots decoration */}
      {[[30,30],[42,50],[18,65],[15,90]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={2+i*0.5} fill="#60A5FA" opacity="0.3" />
      ))}
    </svg>
  )
}

/* ── 6. DeliveryScene — Delivery on motorbike, city street ─────────────────── */
export function DeliveryScene({ className = '', style = {} }) {
  return (
    <svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <defs>
        <linearGradient id="dl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4A261" />
          <stop offset="100%" stopColor="#E76F51" />
        </linearGradient>
        <linearGradient id="dl-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A4A68" />
          <stop offset="100%" stopColor="#3A3A58" />
        </linearGradient>
      </defs>

      {/* Sunset sky */}
      <rect width="420" height="260" fill="url(#dl-sky)" />
      {/* Sun */}
      <circle cx="340" cy="100" r="45" fill={P.yellow} opacity="0.4" />
      <circle cx="340" cy="100" r="30" fill={P.yellow} opacity="0.5" />
      <circle cx="340" cy="100" r="18" fill={P.yellow} opacity="0.7" />

      {/* Silhouette buildings */}
      {[
        [0,80,55,180],[50,60,50,200],[95,90,45,170],
        [290,70,60,190],[345,55,50,205],[388,80,32,180],
      ].map(([x,y,w,h],i)=>(
        <rect key={i} x={x} y={y} width={w} height={h} rx="3" fill="#C84A2A" opacity="0.45" />
      ))}

      {/* Ground */}
      <rect x="0" y="190" width="420" height="70" fill="#4A3050" />
      {/* Road */}
      <rect x="0" y="195" width="420" height="55" fill="url(#dl-road)" />
      <rect x="0" y="193" width="420" height="4" fill="#6A6A88" />
      {/* Road markings */}
      {[20,80,140,200,260,320,380].map((x,i)=>(
        <rect key={i} x={x} y="216" width="40" height="4" rx="2" fill={P.yellow} opacity="0.35" />
      ))}

      {/* Motorbike + rider */}
      <g transform="translate(120,150)">
        {/* Shadow */}
        <ellipse cx="75" cy="60" rx="70" ry="8" fill={P.shadow} />
        {/* Wheels */}
        <circle cx="20" cy="56" r="18" fill="#1A1A2A" />
        <circle cx="20" cy="56" r="11" fill="#2A2A3A" />
        <circle cx="20" cy="56" r="4" fill="#666" />
        <circle cx="130" cy="56" r="18" fill="#1A1A2A" />
        <circle cx="130" cy="56" r="11" fill="#2A2A3A" />
        <circle cx="130" cy="56" r="4" fill="#666" />
        {/* Frame */}
        <path d="M20,38 L55,20 L90,38 L130,38" fill="none" stroke="#C84A10" strokeWidth="6" strokeLinecap="round" />
        <path d="M55,20 L90,38 L90,56" fill="none" stroke="#C84A10" strokeWidth="5" strokeLinecap="round" />
        <path d="M20,38 L55,38 L90,38" fill="none" stroke="#E85A20" strokeWidth="4" strokeLinecap="round" />
        {/* Engine/body */}
        <rect x="45" y="30" width="50" height="22" rx="5" fill="#D04818" />
        {/* Handlebars */}
        <rect x="118" y="20" width="4" height="20" rx="2" fill="#4A4A6A" />
        <rect x="112" y="19" width="16" height="4" rx="2" fill="#3A3A5A" />
        {/* Headlight */}
        <circle cx="145" cy="38" r="6" fill={P.yellow} opacity="0.8" />
        <ellipse cx="152" cy="38" rx="12" ry="6" fill={P.yellow} opacity="0.15" />
        {/* Delivery box on back */}
        <rect x="15" y="10" width="32" height="24" rx="4" fill={P.lime} />
        <rect x="15" y="10" width="32" height="24" rx="4" fill="none" stroke="#9DD900" strokeWidth="1.5" />
        <text x="31" y="26" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#0F0F0F">FEAZI</text>
        {/* Rider body */}
        <rect x="55" y="0" width="28" height="35" rx="6" fill="#2A4A8A" />
        {/* Rider helmet */}
        <ellipse cx="69" cy="-8" rx="16" ry="15" fill="#1A1A2A" />
        <ellipse cx="69" cy="-8" rx="13" ry="8" fill="#2A2A3A" />
        {/* Visor */}
        <path d="M57,−4 Q69,4 81,−4" fill={P.sky} opacity="0.5" />
        {/* Arms */}
        <rect x="75" y="8" width="8" height="28" rx="4" fill={P.sand} transform="rotate(-15,79,8)" />
      </g>

      {/* Speed lines */}
      {[155,170,185,200].map((y,i)=>(
        <line key={i} x1={60-i*10} y1={y} x2={100-i*10} y2={y}
          stroke="white" strokeWidth="1.5" opacity={0.15+i*0.04} />
      ))}

      {/* Route dots (map pin trail) */}
      {[[250,140],[290,130],[330,125],[370,120]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i===3?7:4} fill={i===3?P.lime:'white'}
          opacity={i===3?0.9:0.4} />
      ))}
      {[[250,140],[290,130],[330,125]].map(([x,y],i)=>(
        <line key={i} x1={x} y1={y} x2={[[290,130],[330,125],[370,120]][i][0]}
          y2={[[290,130],[330,125],[370,120]][i][1]}
          stroke="white" strokeWidth="1.5" strokeDasharray="5,5" opacity="0.35" />
      ))}
      {/* Destination pin */}
      <g transform="translate(363,100)">
        <path d="M7,0 A7,7 0 1,1 7.001,0 L7,18 Z" fill={P.lime} opacity="0.9" />
        <circle cx="7" cy="7" r="3" fill="white" />
      </g>
    </svg>
  )
}

/* ── Keep old simple exports as aliases for backward compat ─────────────────── */
export const WalkingPerson    = HeroScene
export const CarWithPeople    = RideSharingScene
export const PhonePerson      = AirportScene
export const DeliveryPerson   = DeliveryScene
export const CommuterGroup    = UrbanBoardingScene
