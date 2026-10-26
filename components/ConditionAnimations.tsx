'use client'

// Living condition glyphs: the wave swells to the real height and period, the wind
// streaks at the real speed, the road dashes march and change surface with the weather.
// All motion is CSS (keyframes in globals.css) and stops under prefers-reduced-motion.

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

function sinePath(width: number, wavelength: number, amp: number, mid: number): string {
  const total = width + wavelength * 2
  const step = wavelength / 16
  let d = `M0 ${mid.toFixed(1)}`
  for (let x = step; x <= total + step; x += step) {
    const y = mid + amp * Math.sin((x / wavelength) * Math.PI * 2)
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

export function WaveAnim({ heightM, periodS, coastal = true, className = '' }: {
  heightM: number | null; periodS: number | null; coastal?: boolean; className?: string
}) {
  const h = coastal ? (heightM ?? 0) : 0.15
  const amp = clamp(h * 5, 1.5, 15)
  const wl = clamp((periodS ?? 6) * 9, 40, 130)
  const dur = clamp((periodS ?? 6) * 0.45, 1.8, 7)
  const W = 200, H = 48, mid = 24
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden
      className={`rr-anim block h-full w-full ${className}`}>
      <g style={{ ['--wl' as string]: `${(wl * 1.3).toFixed(1)}px`, animation: `rr-wave ${(dur * 1.7).toFixed(2)}s linear infinite` }}>
        <path d={`${sinePath(W, wl * 1.3, amp * 0.6, mid + 7)} V${H} H0 Z`} fill="currentColor" opacity="0.22" />
      </g>
      <g style={{ ['--wl' as string]: `${wl.toFixed(1)}px`, animation: `rr-wave ${dur.toFixed(2)}s linear infinite` }}>
        <path d={`${sinePath(W, wl, amp, mid)} V${H} H0 Z`} fill="currentColor" opacity="0.5" />
      </g>
    </svg>
  )
}

export function WindAnim({ kph, className = '' }: { kph: number; className?: string }) {
  const crossing = clamp(70 / Math.max(kph, 4), 0.8, 7) // seconds for a streak to cross
  const opacity = clamp(kph / 35, 0.3, 1)
  const streaks: [number, number][] = [[10, 70], [20, 44], [30, 92], [40, 56], [52, 36]]
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden
      className={`rr-anim block h-full w-full ${className}`}>
      {streaks.map(([y, len], i) => (
        <line key={i} x1={-len} x2={0} y1={y} y2={y}
          stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity={opacity * (0.55 + (i % 2) * 0.45)}
          style={{ animation: `rr-streak ${crossing.toFixed(2)}s linear infinite`, animationDelay: `${(-(i * crossing) / streaks.length).toFixed(2)}s` }} />
      ))}
    </svg>
  )
}

export type RoadState = 'dry' | 'wet' | 'snow'

export function roadState(s: { tempC: number; precipMm: number; snowCm: number | null }): { state: RoadState; label: string } {
  if ((s.snowCm ?? 0) > 0 || (s.tempC <= 1 && s.precipMm > 0)) return { state: 'snow', label: 'snow and ice — chains or stay put' }
  if (s.precipMm >= 0.5) return { state: 'wet', label: `wet — ${s.precipMm.toFixed(1)} mm, ease off` }
  if (s.tempC <= 2) return { state: 'dry', label: `dry at ${Math.round(s.tempC)} °C — watch for black ice` }
  return { state: 'dry', label: `dry — ${Math.round(s.tempC)} °C` }
}

export function RoadAnim({ state, className = '' }: { state: RoadState; className?: string }) {
  const asphalt = state === 'snow' ? '#E2D5BE' : state === 'wet' ? '#2B241E' : '#3A3129'
  const dash = state === 'snow' ? '#8E7E6A' : state === 'wet' ? '#F5F0E6' : '#D9A21B'
  const edge = state === 'snow' ? '#B8A88C' : '#F5F0E6'
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden
      className={`rr-anim block h-full w-full ${className}`}>
      <rect x="0" y="14" width="200" height="32" rx="3" fill={asphalt} />
      <line x1="0" x2="200" y1="18" y2="18" stroke={edge} strokeOpacity="0.5" strokeWidth="1.5" />
      <line x1="0" x2="200" y1="42" y2="42" stroke={edge} strokeOpacity="0.5" strokeWidth="1.5" />
      <line x1="0" x2="200" y1="30" y2="30" stroke={dash} strokeWidth="3" strokeDasharray="16 14"
        style={{ animation: 'rr-dash 1.1s linear infinite' }} />
      {state === 'wet' && [38, 112, 164].map((x, i) => (
        <ellipse key={i} cx={x} cy={36 - (i % 2) * 8} rx={14 + i * 3} ry="3.5" fill="#5A8AA8" opacity="0.35" />
      ))}
      {state === 'snow' && [12, 48, 80, 118, 150, 186].map((x, i) => (
        <circle key={i} cx={x} cy="-4" r={1.6 + (i % 3) * 0.5} fill="#F5F0E6"
          style={{ animation: `rr-flake ${(2.2 + (i % 4) * 0.5).toFixed(1)}s linear infinite`, animationDelay: `${(-i * 0.6).toFixed(1)}s` }} />
      ))}
    </svg>
  )
}

// Where the sun sits between sunrise and sunset, as a static arc
export function SunArc({ localTime, sunrise, sunset, className = '' }: { localTime: string; sunrise: string; sunset: string; className?: string }) {
  const mins = (t: string) => { const h = parseInt(t.slice(11, 13), 10), m = parseInt(t.slice(14, 16), 10); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null }
  const now = mins(localTime), rise = mins(sunrise), set = mins(sunset)
  const t = now != null && rise != null && set != null && set > rise ? clamp((now - rise) / (set - rise), 0, 1) : 0.5
  const up = now != null && rise != null && set != null ? now >= rise && now <= set : true
  const x = 20 + t * 160
  const y = 50 - Math.sin(t * Math.PI) * 34
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden className={`block h-full w-full ${className}`}>
      <path d="M20 50 A80 80 0 0 1 180 50" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="3 5" />
      <line x1="10" x2="190" y1="50" y2="50" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx={x} cy={y} r="6" fill={up ? '#D9A21B' : '#8E7E6A'} />
      {up && <circle cx={x} cy={y} r="11" fill="#D9A21B" opacity="0.2" />}
    </svg>
  )
}

// The ground itself: a slab of concrete (or a strip of dirt) that shows what's on it.
// Puddles shimmer when it's wet, shrink to patches while it dries, snow drifts down, ice glints.
export function GroundAnim({ ground, dirt = false, className = '' }: {
  ground: 'dry' | 'drying' | 'wet' | 'mud' | 'snow' | 'ice'; dirt?: boolean; className?: string
}) {
  const slab = dirt
    ? (ground === 'mud' || ground === 'wet' ? '#5C4128' : ground === 'drying' ? '#7A5A3A' : '#9C7A52')
    : (ground === 'wet' ? '#8A8278' : ground === 'drying' ? '#B4AC9F' : ground === 'snow' ? '#E8E2D6' : ground === 'ice' ? '#C9D3D6' : '#C8C0B2')
  const seams = dirt ? 'none' : '#9E9588'
  const puddles: [number, number, number][] = ground === 'wet' || ground === 'mud'
    ? [[30, 38, 18], [92, 32, 26], [150, 40, 20], [182, 30, 10]]
    : ground === 'drying' ? [[60, 38, 9], [148, 34, 7]] : []
  return (
    <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden className={`rr-anim block h-full w-full ${className}`}>
      <rect x="0" y="14" width="200" height="40" rx="3" fill={slab} />
      {!dirt && [50, 100, 150].map(x => <line key={x} x1={x} x2={x} y1="14" y2="54" stroke={seams} strokeWidth="1" opacity="0.6" />)}
      {dirt && ground !== 'snow' && [[20, 48], [70, 44], [120, 50], [170, 46]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#4A3420" opacity="0.5" />
      ))}
      {puddles.map(([x, y, rx], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={rx / 5 + 1.5} fill={dirt ? '#3B2A1A' : '#5A8AA8'} opacity={ground === 'drying' ? 0.25 : 0.45}
          style={{ animation: `rr-shimmer ${(2.4 + i * 0.4).toFixed(1)}s ease-in-out infinite`, animationDelay: `${(-i * 0.7).toFixed(1)}s` }} />
      ))}
      {ground === 'ice' && [40, 110, 165].map((x, i) => (
        <path key={i} d={`M${x} 30 l6 -4 l6 4 l-6 4 z`} fill="#F5F0E6" opacity="0.8"
          style={{ animation: `rr-shimmer ${(1.8 + i * 0.5).toFixed(1)}s ease-in-out infinite` }} />
      ))}
      {ground === 'snow' && [12, 48, 80, 118, 150, 186].map((x, i) => (
        <circle key={i} cx={x} cy="-4" r={1.6 + (i % 3) * 0.5} fill="#F5F0E6"
          style={{ animation: `rr-flake ${(2.2 + (i % 4) * 0.5).toFixed(1)}s linear infinite`, animationDelay: `${(-i * 0.6).toFixed(1)}s` }} />
      ))}
      {ground === 'dry' && !dirt && (
        <line x1="-40" x2="0" y1="34" y2="34" stroke="#1F1A15" strokeWidth="3" strokeLinecap="round" opacity="0.35"
          style={{ animation: 'rr-streak 2.4s linear infinite' }} />
      )}
    </svg>
  )
}
