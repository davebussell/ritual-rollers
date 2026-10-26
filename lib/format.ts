// Formatting helpers. String-based on purpose: forecast times are already local to the spot,
// so they are never pushed through a Date (which would shift them into the viewer's zone).

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function hourOf(time: string): number {
  return parseInt(time.slice(11, 13), 10)
}

export function dateOf(time: string): string {
  return time.slice(0, 10)
}

export function weekdayOf(date: string): string {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function clockOf(time: string): string {
  return time.slice(11, 16)
}

export function hourLabel(time: string): string {
  const h = hourOf(time)
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

export function compassOf(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

export function countryFlag(alpha2: string | null | undefined): string {
  if (!alpha2 || alpha2.length !== 2) return ''
  return alpha2.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}
