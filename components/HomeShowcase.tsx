'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Compass, Share2, Check, ChevronUp } from 'lucide-react'
import Journey, { type JourneyPhoto } from '@/components/Journey'

export interface DemoTrip {
  id: string
  title: string
  username: string
  upvotes: number
  photos: JourneyPhoto[]
}

interface Teaser {
  id: string
  title: string
  username: string
  upvotes: number
  cover: string
}

interface Props {
  demoTrip: DemoTrip | null
  teasers: Teaser[]
}

type Stage = 0 | 1 | 2

const STAGES = [
  { label: 'DROP IN YOUR PHOTOS', duration: 4500 },
  { label: 'WE READ THE METADATA', duration: 5000 },
  { label: 'OUT COMES A SHAREABLE STORY', duration: 12000 },
] as const

const TILT = [-4, 3, -2, 5]

export default function HomeShowcase({ demoTrip, teasers }: Props) {
  const [stage, setStage] = useState<Stage>(0)
  const [copied, setCopied] = useState(false)
  const demoPhotos = demoTrip?.photos.slice(0, 4) ?? []
  const tripUrl = demoTrip ? `${typeof window !== 'undefined' ? window.location.origin : 'https://ritualrollers.com'}/trips/${demoTrip.id}` : ''

  // Auto-advance the demo, looping
  useEffect(() => {
    if (!demoTrip) return
    const timer = setTimeout(() => setStage(s => ((s + 1) % 3) as Stage), STAGES[stage].duration)
    return () => clearTimeout(timer)
  }, [stage, demoTrip])

  const copyDemoUrl = () => {
    navigator.clipboard.writeText(tripUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-8">

        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="font-expedition text-[10px] uppercase tracking-[0.35em] text-orange-400">
            Pin it. Roll on.
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-black leading-tight text-white sm:text-6xl">
            Your camera roll already tells the story.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-zinc-400 sm:text-lg">
            Drop in your trip photos. We read the GPS and timestamps hiding inside them
            and turn them into a mapped, step-by-step journey you can hand to anyone as a link.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/trips/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:brightness-110 active:scale-95">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Upload a trip
            </Link>
            <Link href="/explore"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white">
              <Compass className="h-4 w-4" /> Explore trips
            </Link>
          </div>
        </div>

        {/* Demo panel */}
        {demoTrip && (
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40">

            {/* Stage tabs */}
            <div className="flex border-b border-zinc-800">
              {STAGES.map((s, i) => (
                <button key={s.label} onClick={() => setStage(i as Stage)}
                  className={`relative flex-1 px-2 py-3.5 font-expedition text-[8px] uppercase tracking-[0.2em] transition-colors sm:text-[10px] ${
                    stage === i ? 'text-orange-400' : 'text-zinc-600 hover:text-zinc-400'
                  }`}>
                  <span className="mr-1.5 opacity-60">0{i + 1}</span>{s.label}
                  {stage === i && (
                    <motion.div
                      key={`bar-${i}-${stage}`}
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: STAGES[i].duration / 1000, ease: 'linear' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Stage content */}
            <div className="min-h-[440px] p-5 sm:p-8">
              <AnimatePresence mode="popLayout" initial={false}>

                {/* STAGE 1 — photos drop in */}
                {stage === 0 && (
                  <motion.div key="s0"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex min-h-[400px] flex-col items-center justify-center">
                    <div className="relative flex w-full max-w-lg flex-wrap items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-700 px-6 py-14">
                      <p className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-950 px-3 font-expedition text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                        Drop photos — straight off the phone
                      </p>
                      {demoPhotos.map((p, i) => (
                        <motion.div key={p.id}
                          initial={{ opacity: 0, y: -60, rotate: 0, scale: 0.7 }}
                          animate={{ opacity: 1, y: 0, rotate: TILT[i % TILT.length], scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.55, type: 'spring', bounce: 0.45 }}
                          className="h-28 w-28 overflow-hidden rounded-xl border-2 border-zinc-100/90 shadow-xl shadow-black/50 sm:h-32 sm:w-32">
                          <img src={p.url} alt="" className="h-full w-full object-cover" />
                        </motion.div>
                      ))}
                    </div>
                    <p className="mt-6 text-sm text-zinc-500">
                      No forms. No pins to place. Just the photos you already took.
                    </p>
                  </motion.div>
                )}

                {/* STAGE 2 — metadata scan */}
                {stage === 1 && (
                  <motion.div key="s1"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex min-h-[400px] flex-col items-center justify-center">
                    <div className="flex w-full max-w-2xl flex-wrap items-start justify-center gap-4">
                      {demoPhotos.map((p, i) => (
                        <div key={p.id} className="w-28 sm:w-36">
                          <div className="relative h-28 w-full overflow-hidden rounded-xl border border-zinc-700 sm:h-36">
                            <img src={p.url} alt="" className="h-full w-full object-cover" />
                            <motion.div
                              className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-orange-400/40 to-transparent"
                              initial={{ top: '-25%' }}
                              animate={{ top: '110%' }}
                              transition={{ delay: 0.3 + i * 0.45, duration: 0.9, ease: 'easeInOut' }}
                            />
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1 + i * 0.45 }}
                            className="mt-2 space-y-1">
                            {p.lat != null && p.lng != null ? (
                              <>
                                <p className="flex items-center gap-1 font-expedition text-[8px] tracking-[0.12em] text-green-400 sm:text-[9px]">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                                </p>
                                <p className="font-expedition text-[8px] uppercase tracking-[0.15em] text-zinc-500 sm:text-[9px]">
                                  ✓ GPS · Step {i + 1}
                                </p>
                              </>
                            ) : (
                              <p className="font-expedition text-[8px] uppercase tracking-[0.15em] text-zinc-600 sm:text-[9px]">
                                No GPS — stays in the strip
                              </p>
                            )}
                          </motion.div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-8 text-sm text-zinc-500">
                      The EXIF does the work — coordinates, timestamps, order.
                    </p>
                  </motion.div>
                )}

                {/* STAGE 3 — the story */}
                {stage === 2 && (
                  <motion.div key="s2"
                    initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-bold text-white">{demoTrip.title}</h3>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                          @{demoTrip.username}
                          <span className="flex items-center gap-0.5 text-zinc-600">
                            <ChevronUp className="h-3 w-3" />{demoTrip.upvotes}
                          </span>
                          <span className="font-expedition text-[8px] uppercase tracking-[0.2em] text-orange-400/80">
                            Real trip · built from photos alone
                          </span>
                        </p>
                      </div>
                      {/* Share pill */}
                      <div className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-950/80 py-1 pl-3 pr-1">
                        <span className="max-w-40 truncate text-[11px] text-zinc-500 sm:max-w-56">{tripUrl.replace(/^https?:\/\//, '')}</span>
                        <button onClick={copyDemoUrl}
                          className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-all active:scale-95">
                          {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                          {copied ? 'Copied' : 'Copy link'}
                        </button>
                      </div>
                    </div>
                    <Journey photos={demoTrip.photos} />
                    <p className="mt-4 text-center text-xs text-zinc-600">
                      Every pin, step and distance came from the photos' own metadata.{' '}
                      <Link href={`/trips/${demoTrip.id}`} className="text-orange-400 hover:underline">
                        Open the full story →
                      </Link>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Teasers */}
        {teasers.length > 0 && (
          <div className="mt-14">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-expedition text-[9px] uppercase tracking-[0.3em] text-zinc-600">
                Fresh from the crews
              </p>
              <Link href="/explore" className="text-xs text-orange-400 hover:underline">
                See the feed →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {teasers.map(t => (
                <Link key={t.id} href={`/trips/${t.id}`}
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-600">
                  <div className="aspect-video overflow-hidden">
                    <img src={t.cover} alt={t.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{t.title}</p>
                      <p className="text-[11px] text-zinc-500">@{t.username}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-zinc-500">
                      <ChevronUp className="h-3 w-3" />{t.upvotes}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
