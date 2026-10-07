import { describe, expect, it } from 'vitest'
import { compareMatch, fitListing, formatRoomBuckets, hasAnyPreference, roomBucket, scoreMatch, MUTUAL_THRESHOLD } from './matching'
import { EMPTY_SWAP_PREFERENCES, type SwapPreferencesInput } from '@/types'

const listing = (over: Partial<Parameters<typeof fitListing>[0]> = {}) => ({
  id: 'l1',
  district: 'Södermalm',
  rooms: 2,
  rent: 8000,
  area: 55,
  elevator: true,
  balcony: false,
  petsAllowed: true,
  wheelchairAccessible: false,
  strollerFriendly: undefined,
  ...over,
})

const prefs = (over: Partial<SwapPreferencesInput> = {}): SwapPreferencesInput => ({ ...EMPTY_SWAP_PREFERENCES, ...over })

const crit = (fit: ReturnType<typeof fitListing>, key: string) => fit.criteria.find((c) => c.key === key)!

describe('roomBucket / formatRoomBuckets', () => {
  it('rounds down and caps at 5', () => {
    expect(roomBucket(2.5)).toBe(2)
    expect(roomBucket(1)).toBe(1)
    expect(roomBucket(5)).toBe(5)
    expect(roomBucket(7)).toBe(5)
    expect(roomBucket(0.5)).toBe(1)
  })
  it('formats buckets in Swedish', () => {
    expect(formatRoomBuckets([3, 2])).toBe('2 eller 3')
    expect(formatRoomBuckets([1, 2, 5])).toBe('1, 2 eller 5+')
    expect(formatRoomBuckets([])).toBe('alla')
  })
})

describe('hasAnyPreference', () => {
  it('is false for null and empty preferences', () => {
    expect(hasAnyPreference(null)).toBe(false)
    expect(hasAnyPreference(prefs())).toBe(false)
  })
  it('is true when any criterion is set', () => {
    expect(hasAnyPreference(prefs({ districts: ['Solna'] }))).toBe(true)
    expect(hasAnyPreference(prefs({ maxRent: 9000 }))).toBe(true)
    expect(hasAnyPreference(prefs({ needsBalcony: true }))).toBe(true)
  })
})

describe('fitListing', () => {
  it('is unknown (not 100 %) without preferences', () => {
    expect(fitListing(listing(), null)).toMatchObject({ score: null, known: false })
    const empty = fitListing(listing(), prefs())
    expect(empty.score).toBeNull()
    expect(empty.known).toBe(false)
    expect(empty.criteria.every((c) => c.status === 'any')).toBe(true)
  })

  it('scores 100 when every specified criterion is met', () => {
    const fit = fitListing(listing(), prefs({ districts: ['Södermalm'], rooms: [2, 3], maxRent: 9000, minArea: 50, needsElevator: true }))
    expect(fit.score).toBe(100)
    expect(fit.hardMisses).toBe(0)
    expect(crit(fit, 'balcony').status).toBe('any')
  })

  it('ignores unspecified criteria rather than counting them as met', () => {
    // Only rent specified and badly missed → 0, not inflated by "any" criteria.
    const fit = fitListing(listing({ rent: 20000 }), prefs({ maxRent: 9000 }))
    expect(fit.score).toBe(0)
  })

  it('treats room counts by bucket: 2.5 is 2, 6 is 5+', () => {
    expect(crit(fitListing(listing({ rooms: 2.5 }), prefs({ rooms: [2] })), 'rooms').status).toBe('ok')
    expect(crit(fitListing(listing({ rooms: 6 }), prefs({ rooms: [5] })), 'rooms').status).toBe('ok')
    expect(crit(fitListing(listing({ rooms: 4 }), prefs({ rooms: [5] })), 'rooms').status).toBe('miss')
  })

  it('caps the score on hard misses (district, rooms)', () => {
    const p = prefs({ districts: ['Vasastan'], maxRent: 9000, minArea: 50, needsElevator: true })
    const one = fitListing(listing(), p)
    expect(one.hardMisses).toBe(1)
    expect(one.score).toBe(40)

    const two = fitListing(listing(), { ...p, rooms: [4] })
    expect(two.hardMisses).toBe(2)
    expect(two.score).toBe(20)
  })

  it('applies hard-miss caps below the raw average too', () => {
    const fit = fitListing(listing(), prefs({ districts: ['Vasastan'], rooms: [2] }))
    // raw = 25/55 ≈ 45 → capped at 40
    expect(fit.score).toBe(40)
    const worse = fitListing(listing({ rent: 20000 }), prefs({ districts: ['Vasastan'], maxRent: 9000 }))
    expect(worse.score).toBe(0)
  })

  it('gives partial rent credit up to +10 %', () => {
    const p = prefs({ maxRent: 10000 })
    expect(crit(fitListing(listing({ rent: 10000 }), p), 'rent').score).toBe(1)
    const at5 = crit(fitListing(listing({ rent: 10500 }), p), 'rent')
    expect(at5.status).toBe('partial')
    expect(at5.score).toBeCloseTo(0.75)
    expect(crit(fitListing(listing({ rent: 11000 }), p), 'rent').score).toBeCloseTo(0.5)
    expect(crit(fitListing(listing({ rent: 11001 }), p), 'rent').status).toBe('miss')
  })

  it('gives partial area credit down to 80 %', () => {
    const p = prefs({ minArea: 50 })
    expect(crit(fitListing(listing({ area: 60 }), p), 'area').status).toBe('ok')
    const at90 = crit(fitListing(listing({ area: 45 }), p), 'area')
    expect(at90.status).toBe('partial')
    expect(at90.score).toBeCloseTo(0.75)
    expect(crit(fitListing(listing({ area: 39 }), p), 'area').status).toBe('miss')
  })

  it('checks required amenities, unknown counts as missing', () => {
    const fit = fitListing(listing(), prefs({ needsElevator: true, needsBalcony: true, needsStroller: true }))
    expect(crit(fit, 'elevator').status).toBe('ok')
    expect(crit(fit, 'balcony')).toMatchObject({ status: 'miss', detail: 'Saknas' })
    expect(crit(fit, 'stroller')).toMatchObject({ status: 'miss', detail: 'Uppgift saknas' })
    expect(fit.score).toBe(33)
    expect(fit.hardMisses).toBe(0)
  })

  it('weights district and rooms more than amenities', () => {
    const p = prefs({ districts: ['Södermalm'], rooms: [2], needsBalcony: true })
    // 55 of 60 weight met
    expect(fitListing(listing(), p).score).toBe(92)
  })
})

describe('scoreMatch', () => {
  const candidate = listing({ id: 'c', district: 'Södermalm', rooms: 3, rent: 9000, area: 70 })
  const mine = listing({ id: 'm1', district: 'Solna', rooms: 2, rent: 7000, area: 50 })
  const mine2 = listing({ id: 'm2', district: 'Vasastan', rooms: 2, rent: 7500, area: 52 })
  const viewerPrefs = prefs({ districts: ['Södermalm'], rooms: [3] })
  const ownerPrefs = prefs({ districts: ['Vasastan', 'Kungsholmen'], rooms: [2] })

  it('combines both sides and flags a mutual match', () => {
    const m = scoreMatch({ candidate, viewerPrefs, ownerPrefs, viewerListings: [mine, mine2] })
    expect(m.forViewer?.score).toBe(100)
    expect(m.forOwner?.score).toBe(100)
    expect(m.viewerListingId).toBe('m2') // the best of the viewer's listings
    expect(m.score).toBe(100)
    expect(m.mutual).toBe(true)
    expect(m.oneSided).toBeNull()
  })

  it('uses the geometric mean so one weak side pulls it down', () => {
    const m = scoreMatch({ candidate, viewerPrefs, ownerPrefs, viewerListings: [mine] })
    expect(m.forOwner?.score).toBe(40)
    expect(m.score).toBe(Math.round(Math.sqrt(100 * 40)))
    expect(m.mutual).toBe(false)
  })

  it('falls back to a one-sided score when the owner has no preferences', () => {
    const m = scoreMatch({ candidate, viewerPrefs, ownerPrefs: null, viewerListings: [mine] })
    expect(m).toMatchObject({ score: 100, oneSided: 'viewer', mutual: false, forOwner: null })
  })

  it('falls back to the owner side when the viewer has no preferences', () => {
    const m = scoreMatch({ candidate, viewerPrefs: prefs(), ownerPrefs, viewerListings: [mine2] })
    expect(m).toMatchObject({ score: 100, oneSided: 'owner', mutual: false, forViewer: null })
  })

  it('has no owner side when the viewer has no listing', () => {
    const m = scoreMatch({ candidate, viewerPrefs, ownerPrefs, viewerListings: [] })
    expect(m.forOwner).toBeNull()
    expect(m.oneSided).toBe('viewer')
  })

  it('is unknown when neither side has data', () => {
    const m = scoreMatch({ candidate, viewerPrefs: null, ownerPrefs: null, viewerListings: [mine] })
    expect(m).toMatchObject({ score: null, mutual: false, oneSided: null })
  })

  it('never scores the candidate against itself', () => {
    const m = scoreMatch({ candidate, viewerPrefs: null, ownerPrefs: prefs({ districts: ['Södermalm'] }), viewerListings: [candidate] })
    expect(m.forOwner).toBeNull()
  })

  it('requires both sides at the threshold for mutual', () => {
    const justBelow = prefs({ districts: ['Södermalm'], rooms: [3], maxRent: 8500 }) // rent 9000 is +5.9 %
    const m = scoreMatch({ candidate, viewerPrefs: justBelow, ownerPrefs, viewerListings: [mine2] })
    expect(m.forViewer!.score!).toBeGreaterThanOrEqual(MUTUAL_THRESHOLD)
    expect(m.mutual).toBe(true)
  })
})

describe('compareMatch', () => {
  it('sorts by score, unknown last, mutual first on ties', () => {
    const base = { forViewer: null, forOwner: null, viewerListingId: null, oneSided: null }
    const a = { ...base, score: 80, mutual: false }
    const b = { ...base, score: 80, mutual: true }
    const c = { ...base, score: null, mutual: false }
    const d = { ...base, score: 95, mutual: false }
    expect([a, c, b, d].sort(compareMatch)).toEqual([d, b, a, c])
    expect(compareMatch(null, c)).toBe(0)
    expect([a, b].sort(compareMatch)[0]).toBe(b)
  })
})
