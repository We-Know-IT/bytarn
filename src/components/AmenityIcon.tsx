import { Accessibility, Baby, MoveVertical, type LucideProps } from 'lucide-react'
import type { AmenityKey } from '@/types'

const ICONS: Record<AmenityKey, React.ComponentType<LucideProps>> = {
  elevator: MoveVertical,
  strollerFriendly: Baby,
  wheelchairAccessible: Accessibility,
}

export default function AmenityIcon({ amenity, ...props }: { amenity: AmenityKey } & LucideProps) {
  const Icon = ICONS[amenity]
  return <Icon strokeWidth={1.75} aria-hidden {...props} />
}
