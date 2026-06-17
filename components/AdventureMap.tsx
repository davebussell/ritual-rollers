'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { REGION_COLORS, type Region } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'
import { getCountryInfo } from '@/lib/country-names'
import type { GeoFeature } from 'react-simple-maps'

const GEO_URL = '/world-110m.json'
const UNLOCKED_CONTINENTS: Region[] = ['North America']

type ViewState =
  | { level: 'world' }
  | { level: 'continent'; region: Region }
  | { level: 'country'; countryId: number; countryName: string }

interface Props {
  activeRegion: Region | 'all'
  tripRegions: Set<Region>
  onRegionSelect: (region: Region | 'all') => void
  onRegionExplored: (region: Region) => void
  onCountrySelect: (countryId: number, countryName: string) => void
  selectedCountryId: number | null
}

export default function AdventureMap({
  activeRegion, tripRegions, onRegionSelect, onRegionExplored, onCountrySelect, selectedCountryId,
}: Props) {
  const [view, setView] = useState<ViewState>({ level: 'world' })
  const [visible, setVisible] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  function fade(next: ViewState) {
    setVisible(false)
    setTimeout(() => { setView(next); setVisible(true) }, 260)
  }

  function handleCountryClick(geo: GeoFeature) {
    const numericId = Number(geo.id)
    const region = getCountryContinent(numericId)
    if (!region) return

    if (view.level === 'world') {
      // World → Continent
      if (!UNLOCKED_CONTINENTS.includes(region)) return
      onRegionSelect(region)
      onRegionExplored(region)
      fade({ level: 'continent', region })
      return
    }

    if (view.level === 'continent') {
      // Continent → Country
      const info = getCountryInfo(numericId)
      const name = info?.name ?? `Country ${numericId}`
      onCountrySelect(numericId, name)
      fade({ level: 'country', countryId: numericId, countryName: name })
      return
    }
  }

  function goToContinent() {
    if (view.level !== 'country') return
    onCountrySelect(-1, '')
    const region = view.level === 'country'
      ? (getCountryContinent(view.countryId) ?? 'North America' as Region)
      : 'North America' as Region
    fade({ level: 'continent', region })
  }

  function goToWorld() {
    onRegionSelect('all')
    onCountrySelect(-1, '')
    fade({ level: 'world' })
  }

  const region = view.level === 'continent' ? view.region
    : view.level === 'country' ? (getCountryContinent(view.countryId) ?? null)
    : null

  const countryProj = view.level === 'country'
    ? getCountryInfo(view.countryId)?.proj ?? { center: [-98, 39] as [number, number], scale: 800 }
    : null

  const projectionConfig =
    view.level === 'country' && countryProj
      ? { center: countryProj.center, scale: countryProj.scale }
      : view.level === 'continent' && view.region
      ? (() => {
          const bounds: Record<Region, { center: [number, number]; scale: number }> = {
            'North America': { center: [-95, 48], scale: 500 },
            'South America': { center: [-60, -15], scale: 420 },
            'Europe':        { center: [15, 52],  scale: 700 },
            'Africa':        { center: [20, 5],   scale: 400 },
            'Asia':          { center: [90, 40],  scale: 320 },
            'Oceania':       { center: [145,-27], scale: 500 },
          }
          return bounds[view.region]
        })()
      : { scale: 155, center: [10, 10] as [number, number] }

  return (
    <div className="relative h-full w-full bg-[#080810] select-none overflow-hidden">

      {/* Stars */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden>
        {Array.from({ length: 80 }).map((_, i) => (
          <circle key={i}
            cx={`${(i * 137.5) % 100}%`} cy={`${(i * 97.3) % 100}%`}
            r={i % 5 === 0 ? 1.2 : 0.6} fill="white" opacity={0.1 + (i % 5) * 0.05} />
        ))}
      </svg>

      {/* Map */}
      <div className="h-full w-full"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.26s ease' }}>
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
                  if (view.level === 'country') return numId === view.countryId
                  return false
                })
                .map((geo: GeoFeature) => {
                  const numId = Number(geo.id)
                  const r = getCountryContinent(numId)!
                  const color = REGION_COLORS[r]
                  const hoverKey = view.level === 'world' ? r : String(numId)
                  const hovered = hoveredId === hoverKey
                  const locked = view.level === 'world' && !UNLOCKED_CONTINENTS.includes(r)
                  const active = selectedCountryId === numId || activeRegion === r
                  const hasTripData = tripRegions.has(r)

                  const fill = view.level === 'country'
                    ? color
                    : locked ? '#1c1c2e'
                    : active ? `${color}cc`
                    : hovered ? `${color}99`
                    : hasTripData ? `${color}55`
                    : `${color}33`

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredId(hoverKey)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => handleCountryClick(geo)}
                      style={{
                        default: {
                          fill,
                          stroke: locked ? '#2a2a40' : hovered ? color : `${color}55`,
                          strokeWidth: view.level === 'country' ? 0.8 : hovered ? 0.9 : 0.5,
                          outline: 'none',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          transition: 'fill 0.15s, stroke 0.15s',
                        },
                        hover: {
                          fill: locked ? '#1f1f30' : view.level === 'country' ? `${color}dd` : `${color}bb`,
                          stroke: locked ? '#2d2d45' : color,
                          strokeWidth: 1,
                          outline: 'none',
                          cursor: locked ? 'not-allowed' : 'pointer',
                        },
                        pressed: { fill: locked ? '#1c1c2e' : color, stroke: color, strokeWidth: 1, outline: 'none' },
                      }}
                    />
                  )
                })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Breadcrumb nav */}
      {view.level !== 'world' && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-1 text-xs text-zinc-500">
          <button onClick={goToWorld}
            className="hover:text-white transition-colors">World</button>
          {view.level === 'continent' && (
            <>
              <span>/</span>
              <span className="text-zinc-300">{view.region}</span>
            </>
          )}
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
          style={{
            borderColor: REGION_COLORS[region],
            color: REGION_COLORS[region],
            background: `${REGION_COLORS[region]}15`,
          }}>
          {view.level === 'country' ? view.countryName : region}
        </div>
      )}

      {/* World tooltip */}
      {view.level === 'world' && hoveredId && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur"
          style={{
            borderColor: UNLOCKED_CONTINENTS.includes(hoveredId as Region)
              ? REGION_COLORS[hoveredId as Region] : '#3f3f60',
            color: UNLOCKED_CONTINENTS.includes(hoveredId as Region)
              ? REGION_COLORS[hoveredId as Region] : '#52526e',
            background: '#0a0a14ee',
          }}>
          {UNLOCKED_CONTINENTS.includes(hoveredId as Region)
            ? `✦ ${hoveredId} — click to explore`
            : `🔒 ${hoveredId} — coming soon`}
        </div>
      )}

      {/* Continent tooltip */}
      {view.level === 'continent' && hoveredId && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur"
          style={{
            borderColor: REGION_COLORS[view.region],
            color: REGION_COLORS[view.region],
            background: '#0a0a14ee',
          }}>
          {(() => {
            const numId = Number(hoveredId)
            const info = getCountryInfo(numId)
            return info ? `${info.flag} ${info.name} — click to explore` : hoveredId
          })()}
        </div>
      )}

      {view.level === 'world' && !hoveredId && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-xs text-zinc-700">
          hover a continent to explore
        </p>
      )}
      {view.level === 'continent' && !hoveredId && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-xs text-zinc-700">
          click a country to drill in
        </p>
      )}
    </div>
  )
}
