import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { rowToListing, LISTING_SELECT, type ListingRow } from '@/lib/listings'
import type { Listing } from '@/types'

export async function fetchMyInterestListingIds(userId: string): Promise<Set<string>> {
  if (!supabaseConfigured) return new Set()
  const supabase = createClient()
  const { data, error } = await supabase.from('interests').select('listing_id').eq('user_id', userId)
  if (error || !data) return new Set()
  return new Set(data.map((row) => row.listing_id as string))
}

export async function fetchInterestCount(listingId: string): Promise<number> {
  if (!supabaseConfigured) return 0
  const supabase = createClient()
  const { count, error } = await supabase
    .from('interests')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)
  if (error) return 0
  return count ?? 0
}

export async function expressInterest(userId: string, listingId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('interests').insert({ user_id: userId, listing_id: listingId })
  if (error) throw error
}

export async function removeInterest(userId: string, listingId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('interests')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
  if (error) throw error
}

// Everyone whose listing you're interested in, and who is also interested
// in one of yours — a mutual swap match.
export async function fetchMutualMatchUserIds(userId: string): Promise<Set<string>> {
  if (!supabaseConfigured) return new Set()
  const supabase = createClient()
  const [{ data: myInterests }, { data: myListings }] = await Promise.all([
    supabase.from('interests').select('listings(user_id)').eq('user_id', userId),
    supabase.from('listings').select('id').eq('user_id', userId),
  ])

  const ownersIInterestIn = new Set(
    (myInterests ?? []).map((r: any) => r.listings?.user_id).filter(Boolean)
  )
  const myListingIds = (myListings ?? []).map((l) => l.id as string)
  if (ownersIInterestIn.size === 0 || myListingIds.length === 0) return new Set()

  const { data: interestedInMe } = await supabase
    .from('interests')
    .select('user_id')
    .in('listing_id', myListingIds)
  const usersInterestedInMe = new Set((interestedInMe ?? []).map((r) => r.user_id as string))

  const mutual = new Set<string>()
  ownersIInterestIn.forEach((ownerId) => {
    if (usersInterestedInMe.has(ownerId)) mutual.add(ownerId)
  })
  return mutual
}

export interface IncomingInterest {
  id: string
  createdAt: string
  listing: Listing
  interestedUser: { id: string; name: string; avatarUrl?: string }
  mutual: boolean
}

// Interest shown to me on my own listings — who wants to swap with me, and
// whether I've also shown interest in one of their listings (mutual match).
export async function fetchIncomingInterests(userId: string): Promise<IncomingInterest[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()

  const { data: myListings } = await supabase.from('listings').select('id').eq('user_id', userId)
  const myListingIds = (myListings ?? []).map((l) => l.id as string)
  if (myListingIds.length === 0) return []

  const [{ data, error }, { data: myInterests }] = await Promise.all([
    supabase
      .from('interests')
      .select(`id, created_at, user_id, listing_id, profiles ( id, name, avatar_url ), listings ( ${LISTING_SELECT} )`)
      .in('listing_id', myListingIds)
      .order('created_at', { ascending: false }),
    supabase.from('interests').select('listings ( user_id )').eq('user_id', userId),
  ])

  if (error || !data) {
    console.error('Kunde inte hämta intresseanmälningar', error)
    return []
  }

  const ownersImInterestedIn = new Set(
    (myInterests ?? []).map((row: any) => row.listings?.user_id).filter(Boolean)
  )

  return data.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    listing: rowToListing(row.listings as ListingRow),
    interestedUser: {
      id: row.profiles.id,
      name: row.profiles.name,
      avatarUrl: row.profiles.avatar_url ?? undefined,
    },
    mutual: ownersImInterestedIn.has(row.user_id),
  }))
}
