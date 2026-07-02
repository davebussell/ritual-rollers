'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ComposableMap, Geographies, Geography, Line, Marker } from 'react-simple-maps'
import { ChevronUp, X, Camera, MapPin, BookOpen } from 'lucide-react'
import { REGION_COLORS, type Region } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'
import { COUNTRIES, getCountryInfo } from '@/lib/country-names'
import MapTicker from '@/components/MapTicker'
import { countryStats, heatT, regionStats } from '@/lib/engagement'
import { fetchWikiSummary } from '@/lib/wikipedia'
import type { WikiSummary } from '@/lib/wikipedia'
import type { TripWithAnchor } from '@/lib/types'
import type { GeoFeature } from 'react-simple-maps'

const GEO_URL = '/world-110m.json'
const UNLOCKED_CONTINENTS: Region[] = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania']

const CONTINENT_BOUNDS: Record<Region, { center: [number, number]; scale: number }> = {
  'North America': { center: [-95, 48], scale: 500 },
  'South America': { center: [-60, -15], scale: 420 },
  'Europe':        { center: [15, 52],  scale: 700 },
  'Africa':        { center: [20, 5],   scale: 400 },
  'Asia':          { center: [90, 40],  scale: 320 },
  'Oceania':       { center: [145,-27], scale: 500 },
}

const STARS = Array.from({ length: 80 }, (_, i) => ({
  cx: `${(i * 137.5) % 100}%`, cy: `${(i * 97.3) % 100}%`,
  r: i % 5 === 0 ? 1.2 : 0.6, opacity: 0.1 + (i % 5) * 0.05,
}))

const SVG_W = 800, SVG_H = 600

// Mercator projection matching react-simple-maps internals
function mercatorProject(lng: number, lat: number, center: [number, number], scale: number): [number, number] {
  const toRad = Math.PI / 180
  const x = scale * (lng - center[0]) * toRad + SVG_W / 2
  const y = -scale * (
    Math.log(Math.tan(Math.PI / 4 + lat * toRad / 2)) -
    Math.log(Math.tan(Math.PI / 4 + center[1] * toRad / 2))
  ) + SVG_H / 2
  return [x, y]
}

// Map a 0..1 heat value onto a two-digit hex alpha suffix
function heatAlpha(t: number, floor: number, ceil: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  return Math.round(floor + (ceil - floor) * clamped).toString(16).padStart(2, '0')
}

interface ClusterMember { trip: TripWithAnchor; x: number; y: number }
interface ClusterGroup {
  id: string
  members: ClusterMember[]
  cx: number; cy: number
  count: number
}

function computeClusters(
  trips: TripWithAnchor[],
  center: [number, number],
  scale: number,
  threshold = 48,
): ClusterGroup[] {
  const projected: ClusterMember[] = trips
    .filter(t => t.anchorLat != null && t.anchorLng != null)
    .map(t => {
      const [x, y] = mercatorProject(t.anchorLng!, t.anchorLat!, center, scale)
      return { trip: t, x, y }
    })

  const assigned = new Set<string>()
  const groups: ClusterGroup[] = []

  for (const p of projected) {
    if (assigned.has(p.trip.id)) continue
    const members: ClusterMember[] = [p]
    assigned.add(p.trip.id)
    for (const q of projected) {
      if (assigned.has(q.trip.id)) continue
      const dx = p.x - q.x, dy = p.y - q.y
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        members.push(q); assigned.add(q.trip.id)
      }
    }
    const cx = members.reduce((s, m) => s + m.x, 0) / members.length
    const cy = members.reduce((s, m) => s + m.y, 0) / members.length
    groups.push({ id: `cl-${p.trip.id}`, members, cx, cy, count: members.length })
  }
  return groups
}

// ── Photo pin helpers ─────────────────────────────────────────────

// Greedy lat/lng clustering for pin layers — top-upvoted trip anchors each group
interface GeoCluster {
  top: TripWithAnchor
  count: number
  lng: number
  lat: number
}

function clusterByDegrees(trips: TripWithAnchor[], deg: number): GeoCluster[] {
  const anchored = trips
    .filter(t => t.anchorLat != null && t.anchorLng != null)
    .sort((a, b) => b.upvotes_count - a.upvotes_count)
  const assigned = new Set<string>()
  const out: GeoCluster[] = []
  for (const t of anchored) {
    if (assigned.has(t.id)) continue
    let count = 1
    assigned.add(t.id)
    for (const q of anchored) {
      if (assigned.has(q.id)) continue
      if (Math.abs(t.anchorLat! - q.anchorLat!) < deg && Math.abs(t.anchorLng! - q.anchorLng!) < deg) {
        count += 1
        assigned.add(q.id)
      }
    }
    out.push({ top: t, count, lng: t.anchorLng!, lat: t.anchorLat! })
  }
  return out
}

function coverUrlOf(trip: TripWithAnchor): string | null {
  const sp = trip.trip_photos?.[0]?.storage_path
  if (!sp) return null
  return sp.startsWith('https://') ? sp
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${sp}`
}

// alpha2 → ISO numeric id, built once from the country registry
let alpha2ToNumeric: Map<string, number> | null = null
function numericIdForAlpha2(alpha2: string): number | null {
  if (!alpha2ToNumeric) {
    alpha2ToNumeric = new Map()
    for (const [id, info] of Object.entries(COUNTRIES)) alpha2ToNumeric.set(info.alpha2, Number(id))
  }
  return alpha2ToNumeric.get(alpha2) ?? null
}

// Circular photo pin: cover image clipped in a ring, region-colored stroke
const PhotoPin = memo(function PhotoPin({ id, coverUrl, r, ringColor, count, selected, onClick, onEnter, onLeave }: {
  id: string
  coverUrl: string | null
  r: number
  ringColor: string
  count: number
  selected?: boolean
  onClick: (e: React.MouseEvent) => void
  onEnter: () => void
  onLeave: () => void
}) {
  const clipId = `rr-clip-${id}`
  const badgeR = Math.max(5.5, r * 0.42)
  const badgeOff = r * 0.78
  return (
    <g className="rr-photo-pin" style={{ cursor: 'pointer' }}
      onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <defs>
        <clipPath id={clipId}><circle cx={0} cy={0} r={r} /></clipPath>
      </defs>
      {/* Soft drop shadow */}
      <circle cx={0} cy={1.5} r={r + 2.5} fill="#000000" opacity={0.4} />
      {/* Region ring */}
      <circle cx={0} cy={0} r={r + 1.5} fill="#09090b" stroke={ringColor} strokeWidth={selected ? 3 : 2} />
      {/* Cover photo */}
      {coverUrl ? (
        <image href={coverUrl} x={-r} y={-r} width={r * 2} height={r * 2}
          clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <circle cx={0} cy={0} r={r} fill={`${ringColor}66`} />
      )}
      {/* Inner white ring */}
      <circle cx={0} cy={0} r={r} fill="none" stroke="white" strokeWidth={1} strokeOpacity={0.9} />
      {/* Count badge for clusters */}
      {count > 1 && (
        <g>
          <circle cx={badgeOff} cy={-badgeOff} r={badgeR} fill="#f97316" stroke="#09090b" strokeWidth={1.5} />
          <text x={badgeOff} y={-badgeOff} textAnchor="middle" dominantBaseline="central"
            fontSize={badgeR} fontWeight="700" fill="white"
            style={{ fontFamily: 'var(--font-jbmono)' }}>
            +{count - 1}
          </text>
        </g>
      )}
    </g>
  )
})

type ViewState =
  | { level: 'world' }
  | { level: 'continent'; region: Region }
  | { level: 'country'; countryId: number; countryName: string }

interface Props {
  trips: TripWithAnchor[]
  activeRegion: Region | 'all'
  tripRegions: Set<Region>
  onRegionSelect: (region: Region | 'all') => void
  onRegionExplored: (region: Region) => void
  onCountrySelect: (countryId: number, countryName: string) => void
  selectedCountryId: number | null
}

const GeoShape = memo(function GeoShape({ geo, fill, stroke, strokeWidth, locked, onClick, onEnter, onLeave }: {
  geo: GeoFeature; fill: string; stroke: string; strokeWidth: number
  locked: boolean; onClick: () => void; onEnter: () => void; onLeave: () => void
}) {
  const r = getCountryContinent(Number(geo.id))
  const color = r ? REGION_COLORS[r] : '#888'
  return (
    <Geography geography={geo} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}
      style={{
        default: { fill, stroke, strokeWidth, outline: 'none', cursor: locked ? 'not-allowed' : 'pointer', transition: 'fill 0.12s' },
        hover:   { fill: locked ? '#1f1f30' : `${color}bb`, stroke: locked ? '#2d2d45' : color, strokeWidth: 1, outline: 'none', cursor: locked ? 'not-allowed' : 'pointer' },
        pressed: { fill: locked ? '#1c1c2e' : color, stroke: color, strokeWidth: 1, outline: 'none' },
      }} />
  )
})

export default function AdventureMap({
  trips, activeRegion, tripRegions, onRegionSelect, onRegionExplored, onCountrySelect, selectedCountryId,
}: Props) {
  const [view, setView] = useState<ViewState>({ level: 'world' })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<ClusterGroup | null>(null)
  const [countryWiki, setCountryWiki] = useState<WikiSummary | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  // Fetch Wikipedia info when zoomed into a country
  useEffect(() => {
    if (view.level !== 'country') { setCountryWiki(null); return }
    fetchWikiSummary((view as { countryName: string }).countryName).then(setCountryWiki)
  }, [view])

  // View changes are choreographed by AnimatePresence — just swap immediately
  const fade = useCallback((next: ViewState) => {
    setSelectedCluster(null)
    // Clear hover too: the hovered pin/geography unmounts on drill, so its
    // onMouseLeave never fires and a stale tooltip would survive the level change
    setHoveredId(null)
    setView(next)
  }, [])

  const handleGeoClick = useCallback((geo: GeoFeature, v: ViewState) => {
    const numericId = Number(geo.id)
    const region = getCountryContinent(numericId)
    if (!region) return
    if (v.level === 'world') {
      if (!UNLOCKED_CONTINENTS.includes(region)) return
      onRegionSelect(region); onRegionExplored(region)
      fade({ level: 'continent', region })
    } else if (v.level === 'continent') {
      const info = getCountryInfo(numericId)
      const name = info?.name ?? `Country ${numericId}`
      onCountrySelect(numericId, name)
      fade({ level: 'country', countryId: numericId, countryName: name })
    }
  }, [fade, onRegionSelect, onRegionExplored, onCountrySelect])

  const goToContinent = useCallback(() => {
    if (view.level !== 'country') return
    const region = getCountryContinent(view.countryId) ?? 'North America' as Region
    onCountrySelect(-1, ''); fade({ level: 'continent', region })
  }, [view, fade, onCountrySelect])

  const goToWorld = useCallback(() => {
    onRegionSelect('all'); onCountrySelect(-1, ''); fade({ level: 'world' })
  }, [fade, onRegionSelect, onCountrySelect])

  const projectionConfig = useMemo(() => {
    if (view.level === 'country') {
      const proj = getCountryInfo(view.countryId)?.proj ?? { center: [-98, 39] as [number, number], scale: 800 }
      return proj
    }
    if (view.level === 'continent') return CONTINENT_BOUNDS[view.region]
    return { scale: 155, center: [10, 10] as [number, number] }
  }, [view])

  // Cluster computation — only active in country view
  const clusters = useMemo(() => {
    if (view.level !== 'country') return []
    const info = getCountryInfo(view.countryId)
    if (!info) return []
    const countryTrips = trips.filter(t =>
      t.countryCode === info.alpha2 && t.anchorLat != null && t.anchorLng != null
    )
    return computeClusters(countryTrips, projectionConfig.center, projectionConfig.scale)
  }, [view, trips, projectionConfig])

  // Photo-pin clusters — world (~4°) and continent (~1.5°) levels
  const worldPins = useMemo(() =>
    view.level === 'world' ? clusterByDegrees(trips, 4) : [],
    [view, trips])

  const continentPins = useMemo(() =>
    view.level === 'continent'
      ? clusterByDegrees(trips.filter(t => t.region === view.region), 1.5)
      : [],
    [view, trips])

  // Travel arcs — consecutive trips by creation date, world view only
  const arcs = useMemo(() => {
    if (view.level !== 'world') return []
    const seq = trips
      .filter(t => t.anchorLat != null && t.anchorLng != null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
    const out: { from: TripWithAnchor; to: TripWithAnchor }[] = []
    for (let i = 0; i < seq.length - 1 && out.length < 12; i++) {
      out.push({ from: seq[i], to: seq[i + 1] })
    }
    return out
  }, [view, trips])

  const worldStats = useMemo(() => ({
    trips: trips.length,
    regions: new Set(trips.map(t => t.region).filter(Boolean)).size,
    upvotes: trips.reduce((s, t) => s + t.upvotes_count, 0),
  }), [trips])

  const tickerTrips = useMemo(() => trips.map(t => ({
    id: t.id,
    title: t.title,
    upvotes_count: t.upvotes_count,
    region: t.region,
    username: t.profiles?.username ?? 'explorer',
  })), [trips])

  // World pin click → drill into the trip's continent
  const handlePinRegionClick = useCallback((trip: TripWithAnchor) => {
    const r = trip.region
    if (!r || !UNLOCKED_CONTINENTS.includes(r)) return
    onRegionSelect(r); onRegionExplored(r)
    fade({ level: 'continent', region: r })
  }, [fade, onRegionSelect, onRegionExplored])

  // Continent pin click → drill into the trip's country
  const handlePinCountryClick = useCallback((trip: TripWithAnchor) => {
    if (!trip.countryCode) return
    const numericId = numericIdForAlpha2(trip.countryCode)
    if (numericId == null) return
    const name = getCountryInfo(numericId)?.name ?? `Country ${numericId}`
    onCountrySelect(numericId, name)
    fade({ level: 'country', countryId: numericId, countryName: name })
  }, [fade, onCountrySelect])

  // Render the hovered pin last so it rises above its neighbours
  const sortForHover = useCallback((pins: GeoCluster[]): GeoCluster[] => {
    if (!hoveredId?.startsWith('trip:')) return pins
    const id = hoveredId.slice(5)
    return [...pins].sort((a, b) => (a.top.id === id ? 1 : 0) - (b.top.id === id ? 1 : 0))
  }, [hoveredId])

  // Engagement heat — per-region and per-country (alpha2) stats
  const heat = useMemo(() => {
    const regions = regionStats(trips)
    let maxRegion = 0
    regions.forEach(s => { if (s.score > maxRegion) maxRegion = s.score })
    return { regions, maxRegion, countries: countryStats(trips) }
  }, [trips])

  // Hottest country score within the continent currently in view
  const maxCountryScore = useMemo(() => {
    if (view.level !== 'continent') return 0
    let max = 0
    for (const t of trips) {
      if (t.region !== view.region || !t.countryCode) continue
      const s = heat.countries.get(t.countryCode)
      if (s && s.score > max) max = s.score
    }
    return max
  }, [view, trips, heat])

  // Per-cluster upvote totals + hottest cluster in view (country level)
  const clusterHeat = useMemo(() => {
    const totals = new Map<string, number>()
    let max = 0
    let hottestId: string | null = null
    for (const c of clusters) {
      const total = c.members.reduce((s, m) => s + m.trip.upvotes_count, 0)
      totals.set(c.id, total)
      if (total > max) { max = total; hottestId = c.id }
    }
    return { totals, max, hottestId }
  }, [clusters])

  const region = view.level === 'continent' ? view.region
    : view.level === 'country' ? (getCountryContinent(view.countryId) ?? null)
    : null
  const regionColor = region ? REGION_COLORS[region] : '#f97316'

  const tooltip = useMemo(() => {
    if (!hoveredId) return null
    // Photo pin hover — any level
    if (hoveredId.startsWith('trip:')) {
      const t = trips.find(x => x.id === hoveredId.slice(5))
      if (!t) return null
      const color = t.region ? REGION_COLORS[t.region] : '#f97316'
      return {
        text: `📍 ${t.title} — ${t.upvotes_count}▲ @${t.profiles?.username ?? 'explorer'}`,
        color, border: color, mono: true,
      }
    }
    if (view.level === 'country') return null
    if (view.level === 'world') {
      const color = REGION_COLORS[hoveredId as Region] ?? '#f97316'
      const stats = heat.regions.get(hoveredId)
      const text = stats
        ? `✦ ${hoveredId} — ${stats.trips} expedition${stats.trips !== 1 ? 's' : ''} · ${stats.upvotes} upvote${stats.upvotes !== 1 ? 's' : ''}`
        : `✦ ${hoveredId} — click to explore`
      return { text, color, border: color, mono: false }
    }
    if (view.level === 'continent') {
      const info = getCountryInfo(Number(hoveredId))
      const stats = info ? heat.countries.get(info.alpha2) : undefined
      const text = info
        ? stats
          ? `${info.flag} ${info.name} — ${stats.trips} expedition${stats.trips !== 1 ? 's' : ''} · ${stats.upvotes} upvote${stats.upvotes !== 1 ? 's' : ''}`
          : `${info.flag} ${info.name} — click to explore`
        : hoveredId
      return { text, color: REGION_COLORS[view.region], border: REGION_COLORS[view.region], mono: false }
    }
    return null
  }, [hoveredId, view, heat, trips])

  // Sorted trips for selected cluster popup
  const clusterTrips = useMemo(() =>
    (selectedCluster?.members ?? [])
      .map(m => m.trip)
      .sort((a, b) => b.upvotes_count - a.upvotes_count),
    [selectedCluster]
  )

  return (
    <div ref={mapRef} className="relative h-full w-full bg-[#080810] select-none overflow-hidden">
      {/* Stars */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden>
        {STARS.map((s, i) => (
          <circle key={i} className="rr-star" cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.opacity}
            style={{ animationDelay: `${(i * 0.37) % 5}s` }} />
        ))}
      </svg>

      {/* Nebula wash */}
      <div className="rr-nebula pointer-events-none absolute inset-0 blur-3xl" aria-hidden
        style={{
          background:
            'radial-gradient(ellipse at 22% 20%, rgba(249, 115, 22, 0.08), transparent 55%), ' +
            'radial-gradient(ellipse at 78% 80%, rgba(99, 102, 241, 0.06), transparent 55%)',
        }} />

      {/* Map — the new level dives in on every view change (keyed remount).
          No exit animation: AnimatePresence exit proved unreliable here and
          leaked a hidden ComposableMap per level change. */}
        <motion.div
          key={view.level === 'world' ? 'world' : view.level === 'continent' ? `continent:${view.region}` : `country:${view.countryId}`}
          className="h-full w-full"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
        <ComposableMap
          projection={view.level === 'world' ? 'geoNaturalEarth1' : 'geoMercator'}
          projectionConfig={projectionConfig}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoFeature[] }) => {
              const shown = geographies.filter((geo: GeoFeature) => {
                const numId = Number(geo.id)
                const r = getCountryContinent(numId)
                if (!r) return false
                if (view.level === 'world') return true
                if (view.level === 'continent') return r === view.region
                return numId === (view as { countryId: number }).countryId
              })
              return (
                <>
                  {shown.map((geo: GeoFeature) => {
                    const numId = Number(geo.id)
                    const r = getCountryContinent(numId)!
                    const color = REGION_COLORS[r]
                    const hoverKey = view.level === 'world' ? r : String(numId)
                    const hovered = hoveredId === hoverKey
                    const locked = view.level === 'world' && !UNLOCKED_CONTINENTS.includes(r)
                    const active = selectedCountryId === numId || activeRegion === r
                    const info = view.level === 'continent' ? getCountryInfo(numId) : null
                    const cStats = info ? heat.countries.get(info.alpha2) : undefined
                    let fill: string
                    if (view.level === 'country') fill = `${color}44`
                    else if (locked) fill = '#1c1c2e'
                    else if (view.level === 'world') {
                      // Heat-driven continent opacity: quiet 0x08 → hottest 0xcc
                      const rStats = heat.regions.get(r)
                      const alpha = tripRegions.has(r)
                        ? heatAlpha(heatT(rStats?.score ?? 0, heat.maxRegion), 0x08, 0xcc)
                        : '08'
                      fill = active ? `${color}cc` : hovered ? `${color}99` : `${color}${alpha}`
                    } else {
                      // Continent choropleth: countries with trips 0x22 → 0xbb
                      fill = selectedCountryId === numId ? `${color}cc`
                        : hovered ? `${color}99`
                        : cStats ? `${color}${heatAlpha(heatT(cStats.score, maxCountryScore), 0x22, 0xbb)}`
                        : `${color}33`
                    }
                    return (
                      <GeoShape key={geo.rsmKey} geo={geo} fill={fill}
                        stroke={locked ? '#2a2a40' : hovered ? color : cStats ? `${color}99` : `${color}55`}
                        strokeWidth={view.level === 'country' ? 0.8 : hovered ? 0.9 : cStats ? 0.7 : 0.5}
                        locked={locked}
                        onClick={() => handleGeoClick(geo, view)}
                        onEnter={() => setHoveredId(hoverKey)}
                        onLeave={() => setHoveredId(null)} />
                    )
                  })}

                </>
              )
            }}
          </Geographies>

          {/* Travel arcs — world view */}
          {view.level === 'world' && arcs.map((a, i) => (
            <Line key={`arc-${i}`} className="rr-arc"
              from={[a.from.anchorLng!, a.from.anchorLat!]}
              to={[a.to.anchorLng!, a.to.anchorLat!]}
              stroke={a.from.region ? REGION_COLORS[a.from.region] : '#f97316'}
              strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 6"
              strokeLinecap="round" fill="none"
              style={{ pointerEvents: 'none' }} />
          ))}

          {/* Photo pins — world view */}
          {view.level === 'world' && sortForHover(worldPins).map(c => (
            <Marker key={c.top.id} coordinates={[c.lng, c.lat]}>
              <PhotoPin id={`w-${c.top.id}`} coverUrl={coverUrlOf(c.top)} r={9}
                ringColor={c.top.region ? REGION_COLORS[c.top.region] : '#f97316'}
                count={c.count}
                onClick={e => { e.stopPropagation(); handlePinRegionClick(c.top) }}
                onEnter={() => setHoveredId(`trip:${c.top.id}`)}
                onLeave={() => setHoveredId(null)} />
            </Marker>
          ))}

          {/* Photo pins — continent view */}
          {view.level === 'continent' && sortForHover(continentPins).map(c => (
            <Marker key={c.top.id} coordinates={[c.lng, c.lat]}>
              <PhotoPin id={`c-${c.top.id}`} coverUrl={coverUrlOf(c.top)} r={13}
                ringColor={regionColor} count={c.count}
                onClick={e => { e.stopPropagation(); handlePinCountryClick(c.top) }}
                onEnter={() => setHoveredId(`trip:${c.top.id}`)}
                onLeave={() => setHoveredId(null)} />
            </Marker>
          ))}

          {/* Trip cluster layer — country view only */}
          {view.level === 'country' && (
            <g>
              {clusters.map(cluster => {
                const isSelected = selectedCluster?.id === cluster.id
                const isSingle = cluster.count === 1
                const top = cluster.members.reduce((best, m) =>
                  m.trip.upvotes_count > best.trip.upvotes_count ? m : best)
                const pinR = isSingle ? 15 : 18
                const isHottest = clusterHeat.hottestId === cluster.id
                return (
                  <g key={cluster.id}>
                    {/* Connection lines from members to centroid */}
                    {!isSingle && cluster.members.map(m => (
                      <line key={m.trip.id}
                        x1={m.x} y1={m.y} x2={cluster.cx} y2={cluster.cy}
                        stroke={regionColor} strokeOpacity={0.25} strokeWidth={1}
                        strokeDasharray="3 3" />
                    ))}

                    {/* Individual member dots */}
                    {!isSingle && cluster.members.map(m => (
                      <circle key={m.trip.id}
                        cx={m.x} cy={m.y} r={3.5}
                        fill={regionColor} fillOpacity={0.6}
                        stroke={regionColor} strokeWidth={0.5} strokeOpacity={0.8} />
                    ))}

                    {/* Pulse ring — hottest cluster in view */}
                    {isHottest && (
                      <circle cx={cluster.cx} cy={cluster.cy} r={pinR + 4} fill="none"
                        stroke={regionColor} strokeWidth={1.5}>
                        <animate attributeName="r"
                          values={`${pinR + 4};${pinR + 18}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity"
                          values="0.55;0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Photo pin — top trip's cover anchors the cluster */}
                    <g transform={`translate(${cluster.cx}, ${cluster.cy})`}>
                      <PhotoPin id={`k-${cluster.id}`} coverUrl={coverUrlOf(top.trip)} r={pinR}
                        ringColor={regionColor} count={cluster.count} selected={isSelected}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedCluster(isSelected ? null : cluster)
                        }}
                        onEnter={() => setHoveredId(`trip:${top.trip.id}`)}
                        onLeave={() => setHoveredId(null)} />
                    </g>
                  </g>
                )
              })}
            </g>
          )}
        </ComposableMap>
        </motion.div>

      {/* Cluster popup */}
      {selectedCluster && view.level === 'country' && (
        <>
          {/* Backdrop tap to close */}
          <div className="absolute inset-0 z-20" onClick={() => setSelectedCluster(null)} />
          <div
            className="absolute z-30 w-72 rounded-2xl border border-zinc-700 bg-zinc-950/95 shadow-2xl overflow-hidden backdrop-blur"
            style={{
              left: `${(selectedCluster.cx / SVG_W) * 100}%`,
              top: `${(selectedCluster.cy / SVG_H) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 20px))',
            }}>
            {/* Header */}
            <div className="border-b border-zinc-800">
              {/* Wiki destination banner */}
              {countryWiki?.thumbnail && (
                <div className="relative h-24 w-full overflow-hidden">
                  <img src={countryWiki.thumbnail} alt={countryWiki.title}
                    className="h-full w-full object-cover opacity-60" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-8">
                    <p className="text-xs font-bold text-white">{countryWiki.title}</p>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed mt-0.5">
                      {countryWiki.extract.split('. ').slice(0, 2).join('. ')}.
                    </p>
                  </div>
                  <a href={countryWiki.pageUrl} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="absolute bottom-2 right-2 rounded-md bg-zinc-900/80 p-1 text-zinc-400 hover:text-orange-400 transition-colors">
                    <BookOpen className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <MapPin className="h-3 w-3" style={{ color: regionColor }} />
                  <span>{selectedCluster.count} trip{selectedCluster.count !== 1 ? 's' : ''} in this area</span>
                </div>
                <button onClick={() => setSelectedCluster(null)}
                  className="rounded-md p-0.5 text-zinc-600 hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Trip list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/60">
              {clusterTrips.map((trip, i) => {
                const sp = trip.trip_photos?.[0]?.storage_path
                const cover = sp
                  ? sp.startsWith('https://') ? sp
                    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${sp}`
                  : null
                return (
                  <Link key={trip.id} href={`/trips/${trip.id}`}
                    className="group flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-900/80 transition-colors"
                    onClick={() => setSelectedCluster(null)}>
                    {/* Rank */}
                    <span className="w-4 shrink-0 text-center text-[10px] font-bold"
                      style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#52525b' }}>
                      {i + 1}
                    </span>
                    {/* Cover */}
                    <div className="h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                      {cover
                        ? <img src={cover} alt={trip.title} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                        : <div className="flex h-full w-full items-center justify-center text-zinc-700"><Camera className="h-3.5 w-3.5" /></div>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-orange-100 transition-colors">{trip.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">@{trip.profiles?.username}</p>
                    </div>
                    {/* Upvotes */}
                    <div className="flex shrink-0 items-center gap-0.5 text-[10px] text-zinc-600">
                      <ChevronUp className="h-3 w-3" />
                      <span>{trip.upvotes_count}</span>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pointer */}
            <div className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-full rotate-45 border-b border-r border-zinc-700 bg-zinc-950" />
          </div>
        </>
      )}

      {/* Breadcrumb */}
      {view.level !== 'world' && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-1 text-xs text-zinc-500">
          <button onClick={goToWorld} className="hover:text-white transition-colors">World</button>
          {view.level === 'continent' && <><span>/</span><span className="text-zinc-300">{view.region}</span></>}
          {view.level === 'country' && (
            <>
              <span>/</span>
              <button onClick={goToContinent} className="hover:text-white transition-colors">
                {getCountryContinent(view.countryId)}
              </button>
              <span>/</span>
              <span className="text-white font-medium">{view.countryName}</span>
            </>
          )}
        </div>
      )}

      {/* Region badge */}
      {region && (
        <div className="absolute right-4 top-4 z-20 rounded-lg border px-3 py-1.5 text-xs font-bold backdrop-blur"
          style={{ borderColor: regionColor, color: regionColor, background: `${regionColor}15` }}>
          {view.level === 'country' ? (view as { countryName: string }).countryName : region}
        </div>
      )}

      {/* World stats strip — bottom left, world view only */}
      {view.level === 'world' && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10">
          <p className="font-expedition text-[8px] uppercase tracking-[0.25em] text-zinc-600">The World Right Now</p>
          <p className="mt-1 font-expedition text-[9px] uppercase tracking-[0.25em] text-zinc-500">
            <span className="text-orange-400">{worldStats.trips}</span> expeditions
            {' · '}
            <span className="text-orange-400">{worldStats.regions}</span> regions
            {' · '}
            <span className="text-orange-400">{worldStats.upvotes}</span> upvotes
          </p>
        </div>
      )}

      {/* Live activity ticker — world + continent views */}
      {view.level !== 'country' && !selectedCluster && !tooltip && (
        <MapTicker trips={tickerTrips} />
      )}

      {/* Trip count badge — country view */}
      {view.level === 'country' && clusters.length > 0 && !tooltip && (
        <div className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-[11px] text-zinc-500 backdrop-blur">
          {clusters.reduce((n, c) => n + c.count, 0)} trips plotted · click a pin to explore
        </div>
      )}

      {/* Wikipedia country info — bottom left in country view */}
      {view.level === 'country' && countryWiki && !selectedCluster && (
        <div className="absolute bottom-4 left-4 z-20 w-64 rounded-xl border border-zinc-800 bg-zinc-950/90 backdrop-blur overflow-hidden shadow-xl">
          {countryWiki.thumbnail && (
            <div className="relative h-20 w-full overflow-hidden">
              <img src={countryWiki.thumbnail} alt={countryWiki.title}
                className="h-full w-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
            </div>
          )}
          <div className="px-3 py-2.5">
            <p className="text-xs font-bold text-white">{countryWiki.title}</p>
            <p className="mt-1 text-[10px] text-zinc-400 leading-relaxed line-clamp-3">
              {countryWiki.extract.split('. ').slice(0, 2).join('. ')}.
            </p>
            <a href={countryWiki.pageUrl} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors">
              <BookOpen className="h-2.5 w-2.5" /> Read on Wikipedia
            </a>
          </div>
        </div>
      )}

      {/* Heat legend — world + continent views */}
      {view.level !== 'country' && !selectedCluster && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-20">
          <p className="font-expedition text-[8px] uppercase tracking-[0.2em] text-zinc-600">Activity</p>
          <div className="mt-1 h-1.5 w-24 rounded-full"
            style={{ background: 'linear-gradient(to right, #71717a14, #f97316)' }} />
          <div className="mt-1 flex w-24 items-center justify-between font-expedition text-[8px] tracking-[0.2em] text-zinc-600">
            <span>QUIET</span>
            <span>BUZZING</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && !selectedCluster && (
        <div className={`pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 backdrop-blur ${
          tooltip.mono ? 'font-expedition text-[10px] uppercase tracking-[0.15em]' : 'text-xs font-medium'
        }`}
          style={{ borderColor: tooltip.border, color: tooltip.color, background: '#0a0a14ee' }}>
          {tooltip.text}
        </div>
      )}

      {/* Hint */}
      {!hoveredId && view.level !== 'country' && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-xs text-zinc-700">
          {view.level === 'world' ? 'hover a continent to explore' : 'click a country to drill in'}
        </p>
      )}
    </div>
  )
}
