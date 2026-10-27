// The mark: a skate wheel seen from the side — urethane, core, bearing.
export default function Wheel({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#F2C230" />
      <circle cx="32" cy="32" r="14" fill="#1F201C" />
      <circle cx="32" cy="32" r="6" fill="#F2C230" />
    </svg>
  )
}
