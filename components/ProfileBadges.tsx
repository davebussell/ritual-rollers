'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Globe, MapPin, Stamp } from 'lucide-react'
import { REGIONS, REGION_COLORS, REGION_EMOJI, type Region } from '@/lib/regions'
import { NA_COUNTRIES } from '@/lib/country-names'

const BADGE_KEY    = 'rr_country_badges'
const PASSPORT_KEY = 'rr_passport'

interface Props {
  explorerRegions: Region[]   // server-computed from trips
  isOwnProfile: boolean
}

export default function ProfileBadges({ explorerRegions, isOwnProfile }: Props) {
  const [countryBadges, setCountryBadges] = useState<string[]>([])   // alpha2 codes
  const [passportStamps, setPassportStamps] = useState<Region[]>([]) // explored regions
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const cb = JSON.parse(localStorage.getItem(BADGE_KEY) ?? '[]') as string[]
      setCountryBadges(cb)
    } catch { /* ignore */ }
    try {
      const ps = JSON.parse(localStorage.getItem(PASSPORT_KEY) ?? '[]') as Region[]
      setPassportStamps(ps)
    } catch { /* ignore */ }
  }, [])

  const totalBadges = explorerRegions.length + countryBadges.length

  if (!mounted) return null

  return (
    <div className="space-y-5">

      {/* Explorer Badges — earned for creating trips in a region */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Explorer Badges
          </h3>
          {explorerRegions.length > 0 && (
            <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">
              {explorerRegions.length}
            </span>
          )}
        </div>

        {explorerRegions.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-800 px-4 py-3">
            <Award className="h-4 w-4 text-zinc-700" />
            <p className="text-xs text-zinc-600">
              {isOwnProfile ? 'Create your first trip to earn an Explorer Badge' : 'No explorer badges yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {explorerRegions.map((region, i) => {
                const color = REGION_COLORS[region]
                return (
                  <motion.div key={region}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2"
                    style={{ borderColor: `${color}40`, background: `${color}10` }}>
                    <span className="text-lg leading-none">{REGION_EMOJI[region]}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color }}>{region}</p>
                      <p className="text-[10px] text-zinc-600">Explorer</p>
                    </div>
                    <div className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                      style={{ background: `${color}25`, color }}>
                      ✦
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Country Badges — claimed from the map */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Country Claims
          </h3>
          {countryBadges.length > 0 && (
            <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
              {countryBadges.length}
            </span>
          )}
          {!isOwnProfile && (
            <span className="text-[10px] text-zinc-700 ml-1">(owner's view only)</span>
          )}
        </div>

        {countryBadges.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-800 px-4 py-3">
            <p className="text-xs text-zinc-600">
              {isOwnProfile ? 'Claim countries by exploring the map' : 'No country badges yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {countryBadges.map((alpha2, i) => {
              const entry = Object.values(NA_COUNTRIES).find(c => c.alpha2 === alpha2)
              return (
                <motion.div key={alpha2}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  title={entry?.name ?? alpha2}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5">
                  <span className="text-base leading-none">{entry?.flag ?? '🏳️'}</span>
                  <span className="text-[10px] font-medium text-zinc-400">{entry?.name ?? alpha2}</span>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Passport Stamps — regions explored on the map */}
      {isOwnProfile && (
        <section>
          <div className="mb-2.5 flex items-center gap-2">
            <Stamp className="h-3.5 w-3.5 text-zinc-500" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Passport Stamps
            </h3>
            {passportStamps.length > 0 && (
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                {passportStamps.length}/{REGIONS.length}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map(region => {
              const earned = passportStamps.includes(region)
              const color = REGION_COLORS[region]
              return (
                <div key={region}
                  className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-all"
                  style={{
                    borderColor: earned ? `${color}50` : '#27272a',
                    background: earned ? `${color}12` : 'transparent',
                    opacity: earned ? 1 : 0.4,
                  }}>
                  <span className="text-sm">{REGION_EMOJI[region]}</span>
                  <span className="text-[10px] font-medium" style={{ color: earned ? color : '#52525b' }}>
                    {region}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Total count */}
      {totalBadges > 0 && (
        <p className="text-[11px] text-zinc-600">
          {totalBadges} badge{totalBadges !== 1 ? 's' : ''} earned total
        </p>
      )}
    </div>
  )
}
