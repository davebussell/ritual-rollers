// "I'll be here": riders tag a spot or park and when they'll ride it. Everyone sees how many; only signed-in friends
// (and the rider) see who. public.ride_plans and plan_counts() (migration 005), plan_counts_area() (006). Plans replace
// sessions (Dave, 2026-10-27). Every read tolerates the tables not existing yet.

import { createClient } from '@/lib/supabase/server'
import type { RiderLite } from '@/lib/types'

import { type PlanPart } from '@/lib/plans-shared'
export { whenLabel, planExpiry, PART_LABEL, type PlanPart } from '@/lib/plans-shared'

export interface PlanPlace { spot?: string; park?: string }

export interface PlanCount { day: string; part: PlanPart; at_local: string | null; riders: number }

export interface VisiblePlan {
  id: string
  day: string
  part: PlanPart
  at_local: string | null
  note: string | null
  rider: RiderLite
  mine: boolean
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

// null when plans aren't switched on yet (migration 005 not run)
export async function planCounts(place: PlanPlace): Promise<PlanCount[] | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('plan_counts', { p_spot: place.spot ?? null, p_park: place.park ?? null })
    if (error) return null
    return ((data ?? []) as { day: string; part: PlanPart; at_local: string | null; riders: number }[])
      .map(r => ({ day: r.day, part: r.part, at_local: r.at_local, riders: Number(r.riders) }))
  } catch {
    return null
  }
}

// The plans the viewer may put a name to: their own and their friends' (row-level security decides)
export async function visiblePlans(place: PlanPlace, meId: string | null): Promise<VisiblePlan[]> {
  if (!meId) return []
  try {
    const supabase = await createClient()
    let q = supabase.from('ride_plans')
      .select('id, day, part, at_local, note, rider_id, rider:profiles(username, display_name, avatar_url)')
      .gt('expires_at', new Date().toISOString())
      .order('day', { ascending: true })
      .limit(100)
    q = place.spot ? q.eq('spot_slug', place.spot) : q.eq('park_id', place.park ?? '')
    const { data, error } = await q
    if (error || !data) return []
    return (data as unknown as { id: string; day: string; part: PlanPart; at_local: string | null; note: string | null; rider_id: string; rider: RiderLite | RiderLite[] | null }[])
      .map(p => ({
        id: p.id, day: p.day, part: p.part, at_local: p.at_local, note: p.note, mine: p.rider_id === meId,
        rider: one(p.rider) ?? { username: 'rider', display_name: null, avatar_url: null },
      }))
  } catch {
    return []
  }
}

// The viewer's own plans everywhere (for /me)
export async function myPlans(meId: string): Promise<(VisiblePlan & { place_name: string; spot_slug: string | null; park_id: string | null })[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('ride_plans')
      .select('id, day, part, at_local, note, place_name, spot_slug, park_id')
      .eq('rider_id', meId).gt('expires_at', new Date().toISOString()).order('day', { ascending: true })
    if (error || !data) return []
    return (data as { id: string; day: string; part: PlanPart; at_local: string | null; note: string | null; place_name: string; spot_slug: string | null; park_id: string | null }[])
      .map(p => ({ ...p, mine: true, rider: { username: '', display_name: null, avatar_url: null } }))
  } catch {
    return []
  }
}

// ── An area: where riders plan to be, place by place ─────────────────

export interface PlacePlans {
  key: string
  spot_slug: string | null
  park_id: string | null
  name: string
  lat: number
  lng: number
  city: string | null
  days: PlanCount[]
  total: number                       // riders across the coming days (a rider on two days counts twice)
  friends: VisiblePlan[]              // the viewer's friends (and the viewer) going there
  sample?: boolean
}

export interface Box { minLat: number; minLng: number; maxLat: number; maxLng: number }

export function boxAround(lat: number, lng: number, km: number): Box {
  const dLat = km / 111, dLng = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng }
}

const placeKey = (r: { spot_slug: string | null; park_id: string | null }) => r.spot_slug ? `s:${r.spot_slug}` : `p:${r.park_id}`

// Counts for every place in a box, with the viewer's friends' names where they can see them. null = not switched on.
export async function plansInArea(box: Box, meId: string | null): Promise<PlacePlans[] | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('plan_counts_area', { min_lat: box.minLat, min_lng: box.minLng, max_lat: box.maxLat, max_lng: box.maxLng })
    if (error) return null
    const places = new Map<string, PlacePlans>()
    for (const r of (data ?? []) as { spot_slug: string | null; park_id: string | null; place_name: string; lat: number; lng: number; city: string | null; day: string; part: PlanPart; at_local: string | null; riders: number }[]) {
      const key = placeKey(r)
      if (!places.has(key)) places.set(key, { key, spot_slug: r.spot_slug, park_id: r.park_id, name: r.place_name, lat: r.lat, lng: r.lng, city: r.city, days: [], total: 0, friends: [] })
      const p = places.get(key)!
      p.days.push({ day: r.day, part: r.part, at_local: r.at_local, riders: Number(r.riders) })
      p.total += Number(r.riders)
    }
    if (meId && places.size) {
      const { data: rows } = await supabase.from('ride_plans')
        .select('id, day, part, at_local, note, rider_id, spot_slug, park_id, rider:profiles(username, display_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .gte('lat', box.minLat).lte('lat', box.maxLat).gte('lng', box.minLng).lte('lng', box.maxLng)
        .order('day', { ascending: true }).limit(300)
      for (const p of (rows ?? []) as unknown as { id: string; day: string; part: PlanPart; at_local: string | null; note: string | null; rider_id: string; spot_slug: string | null; park_id: string | null; rider: RiderLite | RiderLite[] | null }[]) {
        places.get(placeKey(p))?.friends.push({
          id: p.id, day: p.day, part: p.part, at_local: p.at_local, note: p.note, mine: p.rider_id === meId,
          rider: one(p.rider) ?? { username: 'rider', display_name: null, avatar_url: null },
        })
      }
    }
    return [...places.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  } catch {
    return null
  }
}

// A rider's plans, when the viewer may see them (themselves or a friend; row-level security decides)
export async function plansOf(riderId: string): Promise<{ id: string; day: string; part: PlanPart; at_local: string | null; place_name: string; spot_slug: string | null; park_id: string | null; lng: number }[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('ride_plans')
      .select('id, day, part, at_local, place_name, spot_slug, park_id, lng')
      .eq('rider_id', riderId).gt('expires_at', new Date().toISOString()).order('day', { ascending: true }).limit(20)
    if (error || !data) return []
    return data as { id: string; day: string; part: PlanPart; at_local: string | null; place_name: string; spot_slug: string | null; park_id: string | null; lng: number }[]
  } catch {
    return []
  }
}
