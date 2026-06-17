'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Upload, ChevronUp, Camera, Award } from 'lucide-react'
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
  const [justClaimed, setJustClaimed] = useState(false)

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
    setJustClaimed(true)
    setTimeout(() => setJustClaimed(false), 1200)
  }

  const countryTrips = trips
    .filter(t => t.countryCode === alpha2)
    .sort((a, b) => b.upvotes_count - a.upvotes_count)

  return (
    <motion.div
      key={countryId}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Hero header */}
      <div className="relative shrink-0 overflow-hidden px-4 pt-5 pb-4 border-b border-zinc-800">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ background: `radial-gradient(ellipse at top left, ${color}, transparent 70%)` }} />

        <div className="relative flex items-start gap-3">
          <span className="text-5xl leading-none">{info?.flag ?? '🌍'}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white leading-tight">{countryName}</h2>
            <p className="text-xs text-zinc-500 mt-1">
              {countryTrips.length > 0
                ? `${countryTrips.length} trip${countryTrips.length !== 1 ? 's' : ''} — sorted by popularity`
                : 'No trips yet — be the first'}
            </p>
          </div>
        </div>

        {/* Badge */}
        <div className="relative mt-4 flex items-center gap-3 rounded-xl border p-3 transition-colors"
          style={{
            borderColor: hasBadge ? `${color}40` : '#27272a',
            background: hasBadge ? `${color}08` : 'transparent',
          }}>
          <motion.div
            animate={justClaimed ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.6 }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{
              background: hasBadge ? `${color}20` : '#18181b',
              border: `2px solid ${hasBadge ? color : '#27272a'}`,
              boxShadow: hasBadge ? `0 0 20px ${color}30` : 'none',
            }}>
            {hasBadge ? info?.flag ?? '🏅' : <Award className="h-5 w-5 text-zinc-700" />}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              {hasBadge ? `${countryName} Explorer` : 'Claim your badge'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {hasBadge ? 'You\'ve explored this country ✓' : 'Upload a photo to unlock'}
            </p>
          </div>
          <AnimatePresence>
            {!hasBadge && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={claimBadge}
                whileTap={{ scale: 0.92 }}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: color }}>
                Claim
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Upload CTAs */}
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800/60">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Add your experience
        </p>
        <div className="flex gap-2">
          <Link href="/trips/new"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 py-2.5 text-xs font-medium text-zinc-300 transition-all hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-white active:scale-95">
            <Plus className="h-3.5 w-3.5" />
            New trip
          </Link>
          <Link href="/import"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 py-2.5 text-xs font-medium text-zinc-300 transition-all hover:border-orange-500/50 hover:bg-orange-500/5 hover:text-white active:scale-95">
            <Upload className="h-3.5 w-3.5" />
            Import album
          </Link>
        </div>
      </div>

      {/* Trip list */}
      <div className="flex-1 overflow-y-auto">
        {countryTrips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-40 gap-2 text-center px-6">
            <div className="text-3xl opacity-30">{info?.flag ?? '🌍'}</div>
            <p className="text-zinc-600 text-sm">No trips yet in {countryName}</p>
            <p className="text-zinc-700 text-xs">Add your first adventure above</p>
          </motion.div>
        ) : (
          <div className="divide-y divide-zinc-800/40">
            {countryTrips.map((trip, i) => {
              const sp = trip.trip_photos?.[0]?.storage_path
              const cover = sp
                ? sp.startsWith('https://') ? sp
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/trip-photos/${sp}`
                : null
              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}>
                  <Link href={`/trips/${trip.id}`}
                    className="group flex gap-3 px-4 py-3 transition-colors hover:bg-zinc-900/60">
                    {/* Rank */}
                    <div className="flex w-5 shrink-0 items-center justify-center text-xs font-bold"
                      style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#3f3f46' }}>
                      {i + 1}
                    </div>
                    {/* Cover */}
                    <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                      {cover
                        ? <img src={cover} alt={trip.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        : <div className="flex h-full w-full items-center justify-center text-zinc-700">
                            <Camera className="h-4 w-4" />
                          </div>}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-orange-100 transition-colors">
                        {trip.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">@{trip.profiles?.username}</p>
                    </div>
                    {/* Upvotes */}
                    <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 text-xs text-zinc-600">
                      <ChevronUp className="h-3 w-3" />
                      <span>{trip.upvotes_count}</span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
