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
  status: ListingStatus
  userId: string
  userName: string
  userAvatar?: string
  createdAt: string
  updatedAt: string
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
