import type { Listing } from '@/types'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { DISTRICT_CENTERS } from '@/types'

// How long a listing stays live after it's published or renewed. Mirrors
// the expires_at default in supabase/schema.sql.
export const LISTING_LIFETIME_DAYS = 60

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
  video_url: string | null
  status: Listing['status']
  view_count: number | null
  expires_at: string | null
  floor: number | null
  elevator: boolean | null
  balcony: boolean | null
  furnished: boolean | null
  pets_allowed: boolean | null
  stroller_friendly: boolean | null
  wheelchair_accessible: boolean | null
  created_at: string
  updated_at: string
  user_id: string
  profiles: { name: string; avatar_url: string | null } | null
}

export function rowToListing(row: ListingRow): Listing {
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
    videoUrl: row.video_url ?? undefined,
    status: row.status,
    userId: row.user_id,
    userName: row.profiles?.name ?? 'Okänd användare',
    userAvatar: row.profiles?.avatar_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at ?? addDays(row.updated_at, LISTING_LIFETIME_DAYS),
    viewCount: row.view_count ?? 0,
    interestedCount: 0,
    matchCount: 0,
    floor: row.floor ?? undefined,
    elevator: row.elevator ?? undefined,
    balcony: row.balcony ?? undefined,
    furnished: row.furnished ?? undefined,
    petsAllowed: row.pets_allowed ?? undefined,
    strollerFriendly: row.stroller_friendly ?? undefined,
    wheelchairAccessible: row.wheelchair_accessible ?? undefined,
  }
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString()
}

export function isExpired(listing: Pick<Listing, 'expiresAt'>): boolean {
  return new Date(listing.expiresAt).getTime() < Date.now()
}

// `profiles!user_id` names the relationship explicitly. A bare `profiles`
// is ambiguous to PostgREST — favorites and listing_collaborators also link
// listings to profiles — and it rejected every listings query with
// PGRST201, which surfaced as "Annonsen hittades inte" / an empty feed.
export const LISTING_SELECT = '*, profiles!user_id ( name, avatar_url )'
export type { ListingRow }

// Active, unexpired listings. Expired ones are filtered here as well as by
// the nightly expire_stale_listings() job, so the feed stays clean even if
// pg_cron isn't enabled.
export async function fetchListings(): Promise<Listing[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'aktiv')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Kunde inte hämta annonser', error)
    throw error
  }
  return (data as unknown as ListingRow[]).map(rowToListing)
}

export async function fetchListingsByUser(userId: string): Promise<Listing[]> {
  if (!supabaseConfigured) return []
  const { data, error } = await createClient()
    .from('listings')
    .select(LISTING_SELECT)
    .eq('user_id', userId)
    .eq('status', 'aktiv')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Kunde inte hämta användarens annonser', error)
    return []
  }
  return (data as unknown as ListingRow[]).map(rowToListing)
}

// Listings you own, listings you're a co-manager on (a collaborator
// invited to one listing), and every listing owned by someone in your
// family account — all of them can be paused/edited/deleted by you.
export async function fetchMyListings(userId: string): Promise<Listing[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()

  const [{ data: collabRows, error: collabError }, { data: householdRows }] = await Promise.all([
    supabase.from('listing_collaborators').select('listing_id').eq('user_id', userId),
    supabase.from('household_members').select('user_id'),
  ])
  const ownerIds = [...new Set([userId, ...(householdRows ?? []).map((r) => r.user_id as string)])]
  const { data: owned, error: ownedError } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .in('user_id', ownerIds)

  if (ownedError || collabError) {
    console.error('Kunde inte hämta dina annonser', ownedError ?? collabError)
    return []
  }

  const collabIds = (collabRows ?? []).map((r) => r.listing_id as string)
  let collaborated: ListingRow[] = []
  if (collabIds.length > 0) {
    const { data, error } = await supabase.from('listings').select(LISTING_SELECT).in('id', collabIds)
    if (error) console.error('Kunde inte hämta delade annonser', error)
    else collaborated = data as unknown as ListingRow[]
  }

  const byId = new Map<string, ListingRow>()
  ;[...(owned as unknown as ListingRow[]), ...collaborated].forEach((row) => byId.set(row.id, row))

  return [...byId.values()]
    .map(rowToListing)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (!supabaseConfigured) return null
  const supabase = createClient()
  const { data, error } = await supabase.from('listings').select(LISTING_SELECT).eq('id', id).maybeSingle()

  // Only "no such row" means not found — anything else is a real failure
  // and is thrown so the page can show it instead of a misleading
  // "Annonsen hittades inte".
  if (error) {
    console.error('Kunde inte hämta annonsen', error)
    throw error
  }
  return data ? rowToListing(data as unknown as ListingRow) : null
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
  videoUrl?: string | null
  floor?: number
  elevator?: boolean
  balcony?: boolean
  furnished?: boolean
  petsAllowed?: boolean
  strollerFriendly?: boolean
  wheelchairAccessible?: boolean
}

function toRow(input: CreateListingInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    rooms: input.rooms,
    rent: Math.round(input.rent),
    area: input.area,
    district: input.district,
    address: input.address.trim(),
    lat: input.lat,
    lng: input.lng,
    images: input.images,
    video_url: input.videoUrl ?? null,
    floor: input.floor ?? null,
    elevator: input.elevator ?? false,
    balcony: input.balcony ?? false,
    furnished: input.furnished ?? false,
    pets_allowed: input.petsAllowed ?? false,
    stroller_friendly: input.strollerFriendly ?? false,
    wheelchair_accessible: input.wheelchairAccessible ?? false,
  }
}

// Columns added by migration 20260930_v3. If the code deploys before that
// migration has run, retry without them rather than failing every publish.
const V3_COLUMNS = ['stroller_friendly', 'wheelchair_accessible'] as const

function isMissingV3Column(error: { code?: string; message?: string } | null): boolean {
  return !!error && error.code === 'PGRST204' && V3_COLUMNS.some((c) => error.message?.includes(c))
}

function withoutV3Columns(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !(V3_COLUMNS as readonly string[]).includes(k)))
}

function freshExpiry(): string {
  return addDays(new Date().toISOString(), LISTING_LIFETIME_DAYS)
}

// listings.user_id references profiles(id). Accounts created before the
// profile trigger existed have no row, which made every insert fail on the
// foreign key — create it on the fly instead.
async function ensureProfile(userId: string, fallbackName: string): Promise<void> {
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (data) return
  const { error } = await supabase.from('profiles').insert({ id: userId, name: fallbackName })
  if (error && error.code !== '23505') throw error
}

export async function createListing(input: CreateListingInput, userId: string, userName = 'Användare'): Promise<string> {
  const supabase = createClient()
  await ensureProfile(userId, userName)
  const row = { ...toRow(input), user_id: userId, status: 'aktiv', expires_at: freshExpiry() }
  const insert = (r: Record<string, unknown>) => supabase.from('listings').insert(r).select('id').single()
  let { data, error } = await insert(row)
  if (isMissingV3Column(error)) ({ data, error } = await insert(withoutV3Columns(row)))

  if (error || !data) throw error ?? new Error('Kunde inte skapa annonsen.')
  return data.id
}

export async function updateListing(id: string, input: CreateListingInput): Promise<void> {
  const supabase = createClient()
  const row = { ...toRow(input), updated_at: new Date().toISOString() }
  const update = (r: Record<string, unknown>) => supabase.from('listings').update(r).eq('id', id)
  let { error } = await update(row)
  if (isMissingV3Column(error)) ({ error } = await update(withoutV3Columns(row)))

  if (error) throw error
}

export async function setListingStatus(id: string, status: Listing['status']): Promise<void> {
  const supabase = createClient()
  // Reactivating an expired listing would otherwise flip straight back to
  // 'avslutad' on the next cleanup run, so it gets a fresh lifetime too.
  const patch: Record<string, string> = { status, updated_at: new Date().toISOString() }
  if (status === 'aktiv') patch.expires_at = freshExpiry()
  const { error } = await supabase.from('listings').update(patch).eq('id', id)

  if (error) throw error
}

// Keeps a listing live for another LISTING_LIFETIME_DAYS.
export async function renewListing(id: string): Promise<string> {
  const expiresAt = freshExpiry()
  const { error } = await createClient()
    .from('listings')
    .update({ status: 'aktiv', expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return expiresAt
}

export async function deleteListing(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('listings').delete().eq('id', id)
  if (error) throw error
}

// Counted at most once per browser session per listing.
export async function recordListingView(id: string): Promise<void> {
  if (!supabaseConfigured) return
  const key = `hyresvagen_viewed_${id}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {}
  await createClient().rpc('increment_listing_view', { p_listing_id: id })
}

// Street-level geocoding (Nominatim) with a fallback to the district's
// centre point, so a listing can always be placed on the map even when the
// user typed the address without picking a suggestion.
export async function geocodeAddress(address: string, district: string): Promise<{ lat: number; lng: number; exact: boolean } | null> {
  const q = [address, district, 'Stockholm'].filter(Boolean).join(', ')
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=se`,
      { headers: { 'Accept-Language': 'sv' } }
    )
    if (res.ok) {
      const data: { lat: string; lon: string }[] = await res.json()
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), exact: true }
    }
  } catch {}
  const centre = DISTRICT_CENTERS[district]
  return centre ? { lat: centre[0], lng: centre[1], exact: false } : null
}

// Turns Supabase/PostgREST errors into something a user can act on.
export function describeListingError(err: unknown): string {
  const e = err as { code?: string; message?: string; statusCode?: string | number } | null
  const msg = e?.message ?? ''
  if (e?.code === '42501' || /row-level security/i.test(msg)) {
    return 'Du har inte behörighet att spara den här annonsen. Logga ut och in igen och försök på nytt.'
  }
  if (e?.code === '23503') return 'Din profil saknas i databasen. Ladda om sidan och försök igen.'
  if (e?.code === '23502' || e?.code === '22P02') return 'Något fält har ett ogiltigt värde. Kontrollera rum, yta och hyra.'
  if (e?.code === 'PGRST204' || /column .* does not exist|schema cache/i.test(msg)) {
    return 'Databasen är inte uppdaterad. Kör supabase/schema.sql i Supabase och försök igen.'
  }
  if (/bucket not found/i.test(msg)) return 'Lagringsutrymmet för filer saknas. Kör supabase/schema.sql i Supabase.'
  if (/payload too large|exceeded the maximum/i.test(msg) || e?.statusCode === 413 || e?.statusCode === '413') {
    return 'Filen är för stor.'
  }
  if (/jwt|not authenticated|auth session missing/i.test(msg)) return 'Din inloggning har gått ut. Logga in igen.'
  if (/failed to fetch|network/i.test(msg)) return 'Kunde inte nå servern. Kontrollera din uppkoppling.'
  const code = e?.code ? ` (${e.code})` : ''
  return msg ? `${msg}${code}` : 'Något gick fel. Försök igen.'
}

export async function reportListing(listingId: string, reporterId: string, reason: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('reports')
    .insert({ listing_id: listingId, reporter_id: reporterId, reason })
  if (error) throw error
}
