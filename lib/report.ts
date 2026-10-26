// Small server helpers shared by the report pages: the one-line "now" read for metadata and
// cards, and the stories + nearby lookups.

import type { SkateForecast } from '@/lib/forecast'
import { readHours, dryBy, whenLabel, groundLabel, STATUS_LABEL, type Read, type SpotTraits } from '@/lib/skate'

export interface NowRead {
  read: Read
  ground: string
  status: string
  line: string
  dryAt: string | null
}

export function nowRead(f: SkateForecast | null, traits: SpotTraits): NowRead | null {
  if (!f) return null
  const reads = readHours(f.hours, traits)
  const read = reads[f.nowIndex]
  if (!read) return null
  const dry = read.status === 'no' ? dryBy(reads, f.nowIndex) : null
  return {
    read,
    ground: traits.indoor ? 'Indoor' : groundLabel(read.ground, traits.surface),
    status: STATUS_LABEL[read.status],
    line: read.line,
    dryAt: dry ? whenLabel(dry.time, f.localTime) : null,
  }
}

export function describe(now: NowRead | null, tail: string): string {
  if (!now) return tail
  const bit = `${now.ground} right now — ${now.line}${now.dryAt ? `; rideable ${now.dryAt}` : ''}.`
  const full = `${bit} ${tail}`
  return full.length <= 160 ? full : full.slice(0, 157).replace(/\s+\S*$/, '') + '…'
}
