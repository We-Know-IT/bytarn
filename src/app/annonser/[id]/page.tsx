'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
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
} from 'lucide-react'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import { formatRent, formatDate, cn } from '@/lib/utils'
import ListingCard from '@/components/ListingCard'
import dynamic from 'next/dynamic'

const ListingMap = dynamic(() => import('@/components/ListingMap'), { ssr: false })

export default function ListingDetailPage() {
  const params = useParams()
  const listing = MOCK_LISTINGS.find((l) => l.id === params.id)
  const [currentImg, setCurrentImg] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [interested, setInterested] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonsen hittades inte</h1>
          <Link href="/annonser" className="text-emerald-600 hover:underline">
            Tillbaka till annonser
          </Link>
        </div>
      </div>
    )
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

  const similarListings = MOCK_LISTINGS.filter(
    (l) => l.id !== listing.id && l.district === listing.district && l.status === 'aktiv'
  ).slice(0, 3)

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
                onClick={(e) => { e.stopPropagation(); setCurrentImg((i) => (i - 1 + listing.images.length) % listing.images.length) }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); setCurrentImg((i) => (i + 1) % listing.images.length) }}
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
                      onClick={() => setCurrentImg((i) => (i - 1 + listing.images.length) % listing.images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={() => setCurrentImg((i) => (i + 1) % listing.images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>

                    {/* Thumbnails */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {listing.images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImg(i)}
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
                  onClick={() => setFavorited(!favorited)}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Hiss', value: listing.elevator, icon: '🛗' },
              { label: 'Balkong', value: listing.balcony, icon: '🌿' },
              { label: 'Möblerad', value: listing.furnished, icon: '🛋️' },
              { label: 'Husdjur OK', value: listing.petsAllowed, icon: '🐾' },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-xl text-sm',
                  item.value ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-400'
                )}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {item.value ? (
                  <CheckCircle size={14} className="ml-auto text-emerald-500" />
                ) : (
                  <span className="ml-auto text-xs">Nej</span>
                )}
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Om bostaden</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>

          {/* Map */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Läge</h2>
            <div className="h-56 rounded-2xl overflow-hidden border border-gray-100">
              <ListingMap listings={[listing]} />
            </div>
          </div>

          {/* Activity */}
          <div className="flex items-center gap-6 text-sm text-gray-500 py-4 border-t border-gray-100">
            <span>{listing.interestedCount} intresserade</span>
            <span>{listing.matchCount} matchningar</span>
            <span>Annonserad {formatDate(listing.createdAt)}</span>
          </div>

          {/* Similar listings */}
          {similarListings.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                Fler annonser i {listing.district}
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
              {listing.matchCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl mb-4">
                  <span className="text-emerald-600 text-lg">🤝</span>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Ömsesidigt intresse!</p>
                    <p className="text-xs text-emerald-600">Ni har båda visat intresse.</p>
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => setInterested(!interested)}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                    interested
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  )}
                >
                  {interested ? '✓ Intresseanmälan skickad' : 'Visa intresse'}
                </button>

                <Link
                  href="/meddelanden"
                  className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} />
                  Skicka meddelande
                </Link>
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

            <button className="w-full text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 py-2">
              <Flag size={12} />
              Rapportera annons
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
