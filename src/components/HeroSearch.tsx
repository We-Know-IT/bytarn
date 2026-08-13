'use client'

import { useState } from 'react'
import { Search, MapPin, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

const ROOM_OPTIONS = ['Alla storlekar', '1 rum', '2 rum', '3 rum', '4 rum', '5+ rum']
const RENT_OPTIONS = ['Alla hyror', 'Under 7 500 kr', 'Under 10 000 kr', 'Under 12 500 kr', 'Under 15 000 kr']
const MOVE_OPTIONS = ['Flexibelt', '1 månad', '3 månader', '6 månader', '1 år']

interface FieldProps {
  label: string
  children: React.ReactNode
  icon: React.ReactNode
  border?: boolean
}

function Field({ label, children, icon, border = true }: FieldProps) {
  return (
    <div
      className={`flex items-center gap-3 px-5 py-4 flex-1 min-w-0 ${border ? 'border-r' : ''}`}
      style={border ? { borderColor: 'rgba(21,63,50,0.08)' } : {}}
    >
      <span className="flex-shrink-0 opacity-60" style={{ color: '#153F32' }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-0.5" style={{ color: '#9EA69D' }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  )
}

export default function HeroSearch() {
  const [area, setArea] = useState('')
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push('/annonser')
  }

  return (
    <form
      onSubmit={handleSearch}
      className="flex items-stretch bg-white overflow-hidden"
      style={{
        borderRadius: 20,
        boxShadow: '0 2px 8px rgba(15,30,24,0.04), 0 20px 50px rgba(15,30,24,0.10)',
        border: '1px solid rgba(21,63,50,0.08)',
      }}
      aria-label="Sök bostadsbyten"
    >
      {/* Area */}
      <Field label="Område" icon={<MapPin size={16} />}>
        <input
          type="text"
          placeholder="Var vill du bo?"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#C8D0C5]"
          style={{ color: '#15211E' }}
          aria-label="Område"
        />
      </Field>

      {/* Storlek */}
      <div className="hidden sm:block">
        <Field label="Storlek" icon={<span className="text-[13px] font-medium">rok</span>}>
          <select
            className="bg-transparent text-[14px] outline-none appearance-none cursor-pointer w-full"
            style={{ color: '#6D716C' }}
            aria-label="Storlek"
            defaultValue=""
          >
            <option value="" disabled>Alla storlekar</option>
            {ROOM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      {/* Hyra */}
      <div className="hidden md:block">
        <Field label="Hyra" icon={<span className="text-[12px] font-semibold">kr</span>}>
          <select
            className="bg-transparent text-[14px] outline-none appearance-none cursor-pointer w-full"
            style={{ color: '#6D716C' }}
            aria-label="Hyra"
            defaultValue=""
          >
            <option value="" disabled>Alla hyror</option>
            {RENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      {/* Inflytt */}
      <div className="hidden lg:block">
        <Field label="Inflytt" icon={<Calendar size={15} />}>
          <select
            className="bg-transparent text-[14px] outline-none appearance-none cursor-pointer w-full"
            style={{ color: '#6D716C' }}
            aria-label="Inflytt"
            defaultValue=""
          >
            <option value="" disabled>Flexibelt</option>
            {MOVE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>

      {/* Search button */}
      <div className="p-3 flex items-center flex-shrink-0">
        <button
          type="submit"
          className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-white transition-all hover:-translate-y-[1px] hover:shadow-lg hover:opacity-90 active:translate-y-0"
          style={{ backgroundColor: '#153F32' }}
          aria-label="Sök"
        >
          <Search size={19} />
        </button>
      </div>
    </form>
  )
}
