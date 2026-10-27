'use client'

// Add a photo you took at this park. It's resized in the browser (longest side 1600 px) and re-encoded as JPEG, which
// also drops the camera's location data, then stored in the park-photos bucket under the rider's own folder.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const width = Math.round(bmp.width * scale), height = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height)
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85))
  return { blob, width, height }
}

export default function PhotoUpload({ meId, place }: { meId: string; place: { spot: string | null; park: string | null; name: string } }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost">Add a photo you took here</button>

  const pick = (f: File | null) => {
    setError('')
    if (!f) return
    if (!/^image\//.test(f.type)) { setError('That isn’t a photo.'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !ok) return
    setBusy(true); setError('')
    try {
      const { blob, width, height } = await shrink(file)
      const supabase = createClient()
      const path = `${meId}/${crypto.randomUUID()}.jpg`
      const up = await supabase.storage.from('park-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (up.error) throw up.error
      const { error } = await supabase.from('park_photos').insert({
        rider_id: meId, spot_slug: place.spot, park_id: place.park, place_name: place.name, path, width, height,
        caption: caption.trim() ? caption.trim().slice(0, 200) : null,
      })
      if (error) { await supabase.storage.from('park-photos').remove([path]); throw error }
      setOpen(false); setFile(null); setPreview(null); setCaption(''); setOk(false)
      router.refresh()
    } catch (err) {
      const m = String((err as { message?: string })?.message ?? '')
      setError(/10 photos a day/.test(m) ? 'That’s 10 photos today. Try again tomorrow.' : 'The photo didn’t upload. Try a smaller one, or try again.')
    }
    setBusy(false)
  }

  return (
    <form onSubmit={save} className="panel max-w-xl p-4 sm:p-5">
      <p className="text-[15px] font-bold">Add a photo of someone riding {place.name}</p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" onChange={e => pick(e.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => input.current?.click()} className="btn btn-ghost mt-3">{file ? 'Pick a different photo' : 'Pick a photo'}</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt="" className="mt-3 max-h-72 w-auto rounded-lg" />}
      <label htmlFor="photo-caption" className="mt-4 block text-[15px] font-bold">Caption <span className="font-normal text-muted">(optional)</span></label>
      <input id="photo-caption" value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} placeholder="Back smith on the hubba, Sunday morning" className="field mt-1.5 w-full" />
      <label className="mt-4 flex items-start gap-2 text-[14px]">
        <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} className="mt-1" />
        <span>I took this photo, and anyone you can recognise in it is OK with it being posted. No photos of kids without their parent&apos;s say-so.</span>
      </label>
      <p className="mt-2 text-[13px] text-muted">It&apos;s shrunk before upload, and the camera&apos;s location data is removed. Anyone can see it; you can delete it any time.</p>
      {error && <p role="alert" className="mt-2 text-[14px] font-semibold text-fire">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={!file || !ok || busy} className="btn btn-curb">{busy ? 'Uploading…' : 'Post it'}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
      </div>
    </form>
  )
}

export function RemovePhoto({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" disabled={busy} className="underline underline-offset-2 hover:text-fire"
      onClick={async () => {
        setBusy(true)
        const supabase = createClient()
        const { data } = await supabase.from('park_photos').select('path').eq('id', id).maybeSingle()
        await supabase.from('park_photos').delete().eq('id', id)
        if (data?.path) await supabase.storage.from('park-photos').remove([data.path])
        router.refresh()
      }}>
      delete
    </button>
  )
}
