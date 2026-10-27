// Places: slugs, geocoding (US zip, Canadian postal code, or any place name) and distance.

export interface GeoPoint {
  lat: number
  lng: number
  label: string
  countryCode?: string | null
}

// Browsers ignore a User-Agent set here (forbidden header) — the server needs it for Nominatim/Overpass policy
const UA = { 'User-Agent': 'RitualRollers/1.0 (ritualrollers.com)' }

// ── Slugs: /scout/tarifa-spain ↔ "tarifa spain" ──────────────────────

export function toSlug(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function fromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-+/g, ' ').trim()
}

// ── Geocoding ────────────────────────────────────────────────────────

interface ZippopotamPlace {
  'place name': string
  'state abbreviation': string
  latitude: string
  longitude: string
}

async function tryZippopotam(country: 'us' | 'ca', code: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/${country}/${code}`, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const place: ZippopotamPlace | undefined = data?.places?.[0]
    if (!place) return null
    const lat = parseFloat(place.latitude)
    const lng = parseFloat(place.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng, label: `${place['place name']}, ${place['state abbreviation']}`, countryCode: country.toUpperCase() }
  } catch {
    return null
  }
}

async function tryNominatim(q: string): Promise<GeoPoint | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&accept-language=en&q=${encodeURIComponent(q)}`,
      { headers: { Accept: 'application/json', ...UA }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const hit = Array.isArray(data) ? data[0] : null
    if (!hit) return null
    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    const a = hit.address ?? {}
    const locality = a.city || a.town || a.village || a.municipality || a.county || a.state || hit.name
    // In Canada, the US and Mexico name the province or state ("Wakefield, Quebec"); elsewhere the country.
    const cc = String(a.country_code ?? '').toLowerCase()
    const country = ['ca', 'us', 'mx'].includes(cc) && a.state && a.state !== locality ? a.state : a.country
    const label = locality && country && locality !== country ? `${locality}, ${country}`
      : String(hit.display_name || q).split(',').slice(0, 2).map((s: string) => s.trim()).join(', ')
    return { lat, lng, label, countryCode: a.country_code ? String(a.country_code).toUpperCase() : null }
  } catch {
    return null
  }
}

// Accepts a US zip, a Canadian postal code, or any place name on Earth
export async function geocodePlace(q: string): Promise<GeoPoint | null> {
  const query = q.trim()
  if (!query) return null

  if (/^\d{5}$/.test(query)) {
    const hit = await tryZippopotam('us', query)
    if (hit) return hit
  } else if (/^[A-Za-z]\d[A-Za-z]/.test(query)) {
    const hit = await tryZippopotam('ca', query.slice(0, 3).toUpperCase())
    if (hit) return hit
  }

  return tryNominatim(query)
}

export const geocodeZip = geocodePlace

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
