// Skate, roller and bike shops from OpenStreetMap (data/shops.json, written by scripts/fetch-shops.mjs).
// Server-side only. Data © OpenStreetMap contributors (ODbL).

import raw from '@/data/shops.json'
import { haversineKm } from '@/lib/geo'
import type { Wheel } from '@/lib/wheels'

export interface Shop {
  id: string
  name: string
  kind: 'skate' | 'bike'
  roller?: boolean
  lat: number
  lng: number
  cc: 'CA' | 'US' | 'MX'
  web?: string
  hours?: string
  addr?: string
  city?: string
  brand?: string
}
export interface NearShop extends Shop { distanceKm: number }

const data = raw as unknown as { fetched: string; shops: Shop[] }
export const SHOPS: Shop[] = data.shops

export const SHOP_COLOR = { skate: '#6A4C93', bike: '#1F7A8C' } as const

export function shopLabel(s: Pick<Shop, 'kind' | 'roller'>): string {
  return s.kind === 'bike' ? 'Bike shop' : s.roller ? 'Roller and inline shop' : 'Skate shop'
}

// Board: skate shops. Skates: roller shops first, then skate shops. Bike: bike shops. Nothing picked: skate shops, then bike shops.
export function shopFits(s: Shop, wheel: Wheel | null): boolean {
  if (!wheel) return true
  return wheel.id === 'bike' ? s.kind === 'bike' : s.kind === 'skate'
}
function rank(s: Shop, wheel: Wheel | null): number {
  if (wheel?.id === 'skates') return s.roller ? 0 : 1
  if (wheel?.id === 'board') return s.roller ? 1 : 0
  return s.kind === 'skate' ? 0 : 1
}

export function shopsNear(lat: number, lng: number, radiusKm: number, wheel: Wheel | null, limit = 40): NearShop[] {
  const dLat = radiusKm / 111
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const out: NearShop[] = []
  for (const s of SHOPS) {
    if (Math.abs(s.lat - lat) > dLat || Math.abs(s.lng - lng) > dLng || !shopFits(s, wheel)) continue
    const distanceKm = haversineKm(lat, lng, s.lat, s.lng)
    if (distanceKm <= radiusKm) out.push({ ...s, distanceKm })
  }
  return out.sort((a, b) => rank(a, wheel) - rank(b, wheel) || a.distanceKm - b.distanceKm).slice(0, limit)
}

export function osmShopUrl(id: string): string {
  const type = id[0] === 'n' ? 'node' : id[0] === 'w' ? 'way' : 'relation'
  return `https://www.openstreetmap.org/${type}/${id.slice(1)}`
}
