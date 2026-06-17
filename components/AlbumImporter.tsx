'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, MapPin, Camera, Check, X, RefreshCw, Save } from 'lucide-react'
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

const TRIP_GAP_MS = 7 * 24 * 60 * 60 * 1000

function clusterIntoTrips(photos: PhotoMeta[]): DetectedTrip[] {
  const dated = photos.filter(p => p.takenAt).sort((a, b) => a.takenAt!.getTime() - b.takenAt!.getTime())
  const undated = photos.filter(p => !p.takenAt)
  const clusters: PhotoMeta[][] = []
  for (const photo of dated) {
    const last = clusters[clusters.length - 1]
    const lastPhoto = last?.[last.length - 1]
    if (!last || photo.takenAt!.getTime() - lastPhoto!.takenAt!.getTime() > TRIP_GAP_MS) clusters.push([photo])
    else last.push(photo)
  }
  if (undated.length) clusters.push(undated)
  return clusters.map((cluster, i) => {
    const withGps = cluster.filter(p => p.lat && p.lng)
    const anchor = withGps[Math.floor(withGps.length / 2)]
    const region = anchor ? getRegion(anchor.lat!, anchor.lng!) : null
    const start = cluster.find(p => p.takenAt)?.takenAt ?? new Date()
    const end = [...cluster].reverse().find(p => p.takenAt)?.takenAt ?? start
    const month = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return {
      id: `trip-${i}`,
      photos: cluster, startDate: start, endDate: end, region,
      suggestedName: region ? `${region} — ${month}` : `Trip ${i + 1} — ${month}`,
    }
  })
}

function fmt(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (start.toDateString() === end.toDateString())
    return start.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

export default function AlbumImporter() {
  const [stage, setStage] = useState<'idle' | 'reading' | 'preview' | 'saving' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [trips, setTrips] = useState<DetectedTrip[]>([])
  const [tripNames, setTripNames] = useState<Record<string, string>>({})
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: FileList) => {
    setStage('reading')
    setProgress(0)
    const images = Array.from(files).filter(f => f.type.startsWith('image/'))
    setTotal(images.length)
    const all: PhotoMeta[] = []
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      let lat: number | null = null, lng: number | null = null, takenAt: Date | null = null
      try {
        const exif = await exifr.parse(file, { gps: true, tiff: true })
        if (exif?.latitude) lat = exif.latitude
        if (exif?.longitude) lng = exif.longitude
        if (exif?.DateTimeOriginal) takenAt = new Date(exif.DateTimeOriginal)
        else if (exif?.CreateDate) takenAt = new Date(exif.CreateDate)
      } catch { /* no EXIF */ }
      if (!takenAt) {
        const m = file.name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/)
        if (m) { const d = new Date(`${m[1]}-${m[2]}-${m[3]}`); if (!isNaN(d.getTime())) takenAt = d }
      }
      all.push({ file, preview: URL.createObjectURL(file), lat, lng, takenAt, name: file.name })
      setProgress(i + 1)
    }
    const detected = clusterIntoTrips(all)
    setTrips(detected)
    setTripNames(Object.fromEntries(detected.map(t => [t.id, t.suggestedName])))
    setExcluded(new Set())
    setStage('preview')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }, [processFiles])

  async function handleSave() {
    setStage('saving')
    await new Promise(r => setTimeout(r, 1000))
    setStage('done')
  }

  const kept = trips.filter(t => !excluded.has(t.id))

  if (stage === 'done') return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 ring-2 ring-green-500/30">
        <Check className="h-10 w-10" strokeWidth={2.5} />
      </motion.div>
      <div>
        <h2 className="text-2xl font-bold text-white">{kept.length} trips imported</h2>
        <p className="text-zinc-400 text-sm mt-1">
          {kept.reduce((n, t) => n + t.photos.length, 0)} photos organised and ready to share
        </p>
      </div>
      <button onClick={() => { setTrips([]); setStage('idle') }}
        className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all active:scale-95">
        <RefreshCw className="h-3.5 w-3.5" /> Import more
      </button>
    </motion.div>
  )

  if (stage === 'reading') return (
    <div className="flex flex-col items-center justify-center gap-8 py-24">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
        <Camera className="h-10 w-10 text-orange-500" />
      </motion.div>
      <div className="w-full max-w-sm text-center">
        <p className="text-sm font-medium text-zinc-300 mb-1">
          Reading {progress} of {total} photos…
        </p>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <motion.div className="h-full rounded-full bg-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((progress / total) * 100)}%` }}
            transition={{ duration: 0.1 }} />
        </div>
        <p className="text-xs text-zinc-600 mt-2">Extracting GPS + dates from EXIF</p>
      </div>
    </div>
  )

  if (stage === 'preview' || stage === 'saving') return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            {trips.length} trip{trips.length !== 1 ? 's' : ''} detected
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {trips.reduce((n, t) => n + t.photos.length, 0)} photos · organised by date & location
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStage('idle')}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3.5 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" /> Reset
          </button>
          <motion.button
            onClick={handleSave} disabled={stage === 'saving'} whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-colors disabled:opacity-60">
            {stage === 'saving'
              ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <RefreshCw className="h-3.5 w-3.5" /></motion.div> Saving…</>
              : <><Save className="h-3.5 w-3.5" /> Save {kept.length} trips</>}
          </motion.button>
        </div>
      </div>

      {/* Trip cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {trips.map((trip, i) => {
            const skip = excluded.has(trip.id)
            const color = trip.region ? REGION_COLORS[trip.region] : '#71717a'
            const withGps = trip.photos.filter(p => p.lat && p.lng).length
            return (
              <motion.div key={trip.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: skip ? 0.35 : 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border transition-all ${skip ? 'border-zinc-800' : 'border-zinc-700/60 bg-zinc-900/40'}`}>
                <div className="flex items-start gap-3 p-4">
                  {/* Toggle */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setExcluded(prev => {
                      const next = new Set(prev)
                      next.has(trip.id) ? next.delete(trip.id) : next.add(trip.id)
                      return next
                    })}
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      skip ? 'border-zinc-700 bg-transparent' : 'border-orange-500 bg-orange-500'
                    }`}>
                    {!skip && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </motion.button>

                  <div className="flex-1 min-w-0">
                    <input value={tripNames[trip.id] ?? ''}
                      onChange={e => setTripNames(prev => ({ ...prev, [trip.id]: e.target.value }))}
                      className="w-full bg-transparent text-sm font-semibold text-white outline-none border-b border-transparent focus:border-zinc-600 pb-0.5 placeholder-zinc-600"
                      placeholder="Trip name" />
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3" /> {trip.photos.length} photos
                      </span>
                      <span>{fmt(trip.startDate, trip.endDate)}</span>
                      {withGps > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {withGps} with GPS
                        </span>
                      )}
                      {trip.region && (
                        <span className="font-semibold" style={{ color }}>● {trip.region}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Photo strip */}
                <div className="flex gap-1.5 px-4 pb-4 overflow-x-auto scrollbar-none">
                  {trip.photos.slice(0, 14).map((p, j) => (
                    <motion.img key={j} src={p.preview} alt={p.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: j * 0.03 }}
                      className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                      style={{ outline: `2px solid ${p.lat ? `${color}60` : 'transparent'}` }} />
                  ))}
                  {trip.photos.length > 14 && (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xs font-medium text-zinc-400">
                      +{trip.photos.length - 14}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )

  // Idle — drop zone
  return (
    <motion.div
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      animate={{ borderColor: dragging ? '#f97316' : '#27272a', background: dragging ? 'rgba(249,115,22,0.04)' : 'transparent' }}
      className="group flex cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed py-24 transition-colors"
    >
      <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
        onChange={e => e.target.files?.length && processFiles(e.target.files)} />

      <motion.div
        animate={{ scale: dragging ? 1.15 : 1 }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500 group-hover:bg-orange-500/10 group-hover:text-orange-400 transition-all">
        <Upload className="h-9 w-9" />
      </motion.div>

      <div className="text-center">
        <p className="text-lg font-semibold text-white">
          {dragging ? 'Drop to analyse' : 'Drop your photo album here'}
        </p>
        <p className="text-zinc-500 text-sm mt-1">or click to browse — select as many as you want</p>
      </div>

      <div className="flex items-center gap-6 text-center">
        {[
          { icon: <Camera className="h-4 w-4" />, label: 'Reads GPS & dates' },
          { icon: <MapPin className="h-4 w-4" />, label: 'Groups into trips' },
          { icon: <Check className="h-4 w-4" />, label: 'You approve & save' },
        ].map(({ icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 text-zinc-600">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60">{icon}</div>
            <span className="text-xs">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
