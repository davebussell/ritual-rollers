'use client'

import { useEffect, useState } from 'react'
import { REGIONS, REGION_COLORS, REGION_EMOJI, type Region } from '@/lib/regions'

interface Props {
  exploredRegions: Set<Region>
  newStamp: Region | null
}

const SHORT: Record<Region, string> = {
  'North America': 'N. America',
  'South America': 'S. America',
  'Europe': 'Europe',
  'Africa': 'Africa',
  'Asia': 'Asia',
  'Oceania': 'Oceania',
}

export default function PassportWidget({ exploredRegions, newStamp }: Props) {
  const [animating, setAnimating] = useState<Region | null>(null)

  useEffect(() => {
    if (!newStamp) return
    setAnimating(newStamp)
    const t = setTimeout(() => setAnimating(null), 800)
    return () => clearTimeout(t)
  }, [newStamp])

  return (
    <div className="border-t border-zinc-800 px-3 py-3 bg-zinc-950">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-600">Your Passport</p>
      <div className="flex flex-wrap gap-1.5">
        {REGIONS.map(region => {
          const earned = exploredRegions.has(region)
          const color = REGION_COLORS[region]
          const isNew = animating === region
          return (
            <div
              key={region}
              title={earned ? `${region} — explored!` : `${region} — not yet visited`}
              style={earned ? { borderColor: color, color } : {}}
              className={[
                'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-300',
                earned
                  ? 'bg-opacity-10'
                  : 'border-zinc-700 text-zinc-600',
                isNew ? 'scale-125' : 'scale-100',
              ].join(' ')}
            >
              <span>{REGION_EMOJI[region]}</span>
              <span>{SHORT[region]}</span>
              {earned && <span className="text-[10px]">✓</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
