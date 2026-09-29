import Link from 'next/link'
import { cn } from '@/lib/utils'

/** The Bytaren house-with-arrows mark. */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  const icon = Math.round(size * 0.6)
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-[10px] bg-emerald-600 flex-shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={icon} height={icon} viewBox="0 0 28 27" fill="none">
        <path d="M14 3L22 11V22H6V11L14 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M22 11V3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19.5 5.5L22 3L24.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 22V25" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3.5 23L6 25L8.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** Mark + wordmark, linking home. `inverse` for dark backgrounds. */
export default function Logo({
  inverse = false,
  size = 34,
  onClick,
  className,
}: {
  inverse?: boolean
  size?: number
  onClick?: () => void
  className?: string
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="Bytaren — till startsidan"
      className={cn('group inline-flex items-center gap-2.5 rounded-lg flex-shrink-0', className)}
    >
      <LogoMark size={size} className="transition-transform duration-200 group-hover:scale-[0.96]" />
      <span
        className={cn(
          'text-[13.5px] font-bold tracking-[0.16em] uppercase',
          inverse ? 'text-white' : 'text-gray-900'
        )}
      >
        Bytaren
      </span>
    </Link>
  )
}
