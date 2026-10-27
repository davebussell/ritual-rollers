// The line a rider follows in the 3D ride: a mapped OSM line in local metres, smoothed and resampled every half
// metre, laid on the ground, with its slope, curvature and banking.
// What's real and what isn't: the line is the mapped one and the ground is the elevation data. On pump and BMX
// tracks the rollers, berms and start hill are generated (elevation data is far too coarse to show them), so
// they're shaped like a typical track, not like this one. Trails get no generated features.

export type RideStyle = 'pump' | 'bmx' | 'trail' | 'path'

export interface RidePath {
  style: RideStyle
  n: number
  ds: number
  length: number
  closed: boolean
  width: number
  generated: boolean
  x: Float32Array
  z: Float32Array
  h: Float32Array        // the riding surface along the centre line
  ground: Float32Array   // the ground under it, before generated features
  slope: Float32Array    // dh/ds
  vcurv: Float32Array    // d²h/ds²
  curv: Float32Array     // horizontal curvature, 1/m; positive turns left
  bank: Float32Array     // radians; positive is banked for a left turn (right edge high)
  heading: Float32Array  // radians from east, counter-clockwise (north is +π/2)
}

export const WIDTH: Record<RideStyle, number> = { pump: 2.2, bmx: 4.5, trail: 1.3, path: 2.2 }
const G = 9.81

function dedupe(pts: [number, number][], min = 0.05): [number, number][] {
  const out: [number, number][] = []
  for (const p of pts) {
    const q = out[out.length - 1]
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > min) out.push(p)
  }
  return out
}

// Chaikin corner cutting: rounds the corners OSM lines have at every node
function chaikin(pts: [number, number][], closed: boolean, rounds = 2): [number, number][] {
  let p = pts
  for (let r = 0; r < rounds; r++) {
    const out: [number, number][] = []
    const n = p.length
    if (!closed) out.push(p[0])
    const segs = closed ? n : n - 1
    for (let i = 0; i < segs; i++) {
      const a = p[i], b = p[(i + 1) % n]
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    if (!closed) out.push(p[n - 1])
    p = out
  }
  return p
}

function resample(pts: [number, number][], closed: boolean, ds: number): { x: Float32Array; z: Float32Array; length: number } {
  const p = closed ? [...pts, pts[0]] : pts
  const cum = [0]
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]))
  const length = cum[cum.length - 1]
  const n = closed ? Math.max(8, Math.round(length / ds)) : Math.max(2, Math.round(length / ds) + 1)
  const step = closed ? length / n : length / (n - 1)
  const x = new Float32Array(n), z = new Float32Array(n)
  let k = 0
  for (let i = 0; i < n; i++) {
    const s = i * step
    while (k < cum.length - 2 && cum[k + 1] < s) k++
    const seg = cum[k + 1] - cum[k] || 1
    const t = Math.min(1, Math.max(0, (s - cum[k]) / seg))
    x[i] = p[k][0] + (p[k + 1][0] - p[k][0]) * t
    z[i] = p[k][1] + (p[k + 1][1] - p[k][1]) * t
  }
  return { x, z, length: closed ? length : (n - 1) * step }
}

// Moving average over ±half samples (wrapping on a loop, shrinking at the ends of an open line)
function smooth(a: Float32Array, half: number, closed: boolean): Float32Array {
  const n = a.length, out = new Float32Array(n)
  if (half < 1) { out.set(a); return out }
  for (let i = 0; i < n; i++) {
    let sum = 0, cnt = 0
    for (let k = -half; k <= half; k++) {
      let j = i + k
      if (closed) j = ((j % n) + n) % n
      else if (j < 0 || j >= n) continue
      sum += a[j]; cnt++
    }
    out[i] = sum / cnt
  }
  return out
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export interface PathOptions {
  style: RideStyle
  groundHeight: (x: number, z: number) => number
  reverse?: boolean
}

export function buildPath(points: [number, number][], opts: PathOptions): RidePath {
  const ds = 0.5
  let pts = dedupe(points)
  if (opts.reverse) pts = [...pts].reverse()
  let raw = 0
  for (let i = 1; i < pts.length; i++) raw += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  const first = pts[0], last = pts[pts.length - 1]
  const closed = pts.length > 3 && raw > 20 && Math.hypot(first[0] - last[0], first[1] - last[1]) < 2.5
  if (closed) pts = pts.slice(0, -1)
  const { x, z, length } = resample(chaikin(pts, closed), closed, ds)
  const n = x.length
  const at = (i: number) => (closed ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i)))

  // heading and curvature
  const heading = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = at(i - 1), b = at(i + 1)
    heading[i] = Math.atan2(-(z[b] - z[a]), x[b] - x[a])
  }
  const kWin = 6 // ±3 m
  const curvRaw = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = at(i - kWin), b = at(i + kWin)
    const span = closed ? 2 * kWin * ds : (b - a) * ds
    curvRaw[i] = span > 0 ? wrapAngle(heading[b] - heading[a]) / span : 0
  }
  const curv = smooth(curvRaw, 4, closed)

  // the ground along the line, smoothed so the ride doesn't feel every cell of the elevation grid
  const groundRaw = new Float32Array(n)
  for (let i = 0; i < n; i++) groundRaw[i] = opts.groundHeight(x[i], z[i])
  const style = opts.style
  const gs = smooth(groundRaw, style === 'trail' || style === 'path' ? 8 : 16, closed)
  const ground = new Float32Array(n)
  for (let i = 0; i < n; i++) ground[i] = Math.max(gs[i], groundRaw[i] + 0.03)

  // generated track features
  const gen = new Float32Array(n)
  const bankRaw = new Float32Array(n)
  const generated = style === 'pump' || style === 'bmx'
  if (generated) {
    const design = style === 'pump' ? 6.5 : 8.5        // speed the berms are shaped for, m/s
    const maxBank = (style === 'pump' ? 38 : 34) * (Math.PI / 180)
    for (let i = 0; i < n; i++) {
      const k = curv[i]
      bankRaw[i] = Math.sign(k) * Math.min(maxBank, Math.atan((design * design * Math.abs(k)) / G))
    }
    // rollers on the straights, fading out where the line turns
    const straightRaw = new Float32Array(n)
    for (let i = 0; i < n; i++) straightRaw[i] = Math.max(0, Math.min(1, 1 - Math.abs(curv[i]) * 6))
    const straight = smooth(straightRaw, 6, closed)
    const amp = style === 'pump' ? 0.55 : 0.7     // crest to trough, m
    let lambda = style === 'pump' ? 5.2 : 6.0   // crest to crest, m
    if (closed) lambda = length / Math.max(1, Math.round(length / lambda))
    for (let i = 0; i < n; i++) {
      const s = i * ds
      let a = amp * straight[i]
      if (style === 'bmx' && !closed) {
        // start hill, a run-out to the first roller, and a flat finish
        const startLen = 14, hill = 3.2
        if (s < startLen) gen[i] += hill * (1 - s / startLen) ** 2
        a *= Math.min(1, Math.max(0, (s - 20) / 6)) * Math.min(1, Math.max(0, (length - s - 12) / 6))
      } else if (!closed) {
        a *= Math.min(1, s / 4) * Math.min(1, (length - s) / 4)
      }
      gen[i] += a * 0.5 * (1 - Math.cos((2 * Math.PI * s) / lambda))
    }
  }
  const bank = smooth(bankRaw, 6, closed)
  // berms sit up a little as well as tilting
  const h = new Float32Array(n)
  for (let i = 0; i < n; i++) h[i] = ground[i] + gen[i] + Math.abs(Math.sin(bank[i])) * 0.25

  const slope = new Float32Array(n), vraw = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const a = at(i - 1), b = at(i + 1)
    const span = closed ? 2 * ds : (b - a) * ds
    slope[i] = span > 0 ? (h[b] - h[a]) / span : 0
  }
  for (let i = 0; i < n; i++) {
    const a = at(i - 1), b = at(i + 1)
    const span = closed ? 2 * ds : (b - a) * ds
    vraw[i] = span > 0 ? (slope[b] - slope[a]) / span : 0
  }
  const vcurv = smooth(vraw, 1, closed)

  return { style, n, ds, length, closed, width: WIDTH[style], generated, x, z, h, ground, slope, vcurv, curv, bank, heading }
}

export interface PathPoint { x: number; z: number; h: number; slope: number; vcurv: number; curv: number; bank: number; heading: number }

// Everything at a distance s along the path (wraps on a loop, clamps on an open line)
export function pointAt(p: RidePath, s: number): PathPoint {
  const span = p.closed ? p.length : (p.n - 1) * p.ds
  let ss = p.closed ? ((s % span) + span) % span : Math.min(span, Math.max(0, s))
  const f = ss / p.ds
  let i = Math.floor(f)
  if (!p.closed && i >= p.n - 1) { i = p.n - 2; ss = span }
  const t = Math.min(1, Math.max(0, f - i))
  const j = p.closed ? (i + 1) % p.n : i + 1
  const lerp = (a: Float32Array) => a[i] + (a[j] - a[i]) * t
  const dh = wrapAngle(p.heading[j] - p.heading[i])
  return {
    x: lerp(p.x), z: lerp(p.z), h: lerp(p.h), slope: lerp(p.slope), vcurv: lerp(p.vcurv),
    curv: lerp(p.curv), bank: lerp(p.bank), heading: p.heading[i] + dh * t,
  }
}

// Total climb and descent along the ground (for choosing which way a trail is ridden)
export function dropAlong(points: [number, number][], groundHeight: (x: number, z: number) => number): number {
  if (points.length < 2) return 0
  const a = points[0], b = points[points.length - 1]
  return groundHeight(a[0], a[1]) - groundHeight(b[0], b[1])
}
