// The 3D scene for the ride (three.js): ground from elevation data, the park's lines as ribbons, generated trees,
// a start gate, and a first-person camera that follows the rider. Loaded only on /ride pages.

import * as THREE from 'three'
import type { Ground, Box } from '@/lib/ride/terrain'
import { pointAt, type RidePath } from '@/lib/ride/path'
import type { RideState, Rider } from '@/lib/ride/physics'

export type CameraMode = 'first' | 'chase'

export interface SceneLine {
  id: string
  path: RidePath
  surface: 'asphalt' | 'concrete' | 'dirt'
}

export interface SceneOptions {
  canvas: HTMLCanvasElement
  ground: Ground
  outline: [number, number][][]       // in local metres
  parkKind: 'skate' | 'pump' | 'bmx' | 'bike'
  lines: SceneLine[]
  seed: number
  lowPower: boolean
  focus?: string                       // the line being ridden: the woods gather around it
}

// ── palette ─────────────────────────────────────────────────────────
const C = {
  skyTop: new THREE.Color('#6F98C2'),
  skyHorizon: new THREE.Color('#E5E4DF'),
  grass: new THREE.Color('#71804C'),
  grass2: new THREE.Color('#5D6E3F'),
  rock: new THREE.Color('#8C8676'),
  dirtPad: new THREE.Color('#A88F6A'),
  concretePad: new THREE.Color('#BDBAB0'),
  asphalt: new THREE.Color('#47483F'),
  concrete: new THREE.Color('#B5B2A8'),
  dirt: new THREE.Color('#8E6A43'),
  dirtDark: new THREE.Color('#6E5034'),
  trunk: new THREE.Color('#5B4632'),
  leaf: [new THREE.Color('#2F5133'), new THREE.Color('#3B5E37'), new THREE.Color('#46683A'), new THREE.Color('#2A4630')],
  curb: new THREE.Color('#F2C230'),
  fire: new THREE.Color('#D4402A'),
  asphaltDark: new THREE.Color('#1F201C'),
}

function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// value noise for colour variation
function noise2(x: number, z: number) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return s - Math.floor(s)
}
function smoothNoise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  const a = noise2(ix, iz), b = noise2(ix + 1, iz), c = noise2(ix, iz + 1), d = noise2(ix + 1, iz + 1)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}

function inRing(x: number, z: number, ring: [number, number][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

// A grid of every line's sample points, to ask "how far is the nearest line?"
class LineIndex {
  private cells = new Map<string, number[]>()
  constructor(private size: number) {}
  add(x: number, z: number) {
    const k = `${Math.floor(x / this.size)},${Math.floor(z / this.size)}`
    const a = this.cells.get(k)
    if (a) a.push(x, z); else this.cells.set(k, [x, z])
  }
  near(x: number, z: number, r: number): boolean {
    const cx = Math.floor(x / this.size), cz = Math.floor(z / this.size)
    const span = Math.ceil(r / this.size)
    for (let i = -span; i <= span; i++) for (let j = -span; j <= span; j++) {
      const a = this.cells.get(`${cx + i},${cz + j}`)
      if (!a) continue
      for (let k = 0; k < a.length; k += 2) if ((a[k] - x) ** 2 + (a[k + 1] - z) ** 2 < r * r) return true
    }
    return false
  }
}

export interface RideScene {
  render: (st: RideState, path: RidePath, rider: Rider, eye: number, dt: number) => void
  setCamera: (mode: CameraMode) => void
  resize: (w: number, h: number) => void
  dispose: () => void
}

export function createScene(o: SceneOptions): RideScene {
  const { ground } = o
  const box: Box = ground.box
  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: !o.lowPower, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.lowPower ? 1.5 : 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const extent = Math.max(box.maxX - box.minX, box.maxZ - box.minZ)
  const fogFar = Math.min(900, Math.max(260, extent * 0.7))
  scene.fog = new THREE.Fog(C.skyHorizon, fogFar * 0.35, fogFar)
  scene.background = C.skyHorizon

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, fogFar * 1.6)
  scene.add(camera)

  // sky: a dome that fades from blue to the horizon colour
  const skyGeo = new THREE.SphereGeometry(fogFar * 1.4, 24, 12)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C.skyTop }, bottom: { value: C.skyHorizon } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vp; void main(){ float t = clamp(vp.y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(t, 0.8)), 1.0); }',
  })
  const sky = new THREE.Mesh(skyGeo, skyMat)
  sky.renderOrder = -1
  scene.add(sky)

  scene.add(new THREE.HemisphereLight(0xe8eef2, 0x5f5a45, 1.25))
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.7)
  sun.position.set(-0.6, 0.75, 0.35)
  scene.add(sun)

  const disposables: { dispose: () => void }[] = [skyGeo, skyMat]

  // ── ground ────────────────────────────────────────────────────────
  {
    const { nx, nz, dx, dz, heights } = ground
    const pos = new Float32Array(nx * nz * 3)
    const col = new Float32Array(nx * nz * 3)
    const pad = o.parkKind === 'pump' || o.parkKind === 'skate' ? C.concretePad : C.dirtPad
    const tmp = new THREE.Color()
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      const x = box.minX + i * dx, z = box.minZ + j * dz
      pos[k * 3] = x; pos[k * 3 + 1] = heights[k]; pos[k * 3 + 2] = z
      const hl = heights[j * nx + Math.max(0, i - 1)], hr = heights[j * nx + Math.min(nx - 1, i + 1)]
      const hu = heights[Math.max(0, j - 1) * nx + i], hd = heights[Math.min(nz - 1, j + 1) * nx + i]
      const steep = Math.hypot((hr - hl) / (2 * dx), (hd - hu) / (2 * dz))
      const n = smoothNoise(x / 9, z / 9) * 0.6 + smoothNoise(x / 2.3, z / 2.3) * 0.4
      tmp.copy(C.grass).lerp(C.grass2, n)
      tmp.lerp(C.rock, Math.min(1, Math.max(0, (steep - 0.55) * 1.6)))
      if (o.parkKind !== 'bike' && o.outline.some(r => inRing(x, z, r))) tmp.copy(pad).multiplyScalar(0.92 + n * 0.12)
      col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b
    }
    const idx: number[] = []
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.setIndex(nx * nz > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1))
    geo.computeVertexNormals()
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
    scene.add(new THREE.Mesh(geo, mat))
    disposables.push(geo, mat)

    // a wide apron at the edge's average height so the world doesn't end in a cliff
    let edge = 0, cnt = 0
    for (let i = 0; i < nx; i++) { edge += heights[i] + heights[(nz - 1) * nx + i]; cnt += 2 }
    for (let j = 0; j < nz; j++) { edge += heights[j * nx] + heights[j * nx + nx - 1]; cnt += 2 }
    const apronGeo = new THREE.PlaneGeometry(fogFar * 4, fogFar * 4)
    apronGeo.rotateX(-Math.PI / 2)
    const apronMat = new THREE.MeshLambertMaterial({ color: C.grass2 })
    const apron = new THREE.Mesh(apronGeo, apronMat)
    apron.position.set((box.minX + box.maxX) / 2, edge / cnt - 1.5, (box.minZ + box.maxZ) / 2)
    scene.add(apron)
    disposables.push(apronGeo, apronMat)
  }

  // ── lines as ribbons ──────────────────────────────────────────────
  const index = new LineIndex(6)
  for (const line of o.lines) {
    const p = line.path
    const n = p.n
    const loop = p.closed
    const segs = loop ? n : n - 1
    const w2 = p.width / 2
    const pos = new Float32Array(n * 4 * 3)
    const col = new Float32Array(n * 4 * 3)
    const base = line.surface === 'asphalt' ? C.asphalt : line.surface === 'concrete' ? C.concrete : C.dirt
    const tmp = new THREE.Color()
    for (let i = 0; i < n; i++) {
      index.add(p.x[i], p.z[i])
      const a = loop ? (i - 1 + n) % n : Math.max(0, i - 1), b = loop ? (i + 1) % n : Math.min(n - 1, i + 1)
      let tx = p.x[b] - p.x[a], tz = p.z[b] - p.z[a]
      const tl = Math.hypot(tx, tz) || 1
      tx /= tl; tz /= tl
      const lx = tz, lz = -tx               // left of the direction of travel
      const tilt = Math.tan(p.bank[i]) * w2
      const xl = p.x[i] + lx * w2, zl = p.z[i] + lz * w2, xr = p.x[i] - lx * w2, zr = p.z[i] - lz * w2
      const gl = ground.height(xl, zl), gr = ground.height(xr, zr)
      const hl = Math.max(p.h[i] - tilt, gl + 0.03), hr = Math.max(p.h[i] + tilt, gr + 0.03)
      const skirt = 0.6
      const v = [xl, hl, zl, xr, hr, zr, xl, Math.min(gl, hl) - skirt, zl, xr, Math.min(gr, hr) - skirt, zr]
      pos.set(v, i * 12)
      // stripes every metre give a sense of speed; the sides are darker
      const stripe = Math.floor((i * p.ds) / 1.5) % 2 === 0 ? 1 : 0.94
      tmp.copy(base).multiplyScalar(stripe * (0.96 + noise2(i, 3) * 0.08))
      col.set([tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b], i * 12)
      tmp.copy(line.surface === 'dirt' ? C.dirtDark : base).multiplyScalar(0.7)
      col.set([tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b], i * 12 + 6)
    }
    const idx: number[] = []
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % n
      const L = i * 4, R = L + 1, BL = L + 2, BR = L + 3
      const L2 = j * 4, R2 = L2 + 1, BL2 = L2 + 2, BR2 = L2 + 3
      idx.push(L, L2, R, R, L2, R2)            // top
      idx.push(BL, BL2, L, L, BL2, L2)         // left side
      idx.push(R, R2, BR, BR, R2, BR2)         // right side
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    scene.add(new THREE.Mesh(geo, mat))
    disposables.push(geo, mat)
  }

  // ── trees (generated) ─────────────────────────────────────────────
  {
    const random = rng(o.seed)
    const areaW = box.maxX - box.minX, areaD = box.maxZ - box.minZ
    const wooded = o.parkKind === 'bike'
    const cap = wooded ? (o.lowPower ? 2200 : 7000) : (o.lowPower ? 350 : 700)
    const tries = cap * (wooded ? 3 : 12)
    const spots: [number, number, number, number][] = []
    const rideLines = o.lines.filter(l => l.path.style !== 'path')
    for (let t = 0; t < tries && spots.length < cap; t++) {
      let x = box.minX + random() * areaW, z = box.minZ + random() * areaD
      // in the woods, half the trees crowd the trails, the way they do on a real hillside
      if (wooded && rideLines.length && t % 3 !== 0) {
        const focus = rideLines.find(l => l.id === o.focus)
        const l = (focus && random() < 0.7 ? focus : rideLines[Math.floor(random() * rideLines.length)]).path
        const i = Math.floor(random() * l.n)
        const a = random() * Math.PI * 2, d = 4 + random() * 45
        x = l.x[i] + Math.cos(a) * d
        z = l.z[i] + Math.sin(a) * d
        if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue
      }
      // thinner away from the park, none on a line or on a track's pad
      const inside = o.outline.some(r => inRing(x, z, r))
      if (!wooded && inside) continue
      if (!wooded && random() > 0.12) continue
      if (index.near(x, z, wooded ? 3.2 : 6)) continue
      if (wooded && !inside && random() > 0.45) continue
      if (smoothNoise(x / 40, z / 40) < (wooded ? 0.25 : 0.4)) continue   // clearings
      spots.push([x, z, 0.7 + random() * 0.7, random()])
    }
    const cone = new THREE.ConeGeometry(1.6, 6, 6)
    cone.translate(0, 5, 0)
    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 2.2, 5)
    trunk.translate(0, 1.1, 0)
    const leafMat = new THREE.MeshLambertMaterial({ flatShading: true })
    const trunkMat = new THREE.MeshLambertMaterial({ color: C.trunk, flatShading: true })
    const leaves = new THREE.InstancedMesh(cone, leafMat, spots.length)
    const trunks = new THREE.InstancedMesh(trunk, trunkMat, spots.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3()
    spots.forEach(([x, z, s, r], i) => {
      ps.set(x, ground.height(x, z) - 0.2, z)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6.28)
      sc.set(s, s * (0.85 + r * 0.5), s)
      m.compose(ps, q, sc)
      leaves.setMatrixAt(i, m)
      trunks.setMatrixAt(i, m)
      leaves.setColorAt(i, C.leaf[Math.floor(r * C.leaf.length) % C.leaf.length])
    })
    scene.add(leaves, trunks)
    disposables.push(cone, trunk, leafMat, trunkMat, leaves, trunks)
  }

  // ── start gate and finish on the open lines ───────────────────────
  const gateMat = new THREE.MeshLambertMaterial({ color: C.curb, flatShading: true })
  const postMat = new THREE.MeshLambertMaterial({ color: C.asphaltDark, flatShading: true })
  disposables.push(gateMat, postMat)
  function gate(p: RidePath, s: number) {
    const pt = pointAt(p, s)
    const g = new THREE.Group()
    const w = p.width + 1.2
    const post = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6)
    disposables.push(post)
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(post, postMat)
      m.position.set(side * w / 2, 1.6, 0)
      g.add(m)
    }
    const banner = new THREE.BoxGeometry(w, 0.5, 0.06)
    disposables.push(banner)
    const b = new THREE.Mesh(banner, gateMat)
    b.position.set(0, 3, 0)
    g.add(b)
    g.position.set(pt.x, pt.h, pt.z)
    g.rotation.y = pt.heading - Math.PI / 2
    scene.add(g)
  }

  // ── the rider (seen in the chase camera) and the bars (first person) ──
  const riderGroup = new THREE.Group()
  const bodyGeo = new THREE.CapsuleGeometry(0.28, 0.9, 4, 8)
  const bodyMat = new THREE.MeshLambertMaterial({ color: C.fire, flatShading: true })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 1.15
  riderGroup.add(body)
  const headGeo = new THREE.SphereGeometry(0.17, 10, 8)
  const helmetMat = new THREE.MeshLambertMaterial({ color: C.curb, flatShading: true })
  const head = new THREE.Mesh(headGeo, helmetMat)
  head.position.y = 1.86
  riderGroup.add(head)
  disposables.push(headGeo, helmetMat)
  const wheelGeo = new THREE.TorusGeometry(0.33, 0.05, 6, 16)
  const darkMat = new THREE.MeshLambertMaterial({ color: C.asphaltDark, flatShading: true })
  const wheels = [new THREE.Mesh(wheelGeo, darkMat), new THREE.Mesh(wheelGeo, darkMat)]
  wheels[0].position.set(0, 0.33, -0.52)
  wheels[1].position.set(0, 0.33, 0.52)
  wheels.forEach(w => { w.rotation.y = Math.PI / 2; riderGroup.add(w) })
  const deckGeo = new THREE.BoxGeometry(0.22, 0.04, 0.82)
  const deck = new THREE.Mesh(deckGeo, darkMat)
  deck.position.y = 0.1
  riderGroup.add(deck)
  scene.add(riderGroup)
  disposables.push(bodyGeo, bodyMat, wheelGeo, darkMat, deckGeo)

  const bars = new THREE.Group()
  const barGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.74, 8)
  barGeo.rotateZ(Math.PI / 2)
  const gripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8)
  gripGeo.rotateZ(Math.PI / 2)
  const stemGeo = new THREE.BoxGeometry(0.05, 0.05, 0.12)
  const barMat = new THREE.MeshLambertMaterial({ color: '#2a2b27' })
  const gripMat = new THREE.MeshLambertMaterial({ color: C.fire })
  bars.add(new THREE.Mesh(barGeo, barMat))
  for (const side of [-1, 1]) { const g = new THREE.Mesh(gripGeo, gripMat); g.position.x = side * 0.34; bars.add(g) }
  const stem = new THREE.Mesh(stemGeo, barMat); stem.position.set(0, -0.02, 0.05); bars.add(stem)
  bars.position.set(0, -0.47, -0.7)
  bars.rotation.x = 0.25
  bars.scale.setScalar(0.85)
  camera.add(bars)
  disposables.push(barGeo, gripGeo, stemGeo, barMat, gripMat)

  // gates go on every open line we can ride
  for (const line of o.lines) if (!line.path.closed && line.path.style !== 'path' && line.path.length > 40) {
    gate(line.path, 1)
    gate(line.path, line.path.length - 1)
  }

  // ── camera ────────────────────────────────────────────────────────
  let mode: CameraMode = 'first'
  const look = new THREE.Vector3()
  const camPos = new THREE.Vector3()
  let haveLook = false
  let roll = 0
  let shake = 0

  function render(st: RideState, path: RidePath, rider: Rider, eye: number, dt: number) {
    const p = pointAt(path, st.s)
    const y = st.air ? st.y : p.h
    const v = st.air ? st.vh : st.v
    const dir = v < -0.2 ? -1 : 1
    const ahead = pointAt(path, st.s + dir * Math.min(26, 5 + Math.abs(v) * 0.55))
    const k = 1 - Math.exp(-dt * 7)
    const target = new THREE.Vector3(ahead.x, ahead.h + eye * 0.75, ahead.z)
    if (!haveLook) { look.copy(target); haveLook = true } else look.lerp(target, k)
    const lean = Math.max(-0.6, Math.min(0.6, Math.atan((v * v * p.curv) / 9.81))) * dir
    // riders keep their head nearly level: a little of the berm and the lean, never a lot
    const wantRoll = Math.max(-0.26, Math.min(0.26, (st.air ? 0 : p.bank * 0.3) + lean * 0.25))
    roll += (wantRoll - roll) * (1 - Math.exp(-dt * 5))
    shake = Math.max(shake * Math.exp(-dt * 6), st.skid * 0.05, st.lastLanding < 0.15 ? 0.06 : 0)

    riderGroup.position.set(p.x, y, p.z)
    riderGroup.rotation.set(0, p.heading - Math.PI / 2 + (dir < 0 ? Math.PI : 0), 0)
    riderGroup.rotateZ(lean)
    wheels.forEach(w => { w.visible = rider === 'bike' })
    deck.visible = rider === 'board'
    bars.visible = rider === 'bike' && mode === 'first'
    riderGroup.visible = mode === 'chase'

    if (mode === 'first') {
      camPos.set(p.x, y + eye, p.z)
    } else {
      const back = pointAt(path, st.s - dir * 7)
      const want = new THREE.Vector3(back.x, Math.max(back.h, y) + 3.2, back.z)
      if (camPos.lengthSq() === 0) camPos.copy(want); else camPos.lerp(want, 1 - Math.exp(-dt * 4))
      const g = ground.height(camPos.x, camPos.z) + 1
      if (camPos.y < g) camPos.y = g
    }
    camera.position.copy(camPos)
    if (shake > 0.001) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake))
    if (mode === 'chase') camera.lookAt(p.x, y + 1.2, p.z); else camera.lookAt(look)
    camera.rotateZ(mode === 'first' ? roll : roll * 0.4)
    sky.position.copy(camera.position)
    renderer.render(scene, camera)
  }

  function resize(w: number, h: number) {
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // keep the sideways view wide enough on a phone held upright
    camera.fov = w / h < 1 ? 88 : w / h < 1.4 ? 78 : 70
    camera.updateProjectionMatrix()
  }

  return {
    render,
    setCamera: m => { mode = m; camPos.set(0, 0, 0); haveLook = false },
    resize,
    dispose: () => {
      for (const d of disposables) d.dispose()
      renderer.dispose()
    },
  }
}
