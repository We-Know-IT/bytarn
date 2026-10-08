// Saved searches ("Spara sökning"). Stored in the saved_searches table when
// signed in — so we can e-mail "a new listing matches your search" — and in
// localStorage when signed out. Searches saved while signed out are moved
// into the database on the first signed-in load and then cleared locally.
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import type { SavedSearch, SearchFilters } from '@/types'

export const LOCAL_KEY = 'hyresvagen_saved_searches'

export interface StoredSavedSearch extends SavedSearch {
  /** E-mail me about new matching listings (saved_searches.notify). */
  notify: boolean
  /** Only in this browser (signed out). */
  local?: boolean
}

export type SavedSearchFilters = Omit<SearchFilters, 'view' | 'sort'>

export interface SavedSearchRow {
  id: string
  user_id: string
  name: string
  districts: string[] | null
  rooms: number[] | null
  max_rent: number | null
  notify?: boolean | null
  created_at: string
}

export function defaultSearchName(date = new Date()): string {
  return `Sökning ${date.toLocaleDateString('sv-SE')}`
}

export function rowToSavedSearch(row: SavedSearchRow): StoredSavedSearch {
  return {
    id: row.id,
    name: row.name,
    filters: {
      districts: row.districts ?? [],
      rooms: row.rooms ?? [],
      maxRent: row.max_rent ?? null,
      amenities: [],
    },
    notify: row.notify !== false,
    createdAt: row.created_at,
  }
}

/** Columns for an insert. Amenities aren't stored in the database. */
export function savedSearchToRow(userId: string, name: string, filters: SavedSearchFilters) {
  const maxRent = filters.maxRent != null && Number.isFinite(filters.maxRent) && filters.maxRent > 0 ? Math.round(filters.maxRent) : null
  return {
    user_id: userId,
    name: name.trim().slice(0, 100) || defaultSearchName(),
    districts: [...new Set(filters.districts)],
    rooms: [...new Set(filters.rooms.map((r) => Math.min(5, Math.max(1, Math.floor(r)))))].sort((a, b) => a - b),
    max_rent: maxRent,
  }
}

/** Parses the localStorage value, ignoring anything malformed. */
export function parseLocalSearches(raw: string | null): StoredSavedSearch[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s): s is SavedSearch => !!s && typeof s === 'object' && typeof (s as SavedSearch).id === 'string' && !!(s as SavedSearch).filters)
      .map((s) => ({
        id: s.id,
        name: typeof s.name === 'string' ? s.name : defaultSearchName(),
        filters: {
          districts: Array.isArray(s.filters.districts) ? s.filters.districts : [],
          rooms: Array.isArray(s.filters.rooms) ? s.filters.rooms : [],
          maxRent: typeof s.filters.maxRent === 'number' ? s.filters.maxRent : null,
          amenities: Array.isArray(s.filters.amenities) ? s.filters.amenities : [],
        },
        createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
        notify: false,
        local: true,
      }))
  } catch {
    return []
  }
}

function readLocal(): StoredSavedSearch[] {
  try {
    return parseLocalSearches(localStorage.getItem(LOCAL_KEY))
  } catch {
    return []
  }
}

function writeLocal(searches: StoredSavedSearch[]): void {
  try {
    if (searches.length === 0) localStorage.removeItem(LOCAL_KEY)
    else {
      const plain: SavedSearch[] = searches.map(({ id, name, filters, createdAt }) => ({ id, name, filters, createdAt }))
      localStorage.setItem(LOCAL_KEY, JSON.stringify(plain))
    }
  } catch {
    // Storage unavailable (private mode etc.) — nothing to do.
  }
}

const SELECT = 'id, user_id, name, districts, rooms, max_rent, notify, created_at'

let migration: Promise<void> | null = null

/** Moves searches saved while signed out into the database, then clears them locally. */
function migrateLocal(userId: string): Promise<void> {
  if (!migration) {
    migration = (async () => {
      const local = readLocal()
      if (local.length === 0) return
      const rows = local.map((s) => ({ ...savedSearchToRow(userId, s.name, s.filters), created_at: s.createdAt }))
      const { error } = await createClient().from('saved_searches').insert(rows)
      if (error) {
        console.error('Kunde inte flytta sparade sökningar', error)
        return
      }
      writeLocal([])
    })().finally(() => {
      migration = null
    })
  }
  return migration
}

/** Your saved searches, newest first. userId null = signed out (localStorage). */
export async function fetchSavedSearches(userId: string | null): Promise<StoredSavedSearch[]> {
  if (!userId || !supabaseConfigured) return readLocal().reverse()
  await migrateLocal(userId)
  const { data, error } = await createClient()
    .from('saved_searches')
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as SavedSearchRow[]).map(rowToSavedSearch)
}

export async function saveSearch(
  userId: string | null,
  filters: SavedSearchFilters,
  name = defaultSearchName()
): Promise<StoredSavedSearch> {
  if (!userId || !supabaseConfigured) {
    const saved: StoredSavedSearch = {
      id: Date.now().toString(),
      name,
      filters: { districts: filters.districts, rooms: filters.rooms, maxRent: filters.maxRent, amenities: filters.amenities ?? [] },
      createdAt: new Date().toISOString(),
      notify: false,
      local: true,
    }
    writeLocal([...readLocal(), saved])
    return saved
  }
  await migrateLocal(userId)
  const { data, error } = await createClient()
    .from('saved_searches')
    .insert(savedSearchToRow(userId, name, filters))
    .select(SELECT)
    .single()
  if (error || !data) throw error ?? new Error('Kunde inte spara sökningen.')
  return rowToSavedSearch(data as SavedSearchRow)
}

export async function setSavedSearchNotify(id: string, notify: boolean): Promise<void> {
  const { error } = await createClient().from('saved_searches').update({ notify }).eq('id', id)
  if (error) throw error
}

export async function deleteSavedSearch(search: Pick<StoredSavedSearch, 'id' | 'local'>): Promise<void> {
  if (search.local || !supabaseConfigured) {
    writeLocal(readLocal().filter((s) => s.id !== search.id))
    return
  }
  const { error } = await createClient().from('saved_searches').delete().eq('id', search.id)
  if (error) throw error
}

/**
 * Link to /annonser with the search's filters applied (the query params
 * /annonser understands: ?omrade= takes a single district, ?rum=, ?maxhyra=).
 */
export function savedSearchHref(filters: SavedSearchFilters): string {
  const params = new URLSearchParams()
  if (filters.districts.length === 1) params.set('omrade', filters.districts[0])
  if (filters.rooms.length > 0) params.set('rum', filters.rooms.join(','))
  if (filters.maxRent) params.set('maxhyra', String(filters.maxRent))
  const qs = params.toString()
  return qs ? `/annonser?${qs}` : '/annonser'
}
