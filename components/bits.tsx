// Small shared pieces: avatars, tags, section heads.

import Link from 'next/link'
import { initials } from '@/lib/format'
import { disciplineList } from '@/lib/sports'

const AVATAR_COLORS = ['#2D68B0', '#D4402A', '#3E7D3A', '#6A4C93', '#1F7A8C', '#8A5A2B', '#C2571A']

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-flyer"
      style={{ width: size, height: size, background: AVATAR_COLORS[h % AVATAR_COLORS.length], fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}

export function SampleTag({ className = '' }: { className?: string }) {
  return <span className={`tag tag-sample ${className}`} title="An example, to show how it works">Sample</span>
}

export function Disciplines({ ids, className = '' }: { ids: string[]; className?: string }) {
  if (!ids.length) return null
  return <span className={className}>{disciplineList(ids)}</span>
}

export function SectionHead({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 className="h-section text-[22px] sm:text-[26px]">{title}</h2>
        {children && <div className="mt-1 max-w-2xl text-[15px] text-muted">{children}</div>}
      </div>
      {href && <Link href={href} className="prose-link text-[15px] font-semibold">{linkLabel ?? 'See all'}</Link>}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border-2 border-dashed border-concrete-3 px-5 py-6 text-[15px] text-asphalt-2">{children}</div>
}

export function riderName(r: { display_name: string | null; username: string }): string {
  return r.display_name?.trim() || r.username
}
