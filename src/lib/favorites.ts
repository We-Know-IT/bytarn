import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { rowToListing, LISTING_SELECT, type ListingRow } from '@/lib/listings'
import type { Listing } from '@/types'

export async function fetchFavoriteListingIds(userId: string): Promise<Set<string>> {
  if (!supabaseConfigured) return new Set()
  const supabase = createClient()
  const { data, error } = await supabase.from('favorites').select('listing_id').eq('user_id', userId)
  if (error) {
    console.error('Kunde inte hämta favoriter', error)
    return new Set()
  }
  return new Set(data.map((row) => row.listing_id as string))
}

export async function fetchFavoriteListings(userId: string): Promise<Listing[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()
  const { data: favRows, error: favError } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
  if (favError || !favRows || favRows.length === 0) return []

  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .in('id', favRows.map((r) => r.listing_id))
  if (error || !data) return []
  return (data as unknown as ListingRow[]).map(rowToListing)
}

export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId })
  if (error) throw error
}

export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
  if (error) throw error
}
