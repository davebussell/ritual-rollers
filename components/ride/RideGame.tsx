'use client'

// Ride a park's real lines in first person. Pick a line, then pedal, pump and brake.
// The line comes from OpenStreetMap, the ground from elevation data; rollers and berms on pump and BMX tracks are
// generated (see lib/ride/path.ts). three.js loads only once you start.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import type { ParkLines, ParkLine } from '@/lib/lines'
import { DIFFICULTY_META, metres } from '@/lib/lines'
import type { ParkKind } from '@/lib/parks'
import type { Surface } from '@/lib/sports'
import type { WheelId } from '@/lib/wheels'
import { rideList, riderForWheel, sceneBox, nextLines, styleFor, surfaceFor, type RideChoice } from '@/lib/ride/setup'
import { projection, loadHeightfield, buildGround, TERRAIN_ATTRIBUTION, TERRAIN_ATTRIBUTION_URL, type Ground, type Projection } from '@/lib/ride/terrain'
import { buildPath, pointAt, type RidePath } from '@/lib/ride/path'
import { RIDERS, startState, stepFor, respawn, type Rider, type RideState, type Input } from '@/lib/ride/physics'
import type { RideScene, CameraMode } from '@/lib/ride/scene'
import { DifficultySign } from '@/components/TrailSigns'

interface Props {
  parkId: string
  parkName: string
  parkKind: ParkKind
  parkSurface: Surface
  wheel: WheelId | null
  backHref: string
  startLine?: string
}

type Phase = 'loading' | 'choose' | 'building' | 'riding' | 'paused' | 'done' | 'error'

interface Built {
  proj: Projection
  ground: Ground
  flat: boolean
  paths: Map<string, { line: ParkLine; path: RidePath; rev?: RidePath }>
  scene: RideScene
}

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60), s = t - m * 60
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`
}

function bestKey(park: string, line: string, rev: boolean, rider: Rider) {
  return `rr-ride-best:${park}:${line}:${rev ? 'r' : 'f'}:${rider}`
}
function readBest(key: string): number | null {
  try { const v = localStorage.getItem(key); return v ? Number(v) : null } catch { return null }
}
function writeBest(key: string, t: number) {
  try { localStorage.setItem(key, String(t)) } catch { /* private mode */ }
}

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

// Wind and rolling noise from filtered white noise; louder the faster you go
class RideSound {
  private ctx: AudioContext | null = null
  private wind: GainNode | null = null
  private roll: GainNode | null = null
  muted = false
  start() {
    if (this.ctx) return
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const mk = (type: BiquadFilterType, freq: number, q: number) => {
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
        const g = ctx.createGain(); g.gain.value = 0
        src.connect(f).connect(g).connect(ctx.destination); src.start()
        return g
      }
      this.wind = mk('lowpass', 700, 0.3)
      this.roll = mk('bandpass', 160, 1.2)
      this.ctx = ctx
    } catch { /* no audio */ }
  }
  update(speed: number, air: boolean, dirt: boolean) {
    if (!this.ctx || !this.wind || !this.roll) return
    const t = this.ctx.currentTime
    const on = this.muted ? 0 : 1
    this.wind.gain.setTargetAtTime(on * Math.min(0.35, speed * speed * 0.0012), t, 0.1)
    this.roll.gain.setTargetAtTime(on * (air ? 0 : Math.min(dirt ? 0.5 : 0.25, speed * (dirt ? 0.04 : 0.02))), t, 0.05)
  }
  pause() { this.ctx?.suspend().catch(() => {}) }
  resume() { this.ctx?.resume().catch(() => {}) }
  stop() { this.ctx?.close().catch(() => {}); this.ctx = null }
}

const noSubscribe = () => () => {}
const coarse = () => window.matchMedia('(pointer: coarse)').matches

export default function RideGame({ parkId, parkName, parkSurface, wheel, backHref, startLine }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [park, setPark] = useState<ParkLines | null>(null)
  const [choice, setChoice] = useState<RideChoice | null>(null)
  const [rider, setRider] = useState<Rider>('bike')
  const [reverse, setReverse] = useState<boolean | null>(null)  // null: pick the downhill way
  const [cam, setCam] = useState<CameraMode>('first')
  const [muted, setMuted] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<{ time: number; best: number | null; newBest: boolean; top: number; air: number; canContinue: boolean } | null>(null)
  const touch = useSyncExternalStore(noSubscribe, coarse, () => false)

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const miniRef = useRef<HTMLCanvasElement>(null)
  const hud = { speed: useRef<HTMLSpanElement>(null), time: useRef<HTMLSpanElement>(null), msg: useRef<HTMLDivElement>(null), pump: useRef<HTMLDivElement>(null), lap: useRef<HTMLSpanElement>(null) }
  const builtRef = useRef<Built | null>(null)
  const runRef = useRef<{
    st: RideState; path: RidePath; lineId: string; rev: boolean; first: string; firstRev: boolean; t: number; started: boolean; lapStart: number; laps: number
    bestLap: number | null; prevS: number; msg: string; msgUntil: number; distance: number
  } | null>(null)
  const input = useRef<Input>({ pedal: false, pump: false, brake: false })
  const phaseRef = useRef<Phase>('loading')
  const camRef = useRef<CameraMode>('first')
  const soundRef = useRef(new RideSound())
  const rafRef = useRef(0)

  useEffect(() => { phaseRef.current = phase }, [phase])

  // the park's lines
  useEffect(() => {
    let cancelled = false
    fetch(`/lines/${parkId}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((p: ParkLines) => {
        if (cancelled) return
        setPark(p)
        const list = rideList(p, parkSurface)
        const first = list.find(c => c.line.id === startLine) ?? list[0] ?? null
        setChoice(first)
        if (first) setRider(riderForWheel(wheel, first.riders))
        setPhase(list.length ? 'choose' : 'error')
        if (!list.length) setError('Nothing here is mapped well enough to ride yet.')
      })
      .catch(() => { if (!cancelled) { setError('The map data for this park didn’t load. Try again in a moment.'); setPhase('error') } })
    return () => { cancelled = true }
  }, [parkId, parkSurface, startLine, wheel])

  const list = useMemo(() => (park ? rideList(park, parkSurface) : []), [park, parkSurface])

  const say = (msg: string, secs = 2.2) => {
    const r = runRef.current
    if (!r) return
    r.msg = msg
    r.msgUntil = r.t + secs
  }

  // ── build the world for a line ────────────────────────────────────
  const build = useCallback(async (c: RideChoice) => {
    if (!park || !canvasRef.current) return
    if (!webglOk()) { setError('This browser can’t show 3D (WebGL is off or not supported).'); setPhase('error'); return }
    setPhase('building')
    setStatus('Loading the ground…')
    try {
      builtRef.current?.scene.dispose()
      builtRef.current = null
      const [lng0, lat0] = c.line.c[Math.floor(c.line.c.length / 2)]
      const proj = projection(lng0, lat0)
      const { box, lines } = sceneBox(park, c.line, proj, c.style)
      const hf = await loadHeightfield(proj, box)
      setStatus('Building the park…')
      await new Promise(r => setTimeout(r, 20))
      const lowPower = window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4
      const ground = buildGround(hf, box, lowPower ? 200 : 300, c.style === 'trail' ? 2 : 1)
      const local = (l: ParkLine) => l.c.map(([lng, lat]) => proj.toLocal(lng, lat))
      const paths = new Map<string, { line: ParkLine; path: RidePath }>()
      for (const l of lines) {
        const style = styleFor(l, park.kind)
        paths.set(l.id, { line: l, path: buildPath(local(l), { style, groundHeight: ground.height }) })
      }
      const { createScene } = await import('@/lib/ride/scene')
      const scene = createScene({
        canvas: canvasRef.current,
        ground,
        outline: park.outline.map(r => r.map(([lng, lat]) => proj.toLocal(lng, lat))),
        parkKind: park.kind,
        lines: [...paths.values()].map(({ line, path }) => ({ id: line.id, path, surface: surfaceFor(line, path.style, parkSurface) })),
        seed: [...parkId].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7),
        lowPower,
        focus: c.line.id,
      })
      builtRef.current = { proj, ground, flat: hf.flat, paths, scene }
      const el = wrapRef.current
      if (el) scene.resize(el.clientWidth, el.clientHeight)
      scene.setCamera(camRef.current)
      // which way: one-way lines as mapped, trails downhill, the rest as mapped
      const pts = local(c.line)
      let rev = reverse ?? false
      if (reverse === null) {
        if (c.line.oneway) rev = c.line.oneway === -1
        else if (c.style === 'trail' || c.style === 'path') {
          const drop = ground.height(pts[0][0], pts[0][1]) - ground.height(pts[pts.length - 1][0], pts[pts.length - 1][1])
          rev = drop < -3
        }
      }
      setReverse(rev)
      startRun(c.line.id, rev)
      if (hf.flat) say('Elevation data didn’t load, so the ground is flat.', 4)
      setPhase('riding')
      soundRef.current.start()
      soundRef.current.resume()
    } catch (e) {
      console.error(e)
      setError('Something went wrong building the park. Try another line.')
      setPhase('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [park, parkId, parkSurface, reverse])

  function pathFor(id: string, rev: boolean): RidePath | null {
    const b = builtRef.current
    const e = b?.paths.get(id)
    if (!b || !e) return null
    if (!rev) return e.path
    if (!e.rev) {
      const pts = e.line.c.map(([lng, lat]) => b.proj.toLocal(lng, lat))
      e.rev = buildPath(pts, { style: e.path.style, groundHeight: b.ground.height, reverse: true })
    }
    return e.rev
  }

  function startRun(lineId: string, rev: boolean) {
    const path = pathFor(lineId, rev)
    if (!path) return
    const line = builtRef.current!.paths.get(lineId)!.line
    const dirt = surfaceFor(line, path.style, parkSurface) === 'dirt'
    const st = startState(path.closed ? 0 : 0.5, dirt)
    st.y = pointAt(path, st.s).h
    runRef.current = { st, path, lineId, rev, first: lineId, firstRev: rev, t: 0, started: false, lapStart: 0, laps: 0, bestLap: null, prevS: st.s, msg: '', msgUntil: 0, distance: 0 }
    setResult(null)
  }

  // the lines that join the end of the current one, best first
  function joints() {
    const r = runRef.current, b = builtRef.current
    if (!r || !b) return []
    const end = pointAt(r.path, r.path.length)
    const cands = [...b.paths.values()].filter(e => e.path.style !== 'path').map(e => ({
      id: e.line.id, oneway: e.line.oneway, name: e.line.name,
      start: [e.path.x[0], e.path.z[0]] as [number, number], end: [e.path.x[e.path.n - 1], e.path.z[e.path.n - 1]] as [number, number],
      startHeading: e.path.heading[0], endHeading: e.path.heading[e.path.n - 1],
    }))
    return nextLines([end.x, end.z], end.heading, r.lineId, cands, b.paths.get(r.lineId)?.line.name)
  }

  // carry on to the line that joins the end of this one
  function continueRun(onlySameTrail = false): boolean {
    const r = runRef.current, b = builtRef.current
    if (!r || !b) return false
    const next = joints()[0]
    if (!next || (onlySameTrail && !next.same)) return false
    const path = pathFor(next.id, next.reverse)
    if (!path) return false
    const line = b.paths.get(next.id)!.line
    r.st.s = 0.3
    r.st.dirt = surfaceFor(line, path.style, parkSurface) === 'dirt'
    r.path = path
    r.lineId = next.id
    r.rev = next.reverse
    r.prevS = 0.3
    if (line.name && !next.same) say(line.name, 1.8)
    return true
  }

  // ── the loop ──────────────────────────────────────────────────────
  useEffect(() => {
    let last = performance.now()
    let hudAt = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const b = builtRef.current, r = runRef.current
      if (b && r) {
        const ph = phaseRef.current
        if (ph === 'riding') {
          const inp = input.current
          if (!r.started && (inp.pedal || inp.pump || Math.abs(r.st.v) > 0.3)) { r.started = true; r.t = 0; r.lapStart = 0 }
          const prevS = r.st.s
          const ev = stepFor(r.st, inp, r.path, RIDERS[rider], dt)
          if (r.started) r.t += dt
          r.distance += Math.abs(r.st.s - prevS) < 50 ? Math.abs(r.st.s - prevS) : 0
          if (ev.crashed) { say(ev.crashed, 1.8) }
          if (r.st.crashed < 0) respawn(r.st, r.path)
          if (ev.landed === 'clean' && r.st.lastLanding === 0 && r.st.bestAir > 0.35) say('Clean landing', 1)
          if (r.st.skid > 0.6 && r.msgUntil < r.t) say('Too hot! Skidding', 0.8)
          // laps on a loop
          if (r.path.closed && r.started) {
            const span = r.path.length
            if (prevS > span * 0.75 && r.st.s < span * 0.25) {
              const lap = r.t - r.lapStart
              r.laps++
              r.lapStart = r.t
              const key = bestKey(parkId, r.first, r.firstRev, rider)
              const best = readBest(key)
              if (best === null || lap < best) writeBest(key, lap)
              r.bestLap = r.bestLap === null ? lap : Math.min(r.bestLap, lap)
              say(`Lap ${r.laps}: ${fmtTime(lap)}${best !== null && lap < best ? ' · best yet' : ''}`, 2.5)
            }
          }
          if (ev.reachedEnd) {
            // tracks flow on into whatever joins them; a trail carries on while the next piece is the same trail
            const isTrack = r.path.style === 'pump' || r.path.style === 'bmx'
            if (!continueRun(!isTrack)) {
              const key = bestKey(parkId, r.first, r.firstRev, rider)
              const best = readBest(key)
              const newBest = best === null || r.t < best
              if (newBest) writeBest(key, r.t)
              setResult({ time: r.t, best, newBest, top: r.st.maxSpeed, air: r.st.totalAir, canContinue: joints().length > 0 })
              setPhase('done')
            }
          }
          soundRef.current.update(Math.abs(r.st.air ? r.st.vh : r.st.v), r.st.air, r.st.dirt)
        } else {
          soundRef.current.update(0, false, false)
        }
        b.scene.render(r.st, r.path, rider, RIDERS[rider].eye, ph === 'riding' ? dt : 0)
        if (now - hudAt > 90) {
          hudAt = now
          const sp = Math.abs(r.st.air ? Math.hypot(r.st.vh, r.st.vy) : r.st.v) * 3.6
          if (hud.speed.current) hud.speed.current.textContent = String(Math.round(sp))
          if (hud.time.current) hud.time.current.textContent = fmtTime(r.path.closed ? r.t - r.lapStart : r.t)
          if (hud.lap.current) hud.lap.current.textContent = r.path.closed ? `Lap ${r.laps + 1}${r.bestLap !== null ? ` · best ${fmtTime(r.bestLap)}` : ''}` : `${metres(Math.max(0, r.path.length - r.st.s))} to go`
          if (hud.msg.current) {
            const m = r.st.crashed > 0 ? r.msg : r.t < r.msgUntil || (!r.started && r.msg) ? r.msg : ''
            hud.msg.current.textContent = !r.started && !m ? (touch ? `Hold ${rider === 'bike' ? 'Pedal' : 'Push'} to go` : `Press ↑ or W to ${rider === 'bike' ? 'pedal' : 'push'}`) : m
            hud.msg.current.style.opacity = hud.msg.current.textContent ? '1' : '0'
          }
          if (hud.pump.current) {
            const g = r.st.pumpGood
            hud.pump.current.style.transform = `scaleX(${Math.abs(g)})`
            hud.pump.current.style.background = g >= 0 ? '#3E8E41' : '#D4402A'
          }
          drawMini(r)
        }
      }
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider, parkId, touch])

  // the little map in the corner
  function drawMini(r: NonNullable<typeof runRef.current>) {
    const c = miniRef.current, b = builtRef.current
    if (!c || !b) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const W = c.width, H = c.height
    ctx.clearRect(0, 0, W, H)
    const p = pointAt(r.path, r.st.s)
    const scale = Math.min(W, H) / Math.max(50, Math.min(900, r.path.length * 0.6))
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.lineCap = 'round'
    for (const { path } of b.paths.values()) {
      const active = path === r.path || b.paths.get(r.lineId)?.rev === r.path && path === b.paths.get(r.lineId)?.path
      ctx.strokeStyle = active ? '#F2C230' : 'rgba(251,251,248,.55)'
      ctx.lineWidth = active ? 3 : 1.5
      ctx.beginPath()
      for (let i = 0; i < path.n; i += 2) {
        const x = (path.x[i] - p.x) * scale, y = (path.z[i] - p.z) * scale
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      if (path.closed) ctx.closePath()
      ctx.stroke()
    }
    ctx.fillStyle = '#D4402A'
    ctx.strokeStyle = '#FBFBF8'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  // ── input ─────────────────────────────────────────────────────────
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      if (phaseRef.current !== 'riding' && phaseRef.current !== 'paused') return
      const k = e.key.toLowerCase()
      if (k === 'arrowup' || k === 'w') input.current.pedal = on
      else if (k === 'arrowdown' || k === 's') input.current.brake = on
      else if (k === ' ' || k === 'shift') input.current.pump = on
      else if (!on) return
      else if (k === 'c') toggleCam()
      else if (k === 'r') restart()
      else if (k === 'm') toggleMute()
      else if (k === 'escape' || k === 'p') togglePause()
      else return
      e.preventDefault()
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    const blur = () => { input.current = { pedal: false, pump: false, brake: false }; if (phaseRef.current === 'riding') { setPhase('paused'); soundRef.current.pause() } }
    const vis = () => { if (document.hidden) blur() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', vis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep the canvas sized to its box
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => builtRef.current?.scene.resize(el.clientWidth, el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // tidy up
  useEffect(() => {
    const sound = soundRef.current
    return () => { builtRef.current?.scene.dispose(); builtRef.current = null; sound.stop() }
  }, [])

  function toggleCam() {
    const next: CameraMode = camRef.current === 'first' ? 'chase' : 'first'
    camRef.current = next
    setCam(next)
    builtRef.current?.scene.setCamera(next)
  }
  function toggleMute() {
    setMuted(m => { soundRef.current.muted = !m; return !m })
  }
  function togglePause() {
    setPhase(p => {
      if (p === 'riding') { soundRef.current.pause(); return 'paused' }
      if (p === 'paused') { soundRef.current.resume(); return 'riding' }
      return p
    })
  }
  function restart() {
    const r = runRef.current
    if (!r || !choice) return
    startRun(choice.line.id, reverse ?? false)
    setPhase('riding')
    soundRef.current.resume()
  }

  const hold = (key: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); input.current[key] = true },
    onPointerUp: () => { input.current[key] = false },
    onPointerCancel: () => { input.current[key] = false },
    onLostPointerCapture: () => { input.current[key] = false },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })

  const riding = phase === 'riding' || phase === 'paused' || phase === 'done'
  const pickLine = (c: RideChoice) => {
    setChoice(c)
    setReverse(null)
    setRider(r => (c.riders.includes(r) ? r : riderForWheel(wheel, c.riders)))
  }

  return (
    <div className="ride">
      <div ref={wrapRef} className="relative h-[calc(100svh-150px)] min-h-[420px] w-full touch-none select-none overflow-hidden bg-asphalt" style={{ maxHeight: 860 }}>
        <canvas ref={canvasRef} className="block h-full w-full" aria-label={`3D ride at ${parkName}`} />

        {/* HUD */}
        {riding && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-asphalt/75 px-3 py-2 text-flyer sm:left-4 sm:top-4">
              <div className="flex items-baseline gap-1"><span ref={hud.speed} className="font-display text-[30px] leading-none sm:text-[38px]">0</span><span className="text-[13px] font-semibold opacity-80">km/h</span></div>
              <div className="mt-1 font-mono text-[15px] tabular-nums"><span ref={hud.time}>0:00.0</span></div>
              <div className="mt-0.5 text-[12px] opacity-80"><span ref={hud.lap} /></div>
              <div className="mt-2 h-1.5 w-24 overflow-hidden rounded bg-flyer/20" title="Pump timing"><div ref={hud.pump} className="h-full origin-left" style={{ transform: 'scaleX(0)' }} /></div>
            </div>
            <canvas ref={miniRef} width={140} height={140} className="pointer-events-none absolute right-3 top-3 h-[100px] w-[100px] rounded-lg bg-asphalt/60 sm:right-4 sm:top-4 sm:h-[140px] sm:w-[140px]" aria-hidden="true" />
            <div ref={hud.msg} className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 rounded-lg bg-asphalt/80 px-4 py-2 text-center text-[16px] font-bold text-flyer transition-opacity sm:text-[19px]" style={{ opacity: 0 }} />
            {touch ? (
              phase === 'riding' && <button type="button" onClick={togglePause} className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-asphalt/75 px-3 py-2 text-[13px] font-bold text-flyer">Pause</button>
            ) : (
              <div className="absolute bottom-3 left-3 flex gap-2 sm:bottom-4 sm:left-4">
                <button type="button" onClick={togglePause} className="rounded-md bg-asphalt/75 px-3 py-2 text-[13px] font-bold text-flyer">{phase === 'paused' ? 'Resume' : 'Pause'}</button>
                <button type="button" onClick={toggleCam} className="rounded-md bg-asphalt/75 px-3 py-2 text-[13px] font-bold text-flyer">{cam === 'first' ? 'Chase view' : 'First person'}</button>
                <button type="button" onClick={toggleMute} className="rounded-md bg-asphalt/75 px-3 py-2 text-[13px] font-bold text-flyer" aria-pressed={muted}>{muted ? 'Sound on' : 'Mute'}</button>
              </div>
            )}
          </>
        )}

        {/* touch controls */}
        {touch && phase === 'riding' && (
          <div className="absolute inset-x-0 bottom-4 flex items-end justify-between px-3">
            <button type="button" {...hold('brake')} className="h-20 w-20 rounded-full border-2 border-flyer/70 bg-fire/70 text-[14px] font-bold text-flyer">Brake</button>
            <div className="flex items-end gap-3">
              <button type="button" {...hold('pump')} className="h-20 w-20 rounded-full border-2 border-flyer/70 bg-pool/70 text-[14px] font-bold text-flyer">Pump</button>
              <button type="button" {...hold('pedal')} className="h-24 w-24 rounded-full border-2 border-flyer/70 bg-curb/80 text-[15px] font-bold text-asphalt">{rider === 'bike' ? 'Pedal' : 'Push'}</button>
            </div>
          </div>
        )}

        {/* choose a line */}
        {(phase === 'choose' || phase === 'loading' || phase === 'building' || phase === 'error') && (
          <div className="absolute inset-0 overflow-y-auto bg-asphalt/95 text-flyer">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
              <p className="text-[14px] font-semibold uppercase tracking-wide text-curb">Ride it in 3D</p>
              <h2 className="h-display mt-1 text-[26px] sm:text-[34px]">{parkName}</h2>
              {phase === 'loading' && <p className="mt-6 text-[16px]">Loading the map…</p>}
              {phase === 'building' && <p className="mt-6 text-[16px]" role="status">{status}</p>}
              {phase === 'error' && (
                <div className="mt-6">
                  <p className="text-[16px]">{error}</p>
                  <Link href={backHref} className="btn btn-curb mt-4">Back to the park</Link>
                </div>
              )}
              {phase === 'choose' && choice && (
                <>
                  <h3 className="mt-6 text-[15px] font-bold">Pick a line</h3>
                  <ul className="mt-2 max-h-[38svh] space-y-1 overflow-y-auto pr-1">
                    {list.map(c => (
                      <li key={c.line.id}>
                        <button type="button" onClick={() => pickLine(c)}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[15px] ${c === choice ? 'bg-flyer text-asphalt' : 'bg-flyer/10 hover:bg-flyer/20'}`}>
                          <LineBadge c={c} />
                          <span className="min-w-0 flex-1 truncate font-semibold">{c.line.name ?? (c.line.kind === 'track' ? (c.style === 'bmx' ? 'BMX track' : 'Pump track') : 'Unnamed trail')}{c.part && <span className="font-normal opacity-75"> · part {c.part[0]} of {c.part[1]}</span>}</span>
                          <span className="shrink-0 text-[13px] opacity-75">{metres(c.line.m)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {choice.riders.length > 1 && (
                    <div className="mt-5">
                      <h3 className="text-[15px] font-bold">Ride it on</h3>
                      <div className="mt-2 flex gap-2">
                        {choice.riders.map(r => (
                          <button key={r} type="button" onClick={() => setRider(r)} aria-pressed={rider === r}
                            className={`rounded-md px-4 py-2 text-[15px] font-bold ${rider === r ? 'bg-curb text-asphalt' : 'bg-flyer/10'}`}>{RIDERS[r].label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {wheel && wheel !== 'bike' && !choice.riders.includes(wheel === 'board' ? 'board' : 'skates') && (
                    <p className="mt-4 rounded-md bg-curb/15 px-3 py-2 text-[14px]">
                      {choice.style === 'pump' ? 'This one is dirt, so it’s ridden on a bike.' : 'This line is ridden on a bike.'}
                    </p>
                  )}
                  {!choice.line.oneway && (
                    <label className="mt-4 flex items-center gap-2 text-[15px]">
                      <input type="checkbox" checked={reverse === true} onChange={e => setReverse(e.target.checked ? true : null)} />
                      Ride it the other way{choice.style === 'trail' ? ' (normally downhill)' : ''}
                    </label>
                  )}
                  <button type="button" onClick={() => build(choice)} className="btn btn-curb mt-6 w-full text-[17px] sm:w-auto">Ride {choice.line.name ?? 'it'}</button>
                  <Controls touch={touch} push={rider !== 'bike'} />
                </>
              )}
            </div>
          </div>
        )}

        {/* paused / done */}
        {(phase === 'paused' || phase === 'done') && (
          <div className="absolute inset-0 flex items-center justify-center bg-asphalt/70 p-4">
            <div className="w-full max-w-sm rounded-xl bg-flyer p-5 text-asphalt">
              {phase === 'done' && result ? (
                <>
                  <h2 className="h-section text-[22px]">{result.newBest ? 'New best!' : 'Finished'}</h2>
                  <p className="mt-2 font-mono text-[28px] tabular-nums">{fmtTime(result.time)}</p>
                  <p className="mt-1 text-[14px] text-muted">
                    {result.best !== null && !result.newBest ? `Your best: ${fmtTime(result.best)} · ` : ''}Top speed {Math.round(result.top * 3.6)} km/h{result.air > 0.2 ? ` · ${result.air.toFixed(1)} s in the air` : ''}
                  </p>
                </>
              ) : (
                <h2 className="h-section text-[22px]">Paused</h2>
              )}
              <div className="mt-5 grid gap-2">
                {phase === 'paused' && <button type="button" onClick={togglePause} className="btn btn-curb">Keep riding</button>}
                {phase === 'paused' && touch && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={toggleCam} className="btn btn-line">{cam === 'first' ? 'Chase view' : 'First person'}</button>
                    <button type="button" onClick={toggleMute} className="btn btn-line" aria-pressed={muted}>{muted ? 'Sound on' : 'Mute'}</button>
                  </div>
                )}
                {phase === 'done' && result?.canContinue && (
                  <button type="button" onClick={() => {
                    const r = runRef.current
                    if (r && continueRun()) { r.first = r.lineId; r.firstRev = r.rev; r.t = 0; r.st.maxSpeed = 0; r.st.totalAir = 0; setResult(null); setPhase('riding'); soundRef.current.resume() }
                  }} className="btn btn-curb">Keep riding the next trail</button>
                )}
                <button type="button" onClick={restart} className="btn btn-dark">Ride it again</button>
                <button type="button" onClick={() => { setPhase('choose'); soundRef.current.pause() }} className="btn btn-line">Pick another line</button>
                <Link href={backHref} className="btn btn-line">Back to the park</Link>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="mx-auto max-w-6xl px-4 pt-3 text-[13px] text-muted sm:px-6">
        Lines © <a href="https://www.openstreetmap.org/copyright" className="prose-link" rel="noopener">OpenStreetMap</a> contributors.{' '}
        <a href={TERRAIN_ATTRIBUTION_URL} className="prose-link" rel="noopener">{TERRAIN_ATTRIBUTION}</a>.
        Trees{choice?.style === 'pump' || choice?.style === 'bmx' ? ', rollers, berms and the start hill' : ''} are generated, not surveyed.
      </p>
    </div>
  )
}

function LineBadge({ c }: { c: RideChoice }) {
  if (c.line.diff) return <DifficultySign d={c.line.diff} size={18} title={DIFFICULTY_META[c.line.diff].sign} />
  const label = c.style === 'pump' ? 'Pump' : c.style === 'bmx' ? 'BMX' : 'Trail'
  return <span className="w-[46px] shrink-0 rounded bg-flyer/15 px-1 py-0.5 text-center text-[11px] font-bold uppercase">{label}</span>
}

function Controls({ touch, push }: { touch: boolean; push: boolean }) {
  const go = push ? 'push' : 'pedal'
  return (
    <div className="mt-6 rounded-lg bg-flyer/10 p-4 text-[14px] leading-relaxed">
      <h3 className="font-bold">How to ride</h3>
      {touch ? (
        <p className="mt-1">Hold <b>{push ? 'Push' : 'Pedal'}</b> to go, <b>Brake</b> to slow down. Hold <b>Pump</b> as you roll down the back of a roller and let go on the way up: that’s free speed.</p>
      ) : (
        <p className="mt-1"><b>↑ / W</b> {go} · <b>↓ / S</b> brake · <b>Space</b> pump (hold it down the back of a roller, let go on the way up) · <b>C</b> camera · <b>R</b> restart · <b>Esc</b> pause · <b>M</b> sound</p>
      )}
      <p className="mt-2 text-flyer/80">Too fast into a corner and you’ll skid or crash. On a big crest you’ll leave the ground: land on a downslope to keep your speed.</p>
    </div>
  )
}
