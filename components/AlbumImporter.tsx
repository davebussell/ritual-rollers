'use client'

import { useCallback, useRef, useState } from 'react'
import exifr from 'exifr'
import { getRegion, REGION_COLORS, type Region } from '@/lib/regions'

interface PhotoMeta {
  file: File
  preview: string
  lat: number | null
  lng: number | null
  takenAt: Date | null
  name: string
}

interface DetectedTrip {
  id: string
  photos: PhotoMeta[]
  startDate: Date
  endDate: Date
  region: Region | null
  suggestedName: string
}

// Two photos >7 days apart = different trip
const TRIP_GAP_MS = 7 * 24 * 60 * 60 * 1000

function clusterIntoTrips(photos: PhotoMeta[]): DetectedTrip[] {
  const dated = photos
    .filter(p => p.takenAt)
    .sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime())

  const undated = photos.filter(p => !p.takenAt)
  const clusters: PhotoMeta[][] = []

  for (const photo of dated) {
    const last = clusters[clusters.length - 1]
    const lastPhoto = last?.[last.length - 1]
    if (!last || photo.takenAt!.getTime() - lastPhoto!.takenAt!.getTime() > TRIP_GAP_MS) {
      clusters.push([photo])
    } else {
      last.push(photo)
    }
  }

  if (undated.length > 0) clusters.push(undated)

  return clusters.map((cluster, i) => {
    const withGps = cluster.filter(p => p.lat && p.lng)
    const midIdx = Math.floor(withGps.length / 2)
    const anchor = withGps[midIdx]
    const region = anchor ? getRegion(anchor.lat!, anchor.lng!) : null
    const start = cluster.find(p => p.takenAt)?.takenAt ?? new Date()
    const end = [...cluster].reverse().find(p => p.takenAt)?.takenAt ?? start
    const month = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return {
      id: `trip-${i}`,
      photos: cluster,
      startDate: start,
      endDate: end,
      region,
      suggestedName: region ? `${region} — ${month}` : `Trip ${i + 1} — ${month}`,
    }
  })
}

function formatDateRange(start: Date, end: Date) {
  const same = start.toDateString() === end.toDateString()
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (same) return start.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

export default function AlbumImporter() {
  const [stage, setStage] = useState<'idle' | 'reading' | 'preview' | 'saving'>('idle')
  const [progress, setProgress] = useState(0)
  const [trips, setTrips] = useState<DetectedTrip[]>([])
  const [tripNames, setTripNames] = useState<Record<string, string>>({})
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: FileList) => {
    setStage('reading')
    setProgress(0)

    const all: PhotoMeta[] = []
    const total = files.length

    for (let i = 0; i < total; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      let lat: number | null = null
      let lng: number | null = null
      let takenAt: Date | null = null

      try {
        const exif = await exifr.parse(file, { gps: true, tiff: true })
        if (exif?.latitude) lat = exif.latitude
        if (exif?.longitude) lng = exif.longitude
        if (exif?.DateTimeOriginal) takenAt = new Date(exif.DateTimeOriginal)
        else if (exif?.CreateDate) takenAt = new Date(exif.CreateDate)
      } catch { /* no EXIF */ }

      // Fallback: try to get date from file name (IMG_20230415...)
      if (!takenAt) {
        const m = file.name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/)
        if (m) {
          const d = new Date(`${m[1]}-${m[2]}-${m[3]}`)
          if (!isNaN(d.getTime())) takenAt = d
        }
      }

      const preview = URL.createObjectURL(file)
      all.push({ file, preview, lat, lng, takenAt, name: file.name })
      setProgress(Math.round(((i + 1) / total) * 100))
    }

    const detected = clusterIntoTrips(all)
    setTrips(detected)
    setTripNames(Object.fromEntries(detected.map(t => [t.id, t.suggestedName])))
    setExcluded(new Set())
    setStage('preview')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }, [processFiles])

  async function handleSave() {
    setStage('saving')
    // In a real app: POST each trip + photos to Supabase
    // For now simulate a brief delay then mark done
    await new Promise(r => setTimeout(r, 1200))
    setSaved(true)
    setStage('idle')
  }

  if (saved) return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="text-4xl">✦</div>
      <h2 className="text-xl font-bold text-white">Trips imported!</h2>
      <p className="text-zinc-400 text-sm">Your photos have been organized into {trips.filter(t => !excluded.has(t.id)).length} trips.</p>
      <button onClick={() => { setSaved(false); setTrips([]); setStage('idle') }}
        className="mt-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 active:scale-95 transition-all">
        Import more
      </button>
    </div>
  )

  if (stage === 'reading') return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="text-zinc-400 text-sm">Reading photos… {progress}%</div>
      <div className="w-64 h-1.5 rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-orange-500 transition-all duration-200"
          style={{ width: `${progress}%` }} />
      </div>
    </div>
  )

  if (stage === 'preview' || stage === 'saving') return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            {trips.length} trip{trips.length !== 1 ? 's' : ''} detected
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {trips.reduce((n, t) => n + t.photos.length, 0)} photos organised by date & location
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStage('idle')}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Start over
          </button>
          <button onClick={handleSave} disabled={stage === 'saving'}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60">
            {stage === 'saving' ? 'Saving…' : `Save ${trips.filter(t => !excluded.has(t.id)).length} trips`}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {trips.map(trip => {
          const skip = excluded.has(trip.id)
          const color = trip.region ? REGION_COLORS[trip.region] : '#71717a'
          const withGps = trip.photos.filter(p => p.lat && p.lng).length
          return (
            <div key={trip.id}
              className={`rounded-xl border transition-all ${skip ? 'border-zinc-800 opacity-40' : 'border-zinc-700 bg-zinc-900/60'}`}>
              <div className="flex items-start gap-3 p-4">
                {/* Checkbox */}
                <button onClick={() => setExcluded(prev => {
                  const next = new Set(prev)
                  next.has(trip.id) ? next.delete(trip.id) : next.add(trip.id)
                  return next
                })}
                  className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    skip ? 'border-zinc-600' : 'border-orange-500 bg-orange-500'
                  }`}>
                  {!skip && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>}
                </button>

                <div className="flex-1 min-w-0">
                  <input
                    value={tripNames[trip.id] ?? ''}
                    onChange={e => setTripNames(prev => ({ ...prev, [trip.id]: e.target.value }))}
                    className="w-full bg-transparent text-sm font-semibold text-white placeholder-zinc-600 outline-none border-b border-transparent focus:border-zinc-600 pb-0.5"
                    placeholder="Trip name"
                  />
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-zinc-500">
                    <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                    <span>{trip.photos.length} photos</span>
                    {withGps > 0 && <span>{withGps} with GPS</span>}
                    {trip.region && (
                      <span className="font-medium" style={{ color }}>
                        ● {trip.region}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Photo strip */}
              <div className="flex gap-1.5 px-4 pb-4 overflow-x-auto">
                {trip.photos.slice(0, 12).map((p, i) => (
                  <img key={i} src={p.preview} alt={p.name}
                    className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    style={{ border: p.lat ? `2px solid ${color}` : '2px solid transparent' }} />
                ))}
                {trip.photos.length > 12 && (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs text-zinc-400">
                    +{trip.photos.length - 12}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="group flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-zinc-700 py-20 cursor-pointer hover:border-orange-500 hover:bg-orange-500/5 transition-all"
    >
      <input ref={inputRef} type="file" multiple accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.length && processFiles(e.target.files)} />

      <div className="text-5xl group-hover:scale-110 transition-transform">📸</div>
      <div className="text-center">
        <p className="text-white font-semibold">Drop your photo album here</p>
        <p className="text-zinc-500 text-sm mt-1">or click to browse — select as many as you want</p>
      </div>
      <p className="text-xs text-zinc-600 text-center max-w-xs">
        We'll read the GPS and date from each photo and automatically group them into trips
      </p>
    </div>
  )
}
