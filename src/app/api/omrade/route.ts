import { NextResponse, type NextRequest } from 'next/server'
import { buildOverpassQuery, parseOverpass } from '@/lib/neighborhood'

// Public Overpass instances. The main one often rate-limits shared cloud
// IPs (429) or is slow, so all are asked at once and the first answer wins.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const PER_ENDPOINT_TIMEOUT_MS = 9_000

// Room for the slowest mirror before Vercel stops the function.
export const maxDuration = 20

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

  const ask = async (endpoint: string) => {
    const res = await fetch(`${endpoint}?data=${query}`, {
      headers: { 'User-Agent': 'Hyresvagen/1.0 (bostadsbyte i Stockholm; https://xn--hyresvgen-02a.se)' },
      signal: AbortSignal.timeout(PER_ENDPOINT_TIMEOUT_MS),
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`)
    const json = (await res.json()) as { elements?: unknown[] }
    if (!Array.isArray(json.elements)) throw new Error(`${endpoint}: unexpected response`)
    return json.elements
  }

  try {
    const elements = await Promise.any(OVERPASS_ENDPOINTS.map(ask))
    return NextResponse.json(parseOverpass(elements as Parameters<typeof parseOverpass>[0], lat, lng), {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (err) {
    const reasons = err instanceof AggregateError ? err.errors.map((e) => String(e?.message ?? e)) : [String(err)]
    console.error('Overpass misslyckades', reasons)
    return NextResponse.json({ error: 'Kunde inte hämta information om området just nu.' }, { status: 502 })
  }
}
