import { NextResponse, type NextRequest } from 'next/server'
import { buildOverpassQuery, parseOverpass } from '@/lib/neighborhood'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

// Greater Stockholm, with margin. Keeps this from being a general-purpose
// Overpass proxy.
const BOUNDS = { minLat: 58.6, maxLat: 60.3, minLng: 17.0, maxLng: 19.6 }

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get('lat'))
  const lng = Number(request.nextUrl.searchParams.get('lng'))
  if (
    !Number.isFinite(lat) || !Number.isFinite(lng) ||
    lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng
  ) {
    return NextResponse.json({ error: 'Adressen måste ligga i Stockholmsområdet.' }, { status: 400 })
  }

  // ~100 m grid, so nearby addresses share one cached Overpass response.
  const rLat = Math.round(lat * 1000) / 1000
  const rLng = Math.round(lng * 1000) / 1000
  const query = encodeURIComponent(buildOverpassQuery(rLat, rLng))

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(`${endpoint}?data=${query}`, {
        headers: { 'User-Agent': 'Bytaren/1.0 (bostadsbyte i Stockholm)' },
        signal: AbortSignal.timeout(20_000),
        next: { revalidate: 60 * 60 * 24 },
      })
      if (!res.ok) continue
      const json = await res.json()
      return NextResponse.json(parseOverpass(json.elements ?? [], lat, lng), {
        headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
      })
    } catch {
      // try the next mirror
    }
  }
  return NextResponse.json({ error: 'Kunde inte hämta information om området just nu.' }, { status: 502 })
}
