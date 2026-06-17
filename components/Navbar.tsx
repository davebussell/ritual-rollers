'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Map, Upload, Compass, LogOut, User, Plus } from 'lucide-react'
import type { User as SupaUser } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<SupaUser | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const loadUser = async (u: SupaUser | null) => {
      setUser(u)
      if (!u) { setUsername(null); return }
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

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 transition-transform group-hover:scale-110">
            <Compass className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Ritual Rollers</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink href="/" active={isActive('/')} icon={<Map className="h-3.5 w-3.5" />}>
            Explore
          </NavLink>
          <NavLink href="/import" active={isActive('/import')} icon={<Upload className="h-3.5 w-3.5" />}>
            Import
          </NavLink>

          {user ? (
            <>
              <Link href="/trips/new"
                className="ml-2 flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-orange-400 active:scale-95">
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
              className="ml-2 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-orange-400 active:scale-95">
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
      {icon}
      {children}
    </Link>
  )
}
