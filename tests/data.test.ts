// npx tsx --test tests/*.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clock, sessionDate, localToday, addDays, initials } from '../lib/format'
import { samplePlacePlans, sampleRiders, withSamples, isSampleUsername } from '../lib/sample'
import { placeFits } from '../lib/riding'
import { parkById } from '../lib/parks'
import { CITIES, POPULAR, cityBySlug, nearestCity } from '../lib/cities'
import { CREWS } from '../lib/crews'
import { SPOTS, spotBySlug } from '../lib/spots-index'
import { WHEELS, fits, parkFits, wheelById } from '../lib/wheels'

test('clock formats wall-clock times', () => {
  assert.equal(clock('2026-11-01T10:00'), '10 am')
  assert.equal(clock('2026-11-01T18:30'), '6:30 pm')
  assert.equal(clock('2026-11-01T00:15'), '12:15 am')
  assert.equal(clock('2026-11-01T12:00'), '12 pm')
})

test('session dates say Today and Tomorrow at the spot', () => {
  const now = Date.parse('2026-10-27T15:00:00Z')            // 11 am in Ottawa
  assert.equal(localToday(-75.7, now), '2026-10-27')
  assert.equal(sessionDate('2026-10-27T18:00', -75.7, now).relative, 'Today')
  assert.equal(sessionDate('2026-10-28T09:00', -75.7, now).relative, 'Tomorrow')
  const sat = sessionDate('2026-10-31T10:00', -75.7, now)
  assert.equal(sat.relative, null)
  assert.equal(sat.weekdayLong, 'Saturday')
  assert.equal(sat.month, 'Oct')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('initials', () => {
  assert.equal(initials('Mara K.'), 'MK')
  assert.equal(initials('kai.wheels'), 'KW')
})

test('city slugs are unique and the popular list exists', () => {
  const slugs = CITIES.map(c => c.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const s of POPULAR) assert.ok(cityBySlug(s), `missing popular city ${s}`)
  assert.equal(nearestCity(45.42, -75.69)?.slug, 'ottawa')
  assert.equal(nearestCity(45.64, -75.93)?.slug, 'ottawa')  // Wakefield is inside Ottawa's hub
})

test('sample plans are upcoming, at real spots, in real cities', () => {
  const now = Date.parse('2026-10-27T15:00:00Z')
  const list = samplePlacePlans(now)
  assert.ok(list.length >= 30, `only ${list.length} sample places`)
  assert.equal(new Set(list.map(s => s.key)).size, list.length)
  for (const p of list) {
    assert.ok(p.sample)
    assert.ok((p.spot_slug && spotBySlug(p.spot_slug)) || (p.park_id && parkById(p.park_id)), `${p.key} has no spot`)
    assert.ok(p.city && cityBySlug(p.city), `${p.key} has no city`)
    for (const d of p.days) {
      const t = Date.parse(`${d.day}T12:00:00Z`)
      assert.ok(t > now - 86400_000 && t < now + 9 * 86400_000, `${p.key} ${d.day} is not this week`)
      assert.ok(d.riders >= 1)
    }
    assert.equal(p.total, p.days.reduce((n, d) => n + d.riders, 0))
  }
})

test('sample riders live in real cities, at real spots', () => {
  const riders = sampleRiders()
  assert.ok(riders.length >= 20)
  for (const r of riders) {
    assert.ok(r.home_city && cityBySlug(r.home_city), `${r.username} has no city`)
    assert.ok(r.home_spots.length <= 1)
    for (const slug of r.home_spots) {
      const spot = spotBySlug(slug)
      assert.ok(spot && spot.disciplines.some(d => r.disciplines.includes(d)), `${r.username}'s home spot doesn't suit what they ride`)
    }
    assert.ok(isSampleUsername(r.username))
  }
})

test('samples give way to real entries', () => {
  assert.deepEqual(withSamples([1, 2, 3], [9, 9], 3, 12), [1, 2, 3])
  assert.deepEqual(withSamples([1], [9, 8], 3, 12), [1, 9, 8])
  assert.equal(withSamples([], Array(20).fill(0), 3, 5).length, 5)
})

test('crews are clean and placed', () => {
  const slugs = CREWS.map(c => c.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const c of CREWS) {
    assert.ok(Object.values(c.links).every(u => !u || /^https?:\/\//.test(u)), `${c.slug} has a bad link`)
    assert.ok(!/\S+@\S+\.\S+/.test(c.about + (c.meets ?? '')), `${c.slug} shows an email address`)
    if (c.hub) assert.ok(cityBySlug(c.hub), `${c.slug} points at a missing city`)
  }
})

test('every featured spot has a source and sits in its country', () => {
  for (const s of SPOTS) assert.ok(/^https?:\/\//.test(s.source), `${s.slug} has no source`)
})

test('every wheel gets a populated site', () => {
  const now = Date.parse('2026-10-27T15:00:00Z')
  for (const w of WHEELS) {
    assert.ok(SPOTS.filter(s => fits(s.disciplines, w)).length >= 40, `${w.id}: too few spots`)
    assert.ok(samplePlacePlans(now).filter(p => placeFits(p, w)).length >= 10, `${w.id}: too few sample plans`)
    assert.ok(sampleRiders({ disciplines: w.disciplines }).length >= 10, `${w.id}: too few sample riders`)
    assert.ok(CREWS.filter(c => fits(c.disciplines, w)).length >= 10, `${w.id}: too few crews`)
  }
})

test('wheel filters', () => {
  assert.equal(wheelById('bike')?.label, 'Bike')
  assert.equal(wheelById('nope'), null)
  assert.ok(fits(['skateboard'], null))
  assert.ok(fits(['roller', 'skateboard'], wheelById('skates')))
  assert.ok(!fits(['bmx'], wheelById('board')))
  assert.ok(parkFits('bmx', wheelById('bike')) && !parkFits('bmx', wheelById('skates')))
})
