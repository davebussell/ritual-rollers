'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  type GeoFeature,
} from 'react-simple-maps'
import { REGIONS, REGION_COLORS, type Region } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'

const GEO_URL = '/world-110m.json'

// Continent zoom configs: [center, zoom]
const CONTINENT_VIEW: Record<Region, { center: [number, number]; zoom: number }> = {
  'North America': { center: [-95, 50],  zoom: 2.8 },
  'South America': { center: [-60, -15], zoom: 2.8 },
  'Europe':        { center: [15, 52],   zoom: 4.5 },
  'Africa':        { center: [20, 5],    zoom: 2.8 },
  'Asia':          { center: [95, 35],   zoom: 2.2 },
  'Oceania':       { center: [145, -25], zoom: 3.5 },
}

interface Props {
  activeRegion: Region | 'all'
  tripRegions: Set<Region>
  onRegionSelect: (region: Region | 'all') => void
  onRegionExplored: (region: Region) => void
}

export default function AdventureMap({ activeRegion, tripRegions, onRegionSelect, onRegionExplored }: Props) {
  const [drilled, setDrilled] = useState<Region | null>(null)
  const [animating, setAnimating] = useState(false)
  const [revealedCountries, setRevealedCountries] = useState<Set<number>>(new Set())
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState<[number, number]>([10, 20])

  const drillInto = useCallback((region: Region) => {
    if (animating) return
    setAnimating(true)
    setDrilled(region)
    onRegionExplored(region)

    // Stagger-reveal countries in this continent
    setRevealedCountries(new Set())
    const view = CONTINENT_VIEW[region]
    setCenter(view.center)
    setZoom(view.zoom)

    // Countries trickle in after zoom
    setTimeout(() => {
      setRevealedCountries(new Set([1]))
      setTimeout(() => setRevealedCountries(new Set([1, 2])), 60)
      setTimeout(() => setRevealedCountries(new Set([1, 2, 3, 4, 5, 6, 7, 8])), 140)
      setTimeout(() => setRevealedCountries(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30])), 240)
      setTimeout(() => { setRevealedCountries(new Set(Array.from({length: 999}, (_, i) => i))); setAnimating(false) }, 400)
    }, 300)
  }, [animating, onRegionExplored])

  const drillOut = useCallback(() => {
    if (animating) return
    setDrilled(null)
    setRevealedCountries(new Set())
    setCenter([10, 20])
    setZoom(1)
    onRegionSelect('all')
  }, [animating, onRegionSelect])

  const handleCountryClick = useCallback((geo: GeoFeature) => {
    const numId = Number(geo.id)
    const region = getCountryContinent(numId)
    if (!region) return

    if (!drilled) {
      // World view — drill into continent
      drillInto(region)
      onRegionSelect(region)
    } else if (drilled === region) {
      // Already drilled — select this country's region (already selected, could deselect)
      onRegionSelect(region)
      onRegionExplored(region)
    }
  }, [drilled, drillInto, onRegionSelect, onRegionExplored])

  const getCountryStyle = useCallback((geo: GeoFeature) => {
    const numId = Number(geo.id)
    const region = getCountryContinent(numId)
    const color = region ? REGION_COLORS[region] : '#3f3f46'
    const hasTripData = region ? tripRegions.has(region) : false
    const isActiveRegion = drilled ? region === drilled : region === activeRegion

    if (!drilled) {
      // World view: color by continent, pulse if has trips
      return {
        default: {
          fill: isActiveRegion ? color : hasTripData ? `${color}99` : '#27272a',
          stroke: '#18181b',
          strokeWidth: 0.5,
          outline: 'none',
          transition: 'fill 0.2s',
        },
        hover: {
          fill: color,
          stroke: '#f97316',
          strokeWidth: 0.8,
          outline: 'none',
          cursor: 'pointer',
          filter: 'brightness(1.3)',
        },
        pressed: { fill: color, outline: 'none' },
      }
    }

    // Drilled view: show individual countries
    const revealed = revealedCountries.size > 10 || revealedCountries.has(numId)
    const inContinent = region === drilled
    return {
      default: {
        fill: inContinent
          ? (isActiveRegion ? color : `${color}60`)
          : '#1c1c1e',
        stroke: inContinent ? `${color}80` : '#27272a',
        strokeWidth: inContinent ? 0.7 : 0.3,
        outline: 'none',
        opacity: revealed ? 1 : 0,
        transition: 'opacity 0.3s, fill 0.2s',
      },
      hover: inContinent ? {
        fill: color,
        stroke: '#f97316',
        strokeWidth: 1,
        outline: 'none',
        cursor: 'pointer',
        filter: 'brightness(1.2)',
      } : {
        fill: '#1c1c1e',
        stroke: '#27272a',
        strokeWidth: 0.3,
        outline: 'none',
      },
      pressed: { fill: color, outline: 'none' },
    }
  }, [drilled, activeRegion, tripRegions, revealedCountries])

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 select-none">
      {/* Starfield background */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Back button when drilled in */}
      {drilled && (
        <button
          onClick={drillOut}
          className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/90 px-3 py-1.5 text-sm text-zinc-300 backdrop-blur hover:border-orange-500 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          World
        </button>
      )}

      {/* Region label */}
      {drilled && (
        <div className="absolute right-4 top-4 z-20 rounded-lg border px-3 py-1 text-sm font-semibold backdrop-blur"
          style={{ borderColor: REGION_COLORS[drilled], color: REGION_COLORS[drilled], background: `${REGION_COLORS[drilled]}15` }}
        >
          {drilled}
        </div>
      )}

      {/* Hint */}
      {!drilled && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-500 backdrop-blur pointer-events-none">
          Click a continent to explore
        </div>
      )}

      <ComposableMap
        projection="geoNaturalEarth1"
        style={{ width: '100%', height: '100%' }}
        projectionConfig={{ scale: 160 }}
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          onMoveEnd={({ zoom: z }: { zoom: number; coordinates: [number, number] }) => setZoom(z)}
          filterZoomEvent={(e: Event) => e.type !== 'wheel'}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: GeoFeature[] }) =>
              geographies.map((geo: GeoFeature) => {
                const style = getCountryStyle(geo)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(geo)}
                    style={style}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend - world view only */}
      {!drilled && (
        <div className="absolute bottom-4 right-4 z-20 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950/90 p-2 backdrop-blur">
          {REGIONS.filter(r => tripRegions.has(r)).map(r => (
            <button
              key={r}
              onClick={() => { drillInto(r); onRegionSelect(r) }}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-zinc-800 w-full text-left"
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: REGION_COLORS[r] }} />
              <span className="text-zinc-400">{r}</span>
              {activeRegion === r && <span className="ml-auto text-orange-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
