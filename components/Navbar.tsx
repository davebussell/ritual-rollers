'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { Map, Upload, LogOut, User, Plus, BookOpen, Compass } from 'lucide-react'
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

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink href="/scout" active={pathname.startsWith('/scout')} icon={<Compass className="h-3.5 w-3.5" />}>
            Scout
          </NavLink>
          <NavLink href="/explore" active={isActive('/explore') || isActive('/feed')} icon={<BookOpen className="h-3.5 w-3.5" />}>
            Stories
          </NavLink>
          <NavLink href="/map" active={isActive('/map')} icon={<Map className="h-3.5 w-3.5" />}>
            Map
          </NavLink>

          {/* Logging a ride is the contribution action — visible signed-in or out
              (anonymous publishing is supported on /trips/new) */}
          <Link href="/trips/new"
            className="tx-stitch ml-2 flex items-center gap-1.5 rounded-md bg-orange-500 px-3.5 py-2 font-display text-[14px] font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-400 active:scale-95">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Log a ride
          </Link>
          <Link href="/import" title="Import album"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white">
            <Upload className="h-3.5 w-3.5" />
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
