'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { ChevronUp, X, Camera, MapPin, BookOpen } from 'lucide-react'
import { REGION_COLORS, type Region } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'
import { getCountryInfo } from '@/lib/country-names'
import { fetchWikiSummary } from '@/lib/wikipedia'
import type { WikiSummary } from '@/lib/wikipedia'
import type { TripWithAnchor } from '@/lib/types'
import type { GeoFeature } from 'react-simple-maps'

const GEO_URL = '/world-110m.json'
const UNLOCKED_CONTINENTS: Region[] = ['North America']

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
  const [visible, setVisible] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<ClusterGroup | null>(null)
  const [countryWiki, setCountryWiki] = useState<WikiSummary | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  // Fetch Wikipedia info when zoomed into a country
  useEffect(() => {
    if (view.level !== 'country') { setCountryWiki(null); return }
    fetchWikiSummary((view as { countryName: string }).countryName).then(setCountryWiki)
  }, [view])

  const fade = useCallback((next: ViewState) => {
    setVisible(false); setSelectedCluster(null)
    setTimeout(() => { setView(next); setVisible(true) }, 220)
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

  const region = view.level === 'continent' ? view.region
    : view.level === 'country' ? (getCountryContinent(view.countryId) ?? null)
    : null
  const regionColor = region ? REGION_COLORS[region] : '#f97316'

  const tooltip = useMemo(() => {
    if (!hoveredId || view.level === 'country') return null
    if (view.level === 'world') {
      const unlocked = UNLOCKED_CONTINENTS.includes(hoveredId as Region)
      return { text: unlocked ? `✦ ${hoveredId} — click to explore` : `🔒 ${hoveredId} — coming soon`, color: unlocked ? REGION_COLORS[hoveredId as Region] : '#52526e', border: unlocked ? REGION_COLORS[hoveredId as Region] : '#3f3f60' }
    }
    if (view.level === 'continent') {
      const info = getCountryInfo(Number(hoveredId))
      return { text: info ? `${info.flag} ${info.name} — click to explore` : hoveredId, color: REGION_COLORS[view.region], border: REGION_COLORS[view.region] }
    }
    return null
  }, [hoveredId, view])

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
        {STARS.map((s, i) => <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.opacity} />)}
      </svg>

      {/* Map */}
      <div className="h-full w-full" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }}>
        <ComposableMap
          projection={view.level === 'world' ? 'geoNaturalEarth1' : 'geoMercator'}
          projectionConfig={projectionConfig}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies
                .filter((geo: GeoFeature) => {
                  const numId = Number(geo.id)
                  const r = getCountryContinent(numId)
                  if (!r) return false
                  if (view.level === 'world') return true
                  if (view.level === 'continent') return r === view.region
                  return numId === (view as { countryId: number }).countryId
                })
                .map((geo: GeoFeature) => {
                  const numId = Number(geo.id)
                  const r = getCountryContinent(numId)!
                  const color = REGION_COLORS[r]
                  const hoverKey = view.level === 'world' ? r : String(numId)
                  const hovered = hoveredId === hoverKey
                  const locked = view.level === 'world' && !UNLOCKED_CONTINENTS.includes(r)
                  const active = selectedCountryId === numId || activeRegion === r
                  const fill = view.level === 'country' ? `${color}44`
                    : locked ? '#1c1c2e' : active ? `${color}cc`
                    : hovered ? `${color}99` : tripRegions.has(r) ? `${color}55` : `${color}33`
                  return (
                    <GeoShape key={geo.rsmKey} geo={geo} fill={fill}
                      stroke={locked ? '#2a2a40' : hovered ? color : `${color}55`}
                      strokeWidth={view.level === 'country' ? 0.8 : hovered ? 0.9 : 0.5}
                      locked={locked}
                      onClick={() => handleGeoClick(geo, view)}
                      onEnter={() => setHoveredId(hoverKey)}
                      onLeave={() => setHoveredId(null)} />
                  )
                })
            }
          </Geographies>

          {/* Trip cluster layer — country view only */}
          {view.level === 'country' && (
            <g>
              {clusters.map(cluster => {
                const isSelected = selectedCluster?.id === cluster.id
                const isSingle = cluster.count === 1
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

                    {/* Cluster / single pin */}
                    <g
                      style={{ cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation()
                        setSelectedCluster(isSelected ? null : cluster)
                      }}>
                      {/* Outer glow ring */}
                      <circle
                        cx={cluster.cx} cy={cluster.cy}
                        r={isSingle ? 10 : 16}
                        fill={regionColor} fillOpacity={isSelected ? 0.18 : 0.08}
                        stroke={regionColor} strokeOpacity={isSelected ? 0.6 : 0.3}
                        strokeWidth={1} />
                      {/* Inner pin */}
                      <circle
                        cx={cluster.cx} cy={cluster.cy}
                        r={isSingle ? 5 : 10}
                        fill={isSelected ? regionColor : `${regionColor}cc`}
                        stroke="white" strokeWidth={1.5} />
                      {/* Count label for clusters */}
                      {!isSingle && (
                        <text x={cluster.cx} y={cluster.cy}
                          textAnchor="middle" dominantBaseline="central"
                          fontSize={8} fontWeight="700" fill="white">
                          {cluster.count}
                        </text>
                      )}
                      {/* Single pin dot */}
                      {isSingle && (
                        <circle cx={cluster.cx} cy={cluster.cy} r={2}
                          fill="white" fillOpacity={0.9} />
                      )}
                    </g>
                  </g>
                )
              })}
            </g>
          )}
        </ComposableMap>
      </div>

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

      {/* Trip count badge — country view */}
      {view.level === 'country' && clusters.length > 0 && (
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

      {/* Tooltip */}
      {tooltip && !selectedCluster && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur"
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
