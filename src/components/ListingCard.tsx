'use client'

import Link from 'next/link'
import { Heart, MapPin, Home } from 'lucide-react'
import { useState } from 'react'
import type { Listing } from '@/types'
import { formatRent, formatDate, cn } from '@/lib/utils'

interface ListingCardProps {
  listing: Listing
  compact?: boolean
}

export default function ListingCard({ listing, compact = false }: ListingCardProps) {
  const [favorited, setFavorited] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <Link href={`/annonser/${listing.id}`} className="group block">
      <article className="bg-white rounded-2xl overflow-hidden border hover:border-emerald-200 transition-all duration-200 card-hover" style={{ borderColor: '#DDD9D2' }}>

        {/* Image */}
        <div className="relative overflow-hidden bg-sand-100" style={{ aspectRatio: '4/3', backgroundColor: '#EDEBE6' }}>
          {!imgError && listing.images[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home size={36} className="text-sand-200" style={{ color: '#DDD9D2' }} />
            </div>
          )}

          {/* Top row: status + favorite */}
          <div className="absolute top-3 inset-x-3 flex items-start justify-between">
            {listing.status !== 'aktiv' && (
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm',
                listing.status === 'pausad'
                  ? 'bg-white/90 text-amber-700'
                  : 'bg-white/90 text-gray-500'
              )}>
                {listing.status === 'pausad' ? 'Pausad' : 'Avslutad'}
              </span>
            )}
            <div className="ml-auto" />
            <button
              onClick={(e) => {
                e.preventDefault()
                setFavorited(!favorited)
              }}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm',
                favorited
                  ? 'bg-red-500 text-white'
                  : 'bg-white/90 text-gray-500 hover:text-red-400 hover:bg-white'
              )}
            >
              <Heart size={14} fill={favorited ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Match badge */}
          {listing.matchCount > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-sm" style={{ color: '#C49035' }}>
              <span>🤝</span>
              <span>{listing.matchCount} match</span>
            </div>
          )}

          {/* Image count */}
          {listing.images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              1/{listing.images.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn('p-4', compact && 'p-3')}>
          {/* Location */}
          <div className="flex items-center gap-1 mb-1.5">
            <MapPin size={11} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">
              {listing.district}
            </span>
          </div>

          {/* Title */}
          <h3 className={cn(
            'font-semibold text-gray-900 line-clamp-2 leading-snug mb-2',
            compact ? 'text-sm' : 'text-[15px]'
          )}>
            {listing.title}
          </h3>

          {/* Specs row */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <span>{listing.rooms} rok</span>
            <span className="text-gray-300">·</span>
            <span>{listing.area} m²</span>
            {listing.floor !== undefined && (
              <>
                <span className="text-gray-300">·</span>
                <span>vån {listing.floor}</span>
              </>
            )}
          </div>

          {/* Price + date */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[17px] font-bold text-emerald-600 leading-none">
                {new Intl.NumberFormat('sv-SE').format(listing.rent)}
              </span>
              <span className="text-xs text-gray-400 ml-1">kr/mån</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(listing.createdAt)}</span>
          </div>

          {/* Interested count — compact strip */}
          {!compact && listing.interestedCount > 0 && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: '#EDEBE6' }}>
              <div className="flex -space-x-1.5">
                {[47, 12, 32].map((n) => (
                  <img
                    key={n}
                    src={`https://i.pravatar.cc/28?img=${n}`}
                    className="w-5 h-5 rounded-full ring-1 ring-white object-cover"
                    alt=""
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {listing.interestedCount} intresserade
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
