'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import { CATEGORY_META, type LocalSpot, type SportCategory } from '@/lib/local-sports'

interface Props {
  center: { lat: number; lng: number }
  spots: LocalSpot[]
  activeCategory: SportCategory | 'all'
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO'

const userPinHtml = `
  <div style="position:relative;width:16px;height:16px">
    <div class="animate-pulse" style="position:absolute;inset:-4px;border-radius:50%;background:rgba(249,115,22,.35)"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#f97316;border:2px solid #ffffff;box-shadow:0 0 8px rgba(249,115,22,.8)"></div>
  </div>`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function spotHtml(color: string): string {
  return `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:1.5px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,.6)"></div>`
}

export default function RideMap({ center, spots, activeCategory }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const spotLayerRef = useRef<LayerGroup | null>(null)
  const initializedRef = useRef(false)
  const [ready, setReady] = useState(false)

  // Init once per center (guarded against StrictMode double-mount)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true
    let cancelled = false

    const init = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      })
      mapRef.current = map

      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map)

      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          html: userPinHtml,
          className: 'rr-ride-user-pin',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        zIndexOffset: 1000,
      }).addTo(map)

      spotLayerRef.current = L.layerGroup().addTo(map)
      map.setView([center.lat, center.lng], 10)
      setReady(true)
    }

    init()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      spotLayerRef.current = null
      initializedRef.current = false
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng])

  // Render spot markers whenever spots or filter change
  useEffect(() => {
    if (!ready) return
    const render = async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current
      const layer = spotLayerRef.current
      if (!map || !layer) return

      layer.clearLayers()
      const shown = activeCategory === 'all' ? spots : spots.filter(s => s.category === activeCategory)

      shown.forEach(spot => {
        const marker = L.marker([spot.lat, spot.lng], {
          icon: L.divIcon({
            html: spotHtml(CATEGORY_META[spot.category].color),
            className: 'rr-ride-spot',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        })
        marker.bindTooltip(`${escapeHtml(spot.name)} — ${spot.sport} · ${spot.distanceKm.toFixed(1)} km`)
        layer.addLayer(marker)
      })

      if (shown.length > 0) {
        const bounds = L.latLngBounds([
          [center.lat, center.lng],
          ...shown.map(s => [s.lat, s.lng] as [number, number]),
        ])
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
      } else {
        map.setView([center.lat, center.lng], 10)
      }
    }
    render()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, spots, activeCategory, center.lat, center.lng])

  return <div ref={containerRef} className="h-full w-full" />
}
