'use client'

import Link from 'next/link'
import { Heart, Home, MapPin, Handshake, Video, BedDouble, Ruler, Images } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { Listing } from '@/types'
import { cn, haversineKm, formatDistance } from '@/lib/utils'
import { useHomeLocation } from '@/lib/useHomeLocation'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import { addFavorite, removeFavorite } from '@/lib/favorites'

interface ListingCardProps {
  listing: Listing
  compact?: boolean
  favorited?: boolean
  mutualMatch?: boolean
}

const NEW_MS = 7 * 24 * 60 * 60 * 1000

export default function ListingCard({ listing, compact = false, favorited: initialFavorited = false, mutualMatch = false }: ListingCardProps) {
  const { user } = useAuth()
  const home = useHomeLocation()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [imgIndex, setImgIndex] = useState(0)
  const [imgError, setImgError] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep local state in sync when the parent's favorited prop changes.
  const [prevInitial, setPrevInitial] = useState(initialFavorited)
  if (prevInitial !== initialFavorited) {
    setPrevInitial(initialFavorited)
    setFavorited(initialFavorited)
  }

  const distLabel = home
    ? formatDistance(haversineKm(home.lat, home.lng, listing.lat, listing.lng))
    : null

  // "Ny" = published within the last week. Computed once per mount so render stays pure.
  const [isNew] = useState(() => {
    const t = Date.parse(listing.createdAt)
    return Number.isFinite(t) && Date.now() - t < NEW_MS
  })

  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
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

  const images = listing.images.filter(Boolean)
  const hasMultiple = images.length > 1

  function startRotation() {
    if (!hasMultiple || intervalRef.current) return
    intervalRef.current = setInterval(() => {
      setImgIndex((i) => (i + 1) % images.length)
    }, 2600)
  }

  function stopRotation() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setImgIndex(0)
  }

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const rent = new Intl.NumberFormat('sv-SE').format(listing.rent)
  const inactive = listing.status !== 'aktiv'

  return (
    <Link
      href={`/annonser/${listing.id}`}
      className="group block h-full rounded-[20px] focus-visible:outline-offset-4"
      onMouseEnter={startRotation}
      onMouseLeave={stopRotation}
      onFocus={startRotation}
      onBlur={stopRotation}
    >
      <article
        className={cn(
          'card card-hover flex h-full flex-col overflow-hidden',
          compact && 'rounded-[16px]'
        )}
      >
        {/* ─── Image ─── */}
        <div
          className="relative overflow-hidden bg-[#E3EBE2]"
          style={{ aspectRatio: compact ? '16/10' : '4/3' }}
        >
          {!imgError && images[imgIndex] ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Supabase URLs, no loader configured
            <img
              src={images[imgIndex]}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              className={cn('img-zoom h-full w-full object-cover', inactive && 'grayscale-[40%]')}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#E3EBE2] to-[#F5F0E8]">
              <Home size={compact ? 26 : 34} strokeWidth={1.5} className="text-[#A8B9A4]" />
              {!compact && <span className="text-[12px] font-medium text-gray-400">Ingen bild ännu</span>}
            </div>
          )}

          {/* soft gradient so overlay badges stay legible on bright photos */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/20 to-transparent opacity-70"
          />

          {/* Badges — top left */}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-64px)] flex-wrap gap-1.5">
            {mutualMatch && (
              <span className="badge badge-solid shadow-sm">
                <Handshake size={12} strokeWidth={2} />
                Match
              </span>
            )}
            {inactive && (
              <span className="badge badge-overlay text-amber-800">
                {listing.status === 'pausad' ? 'Pausad' : 'Avslutad'}
              </span>
            )}
            {!inactive && isNew && !mutualMatch && (
              <span className="badge badge-overlay text-emerald-600">Ny</span>
            )}
            {listing.videoUrl && (
              <span className="badge badge-overlay">
                <Video size={12} strokeWidth={2} />
                Video
              </span>
            )}
          </div>

          {/* Favorite — top right */}
          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-pressed={favorited}
            className={cn(
              'absolute right-3 top-3 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90',
              compact ? 'h-8 w-8' : 'h-9 w-9',
              favorited
                ? 'bg-white text-red-500 shadow-md'
                : 'bg-white/90 text-gray-600 shadow-sm hover:bg-white hover:text-red-500'
            )}
            aria-label={favorited ? 'Ta bort från favoriter' : 'Spara som favorit'}
          >
            <Heart size={compact ? 14 : 16} strokeWidth={2} fill={favorited ? 'currentColor' : 'none'} />
          </button>

          {/* Image count + dots */}
          {hasMultiple && (
            <>
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                <Images size={11} />
                {imgIndex + 1}/{images.length}
              </span>
              {images.length <= 8 && (
                <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === imgIndex ? 14 : 6,
                        backgroundColor: i === imgIndex ? 'white' : 'rgba(255,255,255,0.55)',
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Content ─── */}
        <div className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-4 sm:p-5')}>
          {/* Location row */}
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6F8A6A]">
              {listing.district}
            </p>
            {distLabel && (
              <span
                className="inline-flex flex-shrink-0 items-center gap-0.5 text-[11.5px] font-medium text-gray-500"
                title="Avstånd från din bostad"
              >
                <MapPin size={11} strokeWidth={2} />
                {distLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={cn(
              'line-clamp-2 font-semibold leading-snug text-gray-900 transition-colors group-hover:text-emerald-600',
              compact ? 'mb-2 text-[14px]' : 'mb-3 text-[16px]'
            )}
          >
            {listing.title}
          </h3>

          {/* Specs */}
          <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600', compact ? 'text-[12.5px]' : 'mb-4 text-[13px]')}>
            <li className="inline-flex items-center gap-1">
              <BedDouble size={14} strokeWidth={1.75} className="text-gray-400" />
              {listing.rooms} rok
            </li>
            <li className="inline-flex items-center gap-1">
              <Ruler size={14} strokeWidth={1.75} className="text-gray-400" />
              {listing.area} m²
            </li>
            {listing.balcony && !compact && <li>Balkong</li>}
          </ul>

          {/* Price */}
          <div
            className={cn(
              'mt-auto flex items-end justify-between gap-3',
              compact ? 'pt-2.5' : 'border-t border-[rgba(21,63,50,0.07)] pt-3.5'
            )}
          >
            <p className="leading-none text-gray-900">
              <span className={cn('font-semibold tracking-[-0.01em]', compact ? 'text-[15px]' : 'text-[18px]')}>
                {rent}
              </span>
              <span className="ml-1 text-[12.5px] font-medium text-gray-500">kr/mån</span>
            </p>
            {!compact && listing.interestedCount > 0 && (
              <span className="text-[12px] text-gray-500">
                {listing.interestedCount} intresserade
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
