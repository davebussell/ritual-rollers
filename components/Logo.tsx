// The sage roll, drawn in one line — the end of a bundle, curling in on itself, two leaf
// tips trailing. It sits on a stitched canvas patch whose colour follows the place you're
// rolling in: duck canvas for dry, dusty ground (sand, road, wind); forest for the green
// (mountain, river). A spot report sets --rr-patch; everywhere else it's duck.

export const LOGO_SPIRAL =
  'M50 50 a4 4 0 0 1 4 4 a8 8 0 0 1 -8 8 a12 12 0 0 1 -12 -12 a16 16 0 0 1 16 -16 a20 20 0 0 1 20 20 a24 24 0 0 1 -24 24 a28 28 0 0 1 -28 -28 a32 32 0 0 1 32 -32 a36 36 0 0 1 36 36'

/** @deprecated use LOGO_SPIRAL */
export const LOGO_PATH = LOGO_SPIRAL

const LEAF_TIPS = 'M86 54 q6 -10 2 -20 M86 54 q10 -4 16 -12'

export type PatchTone = 'duck' | 'forest'
export const PATCH_COLORS: Record<PatchTone, string> = { duck: '#B7794A', forest: '#3F5A42' }
export const CREAM = '#F5F0E6'

type LogoProps = { size?: number; className?: string; tone?: PatchTone }

/** Primary mark: cream sage roll on a canvas patch. Omit `tone` to follow --rr-patch. */
export default function Logo({ size = 28, className = '', tone }: LogoProps) {
  const fill = tone ? PATCH_COLORS[tone] : 'var(--rr-patch, #B7794A)'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect x="2" y="2" width="96" height="96" rx="22" fill={fill} style={{ transition: 'fill 0.4s ease' }} />
      <rect x="8" y="8" width="84" height="84" rx="17" fill="none" stroke={CREAM} strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray="3 3" />
      <g transform="translate(50 50) scale(0.74) translate(-50 -50)">
        <path d={LOGO_SPIRAL} fill="none" stroke={CREAM} strokeWidth="8" strokeLinecap="round" />
        <path d={LEAF_TIPS} fill="none" stroke={CREAM} strokeWidth="5.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** One-colour mark: the roll in currentColor, for stamps, footers and inline use. */
export function LogoMono({ size = 28, className = '' }: Omit<LogoProps, 'tone'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d={LOGO_SPIRAL} fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round" />
      <path d={LEAF_TIPS} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}
