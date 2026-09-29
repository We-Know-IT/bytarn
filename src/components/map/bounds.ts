import type { Listing } from '@/types'

// Lives outside ListingMap so pages can filter by bounds without pulling the
// (dynamically imported, client-only) map module into their own bundle.
export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export function isInBounds(l: Pick<Listing, 'lat' | 'lng'>, b: MapBounds): boolean {
  return l.lat >= b.south && l.lat <= b.north && l.lng >= b.west && l.lng <= b.east
}
