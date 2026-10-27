'use client'

// A park in 3D: the street map draped over real terrain, 3D buildings, the park's outline and every trail or track
// line on top. Tilt, spin and zoom; tap a trail for its climbs and drops, then fly the camera down it.
// MapLibre GL with OpenFreeMap's vector tiles (OpenStreetMap data), the AWS Terrain Tiles for the ground, and the
// USGS orthoimagery as a satellite option in the US. Heights are exaggerated a little so the slopes read; it says so.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MLMap, Marker, GeoJSONSource, StyleSpecification, LngLatBoundsLike } from 'maplibre-gl'
import type { ParkLines, ParkLine } from '@/lib/lines'
import { DIFFICULTY_META, lineColor, metres } from '@/lib/lines'
import type { ParkKind } from '@/lib/parks'
import { projection, loadHeightfield, TERRAIN_ATTRIBUTION_URL } from '@/lib/terrain'
import { profileAlong, downhill, gradeColor, resampleLine, type Profile } from '@/lib/profile'
import { DifficultySign } from '@/components/TrailSigns'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const USGS = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'

interface Props {
  parkId: string
  parkKind: ParkKind
  color: string
  name: string
  lat: number
  lng: number
  country: 'CA' | 'US' | 'MX'
  pick: string | null              // a trail name picked from the list below the map
  onPick: (name: string | null) => void
  onStats?: (stats: Record<string, { climb: number; drop: number }>) => void
  fallback?: React.ReactNode       // shown when the browser can't do WebGL
}

interface Trail { key: string; line: ParkLine; ride: [number, number][]; profile: Profile | null }

function lineTitle(l: ParkLine, parkKind: ParkKind): string {
  if (l.name) return l.name
  if (l.kind === 'track') return parkKind === 'bmx' ? 'BMX track' : 'Pump track'
  return l.kind === 'path' ? 'Path' : 'Unnamed trail'
}

function webglOk(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

function bearingDeg(a: [number, number], b: [number, number]) {
  const k = Math.cos((a[1] * Math.PI) / 180)
  return (Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180) / Math.PI
}

export default function ParkMap3D({ parkId, parkKind, color, name, lat, lng, country, pick, onPick, onStats, fallback = null }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const flyRef = useRef<number | null>(null)
  // rendered in the browser only (dynamic import without SSR), so WebGL can be checked up front
  const [state, setState] = useState<'loading' | 'ready' | 'nogl' | 'error'>(() => (webglOk() ? 'loading' : 'nogl'))
  const [trails, setTrails] = useState<Trail[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [mode3d, setMode3d] = useState(true)
  const [sat, setSat] = useState(false)
  const [flying, setFlying] = useState(false)
  const [exag, setExag] = useState(1.5)
  const [hover, setHover] = useState<number | null>(null)
  const boundsRef = useRef<LngLatBoundsLike | null>(null)

  // the trail shown: one tapped on the map, or the longest piece of the trail picked from the list below
  const selKey = useMemo(() => {
    const tapped = trails.find(t => t.key === sel)
    if (tapped && (!pick || tapped.line.name === pick)) return tapped.key
    if (pick) return trails.filter(t => t.line.name === pick).sort((a, b) => b.line.m - a.line.m)[0]?.key ?? null
    return tapped?.key ?? null
  }, [trails, sel, pick])
  const selected = useMemo(() => trails.find(t => t.key === selKey) ?? null, [trails, selKey])

  // ── build the map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!webglOk()) return
    let cancelled = false
    const init = async () => {
      try {
        const [lib, park, styleJson] = await Promise.all([
          import('maplibre-gl'),
          (parkId ? fetch(`/lines/${parkId}.json`).then(r => (r.ok ? r.json() as Promise<ParkLines> : null)).catch(() => null) : Promise.resolve(null)),
          fetch(STYLE_URL).then(r => r.json() as Promise<StyleSpecification>),
        ])
        await import('maplibre-gl/dist/maplibre-gl.css')
        if (cancelled || !box.current) return
        const maplibregl = lib
        // the worker is served from public/ (scripts/copy-maplibre-worker.mjs)
        maplibregl.setWorkerUrl(`/maplibre/maplibre-gl-worker-${maplibregl.getVersion()}.mjs`)
        const style = styleJson
        style.sources.terrain = { type: 'raster-dem', tiles: [TERRARIUM], encoding: 'terrarium', tileSize: 256, maxzoom: 15, attribution: `<a href="${TERRAIN_ATTRIBUTION_URL}">Terrain Tiles (Mapzen, AWS)</a>` }
        style.sources.hills = { type: 'raster-dem', tiles: [TERRARIUM], encoding: 'terrarium', tileSize: 256, maxzoom: 15 }
        style.sources.usgs = { type: 'raster', tiles: [USGS], tileSize: 256, maxzoom: 16, attribution: 'Imagery: USGS The National Map' }
        const firstSymbol = style.layers.findIndex(l => l.type === 'symbol')
        const firstRoad = style.layers.findIndex(l => /road|transportation|highway|tunnel|bridge/.test(l.id))
        style.layers.splice(firstRoad > 0 ? firstRoad : firstSymbol, 0,
          { id: 'usgs', type: 'raster', source: 'usgs', layout: { visibility: 'none' }, paint: { 'raster-opacity': 1 } },
          { id: 'hills', type: 'hillshade', source: 'hills', paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#4a4a3f' } },
        )
        style.terrain = { source: 'terrain', exaggeration: 1.5 }
        style.sky = { 'sky-color': '#7FA6C9', 'horizon-color': '#E5E4DF', 'fog-color': '#E5E4DF', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4 }

        const coarse = window.matchMedia('(pointer: coarse)').matches
        const map = new maplibregl.Map({
          container: box.current, style, center: [lng, lat], zoom: 17, pitch: 60, bearing: -20, maxPitch: 80, maxZoom: 20.5,
          cooperativeGestures: coarse, attributionControl: { compact: true },
        })
        mapRef.current = map
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
        map.addControl(new maplibregl.FullscreenControl(), 'top-right')

        map.on('load', async () => {
          if (cancelled) return
          // the park
          const outline = park?.outline ?? []
          map.addSource('park', { type: 'geojson', data: { type: 'FeatureCollection', features: outline.map(r => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [r] } })) } })
          map.addLayer({ id: 'park-fill', type: 'fill', source: 'park', paint: { 'fill-color': color, 'fill-opacity': 0.14 } })
          map.addLayer({ id: 'park-line', type: 'line', source: 'park', paint: { 'line-color': color, 'line-width': 2.5 } })
          const lines = park?.lines ?? []
          const features = lines.map((l, i) => ({
            type: 'Feature' as const,
            properties: { key: `${l.id}-${i}`, name: lineTitle(l, parkKind), color: lineColor(l, parkKind), kind: l.kind, double: l.diff === 'double' ? 1 : 0, w: l.kind === 'track' ? 6 : l.kind === 'path' ? 2.5 : 4 },
            geometry: { type: 'LineString' as const, coordinates: l.c },
          }))
          map.addSource('trails', { type: 'geojson', data: { type: 'FeatureCollection', features } })
          map.addSource('picked', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
          map.addLayer({ id: 'trails-casing', type: 'line', source: 'trails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FBFBF8', 'line-width': ['+', ['get', 'w'], 3], 'line-opacity': 0.9 } })
          map.addLayer({ id: 'trails', type: 'line', source: 'trails', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'], 'line-dasharray': ['case', ['==', ['get', 'kind'], 'path'], ['literal', [2, 2]], ['literal', [1, 0]]] } })
          map.addLayer({ id: 'picked', type: 'line', source: 'picked', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#F2C230', 'line-width': 9, 'line-opacity': 0.95 } })
          map.addLayer({ id: 'trail-names', type: 'symbol', source: 'trails', minzoom: 15.5, filter: ['!=', ['get', 'kind'], 'path'], layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#1F201C', 'text-halo-color': '#FBFBF8', 'text-halo-width': 1.6 } })
          if (!outline.length && !lines.length) {
            new maplibregl.Marker({ color }).setLngLat([lng, lat]).addTo(map)
          }
          // frame the whole park as close as it fits
          const b = new maplibregl.LngLatBounds()
          for (const r of outline) for (const p of r) b.extend(p)
          for (const l of lines) for (const p of l.c) b.extend(p)
          if (b.isEmpty()) b.extend([lng - 0.0008, lat - 0.0006]).extend([lng + 0.0008, lat + 0.0006])
          boundsRef.current = b
          map.fitBounds(b, { padding: { top: 50, bottom: 50, left: 30, right: 60 }, pitch: 60, bearing: -20, maxZoom: 19.5, duration: 0 })

          map.on('click', 'trails', (e: { features?: { properties?: Record<string, unknown> }[] }) => {
            const f = e.features?.[0]
            if (!f) return
            setSel(String(f.properties?.key))
            const n = String(f.properties?.name ?? '')
            onPick(lines.find(l => lineTitle(l, parkKind) === n && l.name) ? n : null)
          })
          map.on('mouseenter', 'trails', () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', 'trails', () => { map.getCanvas().style.cursor = '' })
          for (const ev of ['mousedown', 'touchstart', 'wheel'] as const) map.on(ev, () => { if (flyRef.current) stopFly() })
          setState('ready')

          // climbs and drops: elevation along every line
          if (lines.length) {
            const c0 = map.getCenter()
            const proj = projection(c0.lng, c0.lat)
            const sw = proj.toLocal(b.getWest(), b.getSouth()), ne = proj.toLocal(b.getEast(), b.getNorth())
            const hf = await loadHeightfield(proj, { minX: sw[0] - 60, maxX: ne[0] + 60, minZ: ne[1] - 60, maxZ: sw[1] + 60 })
            if (cancelled) return
            const elev = (lo: number, la: number) => { const [x, z] = proj.toLocal(lo, la); return hf.sample(x, z) }
            const relief = hf.max - hf.min
            const e = relief < 15 ? 2.2 : relief < 60 ? 1.7 : relief < 250 ? 1.4 : 1.2
            setExag(e)
            map.setTerrain({ source: 'terrain', exaggeration: e })
            const ts: Trail[] = lines.map((l, i) => {
              const ride = l.kind === 'trail' || l.kind === 'path' ? downhill(l.c, elev, l.oneway) : l.c
              return { key: `${l.id}-${i}`, line: l, ride, profile: hf.flat ? null : profileAlong(ride, elev, Math.max(2, Math.min(10, l.m / 120))) }
            })
            setTrails(ts)
            const stats: Record<string, { climb: number; drop: number }> = {}
            for (const t of ts) if (t.line.name && t.profile) {
              const s = stats[t.line.name] ?? { climb: 0, drop: 0 }
              s.climb += t.profile.climb; s.drop += t.profile.drop
              stats[t.line.name] = s
            }
            onStats?.(stats)
          }
        })
        map.on('error', (e: { error?: { message?: string } }) => { if (/style/i.test(String(e.error?.message ?? ''))) setState('error') })
      } catch {
        if (!cancelled) setState('error')
      }
    }
    init()
    return () => {
      cancelled = true
      if (flyRef.current) cancelAnimationFrame(flyRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
    // the map is built once per park
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkId])

  // show the picked trail, and frame it
  useEffect(() => {
    const map = mapRef.current
    if (!map || state !== 'ready') return
    const src = map.getSource('picked') as GeoJSONSource | undefined
    const t = trails.find(x => x.key === selKey)
    src?.setData({ type: 'FeatureCollection', features: t ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: t.line.c } }] : [] })
    if (t) {
      const xs = t.line.c.map(p => p[0]), ys = t.line.c.map(p => p[1])
      map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 70, pitch: map.getPitch() || 60, bearing: map.getBearing(), maxZoom: 19, duration: 900 })
    }
  }, [selKey, trails, state])

  // the point under the finger on the profile, on the map
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selected?.profile) return
    const run = async () => {
      const maplibregl = await import('maplibre-gl')
      if (hover === null) { markerRef.current?.remove(); markerRef.current = null; return }
      const p = selected.profile!.pts[hover]
      if (!markerRef.current) {
        const el = document.createElement('div')
        el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#D4402A;border:3px solid #FBFBF8;box-shadow:0 1px 4px rgba(0,0,0,.4)'
        markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(p).addTo(map)
      } else markerRef.current.setLngLat(p)
    }
    run()
  }, [hover, selected])

  function toggle3d() {
    const map = mapRef.current
    if (!map) return
    const next = !mode3d
    setMode3d(next)
    map.setTerrain(next ? { source: 'terrain', exaggeration: exag } : null)
    map.easeTo({ pitch: next ? 60 : 0, bearing: next ? -20 : 0, duration: 700 })
  }
  function toggleSat() {
    const map = mapRef.current
    if (!map) return
    const next = !sat
    setSat(next)
    map.setLayoutProperty('usgs', 'visibility', next ? 'visible' : 'none')
  }
  function stopFly() {
    if (flyRef.current) cancelAnimationFrame(flyRef.current)
    flyRef.current = null
    setFlying(false)
  }
  // sweep the camera down the trail, looking ahead along it
  function fly() {
    const map = mapRef.current
    if (!map || !selected) return
    if (flyRef.current) { stopFly(); return }
    if (!mode3d) { setMode3d(true); map.setTerrain({ source: 'terrain', exaggeration: exag }) }
    const { pts, d } = resampleLine(selected.ride, 2)
    const total = d[d.length - 1]
    const speed = Math.max(8, Math.min(22, total / 25))   // m/s: a long trail plays faster
    let s = 0, last = performance.now()
    setFlying(true)
    const at = (dist: number) => pts[Math.min(pts.length - 1, Math.max(0, Math.round(dist / 2)))]
    const step = (now: number) => {
      s += (speed * (now - last)) / 1000
      last = now
      if (s >= total) { stopFly(); return }
      const here = at(s), ahead = at(s + 25)
      map.jumpTo({ center: at(s + 12), bearing: bearingDeg(here, ahead), pitch: 72, zoom: 18.4 })
      flyRef.current = requestAnimationFrame(step)
    }
    flyRef.current = requestAnimationFrame(step)
  }
  function reset() {
    stopFly()
    setSel(null)
    onPick(null)
    const map = mapRef.current, b = boundsRef.current
    if (map && b) map.fitBounds(b, { padding: 50, pitch: mode3d ? 60 : 0, bearing: mode3d ? -20 : 0, maxZoom: 19.5, duration: 800 })
  }

  if (state === 'nogl') return <>{fallback}</>

  const p = selected?.profile ?? null
  return (
    <div>
      <div className="relative h-[62svh] max-h-[640px] min-h-[340px] w-full overflow-hidden bg-concrete-2 sm:h-[560px]">
        <div ref={box} className="h-full w-full" role="region" aria-label={`3D map of ${name}`} />
        {state !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center text-[14px] text-muted">
            {state === 'loading' ? 'Loading the 3D map…' : 'The map didn’t load. Try again in a moment.'}
          </div>
        )}
        {state === 'ready' && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={toggle3d} className="rounded-md bg-asphalt/80 px-2.5 py-1.5 text-[13px] font-bold text-flyer">{mode3d ? 'Flat map' : '3D'}</button>
            {country === 'US' && <button type="button" onClick={toggleSat} aria-pressed={sat} className="rounded-md bg-asphalt/80 px-2.5 py-1.5 text-[13px] font-bold text-flyer">{sat ? 'Street map' : 'Satellite'}</button>}
            {(selKey || flying) && <button type="button" onClick={reset} className="rounded-md bg-asphalt/80 px-2.5 py-1.5 text-[13px] font-bold text-flyer">Whole park</button>}
          </div>
        )}
      </div>

      {selected && (
        <div className="border-t border-asphalt/10 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {selected.line.diff && <DifficultySign d={selected.line.diff} size={16} />}
              <p className="truncate text-[17px] font-bold">{lineTitle(selected.line, parkKind)}</p>
              <span className="text-[14px] text-muted">{metres(selected.line.m)}</span>
            </div>
            {p && <button type="button" onClick={fly} className="btn btn-curb !py-2">{flying ? 'Stop' : 'Fly it'}</button>}
          </div>
          {p ? (
            <>
              <p className="mt-1 text-[14px] text-asphalt-2">
                {p.drop >= 1 && <>↓ <b>{Math.round(p.drop)} m</b> down · </>}
                {p.climb >= 1 && <>↑ <b>{Math.round(p.climb)} m</b> up · </>}
                steepest {Math.round(p.maxGrade * 100)}%
                {selected.line.kind !== 'track' && !selected.line.oneway && p.start > p.end + 2 ? ' · shown from the top' : ''}
                {selected.line.diff ? ` · ${DIFFICULTY_META[selected.line.diff].label.toLowerCase()}` : ''}
              </p>
              <ProfileChart p={p} hover={hover} onHover={setHover} />
            </>
          ) : (
            <p className="mt-1 text-[14px] text-muted">Working out the climbs and drops…</p>
          )}
        </div>
      )}
      {!selected && state === 'ready' && trails.length > 0 && (
        <p className="border-t border-asphalt/10 px-4 py-3 text-[14px] text-muted">Tap a trail to see its climbs and drops, then fly down it.</p>
      )}
      <p className="px-4 pb-3 text-[12px] text-muted">
        Heights shown ×{exag.toFixed(1)} so the slopes read. Ground: elevation data (3–30 m detail), so small rollers and jumps aren’t in it.
      </p>
    </div>
  )
}

function ProfileChart({ p, hover, onHover }: { p: Profile; hover: number | null; onHover: (i: number | null) => void }) {
  const W = 600, H = 120, pad = 4
  const span = Math.max(4, p.max - p.min)
  const x = (d: number) => pad + ((W - 2 * pad) * d) / (p.length || 1)
  const y = (h: number) => H - pad - ((H - 2 * pad - 14) * (h - p.min)) / span
  const segs = []
  for (let i = 1; i < p.d.length; i++) {
    const g = p.grade[i]
    segs.push(<path key={i} d={`M${x(p.d[i - 1])},${H} L${x(p.d[i - 1])},${y(p.h[i - 1])} L${x(p.d[i])},${y(p.h[i])} L${x(p.d[i])},${H} Z`} fill={gradeColor(g)} opacity={0.85} />)
  }
  const line = p.d.map((d, i) => `${i ? 'L' : 'M'}${x(d)},${y(p.h[i])}`).join(' ')
  const move = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect()
    const d = ((clientX - r.left) / r.width) * p.length
    let best = 0
    for (let i = 0; i < p.d.length; i++) if (Math.abs(p.d[i] - d) < Math.abs(p.d[best] - d)) best = i
    onHover(best)
  }
  const hv = hover !== null ? hover : null
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full touch-none select-none" preserveAspectRatio="none" role="img"
        aria-label={`Elevation along the trail, from ${Math.round(p.start)} m to ${Math.round(p.end)} m`}
        onPointerMove={e => move(e.clientX, e.currentTarget)} onPointerDown={e => move(e.clientX, e.currentTarget)} onPointerLeave={() => onHover(null)}>
        {segs}
        <path d={line} fill="none" stroke="#1F201C" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {hv !== null && <line x1={x(p.d[hv])} x2={x(p.d[hv])} y1={0} y2={H} stroke="#1F201C" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-1 flex justify-between text-[12px] text-muted">
        <span>{Math.round(p.start)} m</span>
        <span>{hv !== null ? `${metres(p.d[hv])} in · ${Math.round(p.h[hv])} m` : 'Green gentle · yellow 5–10% · orange 10–15% · red steeper'}</span>
        <span>{Math.round(p.end)} m</span>
      </div>
    </div>
  )
}
