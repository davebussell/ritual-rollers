'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { extractPhotoMeta } from '@/lib/exif'
import { useRouter } from 'next/navigation'

interface Props {
  tripId: string
  userId: string
}

export default function CommunityUpload({ tripId, userId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    const meta = await extractPhotoMeta(file)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${tripId}/community-${Date.now()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from('trip-photos')
      .upload(path, file, { cacheControl: '3600' })

    if (!storageError) {
      const { data: latest } = await supabase
        .from('trip_photos')
        .select('sequence_order')
        .eq('trip_id', tripId)
        .order('sequence_order', { ascending: false })
        .limit(1)
        .single()

      await supabase.from('trip_photos').insert({
        trip_id: tripId,
        uploader_id: userId,
        storage_path: path,
        lat: meta.lat,
        lng: meta.lng,
        taken_at: meta.takenAt?.toISOString() ?? null,
        caption: caption || null,
        sequence_order: (latest?.sequence_order ?? 0) + 1,
      })
    }

    setUploading(false)
    setOpen(false)
    setFile(null)
    setPreview(null)
    setCaption('')
    router.refresh()
  }

  return (
    <div className="border-t border-zinc-800 pt-8">
      <h2 className="mb-3 text-lg font-semibold">Add your photo to this trip</h2>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition-colors"
        >
          + Contribute a photo
        </button>
      ) : (
        <div className="max-w-sm space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          {preview ? (
            <img src={preview} alt="" className="w-full aspect-video rounded-lg object-cover" />
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 py-8 text-sm text-zinc-500 hover:border-zinc-500 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              Click to select a photo
            </label>
          )}
          {file && (
            <input
              type="text"
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={upload}
              disabled={!file || uploading}
              className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-400 disabled:opacity-40 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={() => { setOpen(false); setFile(null); setPreview(null) }}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
