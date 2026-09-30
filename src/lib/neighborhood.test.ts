import { describe, expect, it } from 'vitest'
import { buildOverpassQuery, describeNeighborhood, parseOverpass, titlePhrase, walkMinutes } from './neighborhood'

// Götgatan ~ Medborgarplatsen
const LAT = 59.3143
const LNG = 18.0735

const elements = [
  { lat: 59.3146, lon: 18.0736, tags: { railway: 'station', station: 'subway', name: 'Medborgarplatsen' } },
  { lat: 59.3147, lon: 18.0737, tags: { railway: 'station', station: 'subway', name: 'Medborgarplatsen' } },
  { lat: 59.3079, lon: 18.0762, tags: { railway: 'station', station: 'subway', name: 'Skanstull' } },
  { lat: 59.3195, lon: 18.0718, tags: { railway: 'station', station: 'subway', name: 'Slussen' } },
  { lat: 59.3122, lon: 18.0808, tags: { railway: 'station', station: 'light_rail', name: 'Spårvagnshållplats' } },
  { center: { lat: 59.3131, lon: 18.0808 }, tags: { leisure: 'park', name: 'Nytorget' } },
  { center: { lat: 59.3155, lon: 18.0740 }, tags: { leisure: 'park', name: 'Medborgarplatsen park' } },
  { center: { lat: 59.3159, lon: 18.0835 }, tags: { leisure: 'park' } },
  { center: { lat: 59.3120, lon: 18.0760 }, tags: { amenity: 'school', name: 'Katarina Södra skola' } },
  { center: { lat: 59.3139, lon: 18.0741 }, tags: { amenity: 'kindergarten' } },
  { center: { lat: 59.3134, lon: 18.0721 }, tags: { amenity: 'kindergarten', name: 'Förskolan Solen' } },
  { lat: 59.3141, lon: 18.0730, tags: { shop: 'supermarket', name: 'ICA Nära Götgatan' } },
]

describe('parseOverpass', () => {
  const n = parseOverpass(elements, LAT, LNG)

  it('keeps the two nearest unique subway stations', () => {
    expect(n.subway.map((s) => s.name)).toEqual(['Medborgarplatsen', 'Slussen'])
  })

  it('ignores light rail and unnamed parks, counts preschools', () => {
    expect(n.train).toEqual([])
    expect(n.parks.map((p) => p.name)).toEqual(['Medborgarplatsen park', 'Nytorget'])
    expect(n.preschools).toBe(2)
    expect(n.groceries[0].name).toBe('ICA Nära Götgatan')
  })
})

describe('describeNeighborhood', () => {
  it('writes factual sentences from real places only', () => {
    const text = describeNeighborhood(parseOverpass(elements, LAT, LNG)).join(' ')
    expect(text).toContain('Närmaste tunnelbana är Medborgarplatsen, ca 1 min promenad, och Slussen ligger ca')
    expect(text).toContain('grönområden som Medborgarplatsen park och Nytorget')
    expect(text).toContain('skolor som Katarina Södra skola och 2 förskolor')
    expect(text).toContain('Mataffär: ICA Nära Götgatan')
    expect(text).not.toContain('Pendeltåg')
  })

  it('says nothing when nothing is nearby', () => {
    expect(describeNeighborhood(parseOverpass([], LAT, LNG))).toEqual([])
  })

  it('drops stations beyond a 15 minute walk', () => {
    const far = [{ lat: LAT + 0.012, lon: LNG, tags: { railway: 'station', station: 'subway', name: 'Långt bort' } }]
    expect(describeNeighborhood(parseOverpass(far, LAT, LNG))).toEqual([])
  })
})

describe('helpers', () => {
  it('walkMinutes adds a detour factor and never returns 0', () => {
    expect(walkMinutes(10)).toBe(1)
    expect(walkMinutes(800)).toBe(13)
  })

  it('titlePhrase prefers a nearby T-bana', () => {
    expect(titlePhrase(parseOverpass(elements, LAT, LNG))).toBe('nära Medborgarplatsen T-bana')
  })

  it('builds a query around the given point', () => {
    expect(buildOverpassQuery(59.3, 18.07)).toContain('node(around:1500,59.3,18.07)[railway=station]')
  })
})
