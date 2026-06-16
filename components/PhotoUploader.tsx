'use client'

import { useCallback, useState } from 'react'
import { extractPhotoMeta } from '@/lib/exif'

export interface PendingPhoto {
  file: File
  preview: string
  lat: number | null
  lng: number | null
  takenAt: Date | null
  caption: string
}

interface Props {
  onPhotosChange: (photos: PendingPhoto[]) => void
}

export default function PhotoUploader({ onPhotosChange }: Props) {
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)

  const processFiles = async (files: File[]) => {
    setProcessing(true)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const newPhotos = await Promise.all(
      imageFiles.map(async (file) => {
        const meta = await extractPhotoMeta(file)
        return {
          file,
          preview: URL.createObjectURL(file),
          lat: meta.lat,
          lng: meta.lng,
          takenAt: meta.takenAt,
          caption: '',
        }
      })
    )
    const updated = [...photos, ...newPhotos]
    setPhotos(updated)
    onPhotosChange(updated)
    setProcessing(false)
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }, [photos])

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await processFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const updateCaption = (index: number, caption: string) => {
    const updated = photos.map((p, i) => i === index ? { ...p, caption } : p)
    setPhotos(updated)
    onPhotosChange(updated)
  }

  const remove = (index: number) => {
    const updated = photos.filter((_, i) => i !== index)
    setPhotos(updated)
    onPhotosChange(updated)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-700 hover:border-zinc-500'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <svg className="mb-3 w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-zinc-300 font-medium">Drop photos here or click to browse</p>
        <p className="text-zinc-500 text-sm mt-1">GPS metadata will be extracted automatically</p>
        {processing && <p className="text-orange-400 text-sm mt-2">Reading metadata...</p>}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, i) => (
            <div key={photo.preview} className="group relative rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
              <img src={photo.preview} alt="" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="p-2">
                {photo.lat && photo.lng ? (
                  <p className="text-xs text-green-400 mb-1">📍 GPS found</p>
                ) : (
                  <p className="text-xs text-zinc-500 mb-1">No GPS data</p>
                )}
                <input
                  type="text"
                  placeholder="Add caption..."
                  value={photo.caption}
                  onChange={e => updateCaption(i, e.target.value)}
                  className="w-full bg-transparent text-xs text-zinc-300 placeholder-zinc-600 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
