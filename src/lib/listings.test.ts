import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeListingError, geocodeAddress, isExpired, rowToListing, type ListingRow } from './listings'

describe('isExpired', () => {
  it('compares expiresAt against now', () => {
    expect(isExpired({ expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(true)
    expect(isExpired({ expiresAt: new Date(Date.now() + 60_000).toISOString() })).toBe(false)
  })
})

describe('rowToListing', () => {
  const base = {
    id: 'l1', title: 'T', description: '', rooms: 2, rent: 8000, area: 50, district: 'Södermalm',
    address: 'Hornsgatan 1', lat: 59.3, lng: 18.0, images: [], status: 'aktiv', floor: null,
    elevator: null, balcony: null, furnished: null, pets_allowed: null, video_url: null, view_count: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', user_id: 'u1', profiles: null,
  }

  it('derives an expiry from updated_at when the column is missing (schema not migrated)', () => {
    const l = rowToListing({ ...base, expires_at: null } as ListingRow)
    expect(l.expiresAt).toBe('2026-03-02T00:00:00.000Z')
    expect(l.viewCount).toBe(0)
    expect(l.videoUrl).toBeUndefined()
  })

  it('maps video and views', () => {
    const l = rowToListing({ ...base, expires_at: '2026-05-01T00:00:00Z', video_url: 'v.mp4', view_count: 7 } as ListingRow)
    expect(l.videoUrl).toBe('v.mp4')
    expect(l.viewCount).toBe(7)
  })
})

describe('describeListingError', () => {
  it('explains RLS and foreign-key failures in Swedish', () => {
    expect(describeListingError({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(/behörighet/)
    expect(describeListingError({ code: '23503', message: 'fk' })).toMatch(/profil/)
  })

  it('points at the schema when a column is missing', () => {
    expect(describeListingError({ code: 'PGRST204', message: "Could not find the 'video_url' column" })).toMatch(/schema\.sql/)
  })

  it('recognises a missing storage bucket', () => {
    expect(describeListingError({ message: 'Bucket not found' })).toMatch(/Lagringsutrymmet/)
  })

  it('falls back to the original message', () => {
    expect(describeListingError(new Error('Något annat'))).toBe('Något annat')
  })
})

describe('geocodeAddress', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the geocoder result when found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ lat: '59.31', lon: '18.07' }]))))
    expect(await geocodeAddress('Hornsgatan 45', 'Södermalm')).toEqual({ lat: 59.31, lng: 18.07, exact: true })
  })

  it('falls back to the district centre when the address is unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')))
    const r = await geocodeAddress('Påhittad gata 1', 'Solna')
    expect(r).toMatchObject({ exact: false })
    expect(r?.lat).toBeCloseTo(59.36, 1)
  })

  it('returns null with neither a match nor a known district', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await geocodeAddress('x', 'Okänd')).toBeNull()
  })
})
