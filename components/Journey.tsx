'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import JourneyTimeline from '@/components/JourneyTimeline'
import type { JourneyStep } from '@/components/JourneyMap'

const JourneyMap = dynamic(() => import('@/components/JourneyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-sm text-zinc-600">
      Loading map…
    </div>
  ),
})

export interface JourneyPhoto {
  id: string
  url: string
  lat: number | null
  lng: number | null
  taken_at: string | null
  caption: string | null
  sequence_order: number
}

interface Props {
  photos: JourneyPhoto[]
}

export default function Journey({ photos }: Props) {
  // Order by capture time when every GPS photo has one; otherwise keep upload order
  const ordered = useMemo(() => {
    const sorted = [...photos]
    const gpsPhotos = sorted.filter(p => p.lat != null && p.lng != null)
    const allTimed = gpsPhotos.length > 0 && gpsPhotos.every(p => p.taken_at)
    if (allTimed) {
      sorted.sort((a, b) => {
        if (a.taken_at && b.taken_at) return new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
        return a.sequence_order - b.sequence_order
      })
    } else {
      sorted.sort((a, b) => a.sequence_order - b.sequence_order)
    }
    return sorted
  }, [photos])

  const gpsSteps: JourneyStep[] = useMemo(() =>
    ordered
      .filter(p => p.lat != null && p.lng != null)
      .map((p, i) => ({ id: p.id, url: p.url, lat: p.lat!, lng: p.lng!, caption: p.caption, label: i + 1 })),
    [ordered])

  const [activeStep, setActiveStep] = useState(0)

  if (ordered.length === 0) return null

  // Timeline shows every photo; the map only plots GPS-bearing ones.
  // Map step index i corresponds to the i-th GPS photo in the ordered list.
  const timelineSteps = ordered.map(p => ({
    id: p.id, url: p.url, caption: p.caption, takenAt: p.taken_at, lat: p.lat, lng: p.lng,
  }))
  const gpsIndexByOrdered = ordered.map(p =>
    p.lat != null && p.lng != null ? gpsSteps.findIndex(s => s.id === p.id) : -1
  )
  const orderedIndexByGps = gpsSteps.map(s => ordered.findIndex(p => p.id === s.id))
  const activeTimelineIndex = orderedIndexByGps[activeStep] ?? 0

  return (
    <div>
      {gpsSteps.length > 0 ? (
        <div className="h-[420px] overflow-hidden rounded-2xl border border-zinc-800">
          <JourneyMap
            steps={gpsSteps}
            activeStep={activeStep}
            onStepClick={setActiveStep}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-3 text-sm text-zinc-500">
          No GPS data in these photos — upload originals (not screenshots) to map your route.
        </p>
      )}
      <JourneyTimeline
        steps={timelineSteps}
        activeStep={activeTimelineIndex}
        onStepClick={i => {
          const gpsIdx = gpsIndexByOrdered[i]
          if (gpsIdx >= 0) setActiveStep(gpsIdx)
        }}
      />
    </div>
  )
}
