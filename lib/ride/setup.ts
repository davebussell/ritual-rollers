// Choices the ride makes before it starts: what each line is ridden as, who can ride it, which way, how much of the
// park to build, and where to go when a line ends. Pure, so it's tested in tests/ride.test.ts.

import type { ParkLine, ParkLines } from '@/lib/lines'
import type { ParkKind } from '@/lib/parks'
import type { Surface } from '@/lib/sports'
import type { RideStyle } from '@/lib/ride/path'
import type { Rider } from '@/lib/ride/physics'
import type { Box, Projection } from '@/lib/ride/terrain'
import type { WheelId } from '@/lib/wheels'

export function styleFor(l: Pick<ParkLine, 'kind' | 'm'>, parkKind: ParkKind): RideStyle {
  if (l.kind === 'path') return 'path'
  if (l.kind === 'track') {
    if (parkKind === 'pump') return l.m <= 600 ? 'pump' : 'trail'
    if (parkKind === 'bmx') return l.m <= 800 ? 'bmx' : 'trail'
    return l.m <= 350 ? 'pump' : l.m <= 800 ? 'bmx' : 'trail'
  }
  return 'trail'
}

const PAVED = /asphalt|paved|concrete|paving|tartan|acrylic|metal/
const WOOD = /wood/

export type RideSurface = 'asphalt' | 'concrete' | 'dirt'

export function surfaceFor(l: Pick<ParkLine, 'surface'>, style: RideStyle, park: Surface): RideSurface {
  const s = (l.surface ?? '').toLowerCase()
  if (/concrete/.test(s)) return 'concrete'
  if (PAVED.test(s) || WOOD.test(s)) return 'asphalt'
  if (s) return 'dirt'
  if (style === 'pump') return park === 'dirt' ? 'dirt' : 'asphalt'
  return 'dirt'
}

// Boards and skates need a hard pump track; everything else is a bike line
export function ridersFor(style: RideStyle, surface: RideSurface): Rider[] {
  return style === 'pump' && surface !== 'dirt' ? ['bike', 'board', 'skates'] : ['bike']
}

export function riderForWheel(wheel: WheelId | null, allowed: Rider[]): Rider {
  const want: Rider = wheel === 'board' ? 'board' : wheel === 'skates' ? 'skates' : 'bike'
  return allowed.includes(want) ? want : 'bike'
}

export interface RideChoice {
  line: ParkLine
  style: RideStyle
  surface: RideSurface
  riders: Rider[]
  part?: [number, number]   // a trail mapped in pieces: this piece of how many
}

const DIFF_ORDER = { green: 0, blue: 1, black: 2, double: 3 } as const

// The lines worth riding, best first: tracks, then named trails easiest first, then the rest by length
export function rideList(park: ParkLines, parkSurface: Surface): RideChoice[] {
  const out: RideChoice[] = []
  for (const line of park.lines) {
    if (line.kind === 'path' || line.m < 30) continue
    const style = styleFor(line, park.kind)
    const surface = surfaceFor(line, style, parkSurface)
    out.push({ line, style, surface, riders: ridersFor(style, surface) })
  }
  // in a bike park the trails come first (a tiny pump track shouldn't be the default); elsewhere the track does
  const trackFirst = park.kind !== 'bike'
  const rank = (c: RideChoice) => (c.line.kind === 'track' ? (trackFirst ? 0 : 2) : c.line.name ? 1 : 3) + (c.line.m < 60 ? 4 : 0)
  out.sort((a, b) => rank(a) - rank(b)
    || (a.line.diff && b.line.diff ? DIFF_ORDER[a.line.diff] - DIFF_ORDER[b.line.diff] : a.line.diff ? -1 : b.line.diff ? 1 : 0)
    || b.line.m - a.line.m)
  // a trail OSM splits into pieces keeps its name on each: number them, longest first
  const byName = new Map<string, RideChoice[]>()
  for (const c of out) if (c.line.name) byName.set(c.line.name, [...(byName.get(c.line.name) ?? []), c])
  for (const group of byName.values()) if (group.length > 1) {
    [...group].sort((a, b) => b.line.m - a.line.m).forEach((c, i) => { c.part = [i + 1, group.length] })
  }
  return out
}

// The part of the park to build: around the chosen line, or the whole park when it's small
export function sceneBox(park: ParkLines, line: ParkLine, proj: Projection, style: RideStyle): { box: Box; lines: ParkLine[] } {
  const grow = (b: Box, pts: [number, number][]) => {
    for (const [lng, lat] of pts) {
      const [x, z] = proj.toLocal(lng, lat)
      if (x < b.minX) b.minX = x; if (x > b.maxX) b.maxX = x
      if (z < b.minZ) b.minZ = z; if (z > b.maxZ) b.maxZ = z
    }
    return b
  }
  const empty = (): Box => ({ minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity })
  const all = empty()
  for (const r of park.outline) grow(all, r)
  for (const l of park.lines) grow(all, l.c)
  const small = Math.max(all.maxX - all.minX, all.maxZ - all.minZ) < 1500
  const margin = style === 'trail' ? 160 : 80
  let region: Box
  if (small) region = { ...all }
  else {
    region = grow(empty(), line.c)
    region = { minX: region.minX - 250, maxX: region.maxX + 250, minZ: region.minZ - 250, maxZ: region.maxZ + 250 }
  }
  const touches = (l: ParkLine) => l.c.some(([lng, lat]) => {
    const [x, z] = proj.toLocal(lng, lat)
    return x >= region.minX && x <= region.maxX && z >= region.minZ && z <= region.maxZ
  })
  const lines = park.lines.filter(l => l === line || touches(l))
  const box = empty()
  for (const l of lines) grow(box, l.c)
  if (small) for (const r of park.outline) grow(box, r)
  return { box: { minX: box.minX - margin, maxX: box.maxX + margin, minZ: box.minZ - margin, maxZ: box.maxZ + margin }, lines }
}

export interface Joint { id: string; reverse: boolean; turn: number; same?: boolean }

// Lines that carry on from a point heading a given way (radians from east, counter-clockwise), within 4 m
export function nextLines(
  at: [number, number], heading: number, from: string,
  candidates: { id: string; start: [number, number]; end: [number, number]; startHeading: number; endHeading: number; oneway?: 1 | -1; name?: string | null }[],
  name?: string | null,
): Joint[] {
  const out: Joint[] = []
  const turn = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
  for (const c of candidates) {
    if (c.id === from) continue
    if (c.oneway !== -1 && Math.hypot(c.start[0] - at[0], c.start[1] - at[1]) < 4) out.push({ id: c.id, reverse: false, turn: turn(c.startHeading, heading) })
    // ridden backwards, it starts at its end and heads the opposite way
    if (c.oneway !== 1 && Math.hypot(c.end[0] - at[0], c.end[1] - at[1]) < 4) out.push({ id: c.id, reverse: true, turn: turn(c.endHeading + Math.PI, heading) })
  }
  // the same trail carrying on comes first, then the straightest way on
  const same = (j: Joint) => (name && candidates.find(c => c.id === j.id)?.name === name ? 0 : 1)
  return out.filter(j => j.turn < 2.2).sort((a, b) => same(a) - same(b) || a.turn - b.turn).map(j => ({ ...j, same: same(j) === 0 }))
}
