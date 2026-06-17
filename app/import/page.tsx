'use client'

import dynamic from 'next/dynamic'
import PageContainer from '@/components/PageContainer'

const AlbumImporter = dynamic(() => import('@/components/AlbumImporter'), { ssr: false })

export default function ImportPage() {
  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Import your album</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Upload photos from your camera roll — we'll sort them into trips automatically.
        </p>
      </div>
      <AlbumImporter />
    </PageContainer>
  )
}
