'use client'

import { useState, useMemo, useEffect, useRef, useCallback, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { fetchListings, fetchMyListings, describeListingError, isExpired } from '@/lib/listings'
import { fetchMyPreferences, fetchPreferencesFor } from '@/lib/preferences'
import { scoreMatch, compareMatch, hasAnyPreference, roomBucket, type MatchResult } from '@/lib/matching'
import { fetchFavoriteListingIds } from '@/lib/favorites'
import { fetchMutualMatchUserIds } from '@/lib/interests'
import { fetchMyBlockedIds } from '@/lib/blocks'
import { useAuth } from '@/context/AuthContext'
import { useHomeLocation } from '@/lib/useHomeLocation'
import SearchFiltersComponent from '@/components/SearchFilters'
import ListingCard from '@/components/ListingCard'
import AdSlot from '@/components/AdSlot'
import { isInBounds, type MapBounds } from '@/components/map/bounds'
import { STOCKHOLM_DISTRICTS, AMENITIES, type AmenityKey, type Listing, type SearchFilters, type SwapPreferences } from '@/types'
import { cn, haversineKm } from '@/lib/utils'
import { Home, List, Map as MapIcon } from 'lucide-react'

const AD_FIRST = 4
const AD_EVERY = 8

const ListingMap = dynamic(() => import('@/components/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Laddar karta...</span>
    </div>
  ),
})

export default function AnnonserPage() {
  return (
    <Suspense>
      <AnnonserView />
    </Suspense>
  )
}

// ?omrade=… comes from the home page search; it pre-selects a district
// when the text matches one (case-insensitive, partial match allowed).
function districtsFromQuery(q: string | null): string[] {
  const needle = q?.trim().toLowerCase()
  if (!needle) return []
  return STOCKHOLM_DISTRICTS.filter((d) => d.toLowerCase().includes(needle))
}

// Quick filters from the home page: ?rum=1,2  ?maxhyra=10000  ?tillganglighet=hiss,barnvagn
function roomsFromQuery(q: string | null): number[] {
  return (q ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0)
}

function maxRentFromQuery(q: string | null): number | null {
  const n = Number(q)
  return q && Number.isFinite(n) && n > 0 ? n : null
}

function amenitiesFromQuery(q: string | null): AmenityKey[] {
  const wanted = (q ?? '').split(',')
  return AMENITIES.filter((a) => wanted.includes(a.query)).map((a) => a.key)
}

function AnnonserView() {
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    districts: districtsFromQuery(searchParams.get('omrade')),
    rooms: roomsFromQuery(searchParams.get('rum')),
    maxRent: maxRentFromQuery(searchParams.get('maxhyra')),
    amenities: amenitiesFromQuery(searchParams.get('tillganglighet')),
    view: searchParams.get('vy') === 'karta' ? 'map' : 'list',
    sort: searchParams.get('sortera') === 'match' ? 'best_match' : 'newest',
  }))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  // Owners who showed interest in one of my listings and vice versa
  // (lib/interests) — not the same as the computed match score below.
  const [interestMatchOwnerIds, setInterestMatchOwnerIds] = useState<Set<string>>(new Set())
  // Matching (lib/matching): my wishes, my listings, and listing owners' wishes.
  // undefined = not loaded yet.
  const [myPrefs, setMyPrefs] = useState<SwapPreferences | null | undefined>(undefined)
  const [myListings, setMyListings] = useState<Listing[]>([])
  const [ownerPrefs, setOwnerPrefs] = useState<Map<string, SwapPreferences>>(new Map())
  const [searchInBounds, setSearchInBounds] = useState(true)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  // Phones only: the map is full-width and the list is an overlay toggled
  // by a floating button (there's no room for a side-by-side split).
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Owners I've blocked — their listings are hidden (keyed by my user id).
  const [blocks, setBlocks] = useState<{ userId: string; ids: Set<string> } | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const { user } = useAuth()
  const home = useHomeLocation()
  const homeLat = home?.lat
  const homeLng = home?.lng

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .catch((err) => setLoadError(describeListingError(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    fetchFavoriteListingIds(user.id).then(setFavoriteIds)
    fetchMutualMatchUserIds(user.id).then(setInterestMatchOwnerIds)
    fetchMyPreferences(user.id).then(setMyPrefs)
    fetchMyListings(user.id).then(setMyListings)
    const uid = user.id
    fetchMyBlockedIds(uid).then((ids) => setBlocks({ userId: uid, ids }))
  }, [user])

  // One query for the wishes of every listing owner in the feed.
  const userId = user?.id
  const blockedOwnerIds = userId && blocks?.userId === userId ? blocks.ids : null
  const ownerIdsKey = useMemo(
    () => [...new Set(listings.map((l) => l.userId))].filter((id) => id !== userId).sort().join(','),
    [listings, userId]
  )
  useEffect(() => {
    if (!userId || !ownerIdsKey) return
    fetchPreferencesFor(ownerIdsKey.split(',')).then(setOwnerPrefs)
  }, [userId, ownerIdsKey])

  // Match score per listing id; empty when signed out. Your own listings
  // (and ones you co-manage) aren't scored.
  const matches = useMemo(() => {
    const result = new Map<string, MatchResult>()
    if (!userId) return result
    const offered = myListings.filter((l) => l.status === 'aktiv' && !isExpired(l))
    const managedIds = new Set(myListings.map((l) => l.id))
    for (const l of listings) {
      if (l.userId === userId || managedIds.has(l.id)) continue
      const m = scoreMatch({ candidate: l, viewerPrefs: myPrefs, ownerPrefs: ownerPrefs.get(l.userId), viewerListings: offered })
      if (m.score != null) result.set(l.id, m)
    }
    return result
  }, [userId, listings, myListings, myPrefs, ownerPrefs])

  const bestMatchHint: 'signed_out' | 'no_preferences' | null = !user
    ? 'signed_out'
    : myPrefs !== undefined && !hasAnyPreference(myPrefs)
      ? 'no_preferences'
      : null

  const filtered = useMemo(() => {
    const results = listings.filter((l) => {
      if (l.status !== 'aktiv') return false
      if (blockedOwnerIds?.has(l.userId)) return false
      if (filters.districts.length > 0 && !filters.districts.includes(l.district)) return false
      // 5 = "5 or more"; 2.5 rooms counts as 2.
      if (filters.rooms.length > 0 && !filters.rooms.includes(roomBucket(l.rooms))) return false
      if (filters.maxRent !== null && l.rent > filters.maxRent) return false
      if (filters.amenities?.some((a) => !l[a])) return false
      return true
    })

    const newest = (a: Listing, b: Listing) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return [...results].sort((a, b) => {
      switch (filters.sort) {
        case 'rent_asc': return a.rent - b.rent
        case 'rent_desc': return b.rent - a.rent
        case 'best_match': return compareMatch(matches.get(a.id), matches.get(b.id)) || newest(a, b)
        case 'nearest': {
          // Without a home location there's nothing to measure from —
          // SearchFilters tells the user; we just fall back to newest.
          if (homeLat == null || homeLng == null) return newest(a, b)
          return haversineKm(homeLat, homeLng, a.lat, a.lng) - haversineKm(homeLat, homeLng, b.lat, b.lng)
        }
        default: return newest(a, b)
      }
    })
  }, [filters, listings, homeLat, homeLng, matches, blockedOwnerIds])

  // The map always gets every filtered listing; only the sidebar is narrowed
  // to what's currently visible when "Sök när kartan flyttas" is on.
  const visible = useMemo(
    () => (searchInBounds && mapBounds ? filtered.filter((l) => isInBounds(l, mapBounds)) : filtered),
    [filtered, searchInBounds, mapBounds]
  )

  // Marker click → select and bring the matching card into view.
  const handleMapSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [])

  const isMap = filters.view === 'map'

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {loadError && (
        <div role="alert" className="px-4 py-2.5 bg-red-50 text-red-700 text-sm border-b border-red-100 break-words">
          Kunde inte hämta annonser: {loadError}
        </div>
      )}
      <SearchFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filtered.length}
        nearestAvailable={!!home}
        bestMatchHint={bestMatchHint}
      />

      {!isMap ? (
        /* List view */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((listing, i) => (
                  <Fragment key={listing.id}>
                    <ListingCard
                      listing={listing}
                      favorited={favoriteIds.has(listing.id)}
                      mutualMatch={interestMatchOwnerIds.has(listing.userId)}
                      match={matches.get(listing.id)}
                    />
                    {/* A sponsored card after the 4th listing, then every 8th. */}
                    {(i + 1) % AD_EVERY === AD_FIRST % AD_EVERY && i + 1 >= AD_FIRST && (
                      <AdSlot placement="listing_grid" variant="card" index={Math.floor((i + 1) / AD_EVERY)} />
                    )}
                  </Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Map + list split view (desktop) / full map with list overlay (mobile) */
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 relative min-w-0">
            <ListingMap
              listings={filtered}
              loading={loading}
              selectedId={selectedId}
              onSelect={handleMapSelect}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onBoundsChange={setMapBounds}
              searchInBounds={searchInBounds}
              onSearchInBoundsChange={setSearchInBounds}
              focusDistricts={filters.districts}
            />
          </div>

          {/* Sidebar list */}
          <aside
            className={cn(
              'bg-white overflow-y-auto',
              'md:static md:block md:w-80 xl:w-96 md:flex-shrink-0 md:border-l md:border-gray-100',
              mobileListOpen ? 'absolute inset-0 z-[1100] block' : 'hidden'
            )}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {loading ? 'Laddar annonser…' : `${visible.length} ${visible.length === 1 ? 'annons' : 'annonser'}`}
                {!loading && searchInBounds && mapBounds && visible.length !== filtered.length && (
                  <span className="font-normal text-gray-500"> av {filtered.length} i kartans område</span>
                )}
              </p>
            </div>
            <div className="p-3 space-y-3 pb-24 md:pb-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-56 rounded-2xl bg-gray-100 animate-pulse" />
                ))
              ) : visible.length === 0 ? (
                <div className="text-center py-12 px-4 text-sm text-gray-500">
                  {filtered.length === 0 ? (
                    'Inga annonser matchar dina filter.'
                  ) : (
                    <>
                      Inga annonser i det här området.
                      <br />
                      <span className="text-gray-400">Zooma ut eller flytta kartan.</span>
                    </>
                  )}
                </div>
              ) : (
                visible.map((listing) => {
                  const active = selectedId === listing.id
                  const hovered = hoveredId === listing.id
                  return (
                    <div
                      key={listing.id}
                      ref={(el) => {
                        if (el) cardRefs.current.set(listing.id, el)
                        else cardRefs.current.delete(listing.id)
                      }}
                      onMouseEnter={() => setHoveredId(listing.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onFocus={() => setHoveredId(listing.id)}
                      onBlur={() => setHoveredId(null)}
                      className={cn(
                        'rounded-2xl transition-shadow scroll-my-16',
                        active
                          ? 'ring-2 ring-emerald-600 ring-offset-2'
                          : hovered
                            ? 'ring-1 ring-emerald-600/40'
                            : ''
                      )}
                    >
                      <ListingCard
                        listing={listing}
                        compact
                        favorited={favoriteIds.has(listing.id)}
                        mutualMatch={interestMatchOwnerIds.has(listing.userId)}
                        match={matches.get(listing.id)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          {/* Mobile list/map toggle */}
          <button
            type="button"
            onClick={() => setMobileListOpen((o) => !o)}
            className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-[1200] flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(15,30,24,0.3)] active:scale-95 transition-transform"
          >
            {mobileListOpen ? (
              <>
                <MapIcon size={16} /> Visa karta
              </>
            ) : (
              <>
                <List size={16} /> Visa lista{!loading && ` (${visible.length})`}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Home size={26} className="text-gray-400" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga annonser hittades</h3>
      <p className="text-gray-500 text-sm">Prova att ändra dina filter.</p>
    </div>
  )
}
