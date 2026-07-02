'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { REGION_EMOJI, type Region } from '@/lib/regions'

interface TickerTrip {
  id: string
  title: string
  upvotes_count: number
  region: Region | null
  username: string
}

interface Props {
  trips: TickerTrip[]
}

export default function MapTicker({ trips }: Props) {
  const ordered = useMemo(
    () => [...trips].sort((a, b) => b.upvotes_count - a.upvotes_count),
    [trips]
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (ordered.length < 2) return
    const timer = setInterval(() => setIndex(i => (i + 1) % ordered.length), 3500)
    return () => clearInterval(timer)
  }, [ordered.length])

  if (ordered.length === 0) return null
  const trip = ordered[index % ordered.length]

  return (
    <div className="pointer-events-auto absolute bottom-10 left-1/2 z-10 -translate-x-1/2">
      <AnimatePresence mode="wait">
        <motion.div
          key={trip.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Link
            href={`/trips/${trip.id}`}
            className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-1.5 font-expedition text-[10px] uppercase tracking-[0.15em] text-zinc-400 backdrop-blur transition-colors hover:border-zinc-700 hover:text-zinc-200"
          >
            <span>{trip.region ? REGION_EMOJI[trip.region] : '🌐'}</span>
            <span className="max-w-48 truncate">{trip.title}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-orange-400">{trip.upvotes_count}▲</span>
            <span className="text-zinc-600">·</span>
            <span>@{trip.username}</span>
          </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
