// Match scoring ("matchning") — pure functions, no I/O.
//
// A swap only works if it works both ways, so a match has two sides:
//
//   * "Passar dig"      — the viewer's swap_preferences vs. the candidate listing
//   * "Du passar dem"   — the candidate owner's swap_preferences vs. the viewer's
//                          own listing (the best of the viewer's active listings)
//
// fitListing() scores one side, 0–100, with a per-criterion breakdown.
// scoreMatch() combines both sides.
//
// This is NOT the same thing as mutual *interest* (both users clicked
// "Visa intresse", see fetchMutualMatchUserIds in lib/interests.ts). That
// is something people did; this is a computed estimate of how well two
// homes fit what their owners are looking for.
//
// ─── Scoring rules ─────────────────────────────────────────────────────
// Only criteria the user actually specified count towards the score; an
// unspecified criterion is shown as "Alla går bra" and doesn't inflate it.
// If nothing is specified the side is "okänt" (score null), never 100 %.
//
//   criterion   weight  full score              partial                         miss
//   district      30    district in list        —                               not in list (hard)
//   rooms         25    room bucket in list     —                               not in list (hard)
//   rent          20    rent ≤ max_rent         ≤ +10 %: 1.0 → 0.5 linearly      > +10 %
//   area          10    area ≥ min_area         ≥ 80 %: 0.5 → 1.0 linearly       < 80 %
//   amenity ×5     5    listing has it          —                               missing / unknown
//
// Rooms: a listing's (possibly fractional) room count is rounded down, and
// 5 or more falls into the "5" bucket (5 = "5 or more" in swap_preferences).
//
// score = weighted average of the specified criteria, then capped by hard
// misses: one hard miss caps the side at 40, two at 20 — a home in the
// wrong part of town is a poor match however cheap it is.
//
// Combined: both sides known → geometric mean (one weak side drags the
// whole match down); one side known → that side, flagged one-sided.
// "Ömsesidig match" = both sides known and both ≥ MUTUAL_THRESHOLD.

import type { Listing, SwapPreferencesInput } from '@/types'

export const MUTUAL_THRESHOLD = 70
export const RENT_GRACE = 0.1
export const AREA_GRACE = 0.2
const HARD_MISS_CAPS = [100, 40, 20]

export type CriterionKey =
  | 'district'
  | 'rooms'
  | 'rent'
  | 'area'
  | 'elevator'
  | 'balcony'
  | 'pets'
  | 'wheelchair'
  | 'stroller'

/** ok = fully met, partial = close, miss = not met, any = no preference given. */
export type CriterionStatus = 'ok' | 'partial' | 'miss' | 'any'

export interface CriterionResult {
  key: CriterionKey
  label: string
  status: CriterionStatus
  /** 0–1. Always 1 for status 'any'. */
  score: number
  /** Weight in the overall score; 0 for status 'any'. */
  weight: number
  /** True for criteria where a miss caps the score (district, rooms). */
  hard: boolean
  /** Short Swedish explanation, e.g. "Söker 2–3 rum, har 4". */
  detail: string
}

export interface FitResult {
  /** 0–100, or null when no criterion is specified (unknown). */
  score: number | null
  known: boolean
  criteria: CriterionResult[]
  hardMisses: number
}

export interface MatchResult {
  /** The viewer's wishes vs. the candidate listing. null = viewer has no preferences. */
  forViewer: FitResult | null
  /** The owner's wishes vs. the viewer's own listing. null = owner has no preferences or viewer has no listing. */
  forOwner: FitResult | null
  /** Which of the viewer's listings forOwner was computed for. */
  viewerListingId: string | null
  /** Combined 0–100, null when neither side is known. */
  score: number | null
  /** Both sides known and both ≥ MUTUAL_THRESHOLD. */
  mutual: boolean
  /** Which single side the score is based on, when only one is known. */
  oneSided: 'viewer' | 'owner' | null
}

type MatchableListing = Pick<
  Listing,
  | 'id'
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

type MatchablePreferences = SwapPreferencesInput

const WEIGHTS: Record<CriterionKey, number> = {
  district: 30,
  rooms: 25,
  rent: 20,
  area: 10,
  elevator: 5,
  balcony: 5,
  pets: 5,
  wheelchair: 5,
  stroller: 5,
}

const AMENITY_CRITERIA: {
  key: CriterionKey
  pref: keyof MatchablePreferences
  listing: keyof MatchableListing
  label: string
}[] = [
  { key: 'elevator', pref: 'needsElevator', listing: 'elevator', label: 'Hiss' },
  { key: 'balcony', pref: 'needsBalcony', listing: 'balcony', label: 'Balkong' },
  { key: 'pets', pref: 'needsPets', listing: 'petsAllowed', label: 'Husdjur tillåtna' },
  { key: 'wheelchair', pref: 'needsWheelchair', listing: 'wheelchairAccessible', label: 'Rullstolsanpassat' },
  { key: 'stroller', pref: 'needsStroller', listing: 'strollerFriendly', label: 'Barnvagnsanpassat' },
]

const nf = new Intl.NumberFormat('sv-SE')

/** The swap_preferences room bucket a listing falls in: floor, 5 = 5 or more. */
export function roomBucket(rooms: number): number {
  return Math.min(5, Math.max(1, Math.floor(rooms)))
}

export function formatRoomBuckets(rooms: number[]): string {
  const sorted = [...new Set(rooms)].sort((a, b) => a - b).map((r) => (r >= 5 ? '5+' : String(r)))
  if (sorted.length === 0) return 'alla'
  if (sorted.length === 1) return sorted[0]
  return `${sorted.slice(0, -1).join(', ')} eller ${sorted[sorted.length - 1]}`
}

/** True when at least one criterion is specified. */
export function hasAnyPreference(prefs: MatchablePreferences | null | undefined): boolean {
  if (!prefs) return false
  return (
    prefs.districts.length > 0 ||
    prefs.rooms.length > 0 ||
    prefs.maxRent != null ||
    prefs.minArea != null ||
    AMENITY_CRITERIA.some((a) => prefs[a.pref] === true)
  )
}

function noPreference(key: CriterionKey, label: string, hard: boolean): CriterionResult {
  return { key, label, status: 'any', score: 1, weight: 0, hard, detail: 'Alla går bra' }
}

function result(
  key: CriterionKey,
  label: string,
  score: number,
  detail: string,
  hard = false
): CriterionResult {
  const clamped = Math.max(0, Math.min(1, score))
  const status: CriterionStatus = clamped >= 1 ? 'ok' : clamped > 0 ? 'partial' : 'miss'
  return { key, label, status, score: clamped, weight: WEIGHTS[key], hard, detail }
}

function districtCriterion(listing: MatchableListing, prefs: MatchablePreferences): CriterionResult {
  const label = 'Stadsdel'
  if (prefs.districts.length === 0) return noPreference('district', label, true)
  const ok = prefs.districts.includes(listing.district)
  return result(
    'district',
    label,
    ok ? 1 : 0,
    ok ? listing.district : `${listing.district} finns inte bland önskade`,
    true
  )
}

function roomsCriterion(listing: MatchableListing, prefs: MatchablePreferences): CriterionResult {
  const label = 'Rum'
  if (prefs.rooms.length === 0) return noPreference('rooms', label, true)
  const bucket = roomBucket(listing.rooms)
  const ok = prefs.rooms.some((r) => roomBucket(r) === bucket)
  return result(
    'rooms',
    label,
    ok ? 1 : 0,
    ok ? `${listing.rooms} rum` : `Söker ${formatRoomBuckets(prefs.rooms)} rum, har ${listing.rooms}`,
    true
  )
}

function rentCriterion(listing: MatchableListing, prefs: MatchablePreferences): CriterionResult {
  const label = 'Hyra'
  if (prefs.maxRent == null || prefs.maxRent <= 0) return noPreference('rent', label, false)
  const max = prefs.maxRent
  const rentText = `${nf.format(listing.rent)} kr`
  if (listing.rent <= max) return result('rent', label, 1, `${rentText} (max ${nf.format(max)} kr)`)
  const over = (listing.rent - max) / max
  if (over <= RENT_GRACE) {
    return result('rent', label, 1 - 0.5 * (over / RENT_GRACE), `${rentText}, något över max ${nf.format(max)} kr`)
  }
  return result('rent', label, 0, `${rentText}, över max ${nf.format(max)} kr`)
}

function areaCriterion(listing: MatchableListing, prefs: MatchablePreferences): CriterionResult {
  const label = 'Yta'
  if (prefs.minArea == null || prefs.minArea <= 0) return noPreference('area', label, false)
  const min = prefs.minArea
  const areaText = `${listing.area} m²`
  if (listing.area >= min) return result('area', label, 1, `${areaText} (minst ${min} m²)`)
  const ratio = listing.area / min
  if (ratio >= 1 - AREA_GRACE) {
    return result('area', label, 0.5 + 0.5 * ((ratio - (1 - AREA_GRACE)) / AREA_GRACE), `${areaText}, något under ${min} m²`)
  }
  return result('area', label, 0, `${areaText}, under ${min} m²`)
}

function amenityCriteria(listing: MatchableListing, prefs: MatchablePreferences): CriterionResult[] {
  return AMENITY_CRITERIA.map(({ key, pref, listing: field, label }) => {
    if (prefs[pref] !== true) return noPreference(key, label, false)
    const value = listing[field]
    if (value === true) return result(key, label, 1, 'Finns')
    return result(key, label, 0, value === false ? 'Saknas' : 'Uppgift saknas')
  })
}

/** How well a listing fits a set of swap preferences. */
export function fitListing(listing: MatchableListing, prefs: MatchablePreferences | null | undefined): FitResult {
  if (!prefs) return { score: null, known: false, criteria: [], hardMisses: 0 }

  const criteria = [
    districtCriterion(listing, prefs),
    roomsCriterion(listing, prefs),
    rentCriterion(listing, prefs),
    areaCriterion(listing, prefs),
    ...amenityCriteria(listing, prefs),
  ]
  const hardMisses = criteria.filter((c) => c.hard && c.status === 'miss').length
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight === 0) return { score: null, known: false, criteria, hardMisses: 0 }

  const raw = (criteria.reduce((sum, c) => sum + c.weight * c.score, 0) / totalWeight) * 100
  const capped = Math.min(raw, HARD_MISS_CAPS[Math.min(hardMisses, HARD_MISS_CAPS.length - 1)])
  return { score: Math.round(capped), known: true, criteria, hardMisses }
}

export interface MatchInput {
  candidate: MatchableListing
  /** The viewer's swap preferences (null if none saved). */
  viewerPrefs: MatchablePreferences | null | undefined
  /** The candidate owner's swap preferences (null if none saved). */
  ownerPrefs: MatchablePreferences | null | undefined
  /** The viewer's own active listings to offer in return. */
  viewerListings: MatchableListing[]
}

/**
 * Mutual match between the viewer and a candidate listing. For the owner
 * side, the viewer's listing that best fits the owner's wishes is used.
 */
export function scoreMatch({ candidate, viewerPrefs, ownerPrefs, viewerListings }: MatchInput): MatchResult {
  const viewerFit = hasAnyPreference(viewerPrefs) ? fitListing(candidate, viewerPrefs) : null
  const forViewer = viewerFit?.known ? viewerFit : null

  let forOwner: FitResult | null = null
  let viewerListingId: string | null = null
  if (hasAnyPreference(ownerPrefs)) {
    for (const own of viewerListings) {
      if (own.id === candidate.id) continue
      const fit = fitListing(own, ownerPrefs)
      if (fit.score != null && (forOwner?.score == null || fit.score > forOwner.score)) {
        forOwner = fit
        viewerListingId = own.id
      }
    }
  }

  const a = forViewer?.score ?? null
  const b = forOwner?.score ?? null
  let score: number | null = null
  let oneSided: MatchResult['oneSided'] = null
  if (a != null && b != null) score = Math.round(Math.sqrt(a * b))
  else if (a != null) {
    score = a
    oneSided = 'viewer'
  } else if (b != null) {
    score = b
    oneSided = 'owner'
  }

  const mutual = a != null && b != null && a >= MUTUAL_THRESHOLD && b >= MUTUAL_THRESHOLD
  return { forViewer, forOwner, viewerListingId, score, mutual, oneSided }
}

/** Sort comparator: higher score first, unknown last. */
export function compareMatch(a: MatchResult | null | undefined, b: MatchResult | null | undefined): number {
  const sa = a?.score ?? -1
  const sb = b?.score ?? -1
  if (sa !== sb) return sb - sa
  // Tie-break: a mutual match before a one-sided one.
  return Number(b?.mutual ?? false) - Number(a?.mutual ?? false)
}
