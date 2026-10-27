// Formatting helpers.
// Session times are stored as the wall-clock time at the spot ('YYYY-MM-DDTHH:MM', `starts_local`), so they are
// read as strings and never pushed through the viewer's time zone.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function countryFlag(alpha2: string | null | undefined): string {
  if (!alpha2 || alpha2.length !== 2) return ''
  return alpha2.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

function ymd(local: string): [number, number, number] {
  const [y, m, d] = local.slice(0, 10).split('-').map(Number)
  return [y, m, d]
}

function weekdayIndex(local: string): number {
  const [y, m, d] = ymd(local)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function clock(local: string): string {
  const h = parseInt(local.slice(11, 13), 10)
  const min = local.slice(14, 16)
  const suffix = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return min === '00' ? `${h12} ${suffix}` : `${h12}:${min} ${suffix}`
}

// Today's date at a longitude, roughly (solar offset; good enough for "Today" and "Tomorrow")
export function localToday(lng: number, now = Date.now()): string {
  return new Date(now + Math.round(lng / 15) * 3600_000).toISOString().slice(0, 10)
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = ymd(date)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export interface SessionDate {
  weekday: string        // Sat
  weekdayLong: string    // Saturday
  day: number            // 1
  month: string          // Nov
  time: string           // 10 am
  relative: string | null // Today, Tomorrow
}

export function sessionDate(local: string, lng: number, now = Date.now()): SessionDate {
  const [, m, d] = ymd(local)
  const today = localToday(lng, now)
  const date = local.slice(0, 10)
  const relative = date === today ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : null
  const w = weekdayIndex(local)
  return { weekday: WEEKDAYS[w], weekdayLong: WEEKDAYS_LONG[w], day: d, month: MONTHS[m - 1], time: clock(local), relative }
}

// "Saturday 1 Nov, 10 am" / "Today, 6:30 pm"
export function sessionWhen(local: string, lng: number, now = Date.now()): string {
  const s = sessionDate(local, lng, now)
  return `${s.relative ?? `${s.weekdayLong} ${s.day} ${s.month}`}, ${s.time}`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

export function initials(name: string): string {
  const parts = name.replace(/[_.\-]+/g, ' ').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
