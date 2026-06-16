'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageContainer from '@/components/PageContainer'
import PhotoUploader, { type PendingPhoto } from '@/components/PhotoUploader'

export default function NewTripPage() {
  const supabase = createClient()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [step, setStep] = useState<'details' | 'photos' | 'publishing'>('details')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const publish = async () => {
    setError('')
    setStep('publishing')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Create trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({ owner_id: user.id, title, description, is_public: isPublic })
      .select()
      .single()

    if (tripError || !trip) { setError(tripError?.message ?? 'Failed to create trip'); setStep('photos'); return }

    // Upload photos sorted by taken_at then name
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
          lat: photo.lat,
          lng: photo.lng,
          taken_at: photo.takenAt?.toISOString() ?? null,
          caption: photo.caption || null,
          sequence_order: i,
        })
        .select()
        .single()

      if (i === 0 && photoRow) coverId = photoRow.id
      setProgress(Math.round(((i + 1) / sorted.length) * 100))
    }

    if (coverId) {
      await supabase.from('trips').update({ cover_photo_id: coverId }).eq('id', trip.id)
    }

    router.push(`/trips/${trip.id}`)
  }

  return (
    <PageContainer>
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create a new trip</h1>

      {step === 'publishing' ? (
        <div className="py-16 text-center">
          <p className="text-zinc-300 mb-3">Uploading photos... {progress}%</p>
          <div className="mx-auto h-2 w-64 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Trip title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Pacific Coast Highway Road Trip"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell people about this journey..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-600 outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="rounded accent-orange-500"
                />
                <span className="text-sm text-zinc-300">Make this trip public</span>
              </label>
              <button
                onClick={() => title.trim() && setStep('photos')}
                disabled={!title.trim()}
                className="rounded-lg bg-orange-500 px-5 py-2 font-medium text-white hover:bg-orange-400 transition-colors disabled:opacity-40"
              >
                Next: Add Photos
              </button>
            </div>
          )}

          {step === 'photos' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('details')} className="text-zinc-400 hover:text-white">
                  ← Back
                </button>
                <div>
                  <h2 className="font-semibold text-white">{title}</h2>
                  <p className="text-sm text-zinc-500">Add photos — GPS data will build your map route automatically</p>
                </div>
              </div>
              <PhotoUploader onPhotosChange={setPhotos} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex items-center gap-3">
                <button
                  onClick={publish}
                  disabled={photos.length === 0}
                  className="rounded-lg bg-orange-500 px-6 py-2 font-medium text-white hover:bg-orange-400 transition-colors disabled:opacity-40"
                >
                  Publish Trip ({photos.length} photo{photos.length !== 1 ? 's' : ''})
                </button>
                {photos.filter(p => p.lat).length > 0 && (
                  <span className="text-sm text-green-400">
                    {photos.filter(p => p.lat).length} photo{photos.filter(p => p.lat).length !== 1 ? 's' : ''} with GPS
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </PageContainer>
  )
}
