import { describe, expect, it } from 'vitest'
import type { SwapPreferences } from '@/types'
import type { Neighborhood } from './neighborhood'
import { roomsLabel, streetAddress, suggestDescription, suggestTitle, type SuggestionInput } from './listingSuggestion'

const form: SuggestionInput = {
  rooms: '3', area: '75', rent: '10000', floor: '3', district: 'Södermalm', address: 'Hornsgatan 45, 118 49 Stockholm',
  elevator: true, balcony: true, strollerFriendly: true, wheelchairAccessible: false,
}

const area: Neighborhood = {
  subway: [{ name: 'Mariatorget', distanceM: 250 }],
  train: [],
  parks: [{ name: 'Mariatorget', distanceM: 200 }],
  schools: [],
  preschools: 0,
  groceries: [],
}

const prefs: SwapPreferences = {
  userId: 'u', districts: ['Kungsholmen', 'Vasastan'], rooms: [2, 3], maxRent: 11000, minArea: null,
  needsElevator: false, needsBalcony: true, needsPets: false, needsWheelchair: false, needsStroller: false,
}

describe('helpers', () => {
  it('shortens the address and labels rooms', () => {
    expect(streetAddress('Hornsgatan 45, 118 49 Stockholm')).toBe('Hornsgatan 45')
    expect(roomsLabel('3')).toBe('3:a')
    expect(roomsLabel(2.5)).toBe('2,5:a')
  })
})

describe('suggestTitle', () => {
  it('uses the right preposition and a nearby station', () => {
    expect(suggestTitle(form, area)).toBe('3:a med balkong på Södermalm nära Mariatorget T-bana')
    expect(suggestTitle({ ...form, district: 'Vasastan', balcony: false }, null)).toBe('3:a i Vasastan, 75 m²')
  })
})

describe('suggestDescription', () => {
  it('describes the home, the area and what the user is looking for', () => {
    const text = suggestDescription(form, area, prefs)
    const [home, about, wish] = text.split('\n\n')
    expect(home).toBe(
      '3-rumslägenhet på 75 m² på Hornsgatan 45 på Södermalm. Lägenheten ligger på våning 3 och det finns hiss. Balkong finns. Bostaden är barnvagnsanpassad. Hyran är 10 000 kr/mån.'
    )
    expect(about).toMatch(/^Om området: Södermalm är en av Stockholms mest levande stadsdelar/)
    expect(about).toContain('Närmaste tunnelbana är Mariatorget')
    expect(wish).toBe(
      'Jag söker en 2:a eller 3:a på Kungsholmen eller i Vasastan med en hyra på högst 11 000 kr/mån. Det behöver finnas balkong. Hör av dig om du tror att vi kan passa varandra.'
    )
  })

  it('still says something about the area without the nearby-places lookup', () => {
    const text = suggestDescription(form, null, null)
    expect(text).toContain('Om området: Södermalm är')
    expect(text).toContain('Jag söker byte inom Stockholm.')
  })
})
