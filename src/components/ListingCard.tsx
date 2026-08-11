'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, Home, Maximize2, Users } from 'lucide-react'
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
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-200">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          {!imgError && listing.images[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Home size={40} className="text-gray-400" />
            </div>
          )}

          {/* Status badge */}
          {listing.status !== 'aktiv' && (
            <div className={cn(
              'absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full',
              listing.status === 'pausad' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
            )}>
              {listing.status === 'pausad' ? 'Pausad' : 'Avslutad'}
            </div>
          )}

          {/* Image count */}
          {listing.images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              1/{listing.images.length}
            </div>
          )}

          {/* Favorite button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              setFavorited(!favorited)
            }}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all',
              favorited
                ? 'bg-red-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
            )}
          >
            <Heart size={16} fill={favorited ? 'currentColor' : 'none'} />
          </button>

          {/* Mutual match */}
          {listing.matchCount > 0 && (
            <div className="absolute bottom-3 left-3 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Users size={10} />
              {listing.matchCount} match
            </div>
          )}
        </div>

        {/* Content */}
        <div className={cn('p-4', compact && 'p-3')}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={cn(
              'font-semibold text-gray-900 line-clamp-2 leading-snug',
              compact ? 'text-sm' : 'text-base'
            )}>
              {listing.title}
            </h3>
          </div>

          <div className="flex items-center gap-1 text-gray-500 mb-2">
            <MapPin size={12} />
            <span className="text-xs">{listing.district}</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <span className="font-medium">{listing.rooms} rum</span>
            <span className="text-gray-300">·</span>
            <span>{listing.area} m²</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-700 text-sm">
              {formatRent(listing.rent)}
            </span>
            <span className="text-xs text-gray-400">{formatDate(listing.createdAt)}</span>
          </div>

          {!compact && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
              {listing.userAvatar ? (
                <img
                  src={listing.userAvatar}
                  alt={listing.userName}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-xs text-emerald-700">{listing.userName[0]}</span>
                </div>
              )}
              <span className="text-xs text-gray-500">{listing.userName}</span>
              {listing.interestedCount > 0 && (
                <span className="ml-auto text-xs text-gray-400">
                  {listing.interestedCount} intresserade
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
