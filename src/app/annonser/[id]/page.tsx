'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Home,
  Heart,
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  Share2,
  Flag,
  X,
  Handshake,
  Pencil,
  Eye,
  Clock,
  Sparkles,
  MinusCircle,
  XCircle,
} from 'lucide-react'
import { fetchListingById, fetchListings, fetchMyListings, reportListing, recordListingView, isExpired, describeListingError } from '@/lib/listings'
import { addFavorite, removeFavorite, fetchFavoriteListingIds } from '@/lib/favorites'
import { expressInterest, removeInterest, fetchMyInterestListingIds, fetchInterestCount, fetchMutualMatchUserIds } from '@/lib/interests'
import { getOrCreateConversation } from '@/lib/messages'
import { fetchMyPreferences, fetchPreferencesFor } from '@/lib/preferences'
import { scoreMatch, MUTUAL_THRESHOLD, type CriterionResult, type FitResult, type MatchResult } from '@/lib/matching'
import { AMENITIES, type Listing, type SwapPreferences } from '@/types'
import AmenityIcon from '@/components/AmenityIcon'
import AdSlot from '@/components/AdSlot'
import { formatRent, formatDate, cn } from '@/lib/utils'
import ListingCard from '@/components/ListingCard'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const ListingMap = dynamic(() => import('@/components/ListingMap'), { ssr: false })

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [listing, setListing] = useState<Listing | null | undefined>(undefined)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [currentImg, setCurrentImg] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [interested, setInterested] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reported, setReported] = useState(false)
  const [interestCount, setInterestCount] = useState(0)
  // Both users showed interest in each other's listings (lib/interests).
  const [mutualMatch, setMutualMatch] = useState(false)
  // Matching (lib/matching). undefined = not loaded yet.
  const [myListings, setMyListings] = useState<Listing[] | undefined>(undefined)
  const [myPrefs, setMyPrefs] = useState<SwapPreferences | null | undefined>(undefined)
  const [ownerPrefs, setOwnerPrefs] = useState<SwapPreferences | null | undefined>(undefined)
  const [messaging, setMessaging] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const resetAutoPlay = useRef(0)

  useEffect(() => {
    const id = params.id as string
    fetchListingById(id)
      .then(setListing)
      .catch((err) => {
        setLoadError(describeListingError(err))
        setListing(null)
      })
    fetchListings().then(setAllListings).catch(() => {})
    fetchInterestCount(id).then(setInterestCount)
    recordListingView(id).catch(() => {})
  }, [params.id])

  // Owner, collaborator or family-account member — they get a management
  // bar instead of the "contact the owner" actions.
  useEffect(() => {
    if (!user) return
    const id = params.id as string
    fetchMyListings(user.id).then((mine) => {
      setCanManage(mine.some((l) => l.id === id))
      setMyListings(mine)
    })
  }, [user, params.id])

  // Matching: my wishes and the owner's wishes.
  const ownerId = listing?.userId
  useEffect(() => {
    if (!user || !ownerId || ownerId === user.id) return
    fetchMyPreferences(user.id).then(setMyPrefs)
    fetchPreferencesFor([ownerId]).then((m) => setOwnerPrefs(m.get(ownerId) ?? null))
  }, [user, ownerId])

  useEffect(() => {
    if (!user) return
    const id = params.id as string
    fetchFavoriteListingIds(user.id).then((ids) => setFavorited(ids.has(id)))
    fetchMyInterestListingIds(user.id).then((ids) => setInterested(ids.has(id)))
    fetchMutualMatchUserIds(user.id).then((ownerIds) => {
      if (listing) setMutualMatch(ownerIds.has(listing.userId))
    })
  }, [user, params.id, listing])

  // Auto-rotate gallery every 4.5 s; resets when user manually navigates.
  // Must run unconditionally (before the early returns below) — React requires
  // every render to call the same hooks in the same order.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!listing || listing.images.length <= 1 || lightbox) return
    const id = setInterval(() => {
      setCurrentImg((i) => (i + 1) % listing.images.length)
    }, 4500)
    return () => clearInterval(id)
  }, [listing?.images.length, lightbox, resetAutoPlay.current])

  // Stable reference — prevents ListingMap from reinitializing on every auto-rotate tick
  const mapListings = useMemo(() => (listing ? [listing] : []), [listing?.id])

  const matchLoaded = myListings !== undefined && myPrefs !== undefined && ownerPrefs !== undefined
  const match = useMemo(() => {
    if (!listing || !matchLoaded) return null
    const offered = myListings.filter((l) => l.status === 'aktiv' && !isExpired(l) && l.id !== listing.id)
    return {
      result: scoreMatch({ candidate: listing, viewerPrefs: myPrefs, ownerPrefs, viewerListings: offered }),
      offered,
      hasPrefs: myPrefs != null,
      ownerHasPrefs: ownerPrefs != null,
    }
  }, [listing, matchLoaded, myListings, myPrefs, ownerPrefs])

  if (listing === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Laddar annons…
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {loadError ? 'Kunde inte hämta annonsen' : 'Annonsen hittades inte'}
          </h1>
          {loadError && (
            <p className="max-w-md mx-auto mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm break-words">{loadError}</p>
          )}
          <Link href="/annonser" className="text-emerald-600 hover:underline">
            Tillbaka till annonser
          </Link>
        </div>
      </div>
    )
  }

  async function handleToggleFavorite() {
    if (!listing) return
    if (!supabaseConfigured || !user) {
      alert('Du måste vara inloggad för att spara favoriter.')
      return
    }
    const next = !favorited
    setFavorited(next)
    try {
      if (next) await addFavorite(user.id, listing.id)
      else await removeFavorite(user.id, listing.id)
    } catch {
      setFavorited(!next)
    }
  }

  async function handleToggleInterest() {
    if (!listing) return
    if (!supabaseConfigured || !user) {
      alert('Du måste vara inloggad för att visa intresse.')
      return
    }
    const next = !interested
    setInterested(next)
    setInterestCount((c) => Math.max(0, c + (next ? 1 : -1)))
    try {
      if (next) await expressInterest(user.id, listing.id)
      else await removeInterest(user.id, listing.id)
    } catch {
      setInterested(!next)
      setInterestCount((c) => Math.max(0, c + (next ? -1 : 1)))
    }
  }

  async function handleMessage() {
    if (!listing) return
    if (!supabaseConfigured || !user) {
      alert('Du måste vara inloggad för att skicka meddelanden.')
      return
    }
    if (user.id === listing.userId) {
      alert('Du kan inte skicka meddelande till dig själv.')
      return
    }
    setMessaging(true)
    try {
      const conversationId = await getOrCreateConversation(listing.id, user.id, listing.userId)
      router.push(`/meddelanden/${conversationId}`)
    } catch (err) {
      alert(`Kunde inte starta konversationen: ${describeListingError(err)}`)
      setMessaging(false)
    }
  }

  async function handleReport() {
    if (!listing) return
    if (!supabaseConfigured || !user) {
      alert('Du måste vara inloggad för att rapportera en annons.')
      return
    }
    const reason = prompt('Vad är fel med annonsen?')
    if (!reason) return
    try {
      await reportListing(listing.id, user.id, reason)
      setReported(true)
    } catch {
      alert('Kunde inte skicka rapporten. Försök igen.')
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  function navigate(dir: 1 | -1) {
    if (!listing) return
    setCurrentImg((i) => (i + dir + listing.images.length) % listing.images.length)
    resetAutoPlay.current += 1
  }

  const sameDist = allListings.filter(
    (l) => l.id !== listing.id && l.district === listing.district && l.status === 'aktiv'
  )
  const similarListings = sameDist.length > 0
    ? sameDist.slice(0, 3)
    : allListings.filter((l) => l.id !== listing.id && l.status === 'aktiv').slice(0, 3)
  const similarLabel = sameDist.length > 0 ? `Fler annonser i ${listing.district}` : 'Fler annonser'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X size={20} />
          </button>
          {listing.images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); navigate(-1) }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); navigate(1) }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <img
            src={listing.images[currentImg]}
            alt={listing.title}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-5 text-white/60 text-sm">
            {currentImg + 1} / {listing.images.length}
          </div>
        </div>
      )}
      {/* Back */}
      <Link
        href="/annonser"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        <ArrowLeft size={16} />
        Tillbaka
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Image gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-gray-100 mb-6" style={{ aspectRatio: '16/9' }}>
            {listing.images.length > 0 ? (
              <>
                <img
                  src={listing.images[currentImg]}
                  alt={listing.title}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightbox(true)}
                />

                {listing.images.length > 1 && (
                  <>
                    <button
                      onClick={() => navigate(-1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => navigate(1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>

                    {/* Thumbnails */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {listing.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCurrentImg(i); resetAutoPlay.current += 1 }}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            i === currentImg ? 'bg-white w-4' : 'bg-white/60'
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Thumbnail strip */}
                {listing.images.length > 1 && (
                  <div className="absolute top-3 right-3 flex gap-1">
                    {listing.images.slice(0, 4).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImg(i)}
                        className={cn(
                          'w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                          i === currentImg ? 'border-white' : 'border-transparent opacity-70'
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home size={48} className="text-gray-300" />
              </div>
            )}
          </div>

          {listing.videoUrl && (
            <div className="mb-6">
              <video
                src={listing.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-2xl bg-black max-h-[480px]"
              />
            </div>
          )}

          {canManage ? (
            <div className="mb-6 flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm">
              <span className="font-semibold text-emerald-800">Din annons</span>
              <span className="flex items-center gap-1 text-gray-600"><Eye size={14} /> {listing.viewCount} visningar</span>
              <span className="flex items-center gap-1 text-gray-600">
                <Clock size={14} />
                {listing.status !== 'aktiv'
                  ? listing.status === 'pausad' ? 'Pausad' : 'Avslutad'
                  : isExpired(listing)
                    ? 'Har gått ut'
                    : `Aktiv till ${new Date(listing.expiresAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}`}
              </span>
              <div className="flex gap-2 ml-auto">
                <Link href={`/annonser/ny?redigera=${listing.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50">
                  <Pencil size={14} /> Redigera
                </Link>
                <Link href="/annonshanterare" className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
                  Annonshanteraren
                </Link>
              </div>
            </div>
          ) : (listing.status !== 'aktiv' || isExpired(listing)) && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Den här annonsen är inte längre aktiv.
            </div>
          )}

          {/* Title & meta */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{listing.title}</h1>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleShare}
                  className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors relative"
                  title="Dela annons"
                >
                  <Share2 size={18} />
                  {copied && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-gray-900 text-white px-2 py-1 rounded whitespace-nowrap">
                      Kopierat!
                    </span>
                  )}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  aria-label={favorited ? 'Ta bort från favoriter' : 'Spara som favorit'}
                  className={cn(
                    'p-2 border rounded-xl transition-colors',
                    favorited
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <Heart size={18} fill={favorited ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-500 mb-4">
              <MapPin size={14} />
              <span className="text-sm">{listing.address}, {listing.district}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                {listing.rooms} rum
              </span>
              <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                {listing.area} m²
              </span>
              {listing.floor !== undefined && (
                <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                  Vån {listing.floor}
                </span>
              )}
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold">
                {formatRent(listing.rent)}
              </span>
            </div>
          </div>

          {/* Amenities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {AMENITIES.map((item) => (
              <div
                key={item.key}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl text-sm',
                  listing[item.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                )}
              >
                <AmenityIcon amenity={item.key} size={16} />
                <span className="font-medium">{item.label}</span>
                {listing[item.key] ? (
                  <CheckCircle size={14} className="ml-auto text-emerald-500" />
                ) : (
                  <span className="ml-auto text-xs">Nej</span>
                )}
              </div>
            ))}
          </div>

          {/* Matching — not shown on your own (or co-managed) listing */}
          {supabaseConfigured && !canManage && user?.id !== listing.userId && (
            <MatchBox signedIn={!!user} match={match} />
          )}

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Om bostaden</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>

          {/* Map */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Läge</h2>
            <div className="h-56 rounded-2xl overflow-hidden border border-gray-100">
              <ListingMap
                listings={mapListings}
                zoom={16}
                center={[listing.lat, listing.lng]}
              />
            </div>
          </div>

          {/* Activity */}
          <div className="flex items-center gap-6 text-sm text-gray-500 py-4 border-t border-gray-100">
            <span>{interestCount} intresserade</span>
            <span>Annonserad {formatDate(listing.createdAt)}</span>
          </div>

          {/* Similar listings */}
          {similarListings.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                {similarLabel}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarListings.map((l) => (
                  <ListingCard key={l.id} listing={l} compact />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 space-y-4">
            {/* Annonsör */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                {listing.userAvatar ? (
                  <img
                    src={listing.userAvatar}
                    alt={listing.userName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
                    {listing.userName[0]}
                  </div>
                )}
                <div>
                  <Link
                    href={`/profil/${listing.userId}`}
                    className="font-semibold text-gray-900 hover:text-emerald-600 text-sm"
                  >
                    {listing.userName}
                  </Link>
                  <p className="text-xs text-gray-400">Aktiv sedan {formatDate(listing.createdAt)}</p>
                </div>
              </div>

              {/* Match indicator */}
              {mutualMatch && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl mb-4">
                  <Handshake size={18} className="text-emerald-600 flex-shrink-0" strokeWidth={1.75} />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Ömsesidigt intresse!</p>
                    <p className="text-xs text-emerald-600">Ni har visat intresse för varandras annonser.</p>
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleToggleInterest}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                    interested
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  )}
                >
                  {interested ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle size={16} /> Intresseanmälan skickad
                    </span>
                  ) : (
                    'Visa intresse'
                  )}
                </button>

                <button
                  onClick={handleMessage}
                  disabled={messaging}
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <MessageSquare size={16} />
                  {messaging ? 'Öppnar…' : 'Skicka meddelande'}
                </button>
              </div>
            </div>

            {/* Quick facts */}
            <div className="bg-gray-50 rounded-2xl p-4 text-sm">
              <h3 className="font-semibold text-gray-700 mb-3 text-xs uppercase tracking-wide">
                Snabbfakta
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Stadsdel', value: listing.district },
                  { label: 'Rum', value: `${listing.rooms} rok` },
                  { label: 'Yta', value: `${listing.area} m²` },
                  { label: 'Hyra', value: `${new Intl.NumberFormat('sv-SE').format(listing.rent)} kr/mån` },
                  { label: 'Våning', value: listing.floor !== undefined ? `${listing.floor} tr` : '—' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-medium text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <AdSlot placement="listing_detail" />

            <button
              onClick={handleReport}
              disabled={reported}
              className="w-full text-xs text-gray-400 hover:text-gray-600 disabled:text-emerald-600 disabled:cursor-default flex items-center justify-center gap-1 py-2"
            >
              <Flag size={12} />
              {reported ? 'Rapport skickad' : 'Rapportera annons'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Matching box ─────────────────────────────────────────────────────

interface MatchBoxData {
  result: MatchResult
  offered: Listing[]
  hasPrefs: boolean
  ownerHasPrefs: boolean
}

function MatchBox({ signedIn, match }: { signedIn: boolean; match: MatchBoxData | null }) {
  if (!signedIn) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-100 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          <Sparkles size={18} className="text-emerald-600" /> Matchning
        </h2>
        <p className="text-sm text-gray-500">
          <Link href="/logga-in" className="font-semibold text-emerald-700 hover:underline">Logga in</Link> för att se hur väl
          bostaden passar det du söker — och hur väl din bostad passar annonsören.
        </p>
      </div>
    )
  }
  if (!match) {
    return <div className="mb-6 h-40 rounded-2xl bg-gray-50 animate-pulse" aria-label="Laddar matchning" />
  }

  const { result, offered, hasPrefs, ownerHasPrefs } = match
  const ownListing = offered.find((l) => l.id === result.viewerListingId)
  const headline =
    result.score == null
      ? 'Matchning okänd'
      : result.mutual
        ? 'Ömsesidig match'
        : result.oneSided
          ? 'Matchning åt ett håll'
          : result.score >= MUTUAL_THRESHOLD
            ? 'Bra match'
            : 'Svag match'

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Sparkles size={18} className="text-emerald-600" /> Matchning
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {headline}
            {result.oneSided === 'viewer' && ' — bygger bara på vad du söker'}
            {result.oneSided === 'owner' && ' — bygger bara på vad annonsören söker'}
          </p>
        </div>
        {result.score != null && (
          <div
            className={cn(
              'flex-shrink-0 rounded-2xl px-3 py-2 text-center',
              result.mutual ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800'
            )}
          >
            <div className="text-2xl font-bold leading-none tabular-nums">{result.score} %</div>
            <div className={cn('text-[11px] mt-1', result.mutual ? 'text-white/80' : 'text-emerald-700')}>
              {result.oneSided ? 'ena hållet' : 'båda hållen'}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MatchSide
          title="Passar dig"
          subtitle="Bostaden mot det du söker"
          fit={result.forViewer}
          empty={
            !hasPrefs ? (
              <>
                Du har inte berättat vad du söker.{' '}
                <Link href="/mina-sidor?flik=sokes" className="font-semibold text-emerald-700 hover:underline">
                  Fyll i vad du söker
                </Link>
              </>
            ) : (
              'Du har inte angett några krav — alla bostäder går bra.'
            )
          }
        />
        <MatchSide
          title="Du passar dem"
          subtitle={ownListing ? `Din annons ”${ownListing.title}” mot det annonsören söker` : 'Din bostad mot det annonsören söker'}
          fit={result.forOwner}
          empty={
            !ownerHasPrefs ? (
              'Annonsören har inte angett vad hen söker.'
            ) : offered.length === 0 ? (
              <>
                Du har ingen aktiv annons att byta med.{' '}
                <Link href="/annonser/ny" className="font-semibold text-emerald-700 hover:underline">
                  Lägg upp din bostad
                </Link>
              </>
            ) : (
              'Annonsören har inte angett några krav.'
            )
          }
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-4">
        En uppskattning utifrån stadsdel, rum, hyra, yta och tillgänglighet. Stadsdel och antal rum väger tyngst.
      </p>
    </div>
  )
}

function MatchSide({ title, subtitle, fit, empty }: { title: string; subtitle: string; fit: FitResult | null; empty: React.ReactNode }) {
  const specified = fit?.criteria.filter((c) => c.status !== 'any') ?? []
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {fit?.score != null && <span className="text-sm font-semibold tabular-nums text-gray-700">{fit.score} %</span>}
      </div>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{subtitle}</p>
      {fit && specified.length > 0 ? (
        <ul className="space-y-1.5">
          {specified.map((c) => (
            <CriterionRow key={c.key} c={c} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{empty}</p>
      )}
    </div>
  )
}

function CriterionRow({ c }: { c: CriterionResult }) {
  const Icon = c.status === 'ok' ? CheckCircle : c.status === 'partial' ? MinusCircle : XCircle
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        size={15}
        className={cn(
          'mt-0.5 flex-shrink-0',
          c.status === 'ok' ? 'text-emerald-600' : c.status === 'partial' ? 'text-amber-500' : 'text-red-500'
        )}
        aria-label={c.status === 'ok' ? 'Uppfyllt' : c.status === 'partial' ? 'Delvis' : 'Ej uppfyllt'}
      />
      <span className="min-w-0">
        <span className="font-medium text-gray-800">{c.label}</span>
        <span className="text-gray-500"> · {c.detail}</span>
      </span>
    </li>
  )
}
