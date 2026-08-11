'use client'

import { useEffect, useRef } from 'react'
import type { Listing } from '@/types'
import { formatRent } from '@/lib/utils'
import Link from 'next/link'

interface ListingMapProps {
  listings: Listing[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
}

export default function ListingMap({ listings, selectedId, onSelect }: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapRef.current!, {
        center: [59.334591, 18.063240],
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CartoDB',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map

      // Add markers
      markersRef.current = listings.map((listing) => {
        const isSelected = listing.id === selectedId

        const icon = L.divIcon({
          html: `
            <div style="
              background: ${isSelected ? '#059669' : '#ffffff'};
              color: ${isSelected ? '#ffffff' : '#059669'};
              border: 2px solid #059669;
              border-radius: 20px;
              padding: 4px 8px;
              font-size: 12px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
              font-family: inherit;
            ">
              ${listing.rooms} rum · ${(listing.rent / 1000).toFixed(0)}k
            </div>
          `,
          className: '',
          iconAnchor: [40, 20],
        })

        const marker = L.marker([listing.lat, listing.lng], { icon })
          .addTo(map)
          .bindPopup(
            `
            <div style="width: 200px; overflow: hidden;">
              ${
                listing.images[0]
                  ? `<img src="${listing.images[0]}" style="width:100%; height:120px; object-fit:cover;" />`
                  : ''
              }
              <div style="padding: 12px;">
                <p style="font-weight:600; font-size:13px; margin:0 0 4px; line-height:1.3;">${listing.title}</p>
                <p style="color:#6b7280; font-size:12px; margin:0 0 8px;">${listing.district}</p>
                <p style="font-weight:700; color:#059669; font-size:13px; margin:0 0 8px;">${formatRent(listing.rent)}</p>
                <a href="/annonser/${listing.id}" style="display:block; background:#059669; color:white; text-align:center; padding:6px; border-radius:8px; font-size:12px; font-weight:600; text-decoration:none;">
                  Visa annons
                </a>
              </div>
            </div>
          `,
            { maxWidth: 220, minWidth: 200 }
          )

        marker.on('click', () => {
          onSelect?.(listing.id)
        })

        return marker
      })
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [listings])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
