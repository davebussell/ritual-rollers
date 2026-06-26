'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AvatarUpload from '@/components/AvatarUpload'
import { Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setUsername(data.username ?? '')
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatar_url ?? null)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('profiles').update({
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      bio: bio.trim() || null,
      avatar_url: avatarUrl,
    }).eq('id', user.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push(`/profile/${username.trim().toLowerCase()}`)
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-orange-500" />
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <Link href={`/profile/${username}`}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-black text-white">Edit Profile</h1>

        <div className="space-y-6">
          {/* Avatar */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-zinc-500">Avatar</label>
            <AvatarUpload currentUrl={avatarUrl} onUpload={setAvatarUrl} />
          </div>

          {/* Username */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Username</label>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 focus-within:border-orange-500/50 transition-colors">
              <span className="text-zinc-600">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                className="flex-1 bg-transparent text-white placeholder-zinc-600 outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-600">Only lowercase letters, numbers and underscores.</p>
          </div>

          {/* Bio */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-500">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Tell the crew about yourself..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 transition-colors resize-none"
            />
            <p className="mt-1 text-[11px] text-zinc-600">{bio.length}/200</p>
          </div>

          {error && <p className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</p>}

          <button onClick={save} disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-400 transition-all disabled:opacity-50">
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
