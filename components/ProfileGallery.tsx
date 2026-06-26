'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Photo {
  id: string
  url: string
  caption: string | null
  tripId: string
  tripTitle: string
}

export default function ProfileGallery({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  return (
    <>
      <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
        {photos.map(photo => (
          <div key={photo.id}
            className="group mb-2 cursor-pointer overflow-hidden rounded-xl break-inside-avoid"
            onClick={() => setLightbox(photo)}>
            <div className="relative overflow-hidden">
              <img src={photo.url} alt={photo.caption ?? photo.tripTitle}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/30" />
              <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                <div className="bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[11px] font-semibold text-white line-clamp-1">{photo.tripTitle}</p>
                  {photo.caption && <p className="mt-0.5 text-[10px] text-zinc-400 line-clamp-1">{photo.caption}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-zinc-800 p-2 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}>
            <X className="h-5 w-5" />
          </button>
          <div className="relative max-h-[90vh] max-w-4xl" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption ?? ''} className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl" />
            <div className="mt-3 text-center">
              <Link href={`/trips/${lightbox.tripId}`}
                className="text-sm font-semibold text-orange-400 hover:underline">
                {lightbox.tripTitle}
              </Link>
              {lightbox.caption && <p className="mt-1 text-xs text-zinc-500">{lightbox.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
