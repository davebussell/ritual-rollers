'use client'

import { useEffect, useState } from 'react'
import { fetchWikiSummary, locationLabel, type WikiSummary } from '@/lib/wikipedia'
import { BookOpen } from 'lucide-react'

interface Props {
  countryCode: string | null | undefined
  tripTitle?: string
  compact?: boolean
}

export default function WikiDestinationCard({ countryCode, tripTitle, compact = false }: Props) {
  const [wiki, setWiki] = useState<WikiSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const label = locationLabel(countryCode, tripTitle)
    if (!label) { setLoading(false); return }
    fetchWikiSummary(label).then(result => {
      setWiki(result)
      setLoading(false)
    })
  }, [countryCode, tripTitle])

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl bg-zinc-800/60 h-16" />
    )
  }

  if (!wiki) return null

  const sentences = wiki.extract.split('. ').slice(0, compact ? 2 : 3).join('. ')
  const extract = sentences.endsWith('.') ? sentences : sentences + '.'

  if (compact) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        {wiki.thumbnail && (
          <img
            src={wiki.thumbnail}
            alt={wiki.title}
            className="h-12 w-12 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">{wiki.title}</p>
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{extract}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      {wiki.thumbnail && (
        <div className="relative h-32 w-full overflow-hidden">
          <img
            src={wiki.thumbnail}
            alt={wiki.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
          <div className="absolute bottom-2 left-3">
            <p className="text-sm font-bold text-white">{wiki.title}</p>
            <p className="text-[10px] text-zinc-400">via Wikipedia</p>
          </div>
        </div>
      )}
      <div className="p-3">
        {!wiki.thumbnail && (
          <p className="text-xs font-semibold text-zinc-400 mb-1">{wiki.title}</p>
        )}
        <p className="text-xs text-zinc-400 leading-relaxed">{extract}</p>
        <a
          href={wiki.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
        >
          <BookOpen className="h-3 w-3" />
          Read more on Wikipedia
        </a>
      </div>
    </div>
  )
}
