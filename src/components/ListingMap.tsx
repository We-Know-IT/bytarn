'use client'

import { useEffect, useRef } from 'react'
import type { Listing } from '@/types'
import { formatRent, haversineKm, formatDistance } from '@/lib/utils'
import { CURRENT_USER_HOME } from '@/lib/mock-data'
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

      // Home pin — current user's location
      const homeIcon = L.divIcon({
        html: `
          <div style="
            background: #153F32;
            color: white;
            border: 2.5px solid white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 3px 12px rgba(21,63,50,0.45);
          ">🏠</div>
        `,
        className: '',
        iconAnchor: [18, 18],
      })
      L.marker([CURRENT_USER_HOME.lat, CURRENT_USER_HOME.lng], { icon: homeIcon })
        .addTo(map)
        .bindPopup(`<div style="padding:10px;font-size:13px;font-weight:600;color:#153F32;">Din bostad<br/><span style="font-weight:400;color:#6b7280;font-size:12px;">${CURRENT_USER_HOME.address}, ${CURRENT_USER_HOME.district}</span></div>`, { maxWidth: 200, minWidth: 160 })

      // Add markers
      markersRef.current = listings.map((listing) => {
        const isSelected = listing.id === selectedId
        const distKm = haversineKm(CURRENT_USER_HOME.lat, CURRENT_USER_HOME.lng, listing.lat, listing.lng)
        const distLabel = formatDistance(distKm)

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
                <p style="color:#6b7280; font-size:12px; margin:0 0 4px;">${listing.district}</p>
                <p style="color:#153F32; font-size:11px; font-weight:600; margin:0 0 8px;">📍 ${distLabel} från din bostad</p>
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
