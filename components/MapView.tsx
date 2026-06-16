'use client'

import { useEffect, useRef, useState } from 'react'
import type { TripPhoto } from '@/lib/types'

interface Props {
  photos: TripPhoto[]
  interactive?: boolean
}

interface PhotoWithCoords extends TripPhoto {
  lat: number
  lng: number
}

export default function MapView({ photos, interactive = true }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [activePhoto, setActivePhoto] = useState<PhotoWithCoords | null>(null)

  const photosWithCoords = photos.filter(
    (p): p is PhotoWithCoords => p.lat !== null && p.lng !== null
  )

  useEffect(() => {
    if (!mapContainer.current || photosWithCoords.length === 0) return

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      const bounds = new mapboxgl.LngLatBounds()
      photosWithCoords.forEach(p => bounds.extend([p.lng, p.lat]))

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        interactive,
        fitBoundsOptions: { padding: 60, maxZoom: 14 },
      })

      mapRef.current = map

      map.on('load', () => {
        // Route line
        const coords = photosWithCoords.map(p => [p.lng, p.lat])
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
          },
        })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#f97316', 'line-width': 2.5, 'line-opacity': 0.8 },
        })

        // Photo markers
        photosWithCoords.forEach((photo, i) => {
          const el = document.createElement('div')
          el.className = 'map-marker'
          el.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            border: 2px solid #f97316; overflow: hidden; cursor: pointer;
            box-shadow: 0 0 0 3px rgba(249,115,22,0.3);
          `
          const img = document.createElement('img')
          img.src = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${photo.storage_path}`
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
          el.appendChild(img)
          el.addEventListener('click', () => setActivePhoto(photo))

          new mapboxgl.Marker({ element: el })
            .setLngLat([photo.lng, photo.lat])
            .addTo(map)
        })

        map.fitBounds(bounds, { padding: 60, maxZoom: 14 })
      })
    }

    init()
    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [photosWithCoords.length])

  if (photosWithCoords.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 rounded-xl text-zinc-500 text-sm">
        No photos with GPS data
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="h-full w-full rounded-xl overflow-hidden" />
      {activePhoto && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 rounded-xl bg-zinc-950/95 border border-zinc-800 overflow-hidden shadow-xl">
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${activePhoto.storage_path}`}
            alt=""
            className="w-full aspect-video object-cover"
          />
          <div className="p-3">
            {activePhoto.caption && <p className="text-sm text-zinc-200">{activePhoto.caption}</p>}
            {activePhoto.taken_at && (
              <p className="text-xs text-zinc-500 mt-1">
                {new Date(activePhoto.taken_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            <button onClick={() => setActivePhoto(null)} className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
