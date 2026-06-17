'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCountryInfo } from '@/lib/country-names'
import { REGION_COLORS } from '@/lib/regions'
import { getCountryContinent } from '@/lib/countries'
import type { TripWithAnchor } from '@/lib/types'

interface Props {
  countryId: number
  countryName: string
  trips: TripWithAnchor[]
  currentUserId: string | null
}

const BADGE_KEY = 'rr_country_badges'

function loadBadges(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(BADGE_KEY) ?? '[]')) } catch { return new Set() }
}

function saveBadges(s: Set<string>) {
  localStorage.setItem(BADGE_KEY, JSON.stringify([...s]))
}

export default function CountryPanel({ countryId, countryName, trips, currentUserId }: Props) {
  const [badges, setBadges] = useState<Set<string>>(new Set())
  const [claimAnim, setClaimAnim] = useState(false)

  const info = getCountryInfo(countryId)
  const region = getCountryContinent(countryId)
  const color = region ? REGION_COLORS[region] : '#f97316'
  const alpha2 = info?.alpha2 ?? String(countryId)
  const hasBadge = badges.has(alpha2)

  useEffect(() => { setBadges(loadBadges()) }, [])

  function claimBadge() {
    if (hasBadge) return
    const next = new Set(badges)
    next.add(alpha2)
    setBadges(next)
    saveBadges(next)
    setClaimAnim(true)
    setTimeout(() => setClaimAnim(false), 800)
  }

  const countryTrips = trips
    .filter(t => t.countryCode === alpha2)
    .sort((a, b) => b.upvotes_count - a.upvotes_count)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-800"
        style={{ background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)` }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{info?.flag ?? '🌍'}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{countryName}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {countryTrips.length > 0
                ? `${countryTrips.length} trip${countryTrips.length !== 1 ? 's' : ''} here`
                : 'Be the first to explore'}
            </p>
          </div>
        </div>

        {/* Badge */}
        <div className="mt-3 flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl transition-all duration-500 ${
              hasBadge
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-zinc-700 bg-zinc-800/50 opacity-50 grayscale'
            } ${claimAnim ? 'scale-125' : 'scale-100'}`}
            style={hasBadge ? { boxShadow: `0 0 16px ${color}40` } : {}}>
            {hasBadge ? info?.flag ?? '🏅' : '🔒'}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-zinc-300">
              {hasBadge ? `${countryName} Explorer` : 'Claim your badge'}
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {hasBadge ? 'You\'ve been here!' : 'Upload a photo to claim'}
            </p>
          </div>
          {!hasBadge && (
            <button onClick={claimBadge}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
              style={{ background: color, color: '#fff' }}>
              Claim
            </button>
          )}
        </div>
      </div>

      {/* Upload actions */}
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800 space-y-2">
        <p className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium">Add your experience</p>
        <div className="flex gap-2">
          <Link href="/trips/new"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-300 hover:border-orange-500 hover:text-white transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New trip
          </Link>
          <Link href="/import"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-300 hover:border-orange-500 hover:text-white transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import album
          </Link>
        </div>
      </div>

      {/* Trip list */}
      <div className="flex-1 overflow-y-auto">
        {countryTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-zinc-600 text-sm">No trips yet in {countryName}</p>
            <p className="text-zinc-700 text-xs mt-1">Be the first to add one above</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {countryTrips.map(trip => {
              const sp = trip.trip_photos?.[0]?.storage_path
              const cover = sp
                ? sp.startsWith('https://') ? sp
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${sp}`
                : null
              return (
                <Link key={trip.id} href={`/trips/${trip.id}`}
                  className="flex gap-3 px-4 py-3 hover:bg-zinc-900/60 transition-colors">
                  <div className="h-14 w-16 shrink-0 rounded-lg bg-zinc-800 overflow-hidden">
                    {cover
                      ? <img src={cover} alt={trip.title} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-zinc-600 text-xl">
                          {info?.flag}
                        </div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{trip.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      @{trip.profiles?.username} · {trip.allPhotos.length} stops
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center text-xs text-zinc-600 px-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    <span>{trip.upvotes_count}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
