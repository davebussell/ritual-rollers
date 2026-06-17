'use client'

import { useEffect, useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { REGIONS, REGION_COLORS, type Region } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'
import type { GeoFeature } from 'react-simple-maps'

let topoMerge: ((topology: any, objects: any) => any) | null = null

const GEO_URL = '/world-110m.json'
const UNLOCKED: Region[] = ['North America']

// Projection config for each continent's drilled view
const CONTINENT_PROJ: Record<Region, { center: [number, number]; scale: number }> = {
  'North America': { center: [-95, 50],  scale: 480 },
  'South America': { center: [-60, -15], scale: 420 },
  'Europe':        { center: [15, 52],   scale: 700 },
  'Africa':        { center: [20, 5],    scale: 400 },
  'Asia':          { center: [90, 40],   scale: 320 },
  'Oceania':       { center: [145, -27], scale: 500 },
}

interface Props {
  activeRegion: Region | 'all'
  tripRegions: Set<Region>
  onRegionSelect: (region: Region | 'all') => void
  onRegionExplored: (region: Region) => void
}

type View = 'world' | Region

export default function AdventureMap({ activeRegion, tripRegions, onRegionSelect, onRegionExplored }: Props) {
  const [rawTopology, setRawTopology] = useState<any>(null)
  const [mergeReady, setMergeReady] = useState(false)
  const [view, setView] = useState<View>('world')
  const [transitioning, setTransitioning] = useState(false)
  const [visible, setVisible] = useState(true)
  const [hoveredRegion, setHoveredRegion] = useState<Region | null>(null)
  const [pulseRegion, setPulseRegion] = useState<Region | null>(null)
  const [revealStep, setRevealStep] = useState(0)

  useEffect(() => {
    fetch(GEO_URL).then(r => r.json()).then(setRawTopology)
    import('topojson-client').then(m => { topoMerge = m.merge; setMergeReady(true) })
  }, [])

  // Merge countries → continent blobs
  const continentFeatures = useMemo(() => {
    if (!rawTopology || !mergeReady || !topoMerge) return []
    const countryGeos = rawTopology.objects.countries.geometries as any[]
    return REGIONS.map(region => {
      const regionGeos = countryGeos.filter((g: any) => getCountryContinent(Number(g.id)) === region)
      if (!regionGeos.length) return null
      try {
        const merged = topoMerge!(rawTopology, regionGeos)
        return { type: 'Feature' as const, id: region, properties: { region }, geometry: merged }
      } catch { return null }
    }).filter(Boolean)
  }, [rawTopology, mergeReady])

  const transitionTo = (target: View) => {
    if (transitioning) return
    setTransitioning(true)
    setVisible(false)
    setTimeout(() => {
      setView(target)
      setRevealStep(0)
      setVisible(true)
      setTransitioning(false)
      if (target !== 'world') {
        // Stagger-reveal countries
        [100, 200, 320, 460].forEach((delay, i) => {
          setTimeout(() => setRevealStep(i + 1), delay)
        })
      }
    }, 300)
  }

  const handleContinentClick = (region: Region) => {
    if (transitioning) return
    // Pulse animation
    setPulseRegion(region)
    setTimeout(() => setPulseRegion(null), 500)
    if (!UNLOCKED.includes(region)) return
    onRegionSelect(region)
    onRegionExplored(region)
    transitionTo(region)
  }

  const handleCountryClick = (geo: GeoFeature) => {
    const region = getCountryContinent(Number(geo.id))
    if (region) { onRegionSelect(region); onRegionExplored(region) }
  }

  const goBack = () => { onRegionSelect('all'); transitionTo('world') }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080810] select-none">

      {/* Starfield */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {Array.from({ length: 90 }).map((_, i) => (
          <circle
            key={i}
            cx={`${(i * 137.508) % 100}%`}
            cy={`${(i * 94.21) % 100}%`}
            r={i % 7 === 0 ? 1.4 : 0.7}
            fill="white"
            opacity={0.15 + (i % 4) * 0.1}
          />
        ))}
      </svg>

      {/* Transition wrapper */}
      <div
        className="h-full w-full"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : view === 'world' ? 'scale(1.06)' : 'scale(0.95)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >

        {/* ── WORLD VIEW: continent blobs ── */}
        {view === 'world' && (
          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 158, center: [10, 10] }}
            style={{ width: '100%', height: '100%' }}
          >
            {continentFeatures.map(feature => {
              if (!feature) return null
              const region = feature.properties.region as Region
              const color = REGION_COLORS[region]
              const locked = !UNLOCKED.includes(region)
              const hovered = hoveredRegion === region
              const pulsing = pulseRegion === region
              const active = activeRegion === region
              const hasTripData = tripRegions.has(region)

              const fill = locked
                ? '#1a1a28'
                : active ? color
                : hovered ? color
                : hasTripData ? `${color}60`
                : `${color}35`

              const strokeColor = locked ? '#2a2a40' : hovered ? color : `${color}50`

              return (
                <Geography
                  key={region}
                  geography={feature as any}
                  onMouseEnter={() => setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => handleContinentClick(region)}
                  style={{
                    default: {
                      fill,
                      stroke: strokeColor,
                      strokeWidth: hovered ? 1.4 : 0.7,
                      outline: 'none',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      filter: hovered && !locked
                        ? `drop-shadow(0 0 10px ${color}70)`
                        : active
                        ? `drop-shadow(0 0 6px ${color}60)`
                        : 'none',
                      transform: pulsing ? 'scale(0.96)' : 'scale(1)',
                      transformOrigin: '50% 50%',
                      transition: 'fill 0.2s, stroke 0.2s, filter 0.2s, transform 0.15s',
                    },
                    hover: {
                      fill: locked ? '#1f1f30' : color,
                      stroke: locked ? '#333348' : color,
                      strokeWidth: 1.4,
                      outline: 'none',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      filter: locked ? 'none' : `drop-shadow(0 0 10px ${color}70)`,
                    },
                    pressed: {
                      fill: locked ? '#1a1a28' : `${color}cc`,
                      stroke: color,
                      strokeWidth: 1,
                      outline: 'none',
                    },
                  }}
                />
              )
            })}
          </ComposableMap>
        )}

        {/* ── CONTINENT VIEW ── */}
        {view !== 'world' && rawTopology && (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={CONTINENT_PROJ[view as Region]}
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: GeoFeature[] }) =>
                geographies
                  .filter((geo: GeoFeature) => getCountryContinent(Number(geo.id)) === view)
                  .map((geo: GeoFeature, i: number) => {
                    const color = REGION_COLORS[view as Region]
                    const revealed = revealStep > 0 && i < revealStep * 5
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleCountryClick(geo)}
                        style={{
                          default: {
                            fill: `${color}45`,
                            stroke: `${color}90`,
                            strokeWidth: 0.6,
                            outline: 'none',
                            opacity: revealed ? 1 : 0,
                            transition: `opacity 0.3s ease ${i * 20}ms, fill 0.2s`,
                          },
                          hover: {
                            fill: color,
                            stroke: '#ffffff',
                            strokeWidth: 0.8,
                            outline: 'none',
                            cursor: 'pointer',
                            filter: `drop-shadow(0 0 6px ${color}80)`,
                            opacity: 1,
                          },
                          pressed: {
                            fill: `${color}cc`,
                            stroke: '#ffffff',
                            strokeWidth: 1,
                            outline: 'none',
                            opacity: 0.8,
                          },
                        }}
                      />
                    )
                  })
              }
            </Geographies>
          </ComposableMap>
        )}
      </div>

      {/* Back button */}
      {view !== 'world' && (
        <button
          onClick={goBack}
          className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-sm text-zinc-300 backdrop-blur transition-all hover:border-orange-500 hover:text-white active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          World map
        </button>
      )}

      {/* Region label when drilled */}
      {view !== 'world' && (
        <div
          className="absolute right-4 top-4 z-20 rounded-lg border px-3 py-1.5 text-sm font-bold backdrop-blur"
          style={{
            borderColor: REGION_COLORS[view as Region],
            color: REGION_COLORS[view as Region],
            background: `${REGION_COLORS[view as Region]}15`,
          }}
        >
          {view}
        </div>
      )}

      {/* Hover tooltip */}
      {view === 'world' && hoveredRegion && (
        <div
          className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur transition-all"
          style={{
            borderColor: UNLOCKED.includes(hoveredRegion) ? REGION_COLORS[hoveredRegion] : '#3f3f60',
            color: UNLOCKED.includes(hoveredRegion) ? REGION_COLORS[hoveredRegion] : '#71717a',
            background: '#0a0a14ee',
          }}
        >
          {UNLOCKED.includes(hoveredRegion)
            ? `✦ ${hoveredRegion} — click to explore`
            : `🔒 ${hoveredRegion} — coming soon`}
        </div>
      )}

      {/* World hint */}
      {view === 'world' && !hoveredRegion && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-xs text-zinc-700">
          hover a continent to explore
        </p>
      )}
    </div>
  )
}
