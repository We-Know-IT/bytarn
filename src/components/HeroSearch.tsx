'use client'

import { useState } from 'react'
import { Search, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

const ROOM_OPTIONS = ['1 rum', '2 rum', '3 rum', '4 rum', '5+ rum']
const RENT_OPTIONS = ['Under 7 500 kr', 'Under 10 000 kr', 'Under 12 500 kr', 'Under 15 000 kr']
const MOVE_OPTIONS = ['1 månad', '3 månader', '6 månader', '1 år']

export default function HeroSearch() {
  const [area, setArea] = useState('')
  const [focused, setFocused] = useState(false)
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push('/annonser')
  }

  return (
    <form
      onSubmit={handleSearch}
      aria-label="Sök bostadsbyten"
      className="flex items-center bg-white"
      style={{
        borderRadius: 22,
        border: focused
          ? '1.5px solid rgba(21,63,50,0.35)'
          : '1.5px solid rgba(21,63,50,0.10)',
        boxShadow: focused
          ? '0 2px 8px rgba(15,30,24,0.04), 0 20px 50px rgba(15,30,24,0.10)'
          : '0 2px 8px rgba(15,30,24,0.04), 0 16px 40px rgba(15,30,24,0.07)',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
      }}
    >
      {/* ── Område ── */}
      <div className="flex items-center gap-3 px-5 py-4 flex-[1.4] min-w-0">
        <MapPin size={16} strokeWidth={1.75} style={{ color: '#153F32', flexShrink: 0 }} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-0.5" style={{ color: '#A8B9A4' }}>
            Område
          </p>
          <input
            type="text"
            placeholder="Var vill du bo?"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:font-normal"
            style={{ color: '#15211E' }}
            aria-label="Område"
          />
        </div>
      </div>

      <Divider />

      {/* ── Storlek ── */}
      <div className="hidden sm:block flex-1 min-w-0">
        <SelectField label="Storlek" placeholder="Alla rum" options={ROOM_OPTIONS} />
      </div>

      <div className="hidden sm:block">
        <Divider />
      </div>

      {/* ── Hyra ── */}
      <div className="hidden md:block flex-1 min-w-0">
        <SelectField label="Hyra" placeholder="Alla hyror" options={RENT_OPTIONS} />
      </div>

      <div className="hidden md:block">
        <Divider />
      </div>

      {/* ── Inflytt ── */}
      <div className="hidden lg:block flex-1 min-w-0">
        <SelectField label="Inflytt" placeholder="Flexibelt" options={MOVE_OPTIONS} />
      </div>

      {/* ── Search button ── */}
      <div className="p-2.5 flex-shrink-0">
        <button
          type="submit"
          aria-label="Sök"
          className="flex items-center justify-center text-white transition-all hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: '#153F32',
          }}
        >
          <Search size={18} strokeWidth={2} />
        </button>
      </div>
    </form>
  )
}

function Divider() {
  return (
    <div
      className="h-8 w-px flex-shrink-0"
      style={{ backgroundColor: 'rgba(21,63,50,0.10)' }}
    />
  )
}

function SelectField({ label, placeholder, options }: {
  label: string
  placeholder: string
  options: string[]
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-0.5" style={{ color: '#A8B9A4' }}>
        {label}
      </p>
      <select
        defaultValue=""
        aria-label={label}
        className="bg-transparent text-[14px] font-medium outline-none appearance-none cursor-pointer w-full"
        style={{ color: '#6D716C' }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}
