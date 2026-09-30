'use client'

import { useState } from 'react'
import { Search, MapPin, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

const QUICK_FILTERS = [
  { label: '1–2 rum', query: 'rum=1,2' },
  { label: '3 rum', query: 'rum=3' },
  { label: 'Under 10 000 kr', query: 'maxhyra=10000' },
  { label: 'Hiss', query: 'tillganglighet=hiss' },
]

export default function HeroSearch() {
  const [area, setArea] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = area.trim()
    router.push(q ? `/annonser?omrade=${encodeURIComponent(q)}` : '/annonser')
  }

  return (
    <div className="space-y-3.5">
      {/* ── Main search bar ── */}
      <form
        onSubmit={handleSearch}
        role="search"
        aria-label="Sök bostadsbyten"
        className="group/search flex items-center rounded-[20px] border border-[rgba(21,63,50,0.10)] bg-white p-2 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 focus-within:border-[rgba(21,63,50,0.40)] focus-within:shadow-[0_0_0_4px_rgba(21,63,50,0.07),var(--shadow-card)]"
      >
        {/* Location input */}
        <label className="flex min-w-0 flex-1 cursor-text items-center gap-3 py-1.5 pl-3 pr-2 sm:pl-4">
          <MapPin
            size={18}
            strokeWidth={1.75}
            className="flex-shrink-0 text-[#A8B9A4] transition-colors group-focus-within/search:text-emerald-600"
          />
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#6F8A6A]">
              Område
            </span>
            <input
              type="text"
              placeholder="Vilken stadsdel söker du?"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full truncate bg-transparent text-[15px] font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400 focus-visible:outline-none"
              aria-label="Sök stadsdel eller område"
              enterKeyHint="search"
            />
          </span>
        </label>

        {/* Filter link */}
        <div className="hidden h-8 w-px flex-shrink-0 bg-[rgba(21,63,50,0.10)] sm:block" />
        <button
          type="button"
          onClick={() => router.push('/annonser')}
          className="btn btn-ghost btn-sm mx-1 hidden text-gray-600 hover:text-emerald-600 sm:inline-flex"
        >
          <SlidersHorizontal size={15} strokeWidth={1.75} />
          Filter
        </button>

        {/* Search button */}
        <button
          type="submit"
          aria-label="Sök"
          className="btn btn-primary h-[52px] flex-shrink-0 px-4 sm:px-6"
        >
          <Search size={17} strokeWidth={2} />
          <span className="hidden min-[380px]:inline">Sök</span>
        </button>
      </form>

      {/* ── Quick filter chips ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-0.5 text-[12.5px] text-gray-500">Populärt:</span>
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => router.push(`/annonser?${f.query}`)}
            className="chip"
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
