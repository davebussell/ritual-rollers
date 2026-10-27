// Line icons for the wheel picker, drawn to match: a deck, a quad skate, a BMX.
import type { WheelId } from '@/lib/wheels'

const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function WheelIcon({ id, size = 20, className = '' }: { id: WheelId | 'all'; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {id === 'board' && (<>
        <path {...common} d="M2.5 11.5c1 1.2 2.2 1.5 3.5 1.5h12c1.3 0 2.5-.3 3.5-1.5" />
        <circle {...common} cx="7" cy="16.5" r="1.8" /><circle {...common} cx="17" cy="16.5" r="1.8" />
      </>)}
      {id === 'skates' && (<>
        <path {...common} d="M6 3.5v9.5h11.5c1.7 0 2.5-1 2.5-2.2 0-1.3-1-2.1-2.6-2.4L12 7.5V3.5z" />
        <path {...common} d="M5 13h15" />
        <circle {...common} cx="8" cy="17.5" r="1.8" /><circle {...common} cx="17" cy="17.5" r="1.8" />
      </>)}
      {id === 'bike' && (<>
        <circle {...common} cx="5.5" cy="16" r="3.5" /><circle {...common} cx="18.5" cy="16" r="3.5" />
        <path {...common} d="M5.5 16l4-7h6.5l2.5 7M9.5 9l3 7h-7M15 6.5h2.5l-1.5 2.5" />
      </>)}
      {id === 'all' && (<>
        <circle {...common} cx="12" cy="12" r="8.5" /><circle {...common} cx="12" cy="12" r="3" />
      </>)}
    </svg>
  )
}
