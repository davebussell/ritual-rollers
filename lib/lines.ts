// The lines inside each park (trails, BMX and pump track lines) and its outline, from OpenStreetMap.
// scripts/fetch-lines.mjs writes one file per park to public/lines/<id>.json (fetched by the browser for the 3D park
// map) and a summary of every park to data/lines-index.json (read here, on the server).
// Data © OpenStreetMap contributors (ODbL).

import raw from '@/data/lines-index.json'
import type { ParkKind } from '@/lib/parks'

export type Difficulty = 'green' | 'blue' | 'black' | 'double'
export type LineKind = 'trail' | 'track' | 'path'

// One park's file, as the browser gets it
export interface ParkLine {
  id: string                 // the first OSM way it was built from
  kind: LineKind
  name: string | null
  m: number                  // length in metres
  c: [number, number][]      // [lng, lat]
  diff?: Difficulty
  surface?: string
  oneway?: 1 | -1
  ways?: string[]
}
export interface ParkLines {
  source: string
  id: string
  name: string | null
  kind: ParkKind
  outline: [number, number][][]
  lines: ParkLine[]
  fromOutline?: boolean      // the track is mapped as an area: its line is the area's edge
}

// The summary
export interface LinesEntry {
  o: 0 | 1                                         // has an outline
  n?: number                                       // lines
  m?: number                                       // metres of line in all
  d?: Record<Difficulty, number>                   // trails by difficulty
  t?: [string, Difficulty | LineKind, number][]    // named trails and tracks: name, difficulty (or kind), metres
  r?: 1                                            // has a trail or track line 30 m or longer
  fo?: 1                                           // fromOutline
}

const data = raw as unknown as { fetched: string; parks: Record<string, LinesEntry> }
export const LINES_FETCHED = data.fetched

export function linesFor(id: string): LinesEntry | null {
  return data.parks[id] ?? null
}

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string; sign: string }> = {
  green: { label: 'Easiest', color: '#3E8E41', sign: 'Green circle' },
  blue: { label: 'More difficult', color: '#2D68B0', sign: 'Blue square' },
  black: { label: 'Very difficult', color: '#1F201C', sign: 'Black diamond' },
  double: { label: 'Extremely difficult', color: '#1F201C', sign: 'Double black diamond' },
}

export const UNRATED_COLOR = '#8B887D'
export const PATH_COLOR = '#A3A097'

export function lineColor(l: Pick<ParkLine, 'kind' | 'diff'>, parkKind: ParkKind): string {
  if (l.kind === 'track') return parkKind === 'bmx' ? '#C2571A' : '#B98500'
  if (l.diff) return DIFFICULTY_META[l.diff].color
  return l.kind === 'path' ? PATH_COLOR : UNRATED_COLOR
}

export function metres(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1)} km` : `${Math.round(m / 10) * 10} m`
}
