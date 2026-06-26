'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2 } from 'lucide-react'

interface AvatarUploadProps {
  currentUrl: string | null
  onUpload: (url: string) => void
}

export default function AvatarUpload({ currentUrl, onUpload }: AvatarUploadProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      onUpload(path)
    }
    setUploading(false)
  }

  const displayUrl = preview
    ? preview.startsWith('blob:') || preview.startsWith('https://')
      ? preview
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${preview}`
    : null

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        {displayUrl
          ? <img src={displayUrl} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover" />
          : <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-3xl font-black text-white">?</div>}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-all">
          <Camera className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Change photo'}
        </button>
        <p className="mt-1.5 text-[11px] text-zinc-600">JPG or PNG, max 5MB</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}
