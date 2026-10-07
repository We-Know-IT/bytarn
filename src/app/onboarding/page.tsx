'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, MapPin, Home, Users, Bell, Map, Handshake, MessageSquare, Info } from 'lucide-react'
import { STOCKHOLM_DISTRICTS, AMENITIES, EMPTY_SWAP_PREFERENCES, type AmenityKey, type SwapPreferencesInput } from '@/types'
import { cn } from '@/lib/utils'
import AddressInput from '@/components/AddressInput'
import PreferencesForm from '@/components/PreferencesForm'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import { describeListingError } from '@/lib/listings'
import { formatRoomBuckets } from '@/lib/matching'
import {
  fetchMyPreferences,
  readPendingPreferences,
  savePendingPreferences,
  savePreferences,
  saveNotifyEmail,
} from '@/lib/preferences'

const DRAFT_KEY = 'hyresvagen_my_listing_draft'

type Step = 0 | 1 | 2 | 3

const STEPS = [
  { label: 'Välkommen', icon: Home },
  { label: 'Din bostad', icon: MapPin },
  { label: 'Du söker', icon: Users },
  { label: 'Notiser', icon: Bell },
]

export default function OnboardingPage() {
  const { user, profile } = useAuth()
  const signedIn = supabaseConfigured && !!user
  const [step, setStep] = useState<Step>(0)

  // Step 1 — current home
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [rooms, setRooms] = useState('')
  const [area, setArea] = useState('')
  const [floor, setFloor] = useState('')
  const [rent, setRent] = useState('')
  const [amenities, setAmenities] = useState<Record<AmenityKey, boolean>>({
    elevator: false,
    strollerFriendly: false,
    wheelchairAccessible: false,
  })

  // Step 2 — desired. Saved to swap_preferences (used for matching) when
  // signed in; otherwise kept in localStorage and saved after sign-in.
  const [prefs, setPrefs] = useState<SwapPreferencesInput>(
    () => (typeof window !== 'undefined' && readPendingPreferences()?.preferences) || EMPTY_SWAP_PREFERENCES
  )
  const prefsTouched = useRef(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  // Step 3 — e-mail on new message (profiles.notify_email). null = not
  // changed here yet, show what the profile says.
  const [notifyEmailChoice, setNotifyEmailChoice] = useState<boolean | null>(null)
  const notifyEmail = notifyEmailChoice ?? profile?.notifyEmail ?? true
  const [notifyError, setNotifyError] = useState<string | null>(null)

  // Signed in: start from what's already saved.
  useEffect(() => {
    if (!signedIn || !user) return
    fetchMyPreferences(user.id).then((saved) => {
      if (saved && !prefsTouched.current) setPrefs(saved)
    })
  }, [signedIn, user])

  function changePrefs(next: SwapPreferencesInput) {
    prefsTouched.current = true
    setPrefs(next)
  }

  async function savePrefsAndContinue() {
    setPrefsError(null)
    if (!signedIn || !user) {
      savePendingPreferences({ preferences: prefs })
      setStep(3)
      return
    }
    setSavingPrefs(true)
    try {
      await savePreferences(user.id, prefs)
      setStep(3)
    } catch (err) {
      setPrefsError(describeListingError(err))
    } finally {
      setSavingPrefs(false)
    }
  }

  async function toggleNotifyEmail() {
    const next = !notifyEmail
    setNotifyEmailChoice(next)
    setNotifyError(null)
    if (!signedIn || !user) {
      savePendingPreferences({ notifyEmail: next })
      return
    }
    try {
      await saveNotifyEmail(user.id, next)
    } catch (err) {
      setNotifyEmailChoice(!next)
      setNotifyError(describeListingError(err))
    }
  }

  function handleAddressChange(value: string, guessedDistrict?: string) {
    setAddress(value)
    if (guessedDistrict) setDistrict(guessedDistrict)
  }

  function saveDraftAndContinue() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ district, address, rooms, area, floor, rent, ...amenities }))
    } catch {}
    setStep(2)
  }

  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-[#F5F0E8] flex items-start justify-center py-8 px-4 sm:py-14"
      style={{ backgroundImage: 'radial-gradient(60% 40% at 50% 0%, rgba(168,185,164,0.26) 0%, transparent 70%)' }}>
      <div className="w-full max-w-xl">

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
                  done ? 'bg-emerald-600 text-white' : active ? 'bg-emerald-600 text-white ring-4 ring-[rgba(21,63,50,0.12)]' : 'bg-white border border-gray-300 text-gray-400'
                )}>
                  {done ? <CheckCircle size={16} /> : <Icon size={14} />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-0.5 rounded-full transition-colors', done ? 'bg-emerald-600' : 'bg-gray-300')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="card p-5 sm:p-9">

          {/* ── Step 0 — Welcome ── */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 bg-[#E3EBE2] rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Home size={36} className="text-emerald-600" strokeWidth={1.75} />
              </div>
              <h1 className="font-display text-[36px] italic leading-[1.08] tracking-[-0.02em] text-gray-900 mb-3">Välkommen till Hyresvägen!</h1>
              <p className="text-gray-500 mb-6 leading-relaxed">
                Hyresvägen är Stockholms enklaste sätt att byta bostad direkt — utan mäklare och utan kö.
                Vi hjälper dig hitta rätt match på bara några minuter.
              </p>
              <div className="space-y-3 text-left mb-8">
                {[
                  { Icon: CheckCircle, text: 'Lägg upp din bostad gratis' },
                  { Icon: Map, text: 'Utforska annonser på karta' },
                  { Icon: Handshake, text: 'Matchas med rätt bytespartner' },
                  { Icon: MessageSquare, text: 'Chatta direkt i appen' },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Icon size={16} className="text-emerald-600 flex-shrink-0" strokeWidth={1.75} />
                    {text}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="btn btn-primary btn-lg btn-block"
              >
                Kom igång <ArrowRight size={18} />
              </button>
              <p className="text-xs text-gray-400 mt-3">Tar ca 2 minuter · Helt gratis</p>
            </div>
          )}

          {/* ── Step 1 — Din bostad ── */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-[30px] italic leading-[1.1] tracking-[-0.02em] text-gray-900 mb-1.5">Hur bor du idag?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Berätta om bostaden du vill byta. Vi förinställer dessa uppgifter i din annons.
              </p>

              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className="label">
                    <span className="flex items-center gap-1"><MapPin size={13} /> Gatuadress</span>
                  </label>
                  <AddressInput value={address} onChange={handleAddressChange} />
                </div>

                {/* Stadsdel */}
                <div>
                  <label className="label">Stadsdel *</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="input"
                  >
                    <option value="">Välj stadsdel</option>
                    {STOCKHOLM_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Antal rum */}
                <div>
                  <label className="label">Antal rum *</label>
                  <div className="flex gap-2">
                    {['1', '2', '3', '4', '5+'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRooms(r)}
                        className={cn(
                          'flex-1 min-h-[44px] rounded-xl text-sm font-medium border transition-colors',
                          rooms === r ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-600 hover:text-emerald-600'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Yta + Våning + Hyra */}
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                  <div>
                    <label className="label">Yta (m²)</label>
                    <input type="number" placeholder="65" value={area} onChange={(e) => setArea(e.target.value)}
                      className="input" />
                  </div>
                  <div>
                    <label className="label">Våning</label>
                    <input type="number" placeholder="3" value={floor} onChange={(e) => setFloor(e.target.value)}
                      className="input" />
                  </div>
                  <div>
                    <label className="label">Hyra (kr/mån)</label>
                    <input type="number" placeholder="8 500" value={rent} onChange={(e) => setRent(e.target.value)}
                      className="input" />
                  </div>
                </div>

                {/* Faciliteter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tillgänglighet</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {AMENITIES.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={amenities[item.key]}
                        onClick={() => setAmenities((a) => ({ ...a, [item.key]: !a[item.key] }))}
                        className={cn(
                          'flex-1 min-h-[44px] px-3 rounded-xl text-sm font-medium border transition-colors',
                          amenities[item.key] ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-600 hover:text-emerald-600'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="btn btn-secondary flex-1">
                  Tillbaka
                </button>
                <button
                  onClick={saveDraftAndContinue}
                  disabled={!district || !rooms}
                  className="btn btn-primary flex-1"
                >
                  Nästa
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2 — Du söker ── */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-[30px] italic leading-[1.1] tracking-[-0.02em] text-gray-900 mb-1.5">Vad söker du?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Berätta vad du letar efter. Vi använder det för att räkna ut hur väl varje annons passar dig — och
                hur väl din bostad passar den som annonserar.
              </p>
              <PreferencesForm value={prefs} onChange={changePrefs} disabled={savingPrefs} />
              {!signedIn && (
                <p className="flex items-start gap-1.5 mt-5 text-xs text-gray-500">
                  <Info size={13} className="mt-px flex-shrink-0 text-emerald-700" />
                  <span>Du är inte inloggad. Vi sparar dina val i webbläsaren och kopplar dem till ditt konto när du loggar in.</span>
                </p>
              )}
              {prefsError && (
                <p role="alert" className="mt-4 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm break-words">{prefsError}</p>
              )}
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="btn btn-secondary flex-1" disabled={savingPrefs}>Tillbaka</button>
                <button onClick={savePrefsAndContinue} className="btn btn-primary flex-1" disabled={savingPrefs}>
                  {savingPrefs ? 'Sparar…' : 'Nästa'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 — Notiser ── */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-[30px] italic leading-[1.1] tracking-[-0.02em] text-gray-900 mb-1.5">Notifikationer</h2>
              <p className="text-gray-500 text-sm mb-6">Välj om vi ska mejla dig när någon skriver till dig.</p>
              <div className="space-y-3">
                <label className="flex items-start gap-4 p-4 border border-gray-200 rounded-[14px] cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">E-postnotiser vid nytt meddelande</p>
                    <p className="text-xs text-gray-500 mt-0.5">Vi skickar ett mejl när du får ett nytt meddelande.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifyEmail}
                    aria-label="E-postnotiser vid nytt meddelande"
                    onClick={toggleNotifyEmail}
                    className={cn('relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 cursor-pointer',
                      notifyEmail ? 'bg-emerald-600' : 'bg-gray-200')}
                  >
                    <span className={cn('absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      notifyEmail ? 'translate-x-5' : 'translate-x-1')} />
                  </button>
                </label>
                {notifyError && (
                  <p role="alert" className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm break-words">{notifyError}</p>
                )}
                <p className="text-xs text-gray-500">
                  {signedIn
                    ? 'Sparas direkt. Du hittar dina matchningar under Annonser — sortera på “Bäst match”.'
                    : 'Sparas när du loggar in. Du hittar dina matchningar under Annonser — sortera på “Bäst match”.'}
                </p>
              </div>

              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <h3 className="text-sm font-semibold text-emerald-800 mb-1">Din bostad</h3>
                <div className="text-xs text-emerald-700 space-y-0.5">
                  <p>{rooms} rum i {district}{address ? ` — ${address.split(',')[0]}` : ''}</p>
                  {prefs.districts.length > 0 && <p>Söker i: {prefs.districts.join(', ')}</p>}
                  {prefs.rooms.length > 0 && <p>Vill ha: {formatRoomBuckets(prefs.rooms)} rum</p>}
                  {prefs.maxRent != null && <p>Högst {new Intl.NumberFormat('sv-SE').format(prefs.maxRent)} kr/mån</p>}
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mt-8 mb-3">Vad vill du göra härnäst?</p>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                <Link href="/annonser/ny"
                  className="btn btn-primary h-auto flex-col gap-1 whitespace-normal py-4 text-center">
                  <span className="flex items-center gap-2">Lägg upp annons <ArrowRight size={16} /></span>
                  <span className="text-xs font-normal text-white/70">Annonsera din bostad</span>
                </Link>
                <Link href="/annonser"
                  className="btn btn-secondary h-auto flex-col gap-1 whitespace-normal py-4 text-center text-gray-800">
                  <span>Utforska annonser</span>
                  <span className="text-xs font-normal text-gray-400">Titta runt först</span>
                </Link>
              </div>
              <button onClick={() => setStep(2)} className="block w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4">
                Tillbaka
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
