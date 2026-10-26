'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { Map, LogOut, User, Plus, BookOpen, Compass, Users, Menu, X, Droplets } from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<SupaUser | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const loadUser = async (u: SupaUser | null) => {
      // Treat anonymous sessions the same as logged-out for nav purposes
      const isAnon = !!(u as (SupaUser & { is_anonymous?: boolean }) | null)?.is_anonymous
      setUser(isAnon ? null : u)
      if (!u || isAnon) { setUsername(null); return }
      const { data } = await supabase.from('profiles').select('username').eq('id', u.id).single()
      setUsername(data?.username ?? null)
    }
    supabase.auth.getUser().then(({ data }) => loadUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      loadUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await createClient().auth.signOut()
    window.location.href = '/'
  }

  const isActive = (href: string) => pathname === href

  // Close the phone menu whenever the page changes
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) { setLastPath(pathname); setOpen(false) }

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-zinc-950/85 backdrop-blur-xl'
        : 'bg-zinc-950'
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo — always resets to home feed */}
        <Link href="/" onClick={e => { e.preventDefault(); router.push('/'); router.refresh() }}
          className="flex items-center gap-2.5 group">
          <Logo size={34} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-display text-[20px] font-bold uppercase tracking-[0.04em] text-white">Ritual Rollers</span>
            <span className="font-expedition text-[10px] uppercase tracking-[0.2em] text-teal-700 hidden sm:block">
              The Ritual of the Ride
            </span>
          </div>
        </Link>

        {/* Phone and tablet: the main action and a menu */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link href="/scout"
            className="tx-stitch flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-2 font-display text-[14px] font-bold uppercase tracking-wide text-white active:scale-95">
            <Droplets className="h-3.5 w-3.5" strokeWidth={2.5} /> Is it dry?
          </Link>
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="rr-menu" aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 text-zinc-300">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 lg:flex">
          <NavLink href="/spots" active={pathname.startsWith('/spots')} icon={<Map className="h-3.5 w-3.5" />}>
            Spots
          </NavLink>
          <NavLink href="/scout" active={pathname.startsWith('/scout')} icon={<Compass className="h-3.5 w-3.5" />}>
            Is it dry?
          </NavLink>
          <NavLink href="/explore" active={isActive('/explore') || isActive('/feed')} icon={<BookOpen className="h-3.5 w-3.5" />}>
            Sessions
          </NavLink>

          {/* The two primary actions: find a spot, find your crew */}
          <Link href="/finder"
            className="tx-stitch ml-2 flex items-center gap-1.5 rounded-md bg-orange-500 px-3.5 py-2 font-display text-[14px] font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
            <Compass className="h-3.5 w-3.5" strokeWidth={2.5} />
            Find a spot
          </Link>
          <Link href="/crew"
            className="tx-stitch ml-1.5 flex items-center gap-1.5 rounded-md bg-forest px-3.5 py-2 font-display text-[14px] font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 active:scale-95">
            <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
            Find your crew
          </Link>
          <Link href="/trips/new" title="Log a session"
            className="ml-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>

          {user ? (
            <>
              {username && (
                <Link href={`/profile/${username}`}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white">
                  <User className="h-3.5 w-3.5" />
                </Link>
              )}
              <button onClick={signOut}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-white">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <Link href="/auth/login"
              className="ml-1 rounded-md border border-zinc-700 px-3 py-1.5 font-expedition text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-300 transition-all hover:border-zinc-500 hover:text-white active:scale-95">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {open && (
        <div id="rr-menu" className="border-t border-zinc-800 bg-zinc-950 px-4 pb-4 pt-2 lg:hidden">
          <div className="mx-auto grid max-w-6xl gap-1">
            {[
              { href: '/finder', label: 'Find a spot', icon: <Compass className="h-4 w-4" /> },
              { href: '/spots', label: 'All spots', icon: <Map className="h-4 w-4" /> },
              { href: '/scout', label: 'Is it dry? Check a town', icon: <Droplets className="h-4 w-4" /> },
              { href: '/crew', label: 'Find your crew', icon: <Users className="h-4 w-4" /> },
              { href: '/explore', label: 'Sessions', icon: <BookOpen className="h-4 w-4" /> },
              { href: '/trips/new', label: 'Log a session', icon: <Plus className="h-4 w-4" /> },
              ...(user && username ? [{ href: `/profile/${username}`, label: 'Your profile', icon: <User className="h-4 w-4" /> }] : []),
            ].map(l => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 font-display text-lg font-bold uppercase tracking-wide ${pathname === l.href ? 'bg-zinc-900 text-white' : 'text-zinc-400'}`}>
                {l.icon} {l.label}
              </Link>
            ))}
            {user ? (
              <button onClick={signOut} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left font-display text-lg font-bold uppercase tracking-wide text-zinc-500">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            ) : (
              <Link href="/auth/login" className="mt-1 rounded-md border border-zinc-700 px-3 py-2.5 text-center font-display text-lg font-bold uppercase tracking-wide text-zinc-300">Sign in</Link>
            )}
          </div>
        </div>
      )}
      <div className="rule-plaid" aria-hidden />
    </nav>
  )
}

function NavLink({ href, active, icon, children }: {
  href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-expedition text-[13px] font-semibold uppercase tracking-[0.12em] transition-all ${
        active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
      }`}>
      <span className={active ? 'text-orange-400' : ''}>{icon}</span>
      {children}
    </Link>
  )
}
