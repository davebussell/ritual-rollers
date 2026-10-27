// npx tsx --test tests/*.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'fs'
import { projection, buildGround } from '../lib/terrain'
import { profileAlong, downhill, resampleLine, gradeColor } from '../lib/profile'
import { linesFor } from '../lib/lines'
import { planExpiry, whenLabel } from '../lib/plans-shared'

test('local projection round-trips, and the ground mesh matches its own triangles', () => {
  const proj = projection(-75, 45)
  const [x, z] = proj.toLocal(-74.99, 45.01)
  const [lng, lat] = proj.toLngLat(x, z)
  assert.ok(Math.abs(lng + 74.99) < 1e-9 && Math.abs(lat - 45.01) < 1e-9)
  const g = buildGround({ sample: (x, z) => x * 0.1 + z * 0.05 }, { minX: 0, maxX: 100, minZ: 0, maxZ: 100 }, 20)
  for (const [px, pz] of [[13, 17], [55.5, 12.25], [80, 88]]) assert.ok(Math.abs(g.height(px, pz) - (px * 0.1 + pz * 0.05)) < 0.06)
})

test('a trail profile measures length, climb, drop and the steepest stretch', () => {
  // 1 km due north, falling 100 m evenly: a 10 % descent
  const line: [number, number][] = [[-75, 45], [-75, 45 + 1000 / 111195]]
  const elev = (_lng: number, lat: number) => 200 - ((lat - 45) * 111195) * 0.1
  const p = profileAlong(line, elev, 5)
  assert.ok(Math.abs(p.length - 1000) < 3, `length ${p.length}`)
  assert.ok(Math.abs(p.drop - 100) < 3 && p.climb < 1, `drop ${p.drop} climb ${p.climb}`)
  assert.ok(Math.abs(p.maxGrade - 0.1) < 0.01)
  assert.ok(p.grade.slice(5, -5).every(g => Math.abs(g + 0.1) < 0.02))
  // ridden from the top: an uphill-mapped line is turned round
  const up: [number, number][] = [...line].reverse()
  assert.deepEqual(downhill(up, elev), line)
  assert.deepEqual(downhill(up, elev, 1), up)
  assert.equal(resampleLine(line, 100).pts.length, 11)
  assert.equal(gradeColor(0.02), '#3E8E41')
  assert.equal(gradeColor(-0.2), '#D4402A')
})

test('every park with lines has its file', () => {
  const index = JSON.parse(readFileSync('data/lines-index.json', 'utf8')).parks as Record<string, { n?: number }>
  const ids = Object.keys(index)
  assert.ok(ids.length > 6000)
  for (const id of ids.filter(i => index[i].n).slice(0, 100)) {
    assert.ok(existsSync(`public/lines/${id}.json`), id)
    assert.ok((linesFor(id)?.n ?? 0) > 0)
  }
})

test('plans end with their day at the spot, and read as a time of day', () => {
  assert.equal(planExpiry('2026-11-01', -75.7), '2026-11-02T04:59:59.000Z')
  assert.equal(whenLabel('afternoon', null), 'afternoon')
  assert.equal(whenLabel('time', '17:30'), '5:30 pm')
  assert.equal(whenLabel('time', '00:00'), '12 am')
})
