// A trail's ups and downs: elevation along the line from the terrain tiles (lib/terrain.ts), with the climb, the drop
// and the steepest stretch. The elevation data is 3–30 m detail, so this is the shape of the hill, not every bump.

export interface Profile {
  d: number[]          // distance along the line, m
  h: number[]          // elevation, m (smoothed)
  pts: [number, number][]   // [lng, lat] at each sample
  length: number
  climb: number        // total metres up
  drop: number         // total metres down
  maxGrade: number     // steepest 30 m stretch, as a fraction (0.12 = 12 %)
  grade: number[]      // grade at each sample, averaged over about 25 m
  start: number
  end: number
  min: number
  max: number
}

const R = 6371008.8
function metresBetween(a: [number, number], b: [number, number]) {
  const kx = (Math.PI / 180) * R * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180)), ky = (Math.PI / 180) * R
  return Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * ky)
}

// Points every `step` metres along a line
export function resampleLine(c: [number, number][], step: number): { pts: [number, number][]; d: number[] } {
  const pts: [number, number][] = [c[0]], d = [0]
  let carry = 0, total = 0
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i]
    const seg = metresBetween(a, b)
    let t = step - carry
    while (t <= seg) {
      const f = t / seg
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
      d.push(total + t)
      t += step
    }
    carry = seg - (t - step)
    total += seg
  }
  const last = c[c.length - 1]
  if (total - d[d.length - 1] > step * 0.3) { pts.push(last); d.push(total) }
  return { pts, d }
}

export function profileAlong(c: [number, number][], elevation: (lng: number, lat: number) => number, step = 5): Profile {
  const { pts, d } = resampleLine(c, step)
  const raw = pts.map(([lng, lat]) => elevation(lng, lat))
  // a light moving average: the tiles' pixel steps aren't climbs
  const half = Math.max(1, Math.round(10 / step))
  const h = raw.map((_, i) => {
    let s = 0, n = 0
    for (let k = -half; k <= half; k++) { const j = i + k; if (j >= 0 && j < raw.length) { s += raw[j]; n++ } }
    return s / n
  })
  // climb and drop with a 1 m dead band, so flat noise doesn't add up
  let climb = 0, drop = 0, ref = h[0]
  for (const v of h) {
    if (v - ref >= 1) { climb += v - ref; ref = v }
    else if (ref - v >= 1) { drop += ref - v; ref = v }
  }
  let maxGrade = 0
  const w = Math.max(1, Math.round(30 / step))
  for (let i = w; i < h.length; i++) {
    const g = Math.abs(h[i] - h[i - w]) / (d[i] - d[i - w] || 1)
    if (g > maxGrade) maxGrade = g
  }
  const gw = Math.max(1, Math.round(12.5 / step))
  const grade = h.map((_, i) => {
    const a = Math.max(0, i - gw), b = Math.min(h.length - 1, i + gw)
    return b > a ? (h[b] - h[a]) / (d[b] - d[a] || 1) : 0
  })
  return {
    d, h, pts, length: d[d.length - 1] ?? 0, climb, drop, maxGrade, grade,
    start: h[0], end: h[h.length - 1], min: Math.min(...h), max: Math.max(...h),
  }
}

// Which way a trail is ridden: one-way as mapped, otherwise from its high end down
export function downhill(c: [number, number][], elevation: (lng: number, lat: number) => number, oneway?: 1 | -1): [number, number][] {
  if (oneway === 1) return c
  if (oneway === -1) return [...c].reverse()
  const a = elevation(c[0][0], c[0][1]), b = elevation(c[c.length - 1][0], c[c.length - 1][1])
  return b > a + 2 ? [...c].reverse() : c
}

export function gradeColor(g: number): string {
  const a = Math.abs(g)
  return a < 0.05 ? '#3E8E41' : a < 0.1 ? '#C9A227' : a < 0.15 ? '#D9822B' : '#D4402A'
}
