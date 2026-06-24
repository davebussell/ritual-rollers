'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateUser } from '@/lib/auth-or-anon'
import PageContainer from '@/components/PageContainer'
import PhotoUploader, { type PendingPhoto } from '@/components/PhotoUploader'
import CollaboratorSearch, { type Collaborator } from '@/components/CollaboratorSearch'
import ActivityTagPicker from '@/components/ActivityTagPicker'
import { getCountryCode } from '@/lib/country-detect'
import { RefreshCw, UserPlus } from 'lucide-react'

type Step = 'details' | 'photos' | 'publishing'

export default function NewTripPage() {
  const supabase = createClient()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isRecreation, setIsRecreation] = useState(false)
  const [activityTags, setActivityTags] = useState<string[]>([])
  const [recreationRef, setRecreationRef] = useState('')
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [step, setStep] = useState<Step>('details')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [publishedTripId, setPublishedTripId] = useState<string | null>(null)
  const [publishedAnon, setPublishedAnon] = useState(false)

  const publish = async () => {
    setError('')
    setStep('publishing')

    const session = await getOrCreateUser(supabase)
    if (!session.user) {
      setError('Could not start a session — please sign in to publish.')
      setStep('photos')
      return
    }
    const { user, isAnonymous } = session
    setUserId(user.id)

    const firstGps = photos.find(p => p.lat != null && p.lng != null)
    const country_code = firstGps?.lat && firstGps?.lng ? getCountryCode(firstGps.lat, firstGps.lng) : null

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        owner_id: user.id,
        title,
        description: description || null,
        is_public: isPublic,
        country_code,
        activity_tags: activityTags.length > 0 ? activityTags : null,
        ...(isRecreation ? { is_recreation: true, recreation_ref: recreationRef || null } : {}),
      })
      .select()
      .single()

    if (tripError || !trip) { setError(tripError?.message ?? 'Failed to create trip'); setStep('photos'); return }

    if (collaborators.length > 0) {
      await supabase.from('trip_collaborators').insert(
        collaborators.map(c => ({ trip_id: trip.id, user_id: c.id }))
      )
    }

    const sorted = [...photos].sort((a, b) => {
      if (a.takenAt && b.takenAt) return a.takenAt.getTime() - b.takenAt.getTime()
      return a.file.name.localeCompare(b.file.name)
    })

    let coverId: string | null = null
    for (let i = 0; i < sorted.length; i++) {
      const photo = sorted[i]
      const ext = photo.file.name.split('.').pop()
      const path = `${user.id}/${trip.id}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('trip-photos')
        .upload(path, photo.file, { cacheControl: '3600', upsert: false })

      if (uploadError) continue

      const { data: photoRow } = await supabase
        .from('trip_photos')
        .insert({
          trip_id: trip.id,
          uploader_id: user.id,
          storage_path: path,
          lat: photo.lat, lng: photo.lng,
          taken_at: photo.takenAt?.toISOString() ?? null,
          caption: photo.caption || null,
          sequence_order: i,
        })
        .select()
        .single()

      if (i === 0 && photoRow) coverId = photoRow.id
      setProgress(Math.round(((i + 1) / sorted.length) * 100))
    }

    if (coverId) await supabase.from('trips').update({ cover_photo_id: coverId }).eq('id', trip.id)

    setPublishedTripId(trip.id)
    setPublishedAnon(isAnonymous)

    if (!isAnonymous) {
      router.push(`/trips/${trip.id}`)
    }
  }

  // Published as anonymous — show claim prompt instead of redirect
  if (publishedTripId && publishedAnon) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md py-20 text-center space-y-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-2 ring-green-500/30 mx-auto">
            <span className="text-3xl">✓</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Trip is live!</h1>
            <p className="mt-2 text-zinc-400 text-sm">
              Your photos are on the map. Right now you're posting as a guest.
            </p>
          </div>

          {/* Claim CTA */}
          <div className="rounded-2xl border border-orange-500/25 bg-orange-500/8 px-6 py-5 text-left">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4 text-orange-400" />
              <p className="text-sm font-bold text-orange-300">Create an account to claim this trip</p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Sign up now and your trip gets tied to your profile automatically — no re-uploading needed. You'll also earn your first Explorer Badge and start building your adventure passport.
            </p>
            <div className="flex gap-2">
              <a href="/auth/signup"
                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-center text-sm font-bold text-white hover:bg-orange-400 transition-all">
                Create account
              </a>
              <a href="/auth/login"
                className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-center text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-600 transition-all">
                Sign in
              </a>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => router.push(`/trips/${publishedTripId}`)}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              View trip →
            </button>
            <span className="text-zinc-700">·</span>
            <button onClick={() => router.push('/')}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Back to map
            </button>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between">
          <h1 className="text-2xl font-bold">Create a new trip</h1>
          {/* Guest notice for unauthenticated users */}
          <a href="/auth/login"
            className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-all">
            Sign in to track trips
          </a>
        </div>

        {step === 'publishing' ? (
          <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div className="animate-spin text-orange-500">
              <RefreshCw className="h-8 w-8" />
            </div>
            <div>
              <p className="font-medium text-zinc-300">Publishing your adventure…</p>
              {photos.length > 0 && (
                <p className="text-sm text-zinc-500 mt-1">Uploading photos {progress}%</p>
              )}
            </div>
            <div className="h-1.5 w-64 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : step === 'details' ? (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Trip title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Pacific Coast Highway Road Trip"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Tell people about this journey…"
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-orange-500 transition-colors" />
            </div>

            <div className="relative">
              <CollaboratorSearch
                value={collaborators}
                onChange={setCollaborators}
                excludeUserId={userId ?? undefined} />
            </div>

            <div>
              <ActivityTagPicker value={activityTags} onChange={setActivityTags} label="What activities?" />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={isRecreation} onChange={e => setIsRecreation(e.target.checked)}
                  className="h-4 w-4 rounded accent-green-500" />
                <div>
                  <p className="text-sm font-medium text-white">🔄 This is a recreation</p>
                  <p className="text-xs text-zinc-500">Recreating a famous photo? Mark it here to earn the Moment Keeper badge.</p>
                </div>
              </label>
              {isRecreation && (
                <input type="text" value={recreationRef} onChange={e => setRecreationRef(e.target.value)}
                  placeholder="Link or describe the original photo / trip…"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-green-500 transition-colors" />
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded accent-orange-500" />
              <span className="text-sm text-zinc-300">Make this trip public</span>
            </label>

            <button onClick={() => title.trim() && setStep('photos')} disabled={!title.trim()}
              className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-400 transition-all active:scale-95 disabled:opacity-40">
              Next: Add Photos →
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('details')} className="text-zinc-400 hover:text-white transition-colors">← Back</button>
              <div>
                <h2 className="font-semibold text-white">{title}</h2>
                {collaborators.length > 0 && (
                  <p className="text-xs text-zinc-500">with {collaborators.map(c => `@${c.username}`).join(', ')}</p>
                )}
              </div>
            </div>

            <PhotoUploader onPhotosChange={setPhotos} />
            {error && (
              <p className="text-sm text-red-400">
                {error}
                {error.includes('disabled') && (
                  <>{' '}<a href="/auth/login" className="underline text-orange-400 hover:text-orange-300">Sign in</a> or <a href="/auth/signup" className="underline text-orange-400 hover:text-orange-300">create an account</a>.</>
                )}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button onClick={publish} disabled={photos.length === 0}
                className="rounded-xl bg-orange-500 px-6 py-2.5 font-semibold text-white hover:bg-orange-400 transition-all active:scale-95 disabled:opacity-40">
                Publish Trip ({photos.length} photo{photos.length !== 1 ? 's' : ''})
              </button>
              {photos.filter(p => p.lat).length > 0 && (
                <span className="text-sm text-green-400">
                  {photos.filter(p => p.lat).length} with GPS
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
