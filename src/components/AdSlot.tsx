'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { fetchLiveAds, recordAdClick, type Ad, type AdPlacement } from '@/lib/ads'
import { cn } from '@/lib/utils'

// Google AdSense is used only where no own ad is booked, and only when
// NEXT_PUBLIC_ADSENSE_CLIENT and a slot id for the placement are set.
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const ADSENSE_SLOTS: Record<AdPlacement, string | undefined> = {
  listing_grid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING_GRID,
  listing_detail: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING_DETAIL,
  home: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME,
}

// Random start per page load, so booked ads share impressions.
const rotationOffset = Math.floor(Math.random() * 1000)

interface AdSlotProps {
  placement: AdPlacement
  /** Which of several slots on the page this is; picks a different ad each. */
  index?: number
  variant?: 'card' | 'banner'
  className?: string
}

export default function AdSlot({ placement, index = 0, variant = 'banner', className }: AdSlotProps) {
  const [ads, setAds] = useState<Ad[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLiveAds(placement).then((a) => !cancelled && setAds(a))
    return () => {
      cancelled = true
    }
  }, [placement])

  if (ads === null) return null
  if (ads.length === 0) {
    const slot = ADSENSE_SLOTS[placement]
    return ADSENSE_CLIENT && slot ? <AdSenseUnit client={ADSENSE_CLIENT} slot={slot} className={className} /> : null
  }

  const ad = ads[(rotationOffset + index) % ads.length]
  return variant === 'card' ? <AdCard ad={ad} className={className} /> : <AdBanner ad={ad} className={className} />
}

function SponsoredLabel({ ad }: { ad: Ad }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A8F88]">
      Sponsrat · {ad.advertiser}
    </p>
  )
}

function AdLink({ ad, className, children }: { ad: Ad; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={ad.linkUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => recordAdClick(ad.id)}
      className={cn('group block focus-visible:outline-offset-4', className)}
    >
      {children}
    </a>
  )
}

function AdCard({ ad, className }: { ad: Ad; className?: string }) {
  return (
    <AdLink ad={ad} className={cn('h-full rounded-[20px]', className)}>
      <article className="card flex h-full flex-col overflow-hidden border-dashed">
        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full bg-[#EEF2EC]" />
        )}
        <div className="flex flex-1 flex-col p-5">
          <SponsoredLabel ad={ad} />
          <h3 className="mt-2 text-[16px] font-semibold leading-snug text-gray-900">{ad.headline}</h3>
          {ad.body && <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600 line-clamp-3">{ad.body}</p>}
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-[#153F32] group-hover:underline">
            Läs mer <ExternalLink size={13} />
          </span>
        </div>
      </article>
    </AdLink>
  )
}

function AdBanner({ ad, className }: { ad: Ad; className?: string }) {
  return (
    <AdLink ad={ad} className={cn('rounded-2xl', className)}>
      <aside className="flex items-center gap-4 rounded-2xl border border-dashed border-[#D9DDD6] bg-white p-4">
        {ad.imageUrl && (
          <img src={ad.imageUrl} alt="" loading="lazy" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
        )}
        <div className="min-w-0 flex-1">
          <SponsoredLabel ad={ad} />
          <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">{ad.headline}</p>
          {ad.body && <p className="mt-0.5 text-[13px] text-gray-600 line-clamp-2">{ad.body}</p>}
        </div>
        <ExternalLink size={16} className="flex-shrink-0 text-[#153F32]" aria-hidden />
      </aside>
    </AdLink>
  )
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

function AdSenseUnit({ client, slot, className }: { client: string; slot: string; className?: string }) {
  const pushed = useRef(false)
  useEffect(() => {
    if (pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Blocked by an ad blocker — leave the slot empty.
    }
  }, [])
  return (
    <div className={className}>
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8A8F88]">Sponsrat</p>
      <ins
        className="adsbygoogle block"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
