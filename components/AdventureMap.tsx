'use client'

import { useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { REGION_COLORS, type Region } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'
import type { GeoFeature } from 'react-simple-maps'

const GEO_URL = '/world-110m.json'
const UNLOCKED: Region[] = ['North America']

const CONTINENT_PROJ: Record<Region, { center: [number, number]; scale: number }> = {
  'North America': { center: [-95, 48], scale: 500 },
  'South America': { center: [-60, -15], scale: 420 },
  'Europe':        { center: [15, 52], scale: 700 },
  'Africa':        { center: [20, 5], scale: 400 },
  'Asia':          { center: [90, 40], scale: 320 },
  'Oceania':       { center: [145, -27], scale: 500 },
}

type View = 'world' | Region

interface Props {
  activeRegion: Region | 'all'
  tripRegions: Set<Region>
  onRegionSelect: (region: Region | 'all') => void
  onRegionExplored: (region: Region) => void
}

export default function AdventureMap({ activeRegion, tripRegions, onRegionSelect, onRegionExplored }: Props) {
  const [view, setView] = useState<View>('world')
  const [visible, setVisible] = useState(true)
  const [hoveredRegion, setHoveredRegion] = useState<Region | null>(null)

  function transitionTo(target: View) {
    setVisible(false)
    setTimeout(() => { setView(target); setVisible(true) }, 280)
  }

  function handleCountryClick(geo: GeoFeature) {
    const region = getCountryContinent(Number(geo.id))
    if (!region || !UNLOCKED.includes(region)) return
    onRegionSelect(region)
    onRegionExplored(region)
    transitionTo(region)
  }

  function goBack() {
    onRegionSelect('all')
    transitionTo('world')
  }

  const proj = view !== 'world' ? CONTINENT_PROJ[view as Region] : null

  return (
    <div className="relative h-full w-full bg-[#080810] select-none overflow-hidden">

      {/* Stars */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full" aria-hidden>
        {Array.from({ length: 80 }).map((_, i) => (
          <circle key={i}
            cx={`${(i * 137.5) % 100}%`}
            cy={`${(i * 97.3) % 100}%`}
            r={i % 5 === 0 ? 1.2 : 0.6}
            fill="white" opacity={0.1 + (i % 5) * 0.05}
          />
        ))}
      </svg>

      {/* Map */}
      <div className="h-full w-full"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}>

        <ComposableMap
          projection={view === 'world' ? 'geoNaturalEarth1' : 'geoMercator'}
          projectionConfig={
            proj
              ? { center: proj.center, scale: proj.scale }
              : { scale: 155, center: [10, 10] }
          }
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies
                .filter((geo: GeoFeature) => {
                  const region = getCountryContinent(Number(geo.id))
                  if (!region) return false
                  if (view === 'world') return true
                  return region === view
                })
                .map((geo: GeoFeature) => {
                  const region = getCountryContinent(Number(geo.id))!
                  const color = REGION_COLORS[region]
                  const locked = !UNLOCKED.includes(region)
                  const hovered = hoveredRegion === region
                  const active = activeRegion === region

                  const fill = locked
                    ? '#1c1c2e'
                    : active
                    ? `${color}cc`
                    : hovered
                    ? `${color}99`
                    : tripRegions.has(region)
                    ? `${color}55`
                    : `${color}33`

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredRegion(region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={() => handleCountryClick(geo)}
                      style={{
                        default: {
                          fill,
                          stroke: locked ? '#2a2a40' : `${color}55`,
                          strokeWidth: 0.5,
                          outline: 'none',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          transition: 'fill 0.15s',
                        },
                        hover: {
                          fill: locked ? '#222236' : `${color}bb`,
                          stroke: locked ? '#333350' : color,
                          strokeWidth: 0.8,
                          outline: 'none',
                          cursor: locked ? 'not-allowed' : 'pointer',
                        },
                        pressed: {
                          fill: locked ? '#1c1c2e' : color,
                          stroke: color,
                          strokeWidth: 0.8,
                          outline: 'none',
                        },
                      }}
                    />
                  )
                })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Back */}
      {view !== 'world' && (
        <button onClick={goBack}
          className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-sm text-zinc-300 backdrop-blur hover:border-orange-500 hover:text-white transition-all active:scale-95">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          World map
        </button>
      )}

      {/* Region badge */}
      {view !== 'world' && (
        <div className="absolute right-4 top-4 z-20 rounded-lg border px-3 py-1.5 text-sm font-bold backdrop-blur"
          style={{
            borderColor: REGION_COLORS[view as Region],
            color: REGION_COLORS[view as Region],
            background: `${REGION_COLORS[view as Region]}15`,
          }}>
          {view}
        </div>
      )}

      {/* Tooltip */}
      {view === 'world' && hoveredRegion && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 z-20 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-medium backdrop-blur"
          style={{
            borderColor: UNLOCKED.includes(hoveredRegion) ? REGION_COLORS[hoveredRegion] : '#3f3f60',
            color: UNLOCKED.includes(hoveredRegion) ? REGION_COLORS[hoveredRegion] : '#52526e',
            background: '#0a0a14ee',
          }}>
          {UNLOCKED.includes(hoveredRegion)
            ? `✦ ${hoveredRegion} — click to explore`
            : `🔒 ${hoveredRegion} — coming soon`}
        </div>
      )}

      {view === 'world' && !hoveredRegion && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-xs text-zinc-700">
          hover a continent to explore
        </p>
      )}
    </div>
  )
}
