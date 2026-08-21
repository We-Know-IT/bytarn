'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, MapPin, Home, Users, Bell, Loader2 } from 'lucide-react'
import { STOCKHOLM_DISTRICTS } from '@/types'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'bytaren_my_listing_draft'

type Step = 0 | 1 | 2 | 3

const STEPS = [
  { label: 'Välkommen', icon: Home },
  { label: 'Din bostad', icon: MapPin },
  { label: 'Du söker', icon: Users },
  { label: 'Notiser', icon: Bell },
]

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

function formatSuggestionLine(r: NominatimResult): string {
  const { road, house_number, postcode } = r.address
  const street = [road, house_number].filter(Boolean).join(' ')
  const post = postcode ? `, ${postcode} Stockholm` : ', Stockholm'
  return street ? street + post : r.display_name
}

function guessDistrict(r: NominatimResult): string {
  const candidate = r.address.suburb ?? r.address.city_district ?? r.address.quarter ?? ''
  return STOCKHOLM_DISTRICTS.find((d) => d.toLowerCase() === candidate.toLowerCase()) ?? ''
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(0)

  // Step 1 — current home
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [rooms, setRooms] = useState('')
  const [area, setArea] = useState('')
  const [rent, setRent] = useState('')
  const [balcony, setBalcony] = useState(false)
  const [elevator, setElevator] = useState(false)

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingAddress, setLoadingAddress] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addressWrapRef = useRef<HTMLDivElement>(null)

  // Step 2 — desired
  const [wantDistricts, setWantDistricts] = useState<string[]>([])
  const [wantRooms, setWantRooms] = useState<string[]>([])

  // Step 3 — notifications
  const [notifications, setNotifications] = useState({ email: true, matches: true })

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addressWrapRef.current && !addressWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); return }
    setLoadingAddress(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q + ' Stockholm')}&format=json&limit=6&countrycodes=se&addressdetails=1`
      const res = await fetch(url, { headers: { 'Accept-Language': 'sv' } })
      const data: NominatimResult[] = await res.json()
      setSuggestions(data.filter((r) => r.address.road))
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    } finally {
      setLoadingAddress(false)
    }
  }, [])

  function handleAddressInput(value: string) {
    setAddress(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 350)
  }

  function selectSuggestion(r: NominatimResult) {
    const formatted = formatSuggestionLine(r)
    const guessed = guessDistrict(r)
    setAddress(formatted)
    if (guessed) setDistrict(guessed)
    setShowSuggestions(false)
    setSuggestions([])
  }

  function saveDraftAndContinue() {
    try {
      const draft = { district, address, rooms, area, rent, balcony, elevator }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {}
    setStep(2)
  }

  function toggleWantDistrict(d: string) {
    setWantDistricts((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function toggleWantRoom(r: string) {
    setWantRooms((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  const canStep1Continue = district && rooms

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = step > i
            const active = step === i
            return (
              <div key={s.label} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  done ? 'bg-emerald-600 text-white' : active ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-white border-2 border-gray-200 text-gray-400'
                )}>
                  {done ? <CheckCircle size={16} /> : <Icon size={14} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 transition-colors', done ? 'bg-emerald-500' : 'bg-gray-200')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* ── Step 0 — Welcome ── */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🏠</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Välkommen till Bytaren!</h1>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Bytaren är Stockholms enklaste sätt att byta bostad direkt — utan mäklare och utan kö.
                Vi hjälper dig hitta rätt match på bara några minuter.
              </p>
              <div className="space-y-3 text-left mb-8">
                {[
                  '✅ Lägg upp din bostad gratis',
                  '🗺️ Utforska annonser på karta',
                  '🤝 Matchas med rätt bytespartner',
                  '💬 Chatta direkt i appen',
                ].map((item) => (
                  <div key={item} className="text-sm text-gray-700">{item}</div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                Kom igång <ArrowRight size={18} />
              </button>
              <p className="text-xs text-gray-400 mt-3">Tar ca 2 minuter · Helt gratis</p>
            </div>
          )}

          {/* ── Step 1 — Din bostad ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Hur bor du idag?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Berätta om bostaden du vill byta. Vi förinställer dessa uppgifter i din annons.
              </p>

              <div className="space-y-4">
                {/* Address autocomplete */}
                <div ref={addressWrapRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1"><MapPin size={13} /> Gatuadress</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Hornsgatan 45"
                      value={address}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      autoComplete="off"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {loadingAddress && (
                      <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <ul
                      className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden"
                      style={{ boxShadow: '0 4px 24px rgba(15,30,24,0.12)' }}
                    >
                      {suggestions.map((r, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(r) }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 transition-colors flex items-start gap-2.5 border-b border-gray-100 last:border-0"
                          >
                            <MapPin size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span>{formatSuggestionLine(r)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Stadsdel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Stadsdel *</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Välj stadsdel</option>
                    {STOCKHOLM_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Antal rum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Antal rum *</label>
                  <div className="flex gap-2">
                    {['1', '2', '3', '4', '5+'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRooms(r)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                          rooms === r
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Yta + Hyra */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Yta (m²)</label>
                    <input
                      type="number"
                      placeholder="65"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Hyra (kr/mån)</label>
                    <input
                      type="number"
                      placeholder="8 500"
                      value={rent}
                      onChange={(e) => setRent(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Faciliteter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Faciliteter</label>
                  <div className="flex gap-3">
                    {[
                      { key: 'balcony', label: 'Balkong', value: balcony, set: setBalcony },
                      { key: 'elevator', label: 'Hiss', value: elevator, set: setElevator },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => item.set(!item.value)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                          item.value
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">
                  Tillbaka
                </button>
                <button
                  onClick={saveDraftAndContinue}
                  disabled={!canStep1Continue}
                  className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  Nästa
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2 — Du söker ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Vad söker du?</h2>
              <p className="text-gray-500 text-sm mb-6">Välj de stadsdelar och rum du är intresserad av.</p>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Önskad stadsdel</p>
                  <div className="flex flex-wrap gap-2">
                    {STOCKHOLM_DISTRICTS.map((d) => (
                      <button
                        key={d}
                        onClick={() => toggleWantDistrict(d)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          wantDistricts.includes(d)
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Önskat antal rum</p>
                  <div className="flex gap-2">
                    {['1', '2', '3', '4', '5+'].map((r) => (
                      <button
                        key={r}
                        onClick={() => toggleWantRoom(r)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                          wantRooms.includes(r)
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">
                  Tillbaka
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
                  Nästa
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 — Notiser ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Notifikationer</h2>
              <p className="text-gray-500 text-sm mb-6">Vi meddelar dig när något händer med dina annonser.</p>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'E-postnotiser vid nytt meddelande', desc: 'Vi skickar ett mail när du får ett nytt meddelande.' },
                  { key: 'matches', label: 'Notiser vid ny match', desc: 'Få reda på det direkt när du och en annan bytare visat ömsesidigt intresse.' },
                ].map((item) => (
                  <label key={item.key} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <div
                      onClick={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      className={cn(
                        'relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 cursor-pointer',
                        notifications[item.key as keyof typeof notifications] ? 'bg-emerald-600' : 'bg-gray-200'
                      )}
                    >
                      <div className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                        notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-1'
                      )} />
                    </div>
                  </label>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <h3 className="text-sm font-semibold text-emerald-800 mb-1">Din bostad</h3>
                <div className="text-xs text-emerald-700 space-y-0.5">
                  <p>📍 {rooms} rum i {district}{address ? ` — ${address.split(',')[0]}` : ''}</p>
                  {wantDistricts.length > 0 && <p>🔍 Söker i: {wantDistricts.join(', ')}</p>}
                  {wantRooms.length > 0 && <p>🏠 Vill ha: {wantRooms.join(', ')} rum</p>}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(2)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">
                  Tillbaka
                </button>
                <Link
                  href="/annonser/ny"
                  className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors text-center flex items-center justify-center gap-2"
                >
                  Lägg upp min annons <ArrowRight size={16} />
                </Link>
              </div>
              <Link href="/annonser" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-3">
                Hoppa över — utforska annonser direkt
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
