// MapLibre finds its web worker next to its own module file, which the bundler moves, so the worker is served from
// public/ instead: copy it there (named with the version) before dev and build. components/ParkMap3D.tsx points
// MapLibre at it with setWorkerUrl().
import { copyFileSync, mkdirSync, readFileSync } from 'fs'
const { version } = JSON.parse(readFileSync('node_modules/maplibre-gl/package.json', 'utf8'))
mkdirSync('public/maplibre', { recursive: true })
copyFileSync('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', `public/maplibre/maplibre-gl-worker-${version}.mjs`)
console.log(`maplibre worker ${version} → public/maplibre/`)
