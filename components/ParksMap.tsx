'use client'

// The spots around a place: featured spots as big pins, every mapped park as a small dot,
// coloured by kind, with the place itself pulsing in the middle.

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'

export interface MapPin {
  id: string
  lat: number
  lng: number
  name: string
  sub: string
  color: string
  href?: string
  featured?: boolean
}

interface Props {
  center: { lat: number; lng: number }
  pins: MapPin[]
  activeId?: string | null
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO'

const centerHtml = `
  <div style="position:relative;width:16px;height:16px">
    <div class="animate-pulse" style="position:absolute;inset:-5px;border-radius:50%;background:rgba(217,162,27,.35)"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#D9A21B;border:2px solid #1F1A15"></div>
  </div>`

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pinHtml(color: string, featured: boolean, active: boolean): string {
  const size = featured ? 16 : 10
  return `<div style="width:${size}px;height:${size}px;border-radius:${featured ? '4px' : '50%'};background:${color};border:2px solid #F5F0E6;box-shadow:0 1px 4px rgba(31,26,21,.55)${active ? ';outline:3px solid #D9A21B' : ''}"></div>`
}

export default function ParksMap({ center, pins, activeId = null }: Props) {
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
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({ html: centerHtml, className: 'rr-center-pin', iconSize: [16, 16], iconAnchor: [8, 8] }),
        zIndexOffset: 2000,
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      map.setView([center.lat, center.lng], 11)
      setReady(true)
    }
    init()
    return () => {
      cancelled = true
      mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; initRef.current = false; setReady(false)
    }
  }, [center.lat, center.lng])

  useEffect(() => {
    if (!ready) return
    const render = async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current, layer = layerRef.current
      if (!map || !layer) return
      layer.clearLayers()
      for (const p of pins) {
        const active = p.id === activeId
        const marker = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ html: pinHtml(p.color, !!p.featured, active), className: 'rr-park-pin', iconSize: [16, 16], iconAnchor: [8, 8] }),
          zIndexOffset: p.featured ? 500 : active ? 1000 : 0,
        })
        const link = p.href ? `<br/><a href="${p.href}" style="display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:#A3271F">Open the ride report →</a>` : ''
        marker.bindPopup(`<div style="font-family:Work Sans,system-ui;min-width:170px"><strong style="font-size:14px">${escapeHtml(p.name)}</strong><br/><span style="font-size:12px;color:#6B5B48">${escapeHtml(p.sub)}</span>${link}</div>`)
        layer.addLayer(marker)
      }
      if (pins.length > 0) {
        const near = pins.slice(0, 25)
        map.fitBounds(L.latLngBounds([[center.lat, center.lng], ...near.map(p => [p.lat, p.lng] as [number, number])]), { padding: [30, 30], maxZoom: 13 })
      }
    }
    render()
  }, [ready, pins, activeId, center.lat, center.lng])

  return <div ref={containerRef} className="h-full w-full" />
}
