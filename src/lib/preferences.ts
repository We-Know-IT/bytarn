// swap_preferences: what each user is looking for in a swap (see
// supabase/migrations/20261007_v4.sql). Read by the matching in
// lib/matching.ts. Any signed-in user can read all rows; you write your own.
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import type { SwapPreferences, SwapPreferencesInput } from '@/types'

type PreferencesRow = {
  user_id: string
  districts: string[] | null
  rooms: number[] | null
  max_rent: number | null
  min_area: number | null
  needs_elevator: boolean | null
  needs_balcony: boolean | null
  needs_pets: boolean | null
  needs_wheelchair: boolean | null
  needs_stroller: boolean | null
  updated_at: string | null
}

export function rowToPreferences(row: PreferencesRow): SwapPreferences {
  return {
    userId: row.user_id,
    districts: row.districts ?? [],
    rooms: row.rooms ?? [],
    maxRent: row.max_rent ?? null,
    minArea: row.min_area ?? null,
    needsElevator: !!row.needs_elevator,
    needsBalcony: !!row.needs_balcony,
    needsPets: !!row.needs_pets,
    needsWheelchair: !!row.needs_wheelchair,
    needsStroller: !!row.needs_stroller,
    updatedAt: row.updated_at ?? undefined,
  }
}

function positiveIntOrNull(n: number | null): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export function preferencesToRow(userId: string, input: SwapPreferencesInput) {
  return {
    user_id: userId,
    districts: [...new Set(input.districts)],
    rooms: [...new Set(input.rooms.map((r) => Math.min(5, Math.max(1, Math.floor(r)))))].sort((a, b) => a - b),
    max_rent: positiveIntOrNull(input.maxRent),
    min_area: positiveIntOrNull(input.minArea),
    needs_elevator: input.needsElevator,
    needs_balcony: input.needsBalcony,
    needs_pets: input.needsPets,
    needs_wheelchair: input.needsWheelchair,
    needs_stroller: input.needsStroller,
    updated_at: new Date().toISOString(),
  }
}

// Ids go in the URL with .in(); chunk so a long feed doesn't hit URL limits.
const IN_CHUNK = 150

/** Preferences of many users at once (e.g. every listing owner in view), keyed by user id. */
export async function fetchPreferencesFor(userIds: string[]): Promise<Map<string, SwapPreferences>> {
  const result = new Map<string, SwapPreferences>()
  const ids = [...new Set(userIds)].filter(Boolean)
  if (!supabaseConfigured || ids.length === 0) return result
  const supabase = createClient()
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) chunks.push(ids.slice(i, i + IN_CHUNK))
  const responses = await Promise.all(chunks.map((chunk) => supabase.from('swap_preferences').select('*').in('user_id', chunk)))
  for (const { data, error } of responses) {
    // Most likely the v4 migration hasn't run — matching just stays empty.
    if (error) {
      console.warn('Kunde inte hämta sökprofiler', error)
      continue
    }
    for (const row of (data ?? []) as PreferencesRow[]) result.set(row.user_id, rowToPreferences(row))
  }
  return result
}

/**
 * The signed-in user's preferences. Saves a pending draft first (filled in
 * during onboarding before signing in), so the result includes it.
 */
export async function fetchMyPreferences(userId: string): Promise<SwapPreferences | null> {
  if (!supabaseConfigured) return null
  await syncPendingPreferences(userId)
  const { data, error } = await createClient().from('swap_preferences').select('*').eq('user_id', userId).maybeSingle()
  if (error) {
    console.warn('Kunde inte hämta din sökprofil', error)
    return null
  }
  return data ? rowToPreferences(data as PreferencesRow) : null
}

export async function savePreferences(userId: string, input: SwapPreferencesInput): Promise<SwapPreferences> {
  const { data, error } = await createClient()
    .from('swap_preferences')
    .upsert(preferencesToRow(userId, input), { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error || !data) throw error ?? new Error('Kunde inte spara din sökprofil.')
  return rowToPreferences(data as PreferencesRow)
}

/** profiles.notify_email — e-mail when you get a new message. */
export async function saveNotifyEmail(userId: string, on: boolean): Promise<void> {
  const { error } = await createClient().from('profiles').update({ notify_email: on }).eq('id', userId)
  if (error) throw error
}

// ─── Pending draft (signed out) ───────────────────────────────────────
// Onboarding can be done before creating an account. What was chosen is
// kept in localStorage and saved by fetchMyPreferences() after sign-in.

const PENDING_KEY = 'hyresvagen_pending_preferences'

export interface PendingPreferences {
  preferences?: SwapPreferencesInput
  notifyEmail?: boolean
}

export function savePendingPreferences(draft: PendingPreferences): void {
  try {
    const existing = readPendingPreferences() ?? {}
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ...existing, ...draft }))
  } catch {}
}

export function readPendingPreferences(): PendingPreferences | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingPreferences) : null
  } catch {
    return null
  }
}

function clearPendingPreferences(): void {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {}
}

let syncing: Promise<void> | null = null

/** Saves and clears a pending draft, if any. Safe to call often. */
export function syncPendingPreferences(userId: string): Promise<void> {
  if (!supabaseConfigured || typeof window === 'undefined') return Promise.resolve()
  const draft = readPendingPreferences()
  if (!draft) return Promise.resolve()
  syncing ??= (async () => {
    try {
      if (draft.preferences) await savePreferences(userId, draft.preferences)
      if (draft.notifyEmail !== undefined) await saveNotifyEmail(userId, draft.notifyEmail)
      clearPendingPreferences()
    } catch (err) {
      console.warn('Kunde inte spara sparad sökprofil', err)
    } finally {
      syncing = null
    }
  })()
  return syncing
}
