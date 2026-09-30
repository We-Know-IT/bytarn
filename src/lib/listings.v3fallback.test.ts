import { describe, expect, it, vi } from 'vitest'

const updates: Record<string, unknown>[] = []

vi.mock('@/lib/supabase/client', () => ({
  supabaseConfigured: true,
  createClient: () => ({
    from: () => ({
      update: (row: Record<string, unknown>) => ({
        eq: async () => {
          updates.push(row)
          return 'stroller_friendly' in row
            ? { error: { code: 'PGRST204', message: "Could not find the 'stroller_friendly' column of 'listings' in the schema cache" } }
            : { error: null }
        },
      }),
    }),
  }),
}))

const { updateListing } = await import('./listings')

describe('updateListing before migration v3 has run', () => {
  it('retries without the new columns instead of failing', async () => {
    await updateListing('l1', {
      title: 'T', description: '', rooms: 2, rent: 8000, area: 50, district: 'Södermalm',
      address: 'Hornsgatan 1', lat: 59.3, lng: 18.0, images: [], strollerFriendly: true,
    })
    expect(updates).toHaveLength(2)
    expect(updates[1]).not.toHaveProperty('stroller_friendly')
    expect(updates[1]).not.toHaveProperty('wheelchair_accessible')
    expect(updates[1]).toHaveProperty('elevator', false)
  })
})
