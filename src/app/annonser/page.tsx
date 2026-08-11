'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import SearchFiltersComponent from '@/components/SearchFilters'
import ListingCard from '@/components/ListingCard'
import type { SearchFilters } from '@/types'

const ListingMap = dynamic(() => import('@/components/ListingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Laddar karta...</span>
    </div>
  ),
})

export default function AnnonserPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    districts: [],
    rooms: [],
    maxRent: null,
    view: 'list',
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return MOCK_LISTINGS.filter((l) => {
      if (l.status !== 'aktiv') return false
      if (filters.districts.length > 0 && !filters.districts.includes(l.district)) return false
      if (filters.rooms.length > 0 && !filters.rooms.includes(l.rooms)) return false
      if (filters.maxRent !== null && l.rent > filters.maxRent) return false
      return true
    })
  }, [filters])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <SearchFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filtered.length}
      />

      {filters.view === 'list' ? (
        /* List view */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏠</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Inga annonser hittades</h3>
                <p className="text-gray-500 text-sm">Prova att ändra dina filter.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Map + list split view */
        <div className="flex-1 flex overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <ListingMap
              listings={filtered}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Sidebar list */}
          <div className="w-80 xl:w-96 overflow-y-auto bg-white border-l border-gray-100 flex-shrink-0">
            <div className="p-3 space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  Inga annonser matchar dina filter.
                </div>
              ) : (
                filtered.map((listing) => (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedId(listing.id === selectedId ? null : listing.id)}
                    className={`cursor-pointer rounded-xl transition-all ${
                      selectedId === listing.id
                        ? 'ring-2 ring-emerald-500'
                        : 'hover:ring-1 hover:ring-gray-200'
                    }`}
                  >
                    <ListingCard listing={listing} compact />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
