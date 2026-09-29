export type ListingStatus = 'aktiv' | 'pausad' | 'avslutad'

export interface Listing {
  id: string
  title: string
  description: string
  rooms: number
  rent: number
  area: number
  district: string
  address: string
  lat: number
  lng: number
  images: string[]
  videoUrl?: string
  status: ListingStatus
  userId: string
  userName: string
  userAvatar?: string
  createdAt: string
  updatedAt: string
  expiresAt: string
  viewCount: number
  interestedCount: number
  matchCount: number
  floor?: number
  elevator?: boolean
  balcony?: boolean
  furnished?: boolean
  petsAllowed?: boolean
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  createdAt: string
  listingIds: string[]
  favoriteIds: string[]
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  imageUrl?: string
  videoUrl?: string
  createdAt: string
  read: boolean
}

export interface Conversation {
  id: string
  listingId: string
  listingTitle: string
  listingImage: string
  participantIds: string[]
  participants: { id: string; name: string; avatar?: string }[]
  lastMessage?: Message
  unreadCount: number
  mutualInterest: boolean
  createdAt: string
}

export interface SearchFilters {
  districts: string[]
  rooms: number[]
  maxRent: number | null
  view: 'list' | 'map'
  sort: 'newest' | 'rent_asc' | 'rent_desc' | 'best_match' | 'nearest'
}

export interface SavedSearch {
  id: string
  name: string
  filters: Omit<SearchFilters, 'view' | 'sort'>
  createdAt: string
}

// Approximate centre points, used to place a listing on the map when the
// street address couldn't be geocoded, and to centre the map on a district.
export const DISTRICT_CENTERS: Record<string, [number, number]> = {
  Södermalm: [59.3150, 18.0710],
  Östermalm: [59.3380, 18.0860],
  Kungsholmen: [59.3320, 18.0330],
  Vasastan: [59.3440, 18.0480],
  Norrmalm: [59.3350, 18.0600],
  'Gamla Stan': [59.3250, 18.0710],
  Lidingö: [59.3660, 18.1500],
  Nacka: [59.3100, 18.1640],
  Sundbyberg: [59.3610, 17.9710],
  Solna: [59.3600, 18.0000],
  Bromma: [59.3380, 17.9400],
  Hägersten: [59.2960, 17.9800],
  Skärholmen: [59.2770, 17.9070],
  Farsta: [59.2430, 18.0930],
  Enskede: [59.2840, 18.0770],
  Djurgården: [59.3260, 18.1150],
  Liljeholmen: [59.3100, 18.0230],
}

export const STOCKHOLM_DISTRICTS = [
  'Södermalm',
  'Östermalm',
  'Kungsholmen',
  'Vasastan',
  'Norrmalm',
  'Gamla Stan',
  'Lidingö',
  'Nacka',
  'Sundbyberg',
  'Solna',
  'Bromma',
  'Hägersten',
  'Skärholmen',
  'Farsta',
  'Enskede',
  'Djurgården',
  'Liljeholmen',
]
