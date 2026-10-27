'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import Wheel from '@/components/Wheel'
import { WheelPicker, type WheelValue } from '@/components/WheelPicker'

const LINKS = [
  { href: '/spots', label: 'Spots' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/crews', label: 'Crews' },
  { href: '/riders', label: 'Riders' },
]

export default function Navbar({ wheel }: { wheel: WheelValue | null }) {
  const [user, setUser] = useState<SupaUser | null>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    const load = (u: SupaUser | null) => {
      const anon = !!(u as (SupaUser & { is_anonymous?: boolean }) | null)?.is_anonymous
      setUser(anon ? null : u)
    }
    supabase.auth.getUser().then(({ data }) => load(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => load(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // Close the phone menu whenever the page changes
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) { setLastPath(pathname); setOpen(false) }

  const current = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 bg-asphalt text-flyer">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Ritual Rollers home">
            <Wheel size={30} />
            <span className={`font-display text-[17px] font-semibold tracking-tight sm:text-lg ${wheel ? 'hidden min-[420px]:inline' : ''}`}>Ritual Rollers</span>
          </Link>
          {/* What you ride: on phones only once picked (the bar under the header asks first) */}
          <div className={wheel ? '' : 'hidden sm:block'}><WheelPicker current={wheel} /></div>
        </div>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} aria-current={current(l.href) ? 'page' : undefined}
              className={`rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors ${current(l.href) ? 'bg-flyer/15 text-flyer' : 'text-flyer/75 hover:text-flyer'}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex"><Link href="/sessions/new" className="btn btn-curb !py-2.5">Post a session</Link></span>
          <Link href={user ? '/me' : '/auth/login'}
            className="hidden rounded-full px-3 py-2 text-[15px] font-semibold text-flyer/75 transition-colors hover:text-flyer md:inline-flex">
            {user ? 'Your profile' : 'Sign in'}
          </Link>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="phone-menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-flyer hover:bg-flyer/10 md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {open && (
        <nav id="phone-menu" aria-label="Main" className="border-t border-flyer/10 px-4 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} aria-current={current(l.href) ? 'page' : undefined}
                  className={`block py-3 font-display text-xl font-semibold ${current(l.href) ? 'text-curb' : 'text-flyer'}`}>{l.label}</Link>
              </li>
            ))}
            <li><Link href={user ? '/me' : '/auth/login'} className="block py-3 text-lg font-semibold text-flyer/80">{user ? 'Your profile' : 'Sign in'}</Link></li>
          </ul>
          <div className="mt-3"><WheelPicker current={wheel} onDark={false} wide /></div>
          <Link href="/sessions/new" className="btn btn-curb mt-3 w-full">Post a session</Link>
        </nav>
      )}
    </header>
  )
}
