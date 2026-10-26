'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Compass } from 'lucide-react'
import { toSlug } from '@/lib/geo'

interface Props {
  size?: 'hero' | 'compact'
  initial?: string
  autoFocus?: boolean
}

export default function ScoutSearch({ size = 'compact', initial = '', autoFocus }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(initial)
  const [busy, setBusy] = useState(false)
  const hero = size === 'hero'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const slug = toSlug(q)
    if (!slug) return
    setBusy(true)
    router.push(`/scout/${slug}`)
  }

  return (
    <form onSubmit={submit} role="search"
      className={`flex items-center gap-2 ${hero ? 'mx-auto w-full max-w-xl' : 'w-full max-w-md'}`}>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        autoFocus={autoFocus}
        aria-label="Place to check — a town, a zip or a postal code"
        placeholder="A town, zip or postal code — Portland, 92109, H2X…"
        className={`min-w-0 flex-1 rounded-md border-2 border-zinc-800 bg-zinc-950 font-body text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-orange-500 ${
          hero ? 'px-5 py-3.5 text-base' : 'px-4 py-2.5 text-sm'
        }`}
      />
      <button type="submit" disabled={busy}
        className={`tx-stitch relative flex shrink-0 items-center gap-2 rounded-md bg-orange-500 font-display font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95 disabled:opacity-60 ${
          hero ? 'px-5 py-3.5 text-lg' : 'px-4 py-2.5 text-base'
        }`}>
        <Compass className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} strokeWidth={2.5} />
        {hero ? 'Is it dry?' : 'Check'}
      </button>
    </form>
  )
}
