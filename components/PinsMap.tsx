'use client'

// One map for the whole site: spots, mapped parks, sessions and crews as pins on muted OpenStreetMap tiles.
// Featured things are bigger; a centre point (a city, a spot) can sit in the middle.

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, LayerGroup } from 'leaflet'
import { TILE_URL, TILE_OPTIONS } from '@/lib/tiles'

export interface Pin {
  id: string
  lat: number
  lng: number
  title: string
  sub?: string
  href?: string
  linkLabel?: string
  color: string
  big?: boolean
  square?: boolean
}

interface Props {
  pins: Pin[]
  center?: { lat: number; lng: number } | null
  activeId?: string | null
  onSelect?: (id: string) => void
  zoom?: number            // with a centre: the starting zoom
  fitPins?: boolean        // zoom to the pins (default when there's no centre)
  label: string            // what the map shows, for screen readers
}

const NA_BOUNDS: [[number, number], [number, number]] = [[14, -168], [72, -52]]

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pinHtml(p: Pin, active: boolean): string {
  const size = p.big ? (active ? 20 : 16) : (active ? 14 : 10)
  const radius = p.square ? '3px' : '50%'
  return `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${p.color};border:2px solid #FBFBF8;box-shadow:0 1px 3px rgba(31,32,28,.45)${active ? ';outline:3px solid #1F201C' : ''}"></div>`
}

const centerHtml = `<div style="width:18px;height:18px;border-radius:50%;background:#F2C230;border:3px solid #1F201C;box-shadow:0 0 0 4px rgba(242,194,48,.35)"></div>`

export default function PinsMap({ pins, center = null, activeId = null, onSelect, zoom = 11, fitPins, label }: Props) {
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
      L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      if (center) map.setView([center.lat, center.lng], zoom)
      else map.fitBounds(NA_BOUNDS, { padding: [10, 10] })
      setReady(true)
    }
    init()
    return () => {
      cancelled = true
      mapRef.current?.remove(); mapRef.current = null; layerRef.current = null; initRef.current = false; setReady(false)
    }
    // the map is created once; pins and centre are drawn by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready) return
    const render = async () => {
      const L = (await import('leaflet')).default
      const map = mapRef.current, layer = layerRef.current
      if (!map || !layer) return
      layer.clearLayers()
      if (center) {
        layer.addLayer(L.marker([center.lat, center.lng], {
          icon: L.divIcon({ html: centerHtml, className: 'rr-center', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 2000, keyboard: false,
        }))
      }
      for (const p of pins) {
        const active = p.id === activeId
        const marker = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ html: pinHtml(p, active), className: 'rr-pin', iconSize: [20, 20], iconAnchor: [10, 10] }),
          zIndexOffset: active ? 1500 : p.big ? 500 : 0,
          title: p.title,
        })
        const link = p.href ? `<br/><a href="${p.href}">${escapeHtml(p.linkLabel ?? 'Open')}</a>` : ''
        marker.bindPopup(`<strong>${escapeHtml(p.title)}</strong>${p.sub ? `<br/><span style="color:#5E5F59">${escapeHtml(p.sub)}</span>` : ''}${link}`)
        marker.on('click', () => onSelect?.(p.id))
        layer.addLayer(marker)
      }
      const fit = fitPins ?? !center
      if (fit && pins.length) {
        const pts = pins.map(p => [p.lat, p.lng] as [number, number])
        if (center) pts.push([center.lat, center.lng])
        map.fitBounds(L.latLngBounds(pts), { padding: [28, 28], maxZoom: center ? 14 : 9 })
      } else if (center) {
        map.setView([center.lat, center.lng], zoom)
      }
    }
    render()
  }, [ready, pins, activeId, onSelect, center, zoom, fitPins])

  return <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />
}
