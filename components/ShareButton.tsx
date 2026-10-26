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

  const quick = 'grid h-9 w-9 place-items-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 transition-colors hover:border-zinc-700 hover:text-white'

  return (
    <div className="flex items-center gap-2">
      <button onClick={share}
        className={`tx-stitch relative flex items-center gap-2 rounded-md bg-orange-500 font-display font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95 ${
          compact ? 'px-3 py-1.5 text-base' : 'px-4 py-2 text-lg'
        }`}>
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Link copied!' : 'Share'}
      </button>
      {!compact && (
        <>
          <a href={`https://wa.me/?text=${encoded}`} target="_blank" rel="noopener noreferrer"
            title="Share on WhatsApp" className={quick}>
            <MessageCircle className="h-4 w-4" />
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`} target="_blank" rel="noopener noreferrer"
            title="Share on X" className={quick}>
            <span className="text-sm font-bold leading-none">𝕏</span>
          </a>
          <a href={`mailto:?subject=${encodedTitle}&body=${encoded}`}
            title="Share by email" className={quick}>
            <Mail className="h-4 w-4" />
          </a>
        </>
      )}
    </div>
  )
}
