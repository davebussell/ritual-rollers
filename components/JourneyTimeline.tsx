'use client'

import { useEffect, useRef } from 'react'
import { MoveRight } from 'lucide-react'

export interface TimelineStep {
  id: string
  url: string
  caption: string | null
  takenAt: string | null
  lat: number | null
  lng: number | null
}

interface Props {
  steps: TimelineStep[]
  activeStep: number
  onStepClick: (i: number) => void
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = Math.PI / 180
  const dLat = (bLat - aLat) * toRad
  const dLng = (bLng - aLng) * toRad
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function formatTime(iso: string): string | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function JourneyTimeline({ steps, activeStep, onStepClick }: Props) {
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  useEffect(() => {
    cardRefs.current.get(activeStep)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeStep])

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-3">
      {steps.map((step, i) => {
        const prev = steps[i - 1]
        const dist = prev && prev.lat != null && prev.lng != null && step.lat != null && step.lng != null
          ? haversineKm(prev.lat, prev.lng, step.lat, step.lng)
          : null
        const time = step.takenAt ? formatTime(step.takenAt) : null
        const active = i === activeStep
        return (
          <div key={step.id} className="flex shrink-0 items-center gap-2">
            {/* Distance connector */}
            {i > 0 && (
              <div className="flex flex-col items-center gap-0.5 px-1 text-zinc-600">
                <MoveRight className="h-3 w-3" />
                {dist != null && dist >= 0.1 && (
                  <span className="font-expedition text-[8px] tracking-[0.15em] whitespace-nowrap">
                    {dist >= 10 ? Math.round(dist) : dist.toFixed(1)} KM
                  </span>
                )}
              </div>
            )}
            {/* Step card */}
            <button
              ref={el => { if (el) cardRefs.current.set(i, el) }}
              onClick={() => onStepClick(i)}
              className={`group w-28 shrink-0 overflow-hidden rounded-xl border text-left transition-all ${
                active
                  ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/40'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
              }`}>
              <div className="relative h-20 w-full overflow-hidden">
                <img src={step.url} alt={step.caption ?? ''} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {step.lat == null && (
                  <span className="absolute bottom-1 right-1 rounded bg-zinc-950/80 px-1 font-expedition text-[7px] uppercase text-zinc-500">no gps</span>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className={`font-expedition text-[9px] tracking-[0.2em] ${active ? 'text-orange-400' : 'text-zinc-500'}`}>
                  STEP {String(i + 1).padStart(2, '0')}
                </p>
                {time && <p className="mt-0.5 text-[10px] text-zinc-500">{time}</p>}
                {step.caption && <p className="mt-0.5 text-[10px] text-zinc-400 line-clamp-1">{step.caption}</p>}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
