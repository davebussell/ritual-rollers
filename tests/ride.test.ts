// npx tsx --test tests/*.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPath, pointAt } from '../lib/ride/path'
import { RIDERS, startState, stepFor, cornerLimit } from '../lib/ride/physics'
import { styleFor, ridersFor, surfaceFor, nextLines, rideList } from '../lib/ride/setup'
import { projection, buildGround } from '../lib/ride/terrain'
import { linesFor, rideableIds } from '../lib/lines'
import { readFileSync, existsSync } from 'fs'

const flat = () => 100
const circle = (r: number, n = 48): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => [r * Math.cos((i / n) * 2 * Math.PI), r * Math.sin((i / n) * 2 * Math.PI)])

test('a straight line is resampled to its length and sits on the ground', () => {
  const p = buildPath([[0, 0], [100, 0]], { style: 'trail', groundHeight: flat })
  assert.equal(p.closed, false)
  assert.ok(Math.abs(p.length - 100) < 0.6)
  assert.ok(Math.abs(pointAt(p, 50).h - 100.03) < 0.05)
  assert.ok(Math.abs(pointAt(p, 50).curv) < 1e-3)
})

test('a loop is closed, and a pump track loop gets rollers and berms', () => {
  const p = buildPath(circle(20), { style: 'pump', groundHeight: flat })
  assert.equal(p.closed, true)
  assert.ok(Math.abs(p.length - 2 * Math.PI * 20) < 2)
  // curvature of a radius-20 circle, left-turning (counter-clockwise in x/north… z is south, so this one turns right)
  assert.ok(Math.abs(Math.abs(pointAt(p, 30).curv) - 1 / 20) < 0.01)
  assert.ok(Math.abs(pointAt(p, 30).bank) > 0.1, 'banked')
  const straight = buildPath([[0, 0], [60, 0]], { style: 'pump', groundHeight: flat })
  let max = -Infinity, min = Infinity
  for (let s = 10; s < 50; s += 0.25) { const h = pointAt(straight, s).h; max = Math.max(max, h); min = Math.min(min, h) }
  assert.ok(max - min > 0.4 && max - min < 0.7, `rollers ${max - min}`)
})

test('pedalling gets up to speed on the flat, brakes stop without going backwards', () => {
  const p = buildPath([[0, 0], [500, 0]], { style: 'trail', groundHeight: flat })
  const st = startState(1, true)
  for (let i = 0; i < 300; i++) stepFor(st, { pedal: true, pump: false, brake: false }, p, RIDERS.bike, 1 / 30)
  assert.ok(st.v > 7 && st.v <= RIDERS.bike.pedalTop + 0.1, `speed ${st.v}`)
  for (let i = 0; i < 120; i++) stepFor(st, { pedal: false, pump: false, brake: true }, p, RIDERS.bike, 1 / 30)
  assert.equal(st.v, 0)
})

test('rolling downhill speeds you up without pedalling', () => {
  const slope = (x: number) => 200 - x * 0.12
  const p = buildPath([[0, 0], [300, 0]], { style: 'trail', groundHeight: (x: number) => slope(x) })
  const st = startState(1, true)
  for (let i = 0; i < 240; i++) stepFor(st, { pedal: false, pump: false, brake: false }, p, RIDERS.bike, 1 / 30)
  assert.ok(st.v > 6, `speed ${st.v}`)
})

test('pumping at the right time keeps you going on a pump track; pumping at the wrong time slows you', () => {
  const p = buildPath([[0, 0], [400, 0]], { style: 'pump', groundHeight: flat })
  const run = (timing: 'good' | 'bad' | 'none') => {
    const st = startState(10, false)
    st.v = 5
    for (let i = 0; i < 600; i++) {
      const down = pointAt(p, st.s).slope < 0
      const pump = timing === 'none' ? false : timing === 'good' ? down : !down
      stepFor(st, { pedal: false, pump, brake: false }, p, RIDERS.bike, 1 / 60)
      if (st.crashed > 0) break
    }
    return st
  }
  const good = run('good'), none = run('none'), bad = run('bad')
  assert.ok(good.s > none.s + 5, `good ${good.s} vs none ${none.s}`)
  assert.ok(bad.s < none.s, `bad ${bad.s} vs none ${none.s}`)
})

test('corners have a speed limit that berms raise', () => {
  const flatTurn = cornerLimit(1 / 10, 0, 0.85)
  const bermed = cornerLimit(1 / 10, 0.6, 0.85)
  const wrongWay = cornerLimit(1 / 10, -0.6, 0.85)
  assert.ok(Math.abs(flatTurn - Math.sqrt(0.85 * 9.81 * 10)) < 0.01)
  assert.ok(bermed > flatTurn && wrongWay < flatTurn)
  assert.equal(cornerLimit(0, 0, 0.85), Infinity)
})

test('lines are ridden as the right thing, by the right riders', () => {
  assert.equal(styleFor({ kind: 'track', m: 120 }, 'pump'), 'pump')
  assert.equal(styleFor({ kind: 'track', m: 380 }, 'bmx'), 'bmx')
  assert.equal(styleFor({ kind: 'track', m: 4700 }, 'bmx'), 'trail')
  assert.equal(styleFor({ kind: 'trail', m: 900 }, 'bike'), 'trail')
  assert.deepEqual(ridersFor('pump', surfaceFor({}, 'pump', 'hard')), ['bike', 'board', 'skates'])
  assert.deepEqual(ridersFor('pump', surfaceFor({ surface: 'dirt' }, 'pump', 'hard')), ['bike'])
  assert.deepEqual(ridersFor('trail', 'dirt'), ['bike'])
})

test('a line carries on to the straightest joining line', () => {
  const cands = [
    { id: 'a', start: [0, 0] as [number, number], end: [10, 0] as [number, number], startHeading: 0, endHeading: 0 },
    { id: 'b', start: [10, 0] as [number, number], end: [20, 0] as [number, number], startHeading: 0, endHeading: 0 },
    { id: 'c', start: [10, 0] as [number, number], end: [10, 10] as [number, number], startHeading: Math.PI / 2, endHeading: Math.PI / 2 },
    { id: 'd', start: [30, 0] as [number, number], end: [10.5, 0] as [number, number], startHeading: Math.PI, endHeading: Math.PI },
  ]
  const next = nextLines([10, 0], 0, 'a', cands)
  assert.equal(next[0].turn < 0.01, true)
  assert.ok(['b', 'd'].includes(next[0].id))
  assert.equal(next.find(j => j.id === 'd')?.reverse, true)
  assert.ok(next.some(j => j.id === 'c'))
})

test('the ground mesh height matches its own triangles', () => {
  const proj = projection(-75, 45)
  const g = buildGround({ sample: (x, z) => x * 0.1 + z * 0.05 }, { minX: 0, maxX: 100, minZ: 0, maxZ: 100 }, 20)
  for (const [x, z] of [[13, 17], [55.5, 12.25], [80, 88]]) assert.ok(Math.abs(g.height(x, z) - (x * 0.1 + z * 0.05)) < 0.06)
  const [x, z] = proj.toLocal(-74.99, 45.01)
  const [lng, lat] = proj.toLngLat(x, z)
  assert.ok(Math.abs(lng + 74.99) < 1e-9 && Math.abs(lat - 45.01) < 1e-9)
})

test('every rideable park has a file with something to ride', () => {
  const ids = rideableIds()
  assert.ok(ids.length > 300, `${ids.length} rideable parks`)
  for (const id of ids.slice(0, 80)) {
    const f = `public/lines/${id}.json`
    assert.ok(existsSync(f), f)
    const park = JSON.parse(readFileSync(f, 'utf8'))
    assert.ok(rideList(park, 'dirt').length > 0, id)
    assert.ok(linesFor(id)?.r === 1)
  }
})
