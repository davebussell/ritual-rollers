import { Info } from 'lucide-react'
import { SAMPLE_NOTICE } from '@/lib/sample'

// Honest labelling for seeded demo content (see lib/sample.ts).

export function SampleNotice({ children, className = '', compact = false }: {
  children?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  if (compact) {
    return (
      <p role="note" className={`text-[11px] leading-relaxed text-zinc-500 ${className}`}>
        <span className="font-expedition text-[9px] uppercase tracking-[0.25em] text-orange-400">Sample listings · </span>
        {children ?? SAMPLE_NOTICE}
      </p>
    )
  }
  return (
    <div role="note" className={`flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 ${className}`}>
      <Info className="h-4 w-4 shrink-0 text-orange-400" />
      <p className="flex-1 text-sm text-zinc-400">
        <span className="font-expedition text-[10px] uppercase tracking-[0.25em] text-orange-400">Sample listings · </span>
        {children ?? SAMPLE_NOTICE}
      </p>
    </div>
  )
}

export function SampleBadge({ label = 'Sample', className = '' }: { label?: string; className?: string }) {
  return (
    <span className={`rounded-full bg-zinc-950/80 px-2 py-0.5 font-expedition text-[9px] uppercase tracking-widest text-amber-400 backdrop-blur ${className}`}>
      {label}
    </span>
  )
}
