'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { REGIONS, REGION_COLORS, REGION_EMOJI, type Region } from '@/lib/regions'
import type { TripWithAnchor } from '@/lib/types'
import PassportWidget from './PassportWidget'
import ExploreTripCard from './ExploreTripCard'

const AdventureMap = dynamic(() => import('./AdventureMap'), { ssr: false })

interface Props {
  trips: TripWithAnchor[]
  currentUserId: string | null
  upvotedIds: string[]
}

const PASSPORT_KEY = 'rr_passport'
const PASSPORT_DATE_KEY = 'rr_passport_date'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function loadPassport(): Set<Region> {
  if (typeof window === 'undefined') return new Set()
  try {
    const date = localStorage.getItem(PASSPORT_DATE_KEY)
    if (date !== todayStr()) {
      localStorage.removeItem(PASSPORT_KEY)
      localStorage.setItem(PASSPORT_DATE_KEY, todayStr())
      return new Set()
    }
    const stored = JSON.parse(localStorage.getItem(PASSPORT_KEY) ?? '[]') as Region[]
    return new Set(stored)
  } catch { return new Set() }
}

function savePassport(regions: Set<Region>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PASSPORT_KEY, JSON.stringify([...regions]))
  localStorage.setItem(PASSPORT_DATE_KEY, todayStr())
}

export default function ExploreView({ trips, currentUserId, upvotedIds }: Props) {
  const [activeRegion, setActiveRegion] = useState<Region | 'all'>('all')
  const [sort, setSort] = useState<'trending' | 'newest'>('trending')
  const [activeTrip, setActiveTrip] = useState<TripWithAnchor | null>(null)
  const [exploredRegions, setExploredRegions] = useState<Set<Region>>(new Set())
  const [newStamp, setNewStamp] = useState<Region | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set(upvotedIds))
  const cardListRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    setExploredRegions(loadPassport())
  }, [])

  const earnStamp = useCallback((region: Region | null) => {
    if (!region || exploredRegions.has(region)) return
    const next = new Set(exploredRegions)
    next.add(region)
    setExploredRegions(next)
    savePassport(next)
    setNewStamp(region)
    setToast(`${REGION_EMOJI[region]} New stamp: ${region}!`)
    setTimeout(() => setToast(null), 3000)
    setTimeout(() => setNewStamp(null), 1000)
  }, [exploredRegions])

  const handleTripClick = useCallback((trip: TripWithAnchor) => {
    setActiveTrip(trip)
    earnStamp(trip.region)
    // Scroll the card into view
    const el = cardRefs.current.get(trip.id)
    if (el && cardListRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [earnStamp])

  const handleCardHover = useCallback((trip: TripWithAnchor | null) => {
    setActiveTrip(trip)
    if (trip) earnStamp(trip.region)
  }, [earnStamp])

  const handleRegionFilter = (region: Region | 'all') => {
    setActiveRegion(region)
    if (region !== 'all') earnStamp(region)
  }

  const filtered = trips
    .filter(t => activeRegion === 'all' || t.region === activeRegion)
    .sort((a, b) =>
      sort === 'trending'
        ? b.upvotes_count - a.upvotes_count
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

  const regionCounts = REGIONS.reduce((acc, r) => {
    acc[r] = trips.filter(t => t.region === r).length
    return acc
  }, {} as Record<Region, number>)

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col md:flex-row overflow-hidden">

      {/* ── Map panel ─────────────────────────────────────────── */}
      <div className="h-72 shrink-0 md:h-auto md:flex-1">
        <AdventureMap
          activeRegion={activeRegion}
          tripRegions={new Set(trips.map(t => t.region).filter(Boolean) as Region[])}
          onRegionSelect={handleRegionFilter}
          onRegionExplored={earnStamp}
        />
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      <div className="flex w-full flex-col md:w-96 md:shrink-0 border-l border-zinc-800 bg-zinc-950 overflow-hidden">

        {/* Filter bar */}
        <div className="shrink-0 border-b border-zinc-800 px-3 py-3 space-y-2">
          {/* Region chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleRegionFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeRegion === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              🌐 All ({trips.length})
            </button>
            {REGIONS.filter(r => regionCounts[r] > 0).map(r => (
              <button
                key={r}
                onClick={() => handleRegionFilter(r)}
                style={activeRegion === r ? { backgroundColor: REGION_COLORS[r] } : {}}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeRegion === r
                    ? 'text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {REGION_EMOJI[r]} {r} ({regionCounts[r]})
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">Sort:</span>
            <button
              onClick={() => setSort('trending')}
              className={`text-xs font-medium transition-colors ${sort === 'trending' ? 'text-orange-400' : 'text-zinc-500 hover:text-white'}`}
            >
              Trending
            </button>
            <span className="text-zinc-700">·</span>
            <button
              onClick={() => setSort('newest')}
              className={`text-xs font-medium transition-colors ${sort === 'newest' ? 'text-orange-400' : 'text-zinc-500 hover:text-white'}`}
            >
              Newest
            </button>
            <span className="ml-auto text-xs text-zinc-600">{filtered.length} trips</span>
          </div>
        </div>

        {/* Trip cards */}
        <div ref={cardListRef} className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-600 text-sm">
              <p>No trips in this region yet.</p>
              <Link href="/trips/new" className="mt-2 text-orange-400 hover:underline text-xs">Be the first →</Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {filtered.map(trip => (
                <div
                  key={trip.id}
                  ref={el => { if (el) cardRefs.current.set(trip.id, el) }}
                  onMouseEnter={() => handleCardHover(trip)}
                  onMouseLeave={() => handleCardHover(null)}
                >
                  <ExploreTripCard
                    trip={trip}
                    currentUserId={currentUserId}
                    isActive={activeTrip?.id === trip.id}
                    userUpvoted={upvoted.has(trip.id)}
                    onUpvoteChange={(id, state) => {
                      setUpvoted(prev => {
                        const next = new Set(prev)
                        state ? next.add(id) : next.delete(id)
                        return next
                      })
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Passport widget */}
        <div className="shrink-0">
          <PassportWidget exploredRegions={exploredRegions} newStamp={newStamp} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-sm text-white shadow-2xl animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}
