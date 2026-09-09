'use client'

import Link from 'next/link'
import { Heart, Home, MapPin } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { Listing } from '@/types'
import { cn, haversineKm, formatDistance } from '@/lib/utils'
import { CURRENT_USER_HOME } from '@/lib/mock-data'

interface ListingCardProps {
  listing: Listing
  compact?: boolean
}

function matchPercent(matchCount: number): number | null {
  if (matchCount <= 0) return null
  return Math.min(97, 76 + matchCount * 5)
}

export default function ListingCard({ listing, compact = false }: ListingCardProps) {
  const [favorited, setFavorited] = useState(false)
  const [imgIndex, setImgIndex] = useState(0)
  const [imgError, setImgError] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pct = matchPercent(listing.matchCount)
  const distKm = haversineKm(CURRENT_USER_HOME.lat, CURRENT_USER_HOME.lng, listing.lat, listing.lng)
  const distLabel = formatDistance(distKm)

  const images = listing.images.filter(Boolean)
  const hasMultiple = images.length > 1

  function startRotation() {
    if (!hasMultiple) return
    intervalRef.current = setInterval(() => {
      setImgIndex((i) => (i + 1) % images.length)
    }, 3000)
  }

  function stopRotation() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setImgIndex(0)
  }

  useEffect(() => () => stopRotation(), [])

  return (
    <Link
      href={`/annonser/${listing.id}`}
      className="group block"
      onMouseEnter={startRotation}
      onMouseLeave={stopRotation}
    >
      <article
        className="bg-white card-lift"
        style={{
          borderRadius: 20,
          boxShadow: '0 2px 8px rgba(15,30,24,0.04), 0 16px 40px rgba(15,30,24,0.08)',
          border: '1px solid rgba(21,63,50,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* ─── Image ─── */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/3', backgroundColor: '#E3EBE2' }}>
          {!imgError && images[imgIndex] ? (
            <img
              src={images[imgIndex]}
              alt={listing.title}
              className="w-full h-full object-cover img-zoom transition-opacity duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home size={36} style={{ color: '#A8B9A4' }} />
            </div>
          )}

          {/* Match badge — top left */}
          {pct !== null && (
            <div
              className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-white"
              style={{ backgroundColor: '#153F32' }}
            >
              <Heart size={11} fill="currentColor" />
              <span>{pct}% match</span>
            </div>
          )}

          {/* Status badge (if no match badge) */}
          {pct === null && listing.status !== 'aktiv' && (
            <div className="absolute top-3 left-3 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-white/90 text-amber-700">
              {listing.status === 'pausad' ? 'Pausad' : 'Avslutad'}
            </div>
          )}

          {/* Favorite — top right */}
          <button
            onClick={(e) => {
              e.preventDefault()
              setFavorited(!favorited)
            }}
            className={cn(
              'absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
              favorited
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-white/90 text-[#9EA69D] hover:text-red-400 hover:bg-white shadow-sm'
            )}
            aria-label={favorited ? 'Ta bort från favoriter' : 'Spara som favorit'}
          >
            <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
          </button>

          {/* Image counter / dots */}
          {hasMultiple && (
            <div className="absolute bottom-3 right-3 bg-black/35 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">
              {imgIndex + 1}/{images.length}
            </div>
          )}

          {/* Dot indicators */}
          {hasMultiple && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === imgIndex ? 16 : 6,
                    height: 6,
                    backgroundColor: i === imgIndex ? 'white' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── Content ─── */}
        <div className={cn('p-4', compact && 'p-3.5')}>
          {/* District + distance */}
          <div className="flex items-center justify-between mb-1.5">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.10em]"
              style={{ color: '#A8B9A4' }}
            >
              {listing.district}, Stockholm
            </p>
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
              style={{ color: '#153F32' }}
            >
              <MapPin size={10} strokeWidth={2} />
              {distLabel}
            </span>
          </div>

          {/* Title */}
          <h3
            className={cn(
              'font-semibold leading-snug mb-2.5 line-clamp-2',
              compact ? 'text-[14px]' : 'text-[16px]'
            )}
            style={{ color: '#15211E' }}
          >
            {listing.title}
          </h3>

          {/* Specs */}
          <p className="text-[13px] mb-4" style={{ color: '#6D716C' }}>
            {listing.area} m²
            <span className="mx-1.5" style={{ color: '#D9C2A3' }}>·</span>
            {new Intl.NumberFormat('sv-SE').format(listing.rent)} kr/mån
            {listing.balcony && (
              <>
                <span className="mx-1.5" style={{ color: '#D9C2A3' }}>·</span>
                Balkong
              </>
            )}
          </p>

          {/* Footer */}
          {!compact && (
            <div
              className="flex items-center justify-between pt-3.5 border-t"
              style={{ borderColor: 'rgba(21,63,50,0.08)' }}
            >
              <div className="flex items-center gap-2">
                {listing.interestedCount > 0 && (
                  <span className="text-[12px]" style={{ color: '#9EA69D' }}>
                    {listing.interestedCount} intresserade
                  </span>
                )}
              </div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: '#C8D0C5' }}
              >
                {listing.rooms} rok
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
