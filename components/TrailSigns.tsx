// North American trail difficulty signs: green circle, blue square, black diamond, double black diamond.

import type { Difficulty } from '@/lib/lines'

export function DifficultySign({ d, size = 14, title }: { d: Difficulty; size?: number; title?: string }) {
  const s = size
  const label = title ?? { green: 'Green circle', blue: 'Blue square', black: 'Black diamond', double: 'Double black diamond' }[d]
  if (d === 'green') return <svg width={s} height={s} viewBox="0 0 16 16" role="img" aria-label={label} className="shrink-0"><circle cx="8" cy="8" r="7" fill="#3E8E41" stroke="#FBFBF8" strokeWidth="1.2" /></svg>
  if (d === 'blue') return <svg width={s} height={s} viewBox="0 0 16 16" role="img" aria-label={label} className="shrink-0"><rect x="1.5" y="1.5" width="13" height="13" fill="#2D68B0" stroke="#FBFBF8" strokeWidth="1.2" /></svg>
  const diamond = (cx: number) => <path d={`M${cx} 1.2 L${cx + 6.2} 8 L${cx} 14.8 L${cx - 6.2} 8 Z`} fill="#1F201C" stroke="#FBFBF8" strokeWidth="1.2" />
  if (d === 'black') return <svg width={s} height={s} viewBox="0 0 16 16" role="img" aria-label={label} className="shrink-0">{diamond(8)}</svg>
  return <svg width={s * 1.6} height={s} viewBox="0 0 26 16" role="img" aria-label={label} className="shrink-0">{diamond(7.5)}{diamond(18.5)}</svg>
}
