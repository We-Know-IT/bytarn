'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings, Heart, Home, MessageSquare, Plus, Edit2, Trash2, Eye, EyeOff, Bookmark, LogOut, CheckCircle2, Circle } from 'lucide-react'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import { fetchListings, fetchMyListings, setListingStatus, deleteListing } from '@/lib/listings'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import ListingCard from '@/components/ListingCard'
import { cn, formatDate } from '@/lib/utils'
import type { Listing, SavedSearch } from '@/types'

type Tab = 'annonser' | 'favoriter' | 'intresse' | 'sparade'

export default function MinaSidorPage() {
  const { user, profile, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('annonser')
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [allListings, setAllListings] = useState<Listing[]>(MOCK_LISTINGS)
  const [myListingsReal, setMyListingsReal] = useState<Listing[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('bytaren_saved_searches')
    if (stored) setSavedSearches(JSON.parse(stored))
  }, [])

  useEffect(() => {
    fetchListings().then(setAllListings)
  }, [])

  useEffect(() => {
    if (supabaseConfigured && user) fetchMyListings(user.id).then(setMyListingsReal)
  }, [user])

  const me = supabaseConfigured
    ? { name: profile?.name ?? 'Din profil', email: user?.email ?? '', avatar: profile?.avatarUrl ?? undefined, joinedAt: user?.created_at ?? new Date().toISOString() }
    : { name: 'Anna Svensson', email: 'anna@example.com', avatar: 'https://i.pravatar.cc/150?img=47', joinedAt: '2026-06-01T00:00:00Z' }

  const myListings = supabaseConfigured
    ? myListingsReal
    : allListings.filter((l) => l.userId === 'u1')
  const favoriteListings = supabaseConfigured ? [] : allListings.filter((l) => ['2', '5', '6'].includes(l.id))

  function deleteSavedSearch(id: string) {
    const updated = savedSearches.filter((s) => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem('bytaren_saved_searches', JSON.stringify(updated))
  }

  async function togglePause(listing: Listing) {
    if (!supabaseConfigured) return
    const next = listing.status === 'pausad' ? 'aktiv' : 'pausad'
    await setListingStatus(listing.id, next)
    setMyListingsReal((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status: next } : l)))
  }

  async function handleDelete(id: string) {
    if (!supabaseConfigured) return
    if (!confirm('Ta bort annonsen? Detta går inte att ångra.')) return
    await deleteListing(id)
    setMyListingsReal((prev) => prev.filter((l) => l.id !== id))
  }

  const onboardingSteps = [
    { id: 'profile', label: 'Komplett profil skapad', done: true },
    { id: 'listing', label: 'Annons publicerad', done: myListings.length > 0 },
    { id: 'favorite', label: 'Sparat en annons som favorit', done: favoriteListings.length > 0 },
  ]
  const doneCount = onboardingSteps.filter((s) => s.done).length
  const allDone = doneCount === onboardingSteps.length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="relative flex-shrink-0">
          <img
            src={me.avatar}
            alt={me.name}
            className="w-20 h-20 rounded-full object-cover"
          />
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50">
            <Edit2 size={12} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{me.name}</h1>
          <p className="text-sm text-gray-500">{me.email}</p>
          <p className="text-xs text-gray-400 mt-1">Medlem sedan {formatDate(me.joinedAt)}</p>

          <div className="flex gap-4 mt-3 text-sm">
            <div className="text-center">
              <div className="font-bold text-gray-900">{myListings.length}</div>
              <div className="text-gray-400 text-xs">Annonser</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-900">{favoriteListings.length}</div>
              <div className="text-gray-400 text-xs">Favoriter</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
            <Settings size={15} />
            Inställningar
          </button>
          {supabaseConfigured && user && (
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50"
            >
              <LogOut size={15} />
              Logga ut
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6 overflow-x-auto">
        {([
          { key: 'annonser', label: 'Mina annonser', icon: Home },
          { key: 'favoriter', label: 'Favoriter', icon: Heart },
          { key: 'intresse', label: 'Intresseanmälningar', icon: MessageSquare },
          { key: 'sparade', label: 'Sparade sökningar', icon: Bookmark },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'annonser' && (
        <div>
          {/* Onboarding checklist */}
          {!allDone && (
            <div className="border border-emerald-100 rounded-2xl p-5 mb-6 bg-emerald-50/40">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Kom igång med Bytaren</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{doneCount} av {onboardingSteps.length} klart</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(doneCount / onboardingSteps.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {onboardingSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2.5">
                    {step.done ? (
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <Circle size={16} className="text-gray-300 flex-shrink-0" />
                    )}
                    <span className={cn('text-sm', step.done ? 'text-gray-500 line-through' : 'text-gray-700')}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{myListings.length} annonser</p>
            <Link
              href="/annonser/ny"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus size={15} />
              Ny annons
            </Link>
          </div>

          {myListings.length === 0 ? (
            <div className="text-center py-12">
              <Home size={40} className="text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Inga annonser än</h3>
              <p className="text-gray-500 text-sm mb-4">Lägg upp din bostad för att hitta ett byte.</p>
              <Link
                href="/annonser/ny"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700"
              >
                <Plus size={15} />
                Lägg upp annons
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myListings.map((listing) => (
                <div key={listing.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="flex gap-4 p-4">
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-24 h-20 object-cover rounded-xl flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                          {listing.title}
                        </h3>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                          listing.status === 'aktiv'
                            ? 'bg-emerald-100 text-emerald-700'
                            : listing.status === 'pausad'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {listing.status === 'aktiv' ? 'Aktiv' : listing.status === 'pausad' ? 'Pausad' : 'Avslutad'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{listing.district} · {listing.rooms} rok · {listing.area} m²</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{listing.interestedCount} intresserade</span>
                        <span>{listing.matchCount} matcher</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-50 px-4 py-2.5 flex gap-3">
                    <Link
                      href={`/annonser/${listing.id}`}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <Eye size={12} />
                      Visa
                    </Link>
                    <Link
                      href={`/annonser/ny?redigera=${listing.id}`}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <Edit2 size={12} />
                      Redigera
                    </Link>
                    <button
                      onClick={() => togglePause(listing)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <EyeOff size={12} />
                      {listing.status === 'pausad' ? 'Aktivera' : 'Pausa'}
                    </button>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 ml-auto"
                    >
                      <Trash2 size={12} />
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'favoriter' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">{favoriteListings.length} sparade annonser</p>
          {favoriteListings.length === 0 ? (
            <div className="text-center py-12">
              <Heart size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Inga favoriter sparade ännu.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {favoriteListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sparade' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">{savedSearches.length} sparade sökningar</p>
          {savedSearches.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark size={40} className="text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Inga sparade sökningar</h3>
              <p className="text-gray-500 text-sm mb-4">Filtrera på /annonser och tryck "Spara sökning" för att spara ett sökfilter.</p>
              <Link href="/annonser" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700">
                Utforska annonser
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div key={search.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Bookmark size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{search.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[
                        search.filters.districts.length > 0 && search.filters.districts.join(', '),
                        search.filters.rooms.length > 0 && `${search.filters.rooms.join(', ')} rum`,
                        search.filters.maxRent && `max ${new Intl.NumberFormat('sv-SE').format(search.filters.maxRent)} kr`,
                      ].filter(Boolean).join(' · ') || 'Alla annonser'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href="/annonser"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      Visa
                    </Link>
                    <button
                      onClick={() => deleteSavedSearch(search.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'intresse' && (
        <div className="text-center py-12">
          <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Inga intresseanmälningar än</h3>
          <p className="text-gray-500 text-sm">
            Annonser du visar intresse för dyker upp här.
          </p>
        </div>
      )}
    </div>
  )
}
