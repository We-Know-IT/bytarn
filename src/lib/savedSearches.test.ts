import { describe, expect, it } from 'vitest'
import { parseLocalSearches, rowToSavedSearch, savedSearchHref, savedSearchToRow } from './savedSearches'

describe('savedSearches', () => {
  it('maps rows, defaulting notify to true', () => {
    const s = rowToSavedSearch({ id: '1', user_id: 'u', name: 'A', districts: null, rooms: [2], max_rent: 9000, created_at: 't' })
    expect(s).toEqual({ id: '1', name: 'A', filters: { districts: [], rooms: [2], maxRent: 9000, amenities: [] }, notify: true, createdAt: 't' })
    expect(rowToSavedSearch({ id: '1', user_id: 'u', name: 'A', districts: [], rooms: [], max_rent: null, notify: false, created_at: 't' }).notify).toBe(false)
  })

  it('normalises filters for the database', () => {
    expect(savedSearchToRow('u', '  ', { districts: ['A', 'A'], rooms: [7, 2, 2.5], maxRent: 0, amenities: [] })).toMatchObject({
      user_id: 'u',
      districts: ['A'],
      rooms: [2, 5],
      max_rent: null,
    })
    expect(savedSearchToRow('u', 'Min', { districts: [], rooms: [], maxRent: 9000.4, amenities: [] })).toMatchObject({ name: 'Min', max_rent: 9000 })
  })

  it('parses localStorage defensively', () => {
    expect(parseLocalSearches(null)).toEqual([])
    expect(parseLocalSearches('nope')).toEqual([])
    expect(parseLocalSearches('{}')).toEqual([])
    const parsed = parseLocalSearches(
      JSON.stringify([{ id: '1', name: 'X', filters: { districts: ['A'], rooms: [1], maxRent: null }, createdAt: 't' }, { bad: true }])
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({ id: '1', local: true, filters: { amenities: [] } })
  })

  it('builds /annonser links', () => {
    expect(savedSearchHref({ districts: [], rooms: [], maxRent: null })).toBe('/annonser')
    expect(savedSearchHref({ districts: ['Södermalm'], rooms: [1, 2], maxRent: 9000 })).toBe('/annonser?omrade=S%C3%B6dermalm&rum=1%2C2&maxhyra=9000')
  })
})
