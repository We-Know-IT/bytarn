'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X, Map, List } from 'lucide-react'
import { STOCKHOLM_DISTRICTS } from '@/types'
import { cn } from '@/lib/utils'
import type { SearchFilters } from '@/types'

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  resultCount: number
}

const ROOM_OPTIONS = [1, 2, 3, 4, 5]
const RENT_OPTIONS = [5000, 7500, 10000, 12500, 15000, 20000]

export default function SearchFiltersComponent({
  filters,
  onFiltersChange,
  resultCount,
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchText, setSearchText] = useState('')

  function toggleDistrict(district: string) {
    const next = filters.districts.includes(district)
      ? filters.districts.filter((d) => d !== district)
      : [...filters.districts, district]
    onFiltersChange({ ...filters, districts: next })
  }

  function toggleRoom(room: number) {
    const next = filters.rooms.includes(room)
      ? filters.rooms.filter((r) => r !== room)
      : [...filters.rooms, room]
    onFiltersChange({ ...filters, rooms: next })
  }

  function clearAll() {
    onFiltersChange({ districts: [], rooms: [], maxRent: null, view: filters.view })
  }

  const hasFilters =
    filters.districts.length > 0 || filters.rooms.length > 0 || filters.maxRent !== null

  const filteredDistricts = STOCKHOLM_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Sök stadsdel..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
              showAdvanced || hasFilters
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filter</span>
            {hasFilters && (
              <span className="bg-emerald-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {filters.districts.length + filters.rooms.length + (filters.maxRent ? 1 : 0)}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => onFiltersChange({ ...filters, view: 'list' })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filters.view === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List size={15} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => onFiltersChange({ ...filters, view: 'map' })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filters.view === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Map size={15} />
              <span className="hidden sm:inline">Karta</span>
            </button>
          </div>
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="pb-4 space-y-4">
            {/* Rooms */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">ANTAL RUM</p>
              <div className="flex flex-wrap gap-2">
                {ROOM_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleRoom(r)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      filters.rooms.includes(r)
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                    )}
                  >
                    {r === 5 ? '5+' : r} {r === 1 ? 'rum' : 'rum'}
                  </button>
                ))}
              </div>
            </div>

            {/* Max rent */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">MAX HYRA</p>
              <div className="flex flex-wrap gap-2">
                {RENT_OPTIONS.map((rent) => (
                  <button
                    key={rent}
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        maxRent: filters.maxRent === rent ? null : rent,
                      })
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      filters.maxRent === rent
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                    )}
                  >
                    {new Intl.NumberFormat('sv-SE').format(rent)} kr
                  </button>
                ))}
              </div>
            </div>

            {/* Districts */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">STADSDEL</p>
              <div className="flex flex-wrap gap-2">
                {filteredDistricts.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDistrict(d)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      filters.districts.includes(d)
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active filters + result count */}
        <div className="flex items-center justify-between pb-3 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.districts.map((d) => (
              <span
                key={d}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full"
              >
                {d}
                <button onClick={() => toggleDistrict(d)}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {filters.rooms.map((r) => (
              <span
                key={r}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full"
              >
                {r} rum
                <button onClick={() => toggleRoom(r)}>
                  <X size={10} />
                </button>
              </span>
            ))}
            {filters.maxRent && (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                Max {new Intl.NumberFormat('sv-SE').format(filters.maxRent)} kr
                <button onClick={() => onFiltersChange({ ...filters, maxRent: null })}>
                  <X size={10} />
                </button>
              </span>
            )}
            {hasFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Rensa alla
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {resultCount} annonser
          </span>
        </div>
      </div>
    </div>
  )
}
