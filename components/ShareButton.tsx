'use client'

import { useState } from 'react'
import { Share2, Check, MessageCircle, Mail } from 'lucide-react'

interface Props {
  url: string
  title: string
  compact?: boolean
}

export default function ShareButton({ url, title, compact }: Props) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user dismissed the share sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const encoded = encodeURIComponent(`${title} — ${url}`)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  return (
    <div className="flex items-center gap-2">
      <button onClick={share}
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:brightness-110 active:scale-95 ${
          compact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'
        }`}>
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Link copied!' : 'Share this trip'}
      </button>
      {!compact && (
        <>
          <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer"
            title="Share on WhatsApp"
            className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white">
            <MessageCircle className="h-4 w-4" />
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer"
            title="Share on X"
            className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white">
            <span className="text-sm font-bold leading-none">𝕏</span>
          </a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encoded}`}
            title="Share by email"
            className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white">
            <Mail className="h-4 w-4" />
          </a>
        </>
      )}
    </div>
  )
}
