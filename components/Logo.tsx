// The wave-wheel: a single stroke that circles like a wheel and curls into itself like a breaking wave.
export const LOGO_PATH = 'M88 50 A38 38 0 1 1 50 12 A19 19 0 0 1 50 50 A9.5 9.5 0 0 1 40.5 40.5'

export default function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d={LOGO_PATH} fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
