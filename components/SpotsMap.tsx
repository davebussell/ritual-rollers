'use client'

// The index on a map: one pin per established spot, coloured by its headline sport's family.

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import { FAMILY_META, SPORT_BY_ID } from '@/lib/sports'
import type { IndexedSpot } from '@/lib/spots-index'

interface Props {
  spots: IndexedSpot[]
  activeSlug?: string | null
  onSelect?: (slug: string) => void
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO'
const NA_BOUNDS: [[number, number], [number, number]] = [[14, -168], [72, -52]]

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pinHtml(color: string, active: boolean): string {
  const size = active ? 18 : 13
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #F5F0E6;box-shadow:0 1px 4px rgba(31,26,21,.5)${active ? ';outline:3px solid #D9A21B' : ''}"></div>`
}

export default function SpotsMap({ spots, activeSlug = null, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LayerGroup | null>(null)
  const initRef = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || initRef.current) return
    initRef.current = true
    let cancelled = false
    const init = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !containerRef.current) return
      const map = L.map(containerRef.current, { scrollWheelZoom: false })
      mapRef.current = map
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      map.fitBounds(NA_BOUNDS, { padding: [10, 10] })
      setReady(true)
    }
    init()
    return () => {
      cancelled = true
      mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; initRef.current = false; setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const render = async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current, layer = layerRef.current
      if (!map || !layer) return
      layer.clearLayers()
      spots.forEach(spot => {
        const fam = SPORT_BY_ID[spot.sports[0]]?.family ?? 'water'
        const color = FAMILY_META[fam].color
        const active = spot.slug === activeSlug
        const marker = L.marker([spot.lat, spot.lng], {
          icon: L.divIcon({ html: pinHtml(color, active), className: 'rr-index-pin', iconSize: [18, 18], iconAnchor: [9, 9] }),
          zIndexOffset: active ? 1000 : 0,
        })
        const sportsLine = spot.sports.map(id => SPORT_BY_ID[id]?.label).filter(Boolean).join(' · ')
        marker.bindPopup(`<div style="font-family:Work Sans,system-ui;min-width:180px"><strong style="font-size:14px">${escapeHtml(spot.name)}</strong><br/><span style="font-size:12px;color:#6B5B48">${escapeHtml(spot.region)} · ${escapeHtml(sportsLine)}</span><br/><a href="/spots/${spot.slug}" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:#A3271F">Open the spot →</a></div>`)
        marker.on('click', () => onSelect?.(spot.slug))
        layer.addLayer(marker)
      })
      if (spots.length > 0) {
        map.fitBounds(L.latLngBounds(spots.map(s => [s.lat, s.lng] as [number, number])), { padding: [30, 30], maxZoom: 9 })
      } else {
        map.fitBounds(NA_BOUNDS, { padding: [10, 10] })
      }
    }
    render()
  }, [ready, spots, activeSlug, onSelect])

  return <div ref={containerRef} className="h-full w-full" />
}
