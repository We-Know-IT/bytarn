'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X, Map, List, ChevronDown } from 'lucide-react'
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

export default function SearchFiltersComponent({ filters, onFiltersChange, resultCount }: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [districtSearch, setDistrictSearch] = useState('')

  function toggleDistrict(d: string) {
    const next = filters.districts.includes(d)
      ? filters.districts.filter((x) => x !== d)
      : [...filters.districts, d]
    onFiltersChange({ ...filters, districts: next })
  }

  function toggleRoom(r: number) {
    const next = filters.rooms.includes(r)
      ? filters.rooms.filter((x) => x !== r)
      : [...filters.rooms, r]
    onFiltersChange({ ...filters, rooms: next })
  }

  function clearAll() {
    onFiltersChange({ districts: [], rooms: [], maxRent: null, view: filters.view })
  }

  const activeCount =
    filters.districts.length + filters.rooms.length + (filters.maxRent ? 1 : 0)
  const hasFilters = activeCount > 0

  const filteredDistricts = STOCKHOLM_DISTRICTS.filter((d) =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  )

  return (
    <div className="bg-white border-b sticky top-[68px] z-40" style={{ borderColor: '#DDD9D2' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Main filter bar */}
        <div className="flex items-center gap-2 py-3">

          {/* Search input */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Sök stadsdel..."
              value={districtSearch}
              onChange={(e) => {
                setDistrictSearch(e.target.value)
                if (e.target.value && !showAdvanced) setShowAdvanced(true)
              }}
              className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border bg-sand-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              style={{ borderColor: '#DDD9D2', backgroundColor: '#F7F5F1' }}
            />
          </div>

          {/* Quick room filters */}
          <div className="hidden sm:flex items-center gap-1.5">
            {ROOM_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleRoom(r)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold rounded-xl border transition-all',
                  filters.rooms.includes(r)
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                )}
                style={!filters.rooms.includes(r) ? { borderColor: '#DDD9D2' } : {}}
              >
                {r === 5 ? '5+' : r} rok
              </button>
            ))}
          </div>

          {/* More filters */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all',
              showAdvanced || hasFilters
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:border-gray-400'
            )}
            style={!showAdvanced && !hasFilters ? { borderColor: '#DDD9D2' } : {}}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filter</span>
            {hasFilters && (
              <span className="w-5 h-5 bg-white/25 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>

          <div className="flex-1" />

          {/* Result count */}
          <span className="text-sm text-gray-400 hidden sm:block flex-shrink-0">
            {resultCount} annonser
          </span>

          <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: '#DDD9D2' }} />

          {/* View toggle */}
          <div className="flex items-center bg-sand-100 rounded-xl p-1 gap-0.5 flex-shrink-0" style={{ backgroundColor: '#EDEBE6' }}>
            <button
              onClick={() => onFiltersChange({ ...filters, view: 'list' })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filters.view === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List size={14} />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => onFiltersChange({ ...filters, view: 'map' })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filters.view === 'map'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Map size={14} />
              <span className="hidden sm:inline">Karta</span>
            </button>
          </div>
        </div>

        {/* Advanced panel */}
        {showAdvanced && (
          <div className="border-t pb-4 pt-4 space-y-4" style={{ borderColor: '#EDEBE6' }}>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Max rent */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Max hyra</p>
                <div className="flex flex-wrap gap-1.5">
                  {RENT_OPTIONS.map((rent) => (
                    <button
                      key={rent}
                      onClick={() =>
                        onFiltersChange({ ...filters, maxRent: filters.maxRent === rent ? null : rent })
                      }
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                        filters.maxRent === rent
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white text-gray-600 hover:border-emerald-300'
                      )}
                      style={filters.maxRent !== rent ? { borderColor: '#DDD9D2' } : {}}
                    >
                      {new Intl.NumberFormat('sv-SE').format(rent)} kr
                    </button>
                  ))}
                </div>
              </div>

              {/* Districts */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Stadsdel</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                  {filteredDistricts.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDistrict(d)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                        filters.districts.includes(d)
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white text-gray-600 hover:border-emerald-300'
                      )}
                      style={!filters.districts.includes(d) ? { borderColor: '#DDD9D2' } : {}}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex items-center gap-2 pb-3 flex-wrap">
            {filters.districts.map((d) => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                {d}
                <button onClick={() => toggleDistrict(d)} className="hover:text-emerald-900">
                  <X size={10} />
                </button>
              </span>
            ))}
            {filters.rooms.map((r) => (
              <span key={r} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                {r} rum
                <button onClick={() => toggleRoom(r)} className="hover:text-emerald-900">
                  <X size={10} />
                </button>
              </span>
            ))}
            {filters.maxRent && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                Max {new Intl.NumberFormat('sv-SE').format(filters.maxRent)} kr
                <button onClick={() => onFiltersChange({ ...filters, maxRent: null })} className="hover:text-emerald-900">
                  <X size={10} />
                </button>
              </span>
            )}
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2">
              Rensa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
