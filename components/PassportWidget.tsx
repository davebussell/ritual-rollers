'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Your Passport
        </p>
        <p className="text-[10px] text-zinc-700">{earned}/{REGIONS.length} regions</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REGIONS.map(region => {
          const isEarned = exploredRegions.has(region)
          const isNew = animating === region
          const color = REGION_COLORS[region]

          return (
            <motion.div
              key={region}
              animate={isNew ? { scale: [1, 1.3, 0.95, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              title={isEarned ? `${region} — explored!` : `${region} — not yet visited`}
              className="relative flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-all duration-300"
              style={isEarned
                ? { borderColor: `${color}60`, color, backgroundColor: `${color}12` }
                : { borderColor: '#27272a', color: '#52525b' }}
            >
              <span>{REGION_EMOJI[region]}</span>
              <span>{SHORT[region]}</span>
              <AnimatePresence>
                {isEarned && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[9px]"
                  >✓</motion.span>
                )}
              </AnimatePresence>
              {isNew && (
                <motion.div
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.5 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
