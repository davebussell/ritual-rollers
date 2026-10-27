// The rider in the 3D ride: one dimension along the line (distance s), plus height when airborne.
// Pure functions, so tests can drive them. Units: metres, seconds, m/s.
//
// What the rider can do: pedal (or push), pump (press on the backside of a roller to gain speed, ease off on the face),
// and brake. Corners have a speed limit set by their radius, banking and grip: over it you skid, well over it you crash.
// Crests throw you into the air when you're fast enough; land on a downslope to keep your speed.

import { pointAt, type RidePath } from '@/lib/ride/path'

export type Rider = 'bike' | 'board' | 'skates'

export interface RiderSpec {
  label: string
  mass: number          // kg, rider and wheels
  power: number         // W, pedalling or pushing
  pedalTop: number      // m/s: pedalling stops adding speed here
  crr: number           // rolling resistance on a hard surface
  crrDirt: number
  cda: number           // m²
  brake: number         // m/s²
  grip: number          // tyre or wheel grip
  eye: number           // eye height, m
  hardLanding: number   // m/s into the ground before a crash
}

export const RIDERS: Record<Rider, RiderSpec> = {
  bike: { label: 'Bike', mass: 88, power: 380, pedalTop: 10, crr: 0.006, crrDirt: 0.016, cda: 0.5, brake: 6, grip: 0.85, eye: 1.55, hardLanding: 7.5 },
  board: { label: 'Board', mass: 78, power: 170, pedalTop: 6.5, crr: 0.012, crrDirt: 0.08, cda: 0.45, brake: 2.8, grip: 0.7, eye: 1.6, hardLanding: 4.5 },
  skates: { label: 'Skates', mass: 76, power: 230, pedalTop: 7.5, crr: 0.009, crrDirt: 0.07, cda: 0.45, brake: 3.4, grip: 0.75, eye: 1.62, hardLanding: 5 },
}

export interface Input { pedal: boolean; pump: boolean; brake: boolean }

export interface RideState {
  s: number              // distance along the path, m (horizontal)
  v: number              // speed along the surface, m/s (negative = rolling back)
  air: boolean
  y: number              // height when airborne
  vy: number             // vertical speed when airborne
  vh: number             // horizontal speed when airborne
  airTime: number        // seconds in the current jump
  crashed: number        // seconds left of a crash (0 = riding)
  skid: number           // 0..1, how hard the rider is sliding this frame
  pumpGood: number       // last pump: +1 well timed, -1 into a face, decays to 0
  landing: 'clean' | 'rough' | null
  lastLanding: number    // seconds since the last landing
  dirt: boolean
  // run stats
  maxSpeed: number
  totalAir: number
  bestAir: number
}

export function startState(s = 0, dirt = false): RideState {
  return { s, v: 0, air: false, y: 0, vy: 0, vh: 0, airTime: 0, crashed: 0, skid: 0, pumpGood: 0, landing: null, lastLanding: 99, dirt, maxSpeed: 0, totalAir: 0, bestAir: 0 }
}

const G = 9.81
const RHO = 1.2

// The fastest a corner can be taken: radius from the curvature, helped by the berm when it leans the right way
export function cornerLimit(curv: number, bank: number, grip: number): number {
  const k = Math.abs(curv)
  if (k < 1e-4) return Infinity
  const b = Math.sign(curv) === Math.sign(bank) ? Math.abs(bank) : -Math.abs(bank) * 0.5
  const num = Math.sin(b) + grip * Math.cos(b)
  const den = Math.cos(b) - grip * Math.sin(b)
  if (den <= 0.02) return Infinity
  return Math.sqrt(Math.max(0.5, (num / den) / k * G))
}

export interface StepEvents { crashed?: string; landed?: 'clean' | 'rough'; tookOff?: boolean; reachedEnd?: boolean; reachedStart?: boolean }

// Advance by dt (call with small steps; stepFor() splits a frame)
export function step(st: RideState, inp: Input, path: RidePath, spec: RiderSpec, dt: number): StepEvents {
  const ev: StepEvents = {}
  st.lastLanding += dt
  st.pumpGood *= Math.exp(-dt * 2.5)
  st.skid = Math.max(0, st.skid - dt * 3)
  if (st.crashed > 0) {
    st.crashed -= dt
    st.v = 0
    return ev
  }
  const span = path.closed ? path.length : (path.n - 1) * path.ds
  const p = pointAt(path, st.s)
  const crr = st.dirt || path.style === 'trail' ? spec.crrDirt : spec.crr

  if (st.air) {
    st.airTime += dt
    st.vy -= G * dt
    st.vh -= Math.sign(st.vh) * (0.5 * RHO * spec.cda * st.vh * st.vh / spec.mass) * dt
    st.y += st.vy * dt
    st.s += st.vh * dt
    const q = pointAt(path, st.s)
    if (st.y <= q.h) {
      // land: keep the part of the speed that runs along the slope
      const th = Math.atan(q.slope)
      const along = st.vh * Math.cos(th) + st.vy * Math.sin(th)
      const into = -(-st.vh * Math.sin(th) + st.vy * Math.cos(th))
      st.air = false
      st.y = q.h
      st.totalAir += st.airTime
      st.bestAir = Math.max(st.bestAir, st.airTime)
      st.airTime = 0
      st.lastLanding = 0
      if (into > spec.hardLanding) {
        crash(st)
        ev.crashed = 'Cased it. Too hard a landing.'
        return ev
      }
      const clean = into < spec.hardLanding * 0.45
      st.v = along * (clean ? 0.99 : 0.9)
      st.landing = clean ? 'clean' : 'rough'
      ev.landed = st.landing
    }
  } else {
    const th = Math.atan(p.slope)
    const sin = Math.sin(th), cos = Math.cos(th)
    let a = -G * sin
    if (inp.pedal && st.v < spec.pedalTop) {
      const taper = Math.min(1, (spec.pedalTop - st.v) / 1.5)
      a += Math.min(3, spec.power / (spec.mass * Math.max(1.2, Math.abs(st.v)))) * taper
    }
    if (inp.pump && Math.abs(st.v) > 1) {
      // pushing down on a backside turns height into speed; pushing into a face costs speed
      const down = -sin * Math.sign(st.v)
      if (down > 0.02) { a += Math.sign(st.v) * 0.6 * G * down; st.pumpGood = Math.min(1, st.pumpGood + dt * 4) }
      else if (down < -0.02) { a += Math.sign(st.v) * 0.35 * G * down; st.pumpGood = Math.max(-1, st.pumpGood - dt * 4) }
    }
    if (inp.brake) a -= Math.sign(st.v) * spec.brake
    a -= Math.sign(st.v) * (crr * G * cos + (0.5 * RHO * spec.cda * st.v * st.v) / spec.mass)
    const before = st.v
    st.v += a * dt
    // brakes and friction stop you; they don't push you backwards
    if (Math.sign(st.v) !== Math.sign(before) && before !== 0 && (inp.brake || Math.abs(sin) < 0.03)) st.v = 0
    if (!inp.pedal && Math.abs(st.v) < 0.03 && Math.abs(sin) < 0.03) st.v = 0

    // corners
    const limit = cornerLimit(p.curv, p.bank, spec.grip)
    const speed = Math.abs(st.v)
    if (speed > limit) {
      if (speed > limit * 1.45 && speed > 4) {
        crash(st)
        ev.crashed = 'Washed out in the turn. Brake before the corner.'
        return ev
      }
      st.skid = Math.min(1, (speed - limit) / (limit * 0.3) + 0.3)
      st.v -= Math.sign(st.v) * Math.min(speed - limit, 9 * dt)
    }

    st.s += st.v * cos * dt

    // crests: leave the ground when the curve of the profile asks for more than gravity can give
    const q = pointAt(path, st.s)
    const kv = q.vcurv / Math.pow(1 + q.slope * q.slope, 1.5)
    if (st.v > 3 && kv < 0 && st.v * st.v * -kv > G * Math.cos(Math.atan(q.slope)) * 1.05) {
      const t2 = Math.atan(q.slope)
      st.air = true
      st.vh = st.v * Math.cos(t2)
      st.vy = st.v * Math.sin(t2) + 0.2
      st.y = q.h + 0.01
      st.airTime = 0
      ev.tookOff = true
    }
  }

  if (!path.closed) {
    if (st.s >= span) { st.s = span; ev.reachedEnd = true }
    if (st.s < 0) { st.s = 0; st.v = Math.max(0, st.v); ev.reachedStart = true; if (st.air) { st.air = false } }
  } else {
    st.s = ((st.s % span) + span) % span
  }
  st.maxSpeed = Math.max(st.maxSpeed, Math.abs(st.v), st.air ? Math.hypot(st.vh, st.vy) : 0)
  return ev
}

function crash(st: RideState) {
  st.crashed = 1.6
  st.v = 0
  st.air = false
  st.airTime = 0
  st.skid = 0
}

// After a crash: back up a few metres and stand still
export function respawn(st: RideState, path: RidePath) {
  const span = path.closed ? path.length : (path.n - 1) * path.ds
  st.s = path.closed ? ((st.s - 8) % span + span) % span : Math.max(0, st.s - 8)
  st.v = 0
  st.air = false
  st.crashed = 0
  st.y = pointAt(path, st.s).h
}

// One frame, in fixed sub-steps; the events of the frame merged
export function stepFor(st: RideState, inp: Input, path: RidePath, spec: RiderSpec, frame: number): StepEvents {
  const out: StepEvents = {}
  const n = Math.max(1, Math.ceil(Math.min(frame, 0.1) / (1 / 240)))
  const dt = Math.min(frame, 0.1) / n
  for (let i = 0; i < n; i++) {
    const ev = step(st, inp, path, spec, dt)
    Object.assign(out, ev)
    if (ev.crashed || ev.reachedEnd) break
  }
  return out
}

// Where the rider's head is
export function riderHeight(st: RideState, path: RidePath): number {
  return st.air ? st.y : pointAt(path, st.s).h
}
