// Elevation for park maps (trail profiles: climbs and drops): a local flat projection around the park, and a
// heightfield built from the free Terrain Tiles on AWS Open Data (Mapzen's terrarium PNGs: elevation = R·256 + G + B/256 − 32768 metres).
// Sources behind the tiles include USGS 3DEP, NRCan's CDEM, SRTM and GMTED; detail is about 3–30 m depending on
// where you are, so the shape of a hillside is real but bumps smaller than that are not in it.

export const TERRAIN_ATTRIBUTION = 'Elevation: Terrain Tiles on AWS Open Data (Mapzen), from USGS 3DEP, NRCan CDEM, SRTM and others'
export const TERRAIN_ATTRIBUTION_URL = 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md'
const TILE = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

const R = 6371008.8

export interface Projection {
  lat0: number
  lng0: number
  kx: number   // metres per degree of longitude
  ky: number   // metres per degree of latitude
  // x east, z south
  toLocal: (lng: number, lat: number) => [number, number]
  toLngLat: (x: number, z: number) => [number, number]
}

export function projection(lng0: number, lat0: number): Projection {
  const ky = (Math.PI / 180) * R
  const kx = ky * Math.cos((lat0 * Math.PI) / 180)
  return {
    lat0, lng0, kx, ky,
    toLocal: (lng, lat) => [(lng - lng0) * kx, -(lat - lat0) * ky],
    toLngLat: (x, z) => [lng0 + x / kx, lat0 - z / ky],
  }
}

export interface Box { minX: number; maxX: number; minZ: number; maxZ: number }

// Web Mercator pixel coordinates at a zoom (256 px tiles)
function toPixel(lng: number, lat: number, z: number): [number, number] {
  const n = 256 * 2 ** z
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lng + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n]
}

export interface Heightfield {
  // ground height at a local point, from the elevation tiles (bilinear)
  sample: (x: number, z: number) => number
  min: number
  max: number
}

async function loadTile(z: number, x: number, y: number, signal?: AbortSignal): Promise<Float32Array | null> {
  try {
    const res = await fetch(TILE(z, x, y), { signal, mode: 'cors' })
    if (!res.ok) return null
    const bmp = await createImageBitmap(await res.blob())
    const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(256, 256) : Object.assign(document.createElement('canvas'), { width: 256, height: 256 })
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!ctx) return null
    ctx.drawImage(bmp, 0, 0)
    const px = ctx.getImageData(0, 0, 256, 256).data
    const out = new Float32Array(256 * 256)
    for (let i = 0; i < out.length; i++) out[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768
    return out
  } catch {
    return null
  }
}

// Load the tiles that cover a box (plus a margin) and return a sampler in local metres.
// Falls back to flat ground when the tiles can't be had.
export async function loadHeightfield(proj: Projection, box: Box, signal?: AbortSignal): Promise<Heightfield & { flat: boolean; zoom: number }> {
  const [w, n] = proj.toLngLat(box.minX, box.minZ)
  const [e, s] = proj.toLngLat(box.maxX, box.maxZ)
  // aim for no more than a 4×4 block of tiles
  let z = 15
  for (; z > 10; z--) {
    const [x0, y0] = toPixel(w, n, z), [x1, y1] = toPixel(e, s, z)
    if ((Math.floor(x1 / 256) - Math.floor(x0 / 256) + 1) * (Math.floor(y1 / 256) - Math.floor(y0 / 256) + 1) <= 16) break
  }
  const [px0, py0] = toPixel(w, n, z), [px1, py1] = toPixel(e, s, z)
  const tx0 = Math.floor(px0 / 256), ty0 = Math.floor(py0 / 256), tx1 = Math.floor(px1 / 256), ty1 = Math.floor(py1 / 256)
  const cols = tx1 - tx0 + 1, rows = ty1 - ty0 + 1
  const tiles = await Promise.all(
    Array.from({ length: cols * rows }, (_, i) => loadTile(z, tx0 + (i % cols), ty0 + Math.floor(i / cols), signal)),
  )
  const W = cols * 256, H = rows * 256
  const grid = new Float32Array(W * H)
  let ok = 0
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    if (!t) continue
    ok++
    const ox = (i % cols) * 256, oy = Math.floor(i / cols) * 256
    for (let r = 0; r < 256; r++) grid.set(t.subarray(r * 256, r * 256 + 256), (oy + r) * W + ox)
  }
  if (!ok) return { sample: () => 0, min: 0, max: 0, flat: true, zoom: z }
  // a missing tile: fill it with the mean of the rest so the ground doesn't drop to sea level
  if (ok < tiles.length) {
    let sum = 0, cnt = 0
    tiles.forEach((t, i) => { if (t) for (let k = 0; k < t.length; k += 97) { sum += t[k]; cnt++ } void i })
    const mean = sum / cnt
    tiles.forEach((t, i) => {
      if (t) return
      const ox = (i % cols) * 256, oy = Math.floor(i / cols) * 256
      for (let r = 0; r < 256; r++) grid.fill(mean, (oy + r) * W + ox, (oy + r) * W + ox + 256)
    })
  }
  const offX = tx0 * 256, offY = ty0 * 256
  const at = (gx: number, gy: number) => grid[Math.min(H - 1, Math.max(0, gy)) * W + Math.min(W - 1, Math.max(0, gx))]
  const sample = (x: number, zz: number) => {
    const [lng, lat] = proj.toLngLat(x, zz)
    const [px, py] = toPixel(lng, lat, z)
    // pixel centres sit at +0.5
    const fx = px - offX - 0.5, fy = py - offY - 0.5
    const ix = Math.floor(fx), iy = Math.floor(fy)
    const ax = fx - ix, ay = fy - iy
    const h00 = at(ix, iy), h10 = at(ix + 1, iy), h01 = at(ix, iy + 1), h11 = at(ix + 1, iy + 1)
    return (h00 * (1 - ax) + h10 * ax) * (1 - ay) + (h01 * (1 - ax) + h11 * ax) * ay
  }
  let min = Infinity, max = -Infinity
  for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) {
    const h = sample(box.minX + ((box.maxX - box.minX) * i) / 63, box.minZ + ((box.maxZ - box.minZ) * j) / 63)
    if (h < min) min = h
    if (h > max) max = h
  }
  return { sample, min, max, flat: false, zoom: z }
}

// A regular grid over the box: the mesh the rider sees, and the exact height of that mesh anywhere on it.
// Each cell is split along its b–c diagonal: triangles (a, c, b) and (b, c, d), with a = (i, j), b = (i+1, j),
// c = (i, j+1), d = (i+1, j+1).
export interface Ground {
  box: Box
  nx: number
  nz: number
  dx: number
  dz: number
  heights: Float32Array
  height: (x: number, z: number) => number
}

export function buildGround(hf: Pick<Heightfield, 'sample'>, box: Box, maxCells = 280, minCell = 1): Ground {
  const w = box.maxX - box.minX, d = box.maxZ - box.minZ
  const cell = Math.max(minCell, Math.max(w, d) / maxCells)
  const nx = Math.max(2, Math.ceil(w / cell) + 1), nz = Math.max(2, Math.ceil(d / cell) + 1)
  const dx = w / (nx - 1), dz = d / (nz - 1)
  const raw = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) raw[j * nx + i] = hf.sample(box.minX + i * dx, box.minZ + j * dz)
  // one light pass of smoothing takes the stair-steps out of coarse elevation data
  const heights = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let sum = 0, wsum = 0
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const ii = i + a, jj = j + b
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue
      const wt = a === 0 && b === 0 ? 4 : a === 0 || b === 0 ? 2 : 1
      sum += raw[jj * nx + ii] * wt
      wsum += wt
    }
    heights[j * nx + i] = sum / wsum
  }
  const height = (x: number, z: number) => {
    const fx = Math.min(nx - 1.0001, Math.max(0, (x - box.minX) / dx))
    const fz = Math.min(nz - 1.0001, Math.max(0, (z - box.minZ) / dz))
    const i = Math.floor(fx), j = Math.floor(fz)
    const u = fx - i, v = fz - j
    const ha = heights[j * nx + i], hb = heights[j * nx + i + 1], hc = heights[(j + 1) * nx + i], hd = heights[(j + 1) * nx + i + 1]
    return u + v <= 1 ? ha + (hb - ha) * u + (hc - ha) * v : hd + (hc - hd) * (1 - u) + (hb - hd) * (1 - v)
  }
  return { box, nx, nz, dx, dz, heights, height }
}
