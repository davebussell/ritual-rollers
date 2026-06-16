'use client'

import { useEffect, useRef } from 'react'
import type { TripWithAnchor } from '@/lib/types'

interface Props {
  trips: TripWithAnchor[]
  activeTrip: TripWithAnchor | null
  onTripClick: (trip: TripWithAnchor) => void
  onRegionExplored: (tripId: string) => void
}

export default function ExploreMap({ trips, activeTrip, onTripClick, onRegionExplored }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Build GeoJSON from trips with anchor coords
  const anchored = trips.filter(t => t.anchorLat !== null && t.anchorLng !== null)

  useEffect(() => {
    if (!containerRef.current) return
    let map: any

    const init = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      map = new mapboxgl.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        projection: 'globe' as any,
        zoom: 1.5,
        center: [15, 25],
        attributionControl: false,
      })
      mapRef.current = map

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-left')

      map.on('style.load', () => {
        // Fog for globe atmosphere
        map.setFog({
          color: 'rgb(10,10,18)',
          'high-color': 'rgb(20,20,40)',
          'horizon-blend': 0.05,
          'space-color': 'rgb(4,4,10)',
          'star-intensity': 0.6,
        })

        // Cluster source
        const geojson: any = {
          type: 'FeatureCollection',
          features: anchored.map(t => ({
            type: 'Feature',
            properties: { tripId: t.id, title: t.title, region: t.region },
            geometry: { type: 'Point', coordinates: [t.anchorLng!, t.anchorLat!] },
          })),
        }

        map.addSource('trips', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 6,
          clusterRadius: 50,
        })

        // Cluster circles
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'trips',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#f97316',
            'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 10, 30],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(249,115,22,0.3)',
          },
        })

        // Cluster count labels
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'trips',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 13,
          },
          paint: { 'text-color': '#fff' },
        })

        // Unclustered points
        map.addLayer({
          id: 'unclustered',
          type: 'circle',
          source: 'trips',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#f97316',
            'circle-radius': 7,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(249,115,22,0.4)',
          },
        })

        // Active route line (empty at start)
        map.addSource('active-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'active-route-line',
          type: 'line',
          source: 'active-route',
          paint: {
            'line-color': '#fb923c',
            'line-width': 2.5,
            'line-opacity': 0.9,
            'line-dasharray': [2, 1],
          },
        })
        map.addLayer({
          id: 'active-route-glow',
          type: 'line',
          source: 'active-route',
          paint: {
            'line-color': '#f97316',
            'line-width': 8,
            'line-opacity': 0.15,
          },
        })

        // Cluster click — zoom in
        map.on('click', 'clusters', (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
          if (!features.length) return
          const clusterId = features[0].properties.cluster_id
          ;(map.getSource('trips') as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) return
            map.easeTo({ center: features[0].geometry.coordinates, zoom })
          })
        })

        // Single trip click
        map.on('click', 'unclustered', (e: any) => {
          const props = e.features?.[0]?.properties
          if (!props) return
          const trip = anchored.find(t => t.id === props.tripId)
          if (trip) {
            onTripClick(trip)
            onRegionExplored(trip.id)
          }
        })

        // Cursors
        map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'unclustered', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'unclustered', () => { map.getCanvas().style.cursor = '' })
      })
    }

    init()
    return () => { map?.remove(); mapRef.current = null }
  }, [])

  // React to activeTrip changes — draw route and fly camera
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getSource('active-route')) return

    if (!activeTrip || activeTrip.allPhotos.length === 0) {
      ;(map.getSource('active-route') as any)?.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const coords = activeTrip.allPhotos
      .filter(p => p.lat && p.lng)
      .map(p => [p.lng, p.lat])

    if (coords.length === 0) return

    ;(map.getSource('active-route') as any).setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    })

    if (coords.length === 1) {
      map.flyTo({ center: coords[0] as [number, number], zoom: 6, duration: 1200 })
    } else {
      const lngs = coords.map(c => c[0])
      const lats = coords.map(c => c[1])
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 80, maxZoom: 10, duration: 1200 }
      )
    }
  }, [activeTrip?.id])

  return (
    <div ref={containerRef} className="h-full w-full" />
  )
}
