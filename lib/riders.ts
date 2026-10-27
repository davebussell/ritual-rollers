// Riders who've said they're open to riding with people (profiles.open_to_ride), with samples filling in.
// City-level only: a rider's home city and home spots, never where they live.

import { createClient } from '@/lib/supabase/server'
import type { Profile, RiderCard } from '@/lib/types'
import { sampleRiders, sampleRider, withSamples } from '@/lib/sample'

const COLUMNS = 'username, display_name, avatar_url, bio, disciplines, level, home_city, home_spots, open_to_ride, age_confirmed_at'

function toCard(p: Partial<Profile>): RiderCard {
  return {
    username: p.username ?? 'rider', display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null, bio: p.bio ?? null,
    disciplines: p.disciplines ?? [], level: p.level ?? null, home_city: p.home_city ?? null, home_spots: p.home_spots ?? [],
  }
}

export async function realRiders(filter: { city?: string; spot?: string; discipline?: string } = {}): Promise<RiderCard[]> {
  try {
    const supabase = await createClient()
    let q = supabase.from('profiles').select(COLUMNS).eq('open_to_ride', true).not('age_confirmed_at', 'is', null).limit(100)
    if (filter.city) q = q.eq('home_city', filter.city)
    if (filter.spot) q = q.contains('home_spots', [filter.spot])
    if (filter.discipline) q = q.contains('disciplines', [filter.discipline])
    const { data, error } = await q
    if (error || !data) return []
    return (data as Partial<Profile>[]).map(toCard)
  } catch {
    return []
  }
}

export async function ridersFor(filter: { city?: string; spot?: string; discipline?: string } = {}, max = 12): Promise<RiderCard[]> {
  const real = await realRiders(filter)
  const samples = sampleRiders(filter).filter(r => !filter.discipline || r.disciplines.includes(filter.discipline))
  return withSamples(real, samples, 3, max)
}

export async function riderByUsername(username: string): Promise<(RiderCard & { open_to_ride: boolean }) | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select(COLUMNS).eq('username', username).maybeSingle()
    if (data) return { ...toCard(data as Partial<Profile>), open_to_ride: !!(data as Partial<Profile>).open_to_ride }
  } catch { /* fall through to samples */ }
  const s = sampleRider(username)
  return s ? { ...s, open_to_ride: true } : null
}
