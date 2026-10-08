// Pure recipient selection for "new listing matches your search" e-mails
// (unit tested; used by src/app/api/notify/listing/route.ts).
import { fitListing, roomBucket, MUTUAL_THRESHOLD } from '@/lib/matching'
import type { Listing, SwapPreferencesInput } from '@/types'

/** At most this many recipients per /api/notify/listing call. */
export const MAX_LISTING_RECIPIENTS = 200

/** Minimum one-sided fit (recipient's swap_preferences vs. the listing). */
export const PREFERENCE_THRESHOLD = MUTUAL_THRESHOLD

export type AlertListing = Pick<
  Listing,
  | 'id'
  | 'userId'
  | 'district'
  | 'rooms'
  | 'rent'
  | 'area'
  | 'elevator'
  | 'balcony'
  | 'petsAllowed'
  | 'wheelchairAccessible'
  | 'strollerFriendly'
>

export interface AlertSavedSearch {
  id: string
  userId: string
  name: string
  districts: string[]
  rooms: number[]
  maxRent: number | null
  notify: boolean
}

export interface AlertPreferences {
  userId: string
  prefs: SwapPreferencesInput
}

export interface ListingRecipient {
  userId: string
  /** Saved searches (names) that matched. */
  searchNames: string[]
  /** Fit against the recipient's swap preferences, when ≥ threshold. */
  score: number | null
  /** Stored in listing_notifications.kind. */
  kind: 'saved_search' | 'preferences' | 'saved_search+preferences'
}

/** BankID accounts get a synthetic address that must never be mailed. */
export function isDeliverableEmail(email: string | null | undefined): email is string {
  if (!email) return false
  const e = email.trim().toLowerCase()
  return e.includes('@') && !e.endsWith('@bytarn.internal')
}

/**
 * Does a listing match a saved search? Empty districts / rooms = any;
 * rooms are bucketed like swap_preferences (floored, 5 = 5 or more).
 */
export function savedSearchMatches(
  listing: Pick<Listing, 'district' | 'rooms' | 'rent'>,
  s: Pick<AlertSavedSearch, 'districts' | 'rooms' | 'maxRent'>
): boolean {
  if (s.districts.length > 0 && !s.districts.includes(listing.district)) return false
  if (s.rooms.length > 0) {
    const bucket = roomBucket(listing.rooms)
    if (!s.rooms.some((r) => Math.min(5, Math.max(1, Math.floor(r))) === bucket)) return false
  }
  if (s.maxRent != null && s.maxRent > 0 && listing.rent > s.maxRent) return false
  return true
}

/**
 * Who to e-mail about a new listing: owners of matching saved searches
 * (notify = true) and users whose swap preferences fit it ≥ threshold.
 * Excludes the listing owner, opted-out and blocked users, and anyone
 * already in listing_notifications for the listing. Strongest matches
 * first, capped at `cap`.
 */
export function selectListingRecipients(input: {
  listing: AlertListing
  savedSearches: AlertSavedSearch[]
  preferences: AlertPreferences[]
  /** notify_matches = false. */
  optedOut?: Set<string>
  /** Blocked by or blocking the owner. */
  blocked?: Set<string>
  /** Already in listing_notifications for this listing. */
  alreadyNotified?: Set<string>
  cap?: number
}): ListingRecipient[] {
  const { listing, cap = MAX_LISTING_RECIPIENTS } = input
  const excluded = (id: string) =>
    id === listing.userId ||
    !!input.optedOut?.has(id) ||
    !!input.blocked?.has(id) ||
    !!input.alreadyNotified?.has(id)

  const byUser = new Map<string, { searchNames: string[]; score: number | null }>()
  const entry = (id: string) => {
    let e = byUser.get(id)
    if (!e) byUser.set(id, (e = { searchNames: [], score: null }))
    return e
  }

  for (const s of input.savedSearches) {
    if (!s.notify || excluded(s.userId)) continue
    if (savedSearchMatches(listing, s)) entry(s.userId).searchNames.push(s.name)
  }
  for (const p of input.preferences) {
    if (excluded(p.userId)) continue
    const fit = fitListing(listing, p.prefs)
    if (fit.score != null && fit.score >= PREFERENCE_THRESHOLD) entry(p.userId).score = fit.score
  }

  return [...byUser.entries()]
    .map(([userId, e]): ListingRecipient => ({
      userId,
      searchNames: e.searchNames,
      score: e.score,
      kind:
        e.searchNames.length > 0 && e.score != null
          ? 'saved_search+preferences'
          : e.searchNames.length > 0
            ? 'saved_search'
            : 'preferences',
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.searchNames.length - a.searchNames.length)
    .slice(0, Math.max(0, cap))
}
