'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { STOCKHOLM_DISTRICTS } from '@/types'

interface NominatimResult {
  display_name: string
  address: {
    road?: string
    house_number?: string
    postcode?: string
    suburb?: string
    city_district?: string
    quarter?: string
  }
}

function extractHouseNumber(input: string): string | null {
  const match = input.match(/\d+\w*/)
  return match ? match[0] : null
}

function buildLabel(r: NominatimResult, userInput: string): string {
  const { road, postcode } = r.address
  if (!road) return r.display_name

  // Prefer house number from Nominatim; fall back to what the user typed
  const hn = r.address.house_number ?? extractHouseNumber(userInput)
  const street = hn ? `${road} ${hn}` : road
  const post = postcode ? `, ${postcode} Stockholm` : ', Stockholm'
  return street + post
}

function guessDistrict(r: NominatimResult): string {
  const candidate = r.address.suburb ?? r.address.city_district ?? r.address.quarter ?? ''
  return STOCKHOLM_DISTRICTS.find((d) => d.toLowerCase() === candidate.toLowerCase()) ?? ''
}

// Keep at most one result per road name to avoid duplicate-street noise
function deduplicate(results: NominatimResult[]): NominatimResult[] {
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = r.address.road ?? r.display_name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface AddressInputProps {
  value: string
  onChange: (address: string, district?: string) => void
  className?: string
  inputClassName?: string
}

export default function AddressInput({ value, onChange, inputClassName }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<{ label: string; district: string }[]>([])
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShow(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); return }
    setLoading(true)
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q + ' Stockholm')}&format=json&limit=8` +
        `&countrycodes=se&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'sv' } })
      const data: NominatimResult[] = await res.json()
      const unique = deduplicate(data.filter((r) => r.address.road))
      setSuggestions(unique.map((r) => ({ label: buildLabel(r, q), district: guessDistrict(r) })))
      setShow(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(v: string) {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 380)
  }

  function select(s: { label: string; district: string }) {
    onChange(s.label, s.district || undefined)
    setShow(false)
    setSuggestions([])
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Hornsgatan 45"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShow(true)}
          autoComplete="off"
          className={inputClassName ?? 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'}
        />
        {loading && (
          <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {show && suggestions.length > 0 && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden"
          style={{ boxShadow: '0 4px 24px rgba(15,30,24,0.12)' }}
        >
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(s) }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 transition-colors flex items-start gap-2.5 border-b border-gray-100 last:border-0"
              >
                <MapPin size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span style={{ color: '#15211E' }}>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
