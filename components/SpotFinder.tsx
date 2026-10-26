'use client'

// Four questions in, a ranked shortlist out. Answers live in the URL so a shortlist is shareable.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, MapPin, RotateCcw } from 'lucide-react'
import { countryFlag } from '@/lib/format'
import { geocodePlace, toSlug } from '@/lib/geo'
import { DISCIPLINES, DISCIPLINE_BY_ID, KIND_META, STYLE_LABEL, type Style } from '@/lib/sports'
import { TRAVEL_REGIONS, findSpots, type FinderAnswers, type FinderMatch, type Skill } from '@/lib/spots-index'

type Step = 0 | 1 | 2 | 3 | 4
const QUESTIONS = ['What are you rolling on?', 'What do you like to ride?', 'Where are you starting from?', 'Your level?']

const SKILLS: { id: Exclude<Skill, 'all'> | 'mixed'; label: string; blurb: string }[] = [
  { id: 'beginner', label: 'Learning', blurb: 'mellow, room to fall' },
  { id: 'intermediate', label: 'Solid', blurb: 'linking lines, pushing it' },
  { id: 'advanced', label: 'Sending', blurb: 'the big stuff' },
  { id: 'mixed', label: 'Mixed crew', blurb: 'something for everyone' },
]
const STYLES: Style[] = ['street', 'tranny', 'dirt', 'any']

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-md border px-3 py-2 font-body text-sm transition-all active:scale-95 ${
        active ? 'border-orange-500 bg-orange-500/15 text-white' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white'
      }`}>
      {children}
    </button>
  )
}

export default function SpotFinder() {
  const router = useRouter()
  const params = useSearchParams()

  const [ride, setRide] = useState<string | null>(() => (DISCIPLINE_BY_ID[params.get('ride') ?? ''] ? params.get('ride') : null))
  const [style, setStyle] = useState<Style | null>(() => (STYLES.includes(params.get('style') as Style) ? (params.get('style') as Style) : null))
  const [region, setRegion] = useState<string | null>(() => params.get('region'))
  const [nearQuery, setNearQuery] = useState(params.get('near') ?? '')
  const [near, setNear] = useState<FinderAnswers['near']>(null)
  const [locating, setLocating] = useState(false)
  const [indoor, setIndoor] = useState(params.get('indoor') === '1')
  const [skill, setSkill] = useState<Exclude<Skill, 'all'> | 'mixed' | null>(() => {
    const s = params.get('skill'); return s === 'beginner' || s === 'intermediate' || s === 'advanced' || s === 'mixed' ? s : null
  })
  const [step, setStep] = useState<Step>(() => (params.get('go') === '1' ? 4 : 0))

  useEffect(() => {
    if (step !== 4 || !nearQuery.trim() || near) return
    let alive = true
    setLocating(true)
    geocodePlace(nearQuery).then(p => {
      if (!alive) return
      if (p) setNear({ lat: p.lat, lng: p.lng, label: p.label, radiusKm: 150 })
      setLocating(false)
    })
    return () => { alive = false }
  }, [step, nearQuery, near])

  const answers: FinderAnswers = useMemo(() => ({
    ride,
    style,
    skill: skill && skill !== 'mixed' ? skill : null,
    travelRegion: near ? null : region,
    near,
    indoor,
  }), [ride, style, skill, region, near, indoor])

  const results: FinderMatch[] = useMemo(() => (step === 4 ? findSpots(answers, 12) : []), [answers, step])

  const go = (next: Step) => {
    setStep(next)
    if (next === 4) {
      const q = new URLSearchParams()
      if (ride) q.set('ride', ride)
      if (style) q.set('style', style)
      if (region) q.set('region', region)
      if (nearQuery.trim()) q.set('near', nearQuery.trim())
      if (skill) q.set('skill', skill)
      if (indoor) q.set('indoor', '1')
      q.set('go', '1')
      router.replace(`/finder?${q.toString()}`, { scroll: false })
    }
  }

  const reset = () => {
    setRide(null); setStyle(null); setRegion(null); setNearQuery(''); setNear(null); setSkill(null); setIndoor(false); setStep(0)
    router.replace('/finder')
  }

  return (
    <div className="tx-stitch relative rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <p className="tag inline-block px-2.5 py-0.5 text-[11px] tracking-[0.18em]">Find your spot</p>
        <p className="font-expedition text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          {step < 4 ? `Question ${step + 1} of 4` : `${results.length} match${results.length === 1 ? '' : 'es'}`}
        </p>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= Math.min(step, 3) ? 'bg-orange-500' : 'bg-zinc-800'}`} />)}
      </div>

      {step < 4 ? (
        <>
          <h2 className="mt-6 font-display text-3xl font-bold uppercase tracking-[0.02em] text-white sm:text-4xl">{QUESTIONS[step]}</h2>

          {step === 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {DISCIPLINES.map(d => (
                <Chip key={d.id} active={ride === d.id} onClick={() => setRide(ride === d.id ? null : d.id)}>
                  <span className="mr-1.5">{d.emoji}</span>{d.label}
                </Chip>
              ))}
              <Chip active={ride === null} onClick={() => setRide(null)}>A bit of everything</Chip>
            </div>
          )}

          {step === 1 && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {STYLES.map(s => (
                <button key={s} type="button" onClick={() => setStyle(style === s ? null : s)} aria-pressed={style === s}
                  className={`rounded-md border px-4 py-3 text-left transition-all active:scale-[0.98] ${style === s ? 'border-orange-500 bg-orange-500/15' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
                  <p className="font-display text-lg font-bold uppercase tracking-[0.02em] text-white">{STYLE_LABEL[s]}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="mt-5 space-y-5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-zinc-500" />
                <input value={nearQuery} onChange={e => { setNearQuery(e.target.value); setNear(null); setRegion(null) }}
                  aria-label="Town you're starting from" placeholder="A town: Portland, Toronto, 92109…"
                  className="w-full max-w-sm rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-2 font-body text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500" />
              </div>
              <div>
                <p className="font-body text-sm text-zinc-500">…or pick a region for a trip.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip active={!region && !nearQuery} onClick={() => { setRegion(null); setNearQuery(''); setNear(null) }}>Anywhere</Chip>
                  {TRAVEL_REGIONS.map(r => <Chip key={r.id} active={region === r.id} onClick={() => { setRegion(region === r.id ? null : r.id); setNearQuery(''); setNear(null) }}>{r.label}</Chip>)}
                </div>
              </div>
              <label className="flex items-center gap-2 font-body text-sm text-zinc-400">
                <input type="checkbox" checked={indoor} onChange={e => setIndoor(e.target.checked)} className="h-4 w-4 accent-[#D9A21B]" />
                Indoor only — it&apos;s raining, or it&apos;s winter
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {SKILLS.map(s => (
                <button key={s.id} type="button" onClick={() => setSkill(skill === s.id ? null : s.id)} aria-pressed={skill === s.id}
                  className={`rounded-md border px-4 py-3 text-left transition-all active:scale-[0.98] ${skill === s.id ? 'border-orange-500 bg-orange-500/15' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
                  <p className="font-display text-xl font-bold uppercase tracking-[0.02em] text-white">{s.label}</p>
                  <p className="font-body text-xs text-zinc-500">{s.blurb}</p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <button type="button" onClick={() => go(Math.max(0, step - 1) as Step)} disabled={step === 0}
              className="flex items-center gap-1.5 font-expedition text-[12px] uppercase tracking-[0.14em] text-zinc-500 hover:text-white disabled:opacity-30">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button type="button" onClick={() => go((step + 1) as Step)}
              className="tx-stitch relative flex items-center gap-2 rounded-md bg-orange-500 px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
              {step === 3 ? 'See my spots' : 'Next'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {ride && <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">{DISCIPLINE_BY_ID[ride].emoji} {DISCIPLINE_BY_ID[ride].label}</span>}
            {style && style !== 'any' && <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">{STYLE_LABEL[style].split(' — ')[0]}</span>}
            {near ? <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">near {near.label}</span>
              : region ? <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">{TRAVEL_REGIONS.find(r => r.id === region)?.label}</span> : null}
            {indoor && <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">indoor</span>}
            {skill && <span className="tag px-2 py-0.5 text-[10px] tracking-[0.14em]">{SKILLS.find(s => s.id === skill)?.label}</span>}
            <button type="button" onClick={reset} className="ml-auto flex items-center gap-1.5 font-expedition text-[11px] uppercase tracking-[0.14em] text-zinc-500 hover:text-white">
              <RotateCcw className="h-3 w-3" /> Start over
            </button>
          </div>

          {locating ? (
            <p className="mt-6 font-body text-sm text-zinc-500">Placing {nearQuery}…</p>
          ) : results.length === 0 ? (
            <div className="mt-6 rounded-md border border-dashed border-zinc-700 p-6">
              <p className="font-display text-2xl font-bold uppercase text-white">Nothing featured for that mix yet</p>
              <p className="mt-1 font-body text-sm text-zinc-500">
                Widen the region or drop a filter — or <Link href={nearQuery.trim() ? `/scout/${toSlug(nearQuery)}` : '/scout'} className="text-teal-700 hover:underline">check the town</Link> to see every mapped park around it.
              </p>
            </div>
          ) : (
            <ol className="mt-6 grid gap-3 sm:grid-cols-2">
              {results.map((m, i) => (
                <li key={m.spot.slug}>
                  <Link href={`/spots/${m.spot.slug}`}
                    className="group block h-full rounded-md border border-zinc-800 bg-zinc-950 p-4 transition-all hover:border-orange-500">
                    <p className="font-expedition text-[10px] uppercase tracking-[0.18em]" style={{ color: KIND_META[m.spot.kind].color }}>{i + 1} · {KIND_META[m.spot.kind].label} · {countryFlag(m.spot.country)} {m.spot.region}</p>
                    <p className="mt-0.5 font-display text-2xl font-bold uppercase tracking-[0.02em] text-white group-hover:text-orange-500">{m.spot.name}</p>
                    <p className="font-body text-xs text-zinc-500">{m.spot.city}</p>
                    <p className="mt-3 line-clamp-3 font-body text-sm text-zinc-400">{m.spot.why}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {m.reasons.slice(1).map(r => <li key={r} className="rounded-sm border border-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 font-expedition text-[10px] uppercase tracking-wider text-[#2E4631]">{r}</li>)}
                    </ul>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-5 font-body text-xs text-zinc-600">
            Every spot links to a live read — is the ground dry right now, and when are the dry windows this week.{' '}
            <Link href="/spots" className="text-orange-500 hover:underline">Browse every spot →</Link>
          </p>
        </>
      )}
    </div>
  )
}
