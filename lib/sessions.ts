// Sessions from the database (public.ride_sessions, migration 004), with samples filling in until
// real riders post. Every read tolerates the tables not existing yet: it then returns no real sessions.

import { createClient } from '@/lib/supabase/server'
import type { RideSession, RiderLite, SessionComment } from '@/lib/types'
import { haversineKm } from '@/lib/geo'
import { sampleSessions, sampleSession, withSamples } from '@/lib/sample'

const SELECT = `id, title, notes, spot_slug, park_id, place_name, city, lat, lng, starts_at, starts_local, disciplines, level,
  beginners_welcome, cancelled,
  host:profiles(username, display_name, avatar_url),
  riders:ride_session_riders(rider:profiles(username, display_name, avatar_url))`

interface Row {
  id: string; title: string; notes: string | null; spot_slug: string | null; park_id: string | null; place_name: string
  city: string | null; lat: number; lng: number; starts_at: string; starts_local: string; disciplines: string[] | null
  level: RideSession['level']; beginners_welcome: boolean; cancelled: boolean
  host: RiderLite | RiderLite[] | null
  riders: { rider: RiderLite | RiderLite[] | null }[] | null
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

function fromRow(r: Row): RideSession {
  const host = one(r.host) ?? { username: 'rider', display_name: null, avatar_url: null }
  const riders = (r.riders ?? []).map(x => one(x.rider)).filter((x): x is RiderLite => !!x && x.username !== host.username)
  return {
    id: r.id, title: r.title, notes: r.notes, spot_slug: r.spot_slug, park_id: r.park_id, place_name: r.place_name,
    city: r.city, lat: r.lat, lng: r.lng, starts_at: r.starts_at, starts_local: r.starts_local,
    disciplines: r.disciplines ?? [], level: r.level, beginners_welcome: r.beginners_welcome, cancelled: r.cancelled,
    host, riders, riders_count: riders.length + 1,   // the host counts as going
  }
}

export interface SessionQuery {
  city?: string
  spot?: string
  park?: string
  near?: { lat: number; lng: number; km: number }
  discipline?: string
  beginners?: boolean
  limit?: number
}

function matches(s: RideSession, q: SessionQuery): boolean {
  if (q.city && s.city !== q.city) return false
  if (q.spot && s.spot_slug !== q.spot) return false
  if (q.park && s.park_id !== q.park) return false
  if (q.near && haversineKm(q.near.lat, q.near.lng, s.lat, s.lng) > q.near.km) return false
  if (q.discipline && !s.disciplines.includes(q.discipline)) return false
  if (q.beginners && !s.beginners_welcome && s.level !== 'new') return false
  return true
}

export async function realSessions(q: SessionQuery = {}): Promise<RideSession[]> {
  try {
    const supabase = await createClient()
    let query = supabase.from('ride_sessions').select(SELECT)
      .eq('cancelled', false)
      .gte('starts_at', new Date(Date.now() - 2 * 3600_000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(200)
    if (q.city) query = query.eq('city', q.city)
    if (q.spot) query = query.eq('spot_slug', q.spot)
    if (q.park) query = query.eq('park_id', q.park)
    if (q.near) {
      const dLat = q.near.km / 111, dLng = q.near.km / (111 * Math.max(0.2, Math.cos(q.near.lat * Math.PI / 180)))
      query = query.gte('lat', q.near.lat - dLat).lte('lat', q.near.lat + dLat).gte('lng', q.near.lng - dLng).lte('lng', q.near.lng + dLng)
    }
    const { data, error } = await query
    if (error || !data) return []
    return (data as unknown as Row[]).map(fromRow).filter(s => matches(s, q))
  } catch {
    return []
  }
}

// Upcoming sessions for a list: real ones, topped up with samples while there are few.
export async function upcomingSessions(q: SessionQuery = {}): Promise<RideSession[]> {
  const limit = q.limit ?? 12
  const real = await realSessions(q)
  const samples = sampleSessions().filter(s => matches(s, q))
  return withSamples(real, samples, 3, limit)
}

export async function sessionById(id: string): Promise<RideSession | null> {
  if (id.startsWith('sample-')) return sampleSession(id)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('ride_sessions').select(SELECT).eq('id', id).maybeSingle()
    if (error || !data) return null
    return fromRow(data as unknown as Row)
  } catch {
    return null
  }
}

export async function sessionComments(id: string): Promise<SessionComment[]> {
  if (id.startsWith('sample-')) return []
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('ride_session_comments')
      .select('id, body, created_at, rider:profiles(username, display_name, avatar_url)')
      .eq('session_id', id).order('created_at', { ascending: true }).limit(200)
    if (error || !data) return []
    return (data as unknown as { id: string; body: string; created_at: string; rider: RiderLite | RiderLite[] | null }[])
      .map(c => ({ id: c.id, body: c.body, created_at: c.created_at, rider: one(c.rider) ?? { username: 'rider', display_name: null, avatar_url: null } }))
  } catch {
    return []
  }
}

// Whether the database update (migration 004) is in: posting and "I'm in" need it.
export async function sessionsReady(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('ride_sessions').select('id', { head: true, count: 'exact' }).limit(1)
    return !error
  } catch {
    return false
  }
}
