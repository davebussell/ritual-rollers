'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { DISCIPLINES } from '@/lib/sports'

interface Props {
  initialQuery?: string
  initialSport?: string | null
}

export default function CrewSearch({ initialQuery = '', initialSport = null }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(initialQuery)
  const [sport, setSport] = useState<string>(initialSport ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (sport) p.set('sport', sport)
    router.push(`/crew${p.toString() ? `?${p.toString()}` : ''}`)
  }

  return (
    <form onSubmit={submit} role="search" className="flex w-full max-w-2xl flex-col gap-2 sm:flex-row">
      <input value={q} onChange={e => setQ(e.target.value)}
        aria-label="Where are you headed?" placeholder="Where are you headed? Portland, Montreal, 92109…"
        className="min-w-0 flex-1 rounded-md border-2 border-zinc-800 bg-zinc-950 px-4 py-3 font-body text-base text-white placeholder:text-zinc-600 outline-none focus:border-orange-500" />
      <select aria-label="What you ride" value={sport} onChange={e => setSport(e.target.value)}
        className="rounded-md border-2 border-zinc-800 bg-zinc-950 px-3 py-3 font-body text-sm text-white outline-none focus:border-orange-500">
        <option value="">Anything on wheels</option>
        {DISCIPLINES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
      </select>
      <button type="submit"
        className="tx-stitch relative flex items-center justify-center gap-2 rounded-md bg-forest px-5 py-3 font-display text-lg font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95">
        <Users className="h-4 w-4" strokeWidth={2.5} /> Find my crew
      </button>
    </form>
  )
}
