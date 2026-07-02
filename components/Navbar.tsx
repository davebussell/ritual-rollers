'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Map, Upload, LogOut, User, Plus, BookOpen, Users } from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<SupaUser | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
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

  return (
    <nav className={`sticky top-0 z-50 border-b transition-all duration-300 ${
      scrolled
        ? 'border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl'
        : 'border-zinc-800 bg-zinc-950'
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo — always resets to home feed */}
        <Link href="/" onClick={e => { e.preventDefault(); router.push('/'); router.refresh() }}
          className="flex items-center gap-2.5 group">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" aria-hidden="true">
            <defs>
              <linearGradient id="rr-logo-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f97316" />
                <stop offset="1" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <circle cx="14" cy="14" r="12" stroke="url(#rr-logo-grad)" strokeWidth="2" />
            <g stroke="url(#rr-logo-grad)" strokeWidth="1.5" strokeLinecap="round">
              <line x1="14" y1="4.5" x2="14" y2="10" />
              <line x1="14" y1="18" x2="14" y2="23.5" />
              <line x1="4.5" y1="14" x2="10" y2="14" />
              <line x1="18" y1="14" x2="23.5" y2="14" />
              <line x1="7.3" y1="7.3" x2="11.2" y2="11.2" />
              <line x1="16.8" y1="16.8" x2="20.7" y2="20.7" />
              <line x1="20.7" y1="7.3" x2="16.8" y2="11.2" />
              <line x1="11.2" y1="16.8" x2="7.3" y2="20.7" />
            </g>
            <circle cx="14" cy="14" r="2.5" fill="url(#rr-logo-grad)" />
          </svg>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-display text-[15px] font-extrabold tracking-wide text-white">RITUAL ROLLERS</span>
            <span className="font-expedition text-[9px] uppercase tracking-[0.25em] text-zinc-500 hidden sm:block">
              PIN IT. ROLL ON.
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink href="/" active={isActive('/')} icon={<Map className="h-3.5 w-3.5" />}>
            Explore
          </NavLink>
          <NavLink href="/feed" active={isActive('/feed')} icon={<Users className="h-3.5 w-3.5" />}>
            Feed
          </NavLink>
          <NavLink href="/import" active={isActive('/import')} icon={<Upload className="h-3.5 w-3.5" />}>
            Import
          </NavLink>
          <NavLink href="/guide" active={isActive('/guide')} icon={<BookOpen className="h-3.5 w-3.5" />}>
            Guide
          </NavLink>

          {user ? (
            <>
              <Link href="/trips/new"
                className="ml-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-400 hover:to-amber-400 active:scale-95">
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                New trip
              </Link>
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
              className="ml-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-400 hover:to-amber-400 active:scale-95">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, active, icon, children }: {
  href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
      }`}>
      <span className={active ? 'text-orange-400' : ''}>{icon}</span>
      {children}
    </Link>
  )
}
