'use client'

// Client wrapper so server pages can drop a map in (Leaflet only runs in the browser).
import dynamic from 'next/dynamic'
import type { Pin } from '@/components/PinsMap'

const PinsMap = dynamic(() => import('@/components/PinsMap'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-concrete-2" /> })

export default function HubMap(props: { pins: Pin[]; center?: { lat: number; lng: number } | null; showCenter?: boolean; zoom?: number; fitPins?: boolean; label: string }) {
  return <PinsMap {...props} />
}
