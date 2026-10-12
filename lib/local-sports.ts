export type SportCategory = 'wind' | 'water' | 'mountain' | 'river'

export const CATEGORY_META: Record<SportCategory, { label: string; emoji: string; color: string; sports: string[] }> = {
  wind: {
    label: 'Wind',
    emoji: '🪁',
    color: '#06b6d4',
    sports: ['Kitesurfing', 'Windsurfing', 'Sailing', 'Paragliding'],
  },
  water: {
    label: 'Water',
    emoji: '🌊',
    color: '#3b82f6',
    sports: ['Surfing', 'Swimming', 'Diving', 'Marinas & launches'],
  },
  mountain: {
    label: 'Mountain',
    emoji: '🏔️',
    color: '#a855f7',
    sports: ['Ski & snowboard', 'Climbing', 'Mountain biking'],
  },
  river: {
    label: 'River',
    emoji: '🛶',
    color: '#10b981',
    sports: ['Kayak & canoe', 'Whitewater', 'Boat launches'],
  },
}

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
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(q)}`,
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
    const country = a.country
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

// ── Spots (OpenStreetMap via Overpass) ───────────────────────────────

export interface LocalSpot {
  id: string
  name: string
  category: SportCategory
  sport: string
  lat: number
  lng: number
  distanceKm: number
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function categorize(tags: Record<string, string>): { category: SportCategory; sport: string } | null {
  const sport = tags.sport || ''

  if (sport.includes('kitesurfing')) return { category: 'wind', sport: 'Kitesurfing' }
  if (sport.includes('windsurfing')) return { category: 'wind', sport: 'Windsurfing' }
  if (sport.includes('sailing')) return { category: 'wind', sport: 'Sailing' }
  if (sport.includes('free_flying')) return { category: 'wind', sport: 'Paragliding' }

  if (sport.includes('surfing')) return { category: 'water', sport: 'Surf break' }
  if (sport.includes('swimming')) return { category: 'water', sport: 'Swimming' }
  if (sport.includes('diving')) return { category: 'water', sport: 'Diving' }
  if (tags.leisure === 'marina') return { category: 'water', sport: 'Marina' }
  if (tags.leisure === 'slipway') return { category: 'water', sport: 'Boat launch' }

  if (sport.includes('climbing')) return { category: 'mountain', sport: 'Climbing' }
  if (tags.landuse === 'winter_sports') return { category: 'mountain', sport: 'Ski area' }
  if (tags['piste:type'] === 'downhill') return { category: 'mountain', sport: 'Ski run' }

  if (sport.includes('canoe')) return { category: 'river', sport: 'Canoe & kayak' }
  if (tags.whitewater != null) return { category: 'river', sport: 'Whitewater' }

  return null
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// Returns null when every server failed (so the UI can say so), [] when the area is simply unmapped
export async function fetchLocalSpots(lat: number, lng: number, radiusKm = 40): Promise<LocalSpot[] | null> {
  const r = Math.round(radiusKm * 1000)
  const around = `around:${r},${lat},${lng}`
  // Kept light on purpose: heavy selectors (beaches, trail relations) time out under load
  const query = `[out:json][timeout:20];(
    nwr["sport"="surfing"](${around});
    nwr["sport"="kitesurfing"](${around});
    nwr["sport"="windsurfing"](${around});
    nwr["sport"="sailing"](${around});
    nwr["sport"="free_flying"](${around});
    nwr["sport"="climbing"](${around});
    nwr["sport"="canoe"](${around});
    nwr["leisure"="marina"](${around});
    nwr["leisure"="slipway"](${around});
    nwr["landuse"="winter_sports"](${around});
    nwr["whitewater"](${around});
  );out center 120;`

  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...UA },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) continue
      const text = await res.text()
      if (!text.trim().startsWith('{')) continue
      const data = JSON.parse(text)
      const elements: OverpassElement[] = data?.elements ?? []

      const byKey = new Map<string, LocalSpot>()
      for (const el of elements) {
        const name = el.tags?.name
        if (!name || !el.tags) continue
        const spotLat = el.lat ?? el.center?.lat
        const spotLng = el.lon ?? el.center?.lon
        if (spotLat == null || spotLng == null) continue
        const cat = categorize(el.tags)
        if (!cat) continue
        const distanceKm = haversineKm(lat, lng, spotLat, spotLng)
        const key = `${name}|${cat.category}`
        const existing = byKey.get(key)
        if (existing && existing.distanceKm <= distanceKm) continue
        byKey.set(key, {
          id: `${el.type}-${el.id}`,
          name,
          category: cat.category,
          sport: cat.sport,
          lat: spotLat,
          lng: spotLng,
          distanceKm,
        })
      }

      return Array.from(byKey.values())
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 80)
    } catch {
      // try the next mirror
    }
  }
  return null
}

// ── Legacy "right now" read kept for any remaining callers ───────────

export interface Conditions {
  windKph: number
  windGustKph: number
  windDirDeg: number
  tempC: number
  precipMm: number
  snowDepthCm: number | null
  waveHeightM: number | null
}

export async function fetchConditions(lat: number, lng: number): Promise<Conditions | null> {
  let conditions: Conditions
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,snow_depth`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const current = data?.current
    if (!current) return null
    conditions = {
      windKph: Number(current.wind_speed_10m) || 0,
      windGustKph: Number(current.wind_gusts_10m) || 0,
      windDirDeg: Number(current.wind_direction_10m) || 0,
      tempC: Number(current.temperature_2m) || 0,
      precipMm: Number(current.precipitation) || 0,
      snowDepthCm: current.snow_depth != null ? Math.round(current.snow_depth * 100) : null,
      waveHeightM: null,
    }
  } catch {
    return null
  }

  try {
    const res = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json()
      const wave = data?.current?.wave_height
      if (wave != null && Number.isFinite(Number(wave))) {
        conditions.waveHeightM = Number(wave)
      }
    }
  } catch {
    // inland — no wave data
  }

  return conditions
}
