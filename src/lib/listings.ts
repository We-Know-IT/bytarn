import type { Listing } from '@/types'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { MOCK_LISTINGS } from '@/lib/mock-data'

type ListingRow = {
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
  status: Listing['status']
  floor: number | null
  elevator: boolean | null
  balcony: boolean | null
  furnished: boolean | null
  pets_allowed: boolean | null
  created_at: string
  updated_at: string
  user_id: string
  profiles: { name: string; avatar_url: string | null } | null
}

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    rooms: row.rooms,
    rent: row.rent,
    area: row.area,
    district: row.district,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    images: row.images ?? [],
    status: row.status,
    userId: row.user_id,
    userName: row.profiles?.name ?? 'Okänd användare',
    userAvatar: row.profiles?.avatar_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    interestedCount: 0,
    matchCount: 0,
    floor: row.floor ?? undefined,
    elevator: row.elevator ?? undefined,
    balcony: row.balcony ?? undefined,
    furnished: row.furnished ?? undefined,
    petsAllowed: row.pets_allowed ?? undefined,
  }
}

const LISTING_SELECT = '*, profiles ( name, avatar_url )'

export async function fetchListings(): Promise<Listing[]> {
  if (!supabaseConfigured) return MOCK_LISTINGS
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'aktiv')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Kunde inte hämta annonser', error)
    return MOCK_LISTINGS
  }
  return (data as unknown as ListingRow[]).map(rowToListing)
}

export async function fetchMyListings(userId: string): Promise<Listing[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Kunde inte hämta dina annonser', error)
    return []
  }
  return (data as unknown as ListingRow[]).map(rowToListing)
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!supabaseConfigured) return MOCK_LISTINGS.find((l) => l.id === id) ?? null
  const supabase = createClient()
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).eq('id', id).single()

  if (error || !data) return null
  return rowToListing(data as unknown as ListingRow)
}

export interface CreateListingInput {
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
  floor?: number
  elevator?: boolean
  balcony?: boolean
  furnished?: boolean
  petsAllowed?: boolean
}

export async function createListing(input: CreateListingInput, userId: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listings')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      rooms: input.rooms,
      rent: input.rent,
      area: input.area,
      district: input.district,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      images: input.images,
      floor: input.floor,
      elevator: input.elevator ?? false,
      balcony: input.balcony ?? false,
      furnished: input.furnished ?? false,
      pets_allowed: input.petsAllowed ?? false,
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Kunde inte skapa annonsen.')
  return data.id
}

export async function updateListing(id: string, input: CreateListingInput): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('listings')
    .update({
      title: input.title,
      description: input.description,
      rooms: input.rooms,
      rent: input.rent,
      area: input.area,
      district: input.district,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      images: input.images,
      floor: input.floor,
      elevator: input.elevator ?? false,
      balcony: input.balcony ?? false,
      furnished: input.furnished ?? false,
      pets_allowed: input.petsAllowed ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function setListingStatus(id: string, status: Listing['status']): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('listings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteListing(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

export async function reportListing(listingId: string, reporterId: string, reason: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reports')
    .insert({ listing_id: listingId, reporter_id: reporterId, reason })
  if (error) throw error
}
