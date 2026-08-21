'use client'

import { useState } from 'react'
import { Search, MapPin, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

const QUICK_FILTERS = [
  { label: '1–2 rum', query: 'rooms=1,2' },
  { label: '3 rum', query: 'rooms=3' },
  { label: 'Under 10 000 kr', query: 'maxRent=10000' },
  { label: 'Balkong', query: 'balcony=true' },
]

export default function HeroSearch() {
  const [area, setArea] = useState('')
  const [focused, setFocused] = useState(false)
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push('/annonser')
  }

  return (
    <div className="space-y-3">
      {/* ── Main search bar ── */}
      <form
        onSubmit={handleSearch}
        aria-label="Sök bostadsbyten"
        className="flex items-center bg-white"
        style={{
          borderRadius: 20,
          border: focused
            ? '1.5px solid rgba(21,63,50,0.40)'
            : '1.5px solid rgba(21,63,50,0.10)',
          boxShadow: focused
            ? '0 0 0 4px rgba(21,63,50,0.06), 0 4px 24px rgba(15,30,24,0.08)'
            : '0 2px 8px rgba(15,30,24,0.04), 0 16px 40px rgba(15,30,24,0.07)',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
        }}
      >
        {/* Location input */}
        <div className="flex items-center gap-3 px-5 py-4 flex-1 min-w-0">
          <MapPin
            size={17}
            strokeWidth={1.75}
            style={{ color: focused ? '#153F32' : '#A8B9A4', flexShrink: 0, transition: 'color 160ms' }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-0.5"
              style={{ color: '#A8B9A4' }}
            >
              Område
            </p>
            <input
              type="text"
              placeholder="Vilken stadsdel söker du?"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:font-normal"
              style={{ color: '#15211E' }}
              aria-label="Sök stadsdel eller område"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px flex-shrink-0" style={{ backgroundColor: 'rgba(21,63,50,0.10)' }} />

        {/* Filter button (icon only, links to full filters) */}
        <button
          type="button"
          onClick={() => router.push('/annonser')}
          className="hidden sm:flex items-center gap-2 px-5 text-[13px] font-medium h-full transition-colors hover:text-[#153F32]"
          style={{ color: '#9EA69D' }}
          aria-label="Alla filter"
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} />
          <span>Filter</span>
        </button>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px flex-shrink-0" style={{ backgroundColor: 'rgba(21,63,50,0.10)' }} />

        {/* Search button */}
        <div className="p-3 flex-shrink-0">
          <button
            type="submit"
            aria-label="Sök"
            className="flex items-center gap-2 pl-5 pr-6 h-[52px] text-white text-[14px] font-semibold transition-all hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0 rounded-[14px]"
            style={{ backgroundColor: '#153F32' }}
          >
            <Search size={16} strokeWidth={2} />
            <span>Sök</span>
          </button>
        </div>
      </form>

      {/* ── Quick filter chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px]" style={{ color: '#C8D0C5' }}>Populärt:</span>
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => router.push(`/annonser?${f.query}`)}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all hover:border-[rgba(21,63,50,0.30)] hover:text-[#153F32]"
            style={{
              border: '1px solid rgba(21,63,50,0.14)',
              color: '#6D716C',
              backgroundColor: 'rgba(255,255,255,0.6)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
