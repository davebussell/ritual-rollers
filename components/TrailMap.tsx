'use client'

// A park's own map: its outline and the trails and track lines mapped inside it, coloured by difficulty.
// The geometry is fetched from /lines/<id>.json (scripts/fetch-lines.mjs); the summary comes from the server.

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Polyline, LayerGroup } from 'leaflet'
import { TILE_URL, TILE_OPTIONS } from '@/lib/tiles'
import type { ParkLines, ParkLine } from '@/lib/lines'
import { DIFFICULTY_META, lineColor, metres } from '@/lib/lines'
import type { ParkKind } from '@/lib/parks'

interface Props {
  parkId: string
  parkKind: ParkKind
  color: string
  label: string
  highlight?: string | null      // a trail name to pick out
  onPick?: (name: string | null) => void
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function lineTitle(l: ParkLine, parkKind: ParkKind): string {
  if (l.name) return l.name
  if (l.kind === 'track') return parkKind === 'bmx' ? 'BMX track' : 'Pump track'
  return l.kind === 'path' ? 'Path' : 'Unnamed trail'
}

export default function TrailMap({ parkId, parkKind, color, label, highlight = null, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const linesRef = useRef<{ line: ParkLine; poly: Polyline; base: { weight: number; opacity: number } }[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'none' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    let layer: LayerGroup | null = null
    const init = async () => {
      let data: ParkLines
      try {
        const res = await fetch(`/lines/${parkId}.json`)
        if (!res.ok) { if (!cancelled) setState(res.status === 404 ? 'none' : 'error'); return }
        data = await res.json()
      } catch { if (!cancelled) setState('error'); return }
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !ref.current) return
      const map = L.map(ref.current, { scrollWheelZoom: false, zoomSnap: 0.5 })
      mapRef.current = map
      L.tileLayer(TILE_URL, { ...TILE_OPTIONS, maxZoom: 20, maxNativeZoom: 19 }).addTo(map)
      layer = L.layerGroup().addTo(map)
      const bounds = L.latLngBounds([])
      for (const ring of data.outline) {
        const ll = ring.map(([lng, lat]) => [lat, lng] as [number, number])
        L.polygon(ll, { color, weight: 2, fillColor: color, fillOpacity: 0.1, interactive: false }).addTo(layer)
        ll.forEach(p => bounds.extend(p))
      }
      // paths underneath, then trails easiest first so the hard ones sit on top, then tracks
      const order = (l: ParkLine) => (l.kind === 'path' ? 0 : l.kind === 'track' ? 6 : l.diff ? { green: 2, blue: 3, black: 4, double: 5 }[l.diff] : 1)
      const lines = [...data.lines].sort((a, b) => order(a) - order(b))
      linesRef.current = []
      for (const l of lines) {
        const ll = l.c.map(([lng, lat]) => [lat, lng] as [number, number])
        ll.forEach(p => bounds.extend(p))
        const c = lineColor(l, parkKind)
        const base = { weight: l.kind === 'track' ? 5 : l.kind === 'path' ? 2 : 3.5, opacity: l.kind === 'path' ? 0.8 : 0.95 }
        if (l.diff === 'double') L.polyline(ll, { color: '#FBFBF8', weight: base.weight + 3, opacity: 0.9, interactive: false }).addTo(layer)
        const poly = L.polyline(ll, { color: c, ...base, dashArray: l.kind === 'path' ? '4 5' : l.diff === 'double' ? '10 4' : undefined, lineCap: 'round' })
        const sub = l.kind === 'track' ? (parkKind === 'bmx' ? 'BMX track' : 'Track') : l.diff ? `${DIFFICULTY_META[l.diff].sign} · ${DIFFICULTY_META[l.diff].label}` : l.kind === 'path' ? 'Path' : 'Trail, not rated'
        poly.bindPopup(`<strong>${escapeHtml(lineTitle(l, parkKind))}</strong><br/><span style="color:#5E5F59">${escapeHtml(sub)} · ${metres(l.m)}</span>`)
        poly.on('click', () => onPick?.(l.name))
        poly.addTo(layer)
        linesRef.current.push({ line: l, poly, base })
      }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16], maxZoom: 19 })
      setState('ok')
    }
    init()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layer = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkId])

  // pick out one trail
  useEffect(() => {
    for (const { line, poly, base } of linesRef.current) {
      const on = highlight !== null && line.name === highlight
      const dim = highlight !== null && !on
      poly.setStyle({ weight: on ? base.weight + 3 : base.weight, opacity: dim ? 0.3 : base.opacity })
      if (on) poly.bringToFront()
    }
  }, [highlight, state])

  return (
    <div className="relative h-full w-full">
      <div ref={ref} role="region" aria-label={label} className="h-full w-full" />
      {state !== 'ok' && (
        <div className="absolute inset-0 flex items-center justify-center bg-concrete-2 text-[14px] text-muted">
          {state === 'loading' ? 'Loading the map…' : state === 'none' ? 'Nothing is mapped inside this park yet.' : 'The map didn’t load.'}
        </div>
      )}
    </div>
  )
}
