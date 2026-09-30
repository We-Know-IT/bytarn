import { haversineKm } from '@/lib/utils'

// Real places near a listing, from OpenStreetMap via the Overpass API. Used
// by "Föreslå" so the suggested text names actual stations, parks and shops
// instead of inventing them.

export interface NearbyPlace {
  name: string
  distanceM: number
}

export interface Neighborhood {
  subway: NearbyPlace[]
  train: NearbyPlace[]
  parks: NearbyPlace[]
  schools: NearbyPlace[]
  preschools: number
  groceries: NearbyPlace[]
}

interface OverpassElement {
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function buildOverpassQuery(lat: number, lng: number): string {
  const at = (r: number) => `(around:${r},${lat},${lng})`
  return `[out:json][timeout:20];
(
  node${at(1500)}[railway=station];
  nwr${at(900)}[leisure=park][name];
  nwr${at(900)}[amenity=school][name];
  nwr${at(700)}[amenity=kindergarten];
  nwr${at(700)}[shop=supermarket][name];
);
out center tags;`
}

type Kind = 'subway' | 'train' | 'park' | 'school' | 'preschool' | 'grocery'

function kindOf(tags: Record<string, string>): Kind | null {
  if (tags.railway === 'station') {
    if (tags.station === 'subway' || tags.subway === 'yes') return 'subway'
    // Tram/light rail and museum lines aren't what people mean by "tåg".
    if (tags.station === 'light_rail' || tags.station === 'tram' || tags.usage === 'tourism') return null
    return 'train'
  }
  if (tags.leisure === 'park') return 'park'
  if (tags.amenity === 'school') return 'school'
  if (tags.amenity === 'kindergarten') return 'preschool'
  if (tags.shop === 'supermarket') return 'grocery'
  return null
}

// Keeps the closest place per name (a station or park is often several
// OSM objects), sorted by distance.
function nearestUnique(places: NearbyPlace[], limit: number): NearbyPlace[] {
  const byName = new Map<string, NearbyPlace>()
  for (const p of places) {
    const prev = byName.get(p.name)
    if (!prev || p.distanceM < prev.distanceM) byName.set(p.name, p)
  }
  return [...byName.values()].sort((a, b) => a.distanceM - b.distanceM).slice(0, limit)
}

export function parseOverpass(elements: OverpassElement[], lat: number, lng: number): Neighborhood {
  const buckets: Record<Kind, NearbyPlace[]> = {
    subway: [], train: [], park: [], school: [], preschool: [], grocery: [],
  }
  for (const el of elements) {
    const tags = el.tags ?? {}
    const kind = kindOf(tags)
    const pLat = el.lat ?? el.center?.lat
    const pLng = el.lon ?? el.center?.lon
    if (!kind || pLat == null || pLng == null) continue
    const name = (tags.name ?? '').trim()
    if (!name && kind !== 'preschool') continue
    buckets[kind].push({ name, distanceM: Math.round(haversineKm(lat, lng, pLat, pLng) * 1000) })
  }
  return {
    subway: nearestUnique(buckets.subway, 2),
    train: nearestUnique(buckets.train, 1),
    parks: nearestUnique(buckets.park, 2),
    schools: nearestUnique(buckets.school, 2),
    preschools: buckets.preschool.length,
    groceries: nearestUnique(buckets.grocery, 1),
  }
}

// Straight-line distance × 1.3 for street detours, at ~80 m per minute.
export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round((distanceM * 1.3) / 80))
}

const WALK_LIMIT_MIN = 15

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`
}

export function describeNeighborhood(n: Neighborhood): string[] {
  const sentences: string[] = []
  const subway = n.subway.filter((s) => walkMinutes(s.distanceM) <= WALK_LIMIT_MIN)
  if (subway.length > 0) {
    const [first, second] = subway
    let s = `Närmaste tunnelbana är ${first.name}, ca ${walkMinutes(first.distanceM)} min promenad`
    if (second) s += `, och ${second.name} ligger ca ${walkMinutes(second.distanceM)} min bort`
    sentences.push(`${s}.`)
  }
  const train = n.train.find((t) => walkMinutes(t.distanceM) <= WALK_LIMIT_MIN)
  if (train) sentences.push(`Pendeltåg/tåg från ${train.name}, ca ${walkMinutes(train.distanceM)} min bort.`)
  if (n.parks.length > 0) sentences.push(`Nära till grönområden som ${joinNames(n.parks.map((p) => p.name))}.`)
  if (n.schools.length > 0 || n.preschools > 0) {
    const parts: string[] = []
    if (n.schools.length > 0) parts.push(`skolor som ${joinNames(n.schools.map((s) => s.name))}`)
    if (n.preschools > 0) parts.push(n.preschools === 1 ? 'en förskola' : `${n.preschools} förskolor`)
    sentences.push(`I närheten finns ${parts.join(' och ')}.`)
  }
  const grocery = n.groceries[0]
  if (grocery) sentences.push(`Mataffär: ${grocery.name}, ca ${walkMinutes(grocery.distanceM)} min promenad.`)
  return sentences
}

// Short phrase for a title, e.g. "nära Medborgarplatsen T-bana".
export function titlePhrase(n: Neighborhood): string | null {
  const subway = n.subway.find((s) => walkMinutes(s.distanceM) <= 10)
  if (subway) return `nära ${subway.name} T-bana`
  const park = n.parks.find((p) => walkMinutes(p.distanceM) <= 5)
  if (park) return `vid ${park.name}`
  return null
}

export async function fetchNeighborhood(lat: number, lng: number): Promise<Neighborhood> {
  const res = await fetch(`/api/omrade?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`)
  return res.json()
}
