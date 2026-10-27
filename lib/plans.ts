// "I'll be here": riders say they'll be at a spot or park on a day. Everyone sees how many; only signed-in friends
// (and the rider) see who. public.ride_plans and public.plan_counts(), migration 005. Every read tolerates the
// tables not existing yet.

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
