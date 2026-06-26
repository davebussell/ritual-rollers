import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('id, username').eq('username', username).single()
  if (!profile) notFound()

  const { data: rows } = await supabase.from('follows')
    .select('following_id, profiles!follows_following_id_fkey(username, avatar_url, bio)')
    .eq('follower_id', profile.id)

  type ProfileRow = { username: string; avatar_url: string | null; bio: string | null }
  const following = (rows ?? []).map(r => (r.profiles as unknown) as ProfileRow | null).filter(Boolean) as ProfileRow[]

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <Link href={`/profile/${username}`} className="mb-8 flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> @{username}
        </Link>
        <h1 className="mb-6 text-xl font-black text-white">Following {following.length}</h1>
        <div className="space-y-2">
          {following.map(f => f && (
            <Link key={f.username} href={`/profile/${f.username}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 hover:border-zinc-600 transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 font-bold text-white">
                {f.username[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">@{f.username}</p>
                {f.bio && <p className="text-xs text-zinc-500 line-clamp-1">{f.bio}</p>}
              </div>
            </Link>
          ))}
          {following.length === 0 && <p className="text-zinc-600">Not following anyone yet.</p>}
        </div>
      </div>
    </div>
  )
}
