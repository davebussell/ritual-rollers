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
  const earned = exploredRegions.size

  useEffect(() => {
    if (!newStamp) return
    setAnimating(newStamp)
    const t = setTimeout(() => setAnimating(null), 900)
    return () => clearTimeout(t)
  }, [newStamp])

  return (
    <div className="border-t border-zinc-800/60 bg-zinc-950 px-3 pb-3 pt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-expedition text-[9px] uppercase tracking-[0.3em] text-zinc-600">
          Your Passport
        </p>
        <p className="font-expedition text-[9px] uppercase tracking-widest text-zinc-700">
          {earned}/{REGIONS.length} regions
        </p>
      </div>

      {/* Progress */}
      <div className="mb-2.5 h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
          style={{ width: `${(earned / REGIONS.length) * 100}%` }}
        />
      </div>

      {/* Stamps */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {REGIONS.map(region => {
          const isEarned = exploredRegions.has(region)
          const isNew = animating === region
          const color = REGION_COLORS[region]

          return (
            <div key={region}
              title={isEarned ? `${region} — explored!` : `${region} — not yet visited`}
              className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed text-base transition-all duration-300 ${
                  isNew ? 'animate-stamp-in' : ''
                } ${isEarned ? '' : 'opacity-40'}`}
                style={isEarned
                  ? { borderColor: color, backgroundColor: `${color}12`, transform: 'rotate(-4deg)' }
                  : { borderColor: '#27272a' }}
              >
                <span className={isEarned ? '' : 'opacity-60 grayscale'}>{REGION_EMOJI[region]}</span>
              </div>
              <span
                className="font-expedition text-[8px] uppercase tracking-wider"
                style={{ color: isEarned ? color : '#3f3f46' }}
              >
                {SHORT[region]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
