// Photos of people riding parks.
// 1. Openly licensed photos (public domain, CC0, CC BY, CC BY-SA, Open Government Licence) found by research
//    (research/photos/), copied to public/photos/ by scripts/build-photos.mjs with their credits: data/photos.json.
// 2. Riders' own photos (public.park_photos and the park-photos storage bucket, migration 006).
// Parks with photos are the featured parks (Dave, 2026-10-27).

import raw from '@/data/photos.json'
import { createClient } from '@/lib/supabase/server'

export interface LicensedPhoto {
  id: string
  src: string             // /photos/<id>.jpg, about 1600 px wide
  thumb: string           // /photos/<id>-640.jpg
  width: number
  height: number
  title: string
  author: string
  licence: string
  licence_url: string
  page: string            // where the licence is stated
  year: number | null
  discipline: string
  park_id: string | null
  spot_slug: string | null
  park_name: string
  city: string
  region: string
  country: 'CA' | 'US' | 'MX'
  lat: number
  lng: number
  caption: string
}

export interface RiderPhoto {
  id: string
  url: string
  width: number | null
  height: number | null
  caption: string | null
  created_at: string
  rider: { username: string; display_name: string | null }
  mine: boolean
}

const data = raw as unknown as { photos: LicensedPhoto[] }
export const PHOTOS: LicensedPhoto[] = data.photos

export function photosFor(place: { park?: string | null; spot?: string | null }): LicensedPhoto[] {
  return PHOTOS.filter(p => (place.spot && p.spot_slug === place.spot) || (place.park && p.park_id === place.park))
    .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
}

export function vintage(p: Pick<LicensedPhoto, 'year'>): boolean {
  return p.year !== null && p.year < 2005
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

export function storageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/park-photos/${path}`
}

// Riders' photos of a place. null = not switched on yet (migration 006).
export async function riderPhotos(place: { park?: string | null; spot?: string | null }, meId: string | null): Promise<RiderPhoto[] | null> {
  try {
    const supabase = await createClient()
    let q = supabase.from('park_photos').select('id, path, width, height, caption, created_at, rider_id, rider:profiles(username, display_name)')
      .order('created_at', { ascending: false }).limit(48)
    q = place.spot ? q.eq('spot_slug', place.spot) : q.eq('park_id', place.park ?? '')
    const { data, error } = await q
    if (error) return null
    return ((data ?? []) as unknown as { id: string; path: string; width: number | null; height: number | null; caption: string | null; created_at: string; rider_id: string; rider: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null }[])
      .map(p => ({ id: p.id, url: storageUrl(p.path), width: p.width, height: p.height, caption: p.caption, created_at: p.created_at, mine: p.rider_id === meId, rider: one(p.rider) ?? { username: 'rider', display_name: null } }))
  } catch {
    return null
  }
}

// The featured parks: every park we have a photo of someone riding, best known first (featured spots, then by the
// number of photos), one card each
export interface FeaturedPlace { key: string; href: string; name: string; city: string; country: 'CA' | 'US' | 'MX'; spot_slug: string | null; park_id: string | null; photo: LicensedPhoto; count: number }

export function featuredPlaces(): FeaturedPlace[] {
  const by = new Map<string, FeaturedPlace>()
  for (const p of PHOTOS) {
    const key = p.spot_slug ? `s:${p.spot_slug}` : p.park_id ? `p:${p.park_id}` : null
    if (!key) continue
    const f = by.get(key)
    if (f) { f.count++; if (p.width >= p.height && f.photo.width < f.photo.height) f.photo = p; continue }
    by.set(key, { key, href: p.spot_slug ? `/spots/${p.spot_slug}` : `/parks/${p.park_id}`, name: p.park_name, city: p.city, country: p.country, spot_slug: p.spot_slug, park_id: p.park_id, photo: p, count: 1 })
  }
  return [...by.values()].sort((a, b) => Number(!!b.spot_slug) - Number(!!a.spot_slug) || b.count - a.count || a.name.localeCompare(b.name))
}
