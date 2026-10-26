// Run: npx tsx --test tests/skate.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { waterSeries, readAll, readHours, dryBy, windows, dayReads, groundOf, type Hour } from '../lib/skate'

// Build a day of hours from a compact spec: [hour, tempC, rainMm, et0, gust]
function day(date: string, rows: Array<[number, number, number, number?, number?]>, extra: Partial<Hour> = {}): Hour[] {
  return rows.map(([h, t, rain, et0 = 0.2, gust = 15]) => ({
    time: `${date}T${String(h).padStart(2, '0')}:00`, tempC: t, rh: 60, precipMm: rain, rainMm: rain,
    snowfallCm: 0, snowDepthCm: 0, windKph: gust * 0.6, gustKph: gust, cloudPct: 30,
    isDay: h >= 7 && h <= 19, et0Mm: h >= 7 && h <= 19 ? et0 : 0.02, precipProb: 10, uv: 4, ...extra,
  }))
}
const fullDay = (date: string, t: number, rainAt: Record<number, number> = {}, et0 = 0.35) =>
  day(date, Array.from({ length: 24 }, (_, h) => [h, t, rainAt[h] ?? 0, et0] as [number, number, number, number]))

test('a dry summer day reads prime in the afternoon', () => {
  const hours = fullDay('2026-07-01', 22)
  const reads = readAll(hours, waterSeries(hours))
  assert.equal(reads[14].ground, 'dry')
  assert.equal(reads[14].status, 'prime')
  assert.match(reads[14].line, /prime/)
})

test('rain makes it wet, and it dries a couple of hours after the rain stops on a mild day', () => {
  const hours = fullDay('2026-07-02', 20, { 10: 3, 11: 4, 12: 2 }, 0.4)
  const water = waterSeries(hours)
  const reads = readAll(hours, water)
  assert.equal(reads[11].ground, 'wet')
  assert.equal(reads[11].raining, true)
  const dry = dryBy(reads, 12)
  assert.ok(dry, 'expected a dry time')
  const hr = Number(dry!.time.slice(11, 13))
  assert.ok(hr >= 13 && hr <= 16, `dry at ${hr}h, expected early-to-mid afternoon`)
})

test('overnight rain is still on the ground at dawn and dries mid-morning', () => {
  const hours = [...fullDay('2026-05-01', 12, { 1: 2, 2: 3, 3: 1 }, 0.25)]
  const reads = readAll(hours, waterSeries(hours))
  assert.notEqual(reads[6].ground, 'dry')
  const dry = dryBy(reads, 6)
  assert.ok(dry && Number(dry.time.slice(11, 13)) >= 8 && Number(dry.time.slice(11, 13)) <= 12, `dry at ${dry?.time}`)
})

test('frost on a wet park reads as ice, snow on the ground closes it', () => {
  const h = fullDay('2026-01-10', -3)[10]
  assert.equal(groundOf(h, 0.5), 'ice')
  assert.equal(groundOf({ ...h, snowDepthCm: 4 }, 0), 'snow')
  const reads = readAll([{ ...h, snowDepthCm: 4 }], [0])
  assert.equal(reads[0].status, 'no')
})

test('snow melting out leaves the park soaked', () => {
  const hours = fullDay('2026-03-20', 6, {}, 0.2)
  hours.forEach((h, i) => { h.snowDepthCm = i < 9 ? 3 : 0 })
  const reads = readAll(hours, waterSeries(hours))
  assert.equal(reads[8].ground, 'snow')
  assert.equal(reads[9].ground, 'wet')
})

test('indoor parks are always skateable', () => {
  const hours = fullDay('2026-07-03', 18, { 12: 6 })
  const reads = readAll(hours, waterSeries(hours), { indoor: true })
  assert.equal(reads[12].status, 'skateable')
  assert.match(reads[12].line, /raining outside/)
})

test('after dark: lit parks stay in the windows, unlit ones say so', () => {
  const hours = fullDay('2026-07-04', 22)
  const water = waterSeries(hours)
  assert.equal(readAll(hours, water, { lit: false })[21].status, 'no')
  assert.equal(readAll(hours, water, { lit: true })[21].daylight, true)
  assert.match(readAll(hours, water)[21].line, /after dark/)
})

test('heat and wind are caveats, a gale is a no', () => {
  const hot = readAll(day('2026-07-05', [[14, 38, 0]]), [0])[0]
  assert.equal(hot.status, 'skateable'); assert.match(hot.line, /bakes/)
  const gale = readAll(day('2026-07-05', [[14, 20, 0, 0.3, 70]]), [0])[0]
  assert.equal(gale.status, 'no')
})

test('windows: dry daylight runs, ranked by prime hours, returned in time order', () => {
  const hours = [...fullDay('2026-07-06', 20, { 12: 5, 13: 5 }), ...fullDay('2026-07-07', 21)]
  const reads = readAll(hours, waterSeries(hours))
  const w = windows(reads, 0, 3)
  assert.ok(w.length >= 2)
  assert.ok(w.every((x, i) => i === 0 || x.start >= w[i - 1].start))
  assert.ok(w.some(x => x.start.startsWith('2026-07-07')), 'the dry day should be a window')
})

test('day reads label a washout and a dry day', () => {
  const rainy = fullDay('2026-07-08', 16, Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, 1.5])), 0.2)
  const dry = fullDay('2026-07-09', 20)
  const hours = [...rainy, ...dry]
  const d = dayReads(readAll(hours, waterSeries(hours)), 0)
  assert.equal(d[0].label, 'Washout')
  assert.equal(d[0].status, 'no')
  assert.equal(d[1].status, 'prime')
})

test('dirt soaks up rain: a wet morning is mud, soft by evening, rideable next day', () => {
  const hours = [...fullDay('2026-06-10', 18, { 6: 4, 7: 4, 8: 3 }, 0.4), ...fullDay('2026-06-11', 21, {}, 0.5)]
  const reads = readHours(hours, { surface: 'dirt' })
  assert.equal(reads[10].ground, 'mud')
  assert.equal(reads[10].status, 'no')
  const next = reads.slice(24).filter(r => r.hour.isDay)
  assert.ok(next.some(r => r.status !== 'no'), 'should ride again the next day')
})

test('a light shower barely touches concrete but leaves dirt tacky', () => {
  const hours = fullDay('2026-06-12', 20, { 9: 0.8 }, 0.4)
  const hard = readHours(hours, { surface: 'hard' })
  const dirt = readHours(hours, { surface: 'dirt' })
  assert.equal(hard[12].ground, 'dry')
  assert.notEqual(dirt[10].ground, 'mud')
  assert.equal(dirt[10].status, 'prime')
  assert.match(dirt[10].line, /tacky/)
})
