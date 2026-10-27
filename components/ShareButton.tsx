'use client'

// Share a session or a spot: the phone's share sheet, or copy the link.

import { useState } from 'react'

export default function ShareButton({ url, title, label = 'Share' }: { url: string; title: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title, url }); return } catch { /* dismissed: fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <button type="button" onClick={share} className="btn btn-ghost w-full">
      {copied ? 'Link copied' : label}
    </button>
  )
}
