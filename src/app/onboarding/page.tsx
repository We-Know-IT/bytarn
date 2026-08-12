'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, MapPin, Home, Users, Bell } from 'lucide-react'
import { STOCKHOLM_DISTRICTS } from '@/types'
import { cn } from '@/lib/utils'

type Step = 0 | 1 | 2 | 3

const STEPS = [
  { label: 'Välkommen', icon: Home },
  { label: 'Din bostad', icon: MapPin },
  { label: 'Du söker', icon: Users },
  { label: 'Notiser', icon: Bell },
]

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(0)
  const [district, setDistrict] = useState('')
  const [rooms, setRooms] = useState('')
  const [wantDistricts, setWantDistricts] = useState<string[]>([])
  const [wantRooms, setWantRooms] = useState<string[]>([])
  const [notifications, setNotifications] = useState({ email: true, matches: true })

  function toggleWantDistrict(d: string) {
    setWantDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    )
  }

  function toggleWantRoom(r: string) {
    setWantRooms((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    )
  }

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
          {/* Step 0 — Welcome */}
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
                  <div key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                Kom igång <ArrowRight size={18} />
              </button>
              <p className="text-xs text-gray-400 mt-3">Tar ca 2 minuter</p>
            </div>
          )}

          {/* Step 1 — Din bostad */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Din nuvarande bostad</h2>
              <p className="text-gray-500 text-sm mb-6">
                Berätta kort om bostaden du vill byta bort.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Stadsdel</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Välj stadsdel</option>
                    {STOCKHOLM_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Antal rum</label>
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
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(0)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50">
                  Tillbaka
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!district || !rooms}
                  className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                >
                  Nästa
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Du söker */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Vad söker du?</h2>
              <p className="text-gray-500 text-sm mb-6">
                Välj de stadsdelar och rum du är intresserad av.
              </p>
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
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  Nästa
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Notiser */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Notifikationer</h2>
              <p className="text-gray-500 text-sm mb-6">
                Vi meddelar dig när något händer med dina annonser.
              </p>
              <div className="space-y-3">
                {[
                  {
                    key: 'email',
                    label: 'E-postnotiser vid nytt meddelande',
                    desc: 'Vi skickar ett mail när du får ett nytt meddelande.',
                  },
                  {
                    key: 'matches',
                    label: 'Notiser vid ny match',
                    desc: 'Få reda på det direkt när du och en annan bytare visat ömsesidigt intresse.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <div
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key as keyof typeof prev],
                        }))
                      }
                      className={cn(
                        'relative w-10 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 cursor-pointer',
                        notifications[item.key as keyof typeof notifications]
                          ? 'bg-emerald-600'
                          : 'bg-gray-200'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                          notifications[item.key as keyof typeof notifications]
                            ? 'translate-x-5'
                            : 'translate-x-1'
                        )}
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <h3 className="text-sm font-semibold text-emerald-800 mb-1">Sammanfattning</h3>
                <div className="text-xs text-emerald-700 space-y-0.5">
                  <p>📍 Din bostad: {rooms} rum i {district}</p>
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
