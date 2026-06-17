'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const loadUser = async (u: User | null) => {
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

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Ritual Rollers
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">Explore</Link>
          <Link href="/import" className="text-zinc-400 hover:text-white transition-colors">Import</Link>
          {user ? (
            <>
              <Link href="/feed" className="text-zinc-400 hover:text-white transition-colors">Feed</Link>
              <Link href="/trips/new" className="rounded-md bg-orange-500 px-3 py-1.5 font-medium text-white hover:bg-orange-400 transition-colors">
                + New Trip
              </Link>
              {username && (
                <Link href={`/profile/${username}`} className="text-zinc-400 hover:text-white transition-colors">
                  @{username}
                </Link>
              )}
              <button onClick={signOut} className="text-zinc-500 hover:text-white transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="rounded-md bg-orange-500 px-3 py-1.5 font-medium text-white hover:bg-orange-400 transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
