'use client'

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'

export interface JourneyStep {
  id: string
  url: string
  lat: number
  lng: number
  caption: string | null
  label: number
}

interface Props {
  steps: JourneyStep[]
  activeStep: number
  onStepClick: (i: number) => void
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO'

function markerHtml(step: JourneyStep, active: boolean): string {
  const ring = active ? '#ffffff' : '#f97316'
  const scale = active ? 1.15 : 1
  return `
    <div style="position:relative;width:44px;height:44px;transform:scale(${scale});transition:transform .2s">
      <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid ${ring};box-shadow:0 2px 10px rgba(0,0,0,.6)">
        <img src="${step.url}" style="width:100%;height:100%;object-fit:cover" alt="" />
      </div>
      <div style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#f97316;border:2px solid #09090b;color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;font-family:var(--font-jbmono)">
        ${step.label}
      </div>
    </div>`
}

export default function JourneyMap({ steps, activeStep, onStepClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletMarker[]>([])
  const initializedRef = useRef(false)

  // Init once (guarded against StrictMode double-mount)
  useEffect(() => {
    if (!containerRef.current || initializedRef.current || steps.length === 0) return
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

      L.polyline(steps.map(s => [s.lat, s.lng]), {
        color: '#f97316', weight: 2.5, opacity: 0.75, dashArray: '6 8',
        className: 'rr-journey-route',
      }).addTo(map)

      markersRef.current = steps.map((step, i) => {
        const marker = L.marker([step.lat, step.lng], {
          icon: L.divIcon({
            html: markerHtml(step, i === activeStep),
            className: 'rr-journey-marker',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          zIndexOffset: i === activeStep ? 1000 : 0,
        }).addTo(map)
        marker.on('click', () => onStepClick(i))
        return marker
      })

      map.fitBounds(L.latLngBounds(steps.map(s => [s.lat, s.lng])), { padding: [50, 50], maxZoom: 13 })
    }

    init()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = []
      initializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length])

  // React to active step changes: restyle markers + fly
  useEffect(() => {
    const map = mapRef.current
    if (!map || markersRef.current.length === 0) return
    const restyle = async () => {
      const L = (await import('leaflet')).default
      markersRef.current.forEach((marker, i) => {
        marker.setIcon(L.divIcon({
          html: markerHtml(steps[i], i === activeStep),
          className: 'rr-journey-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }))
        marker.setZIndexOffset(i === activeStep ? 1000 : 0)
      })
      const target = steps[activeStep]
      if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 11), { duration: 0.8 })
    }
    restyle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep])

  return <div ref={containerRef} className="h-full w-full" />
}
