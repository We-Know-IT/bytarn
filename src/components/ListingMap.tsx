'use client'

import { useEffect, useRef } from 'react'
import type { Listing } from '@/types'
import { formatRent, haversineKm, formatDistance } from '@/lib/utils'
import { CURRENT_USER_HOME } from '@/lib/mock-data'

interface ListingMapProps {
  listings: Listing[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  zoom?: number
  center?: [number, number]
}

const BRAND = '#153F32'

export default function ListingMap({ listings, selectedId, onSelect, zoom = 12, center }: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const clusterRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css')
      if (cancelled || !mapRef.current) return

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const defaultCenter: [number, number] = center ?? [59.334591, 18.063240]
      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom,
        zoomControl: true,
      })

      // Clean, low-saturation basemap — closer to Booli/Bostadsförmedlingen than a busy street map.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CartoDB',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setTimeout(() => map.invalidateSize(), 0)

      // Home marker — a plain pin, no emoji.
      const homeIcon = L.divIcon({
        html: `
          <div style="
            width: 30px; height: 30px; border-radius: 50%;
            background: ${BRAND}; border: 3px solid white;
            box-shadow: 0 2px 6px rgba(21,63,50,0.35);
            display:flex; align-items:center; justify-content:center;
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 11.5 12 4l9 7.5"/>
              <path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10"/>
            </svg>
          </div>
        `,
        className: '',
        iconAnchor: [15, 15],
      })
      L.marker([CURRENT_USER_HOME.lat, CURRENT_USER_HOME.lng], { icon: homeIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(
          `<div style="padding:2px;font-size:13px;font-weight:600;color:${BRAND};">Din bostad<br/><span style="font-weight:400;color:#6b7280;font-size:12px;">${CURRENT_USER_HOME.address}, ${CURRENT_USER_HOME.district}</span></div>`,
          { maxWidth: 200, minWidth: 160 }
        )

      // Clustered listing markers — Booli/Bostadsförmedlingen-style rounded price pills,
      // grouped into count bubbles when zoomed out so the map stays legible.
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c: any) =>
          L.divIcon({
            html: `<div style="
              width: 38px; height: 38px; border-radius: 50%;
              background: ${BRAND}; color: white; font-weight: 700; font-size: 13px;
              display:flex; align-items:center; justify-content:center;
              border: 3px solid white; box-shadow: 0 2px 8px rgba(21,63,50,0.3);
            ">${c.getChildCount()}</div>`,
            className: '',
            iconSize: [38, 38],
          }),
      })

      listings.forEach((listing) => {
        const isSelected = listing.id === selectedId
        const distKm = haversineKm(CURRENT_USER_HOME.lat, CURRENT_USER_HOME.lng, listing.lat, listing.lng)
        const distLabel = formatDistance(distKm)

        const icon = L.divIcon({
          html: `
            <div style="
              background: ${isSelected ? BRAND : '#ffffff'};
              color: ${isSelected ? '#ffffff' : '#15211E'};
              border: 1.5px solid ${isSelected ? BRAND : 'rgba(21,63,50,0.18)'};
              border-radius: 8px;
              padding: 5px 9px;
              font-size: 12.5px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 1px 3px rgba(15,30,24,0.12), 0 4px 12px rgba(15,30,24,0.08);
              font-family: inherit;
            ">
              ${(listing.rent / 1000).toFixed(0)}k <span style="font-weight:500; opacity:0.7;">· ${listing.rooms} rok</span>
            </div>
          `,
          className: '',
          iconAnchor: [34, 16],
        })

        const marker = L.marker([listing.lat, listing.lng], { icon })
          .bindPopup(
            `
            <div style="width: 208px; overflow: hidden; font-family: inherit;">
              ${
                listing.images[0]
                  ? `<img src="${listing.images[0]}" style="width:100%; height:124px; object-fit:cover; display:block;" />`
                  : ''
              }
              <div style="padding: 12px;">
                <p style="font-weight:600; font-size:13px; margin:0 0 4px; line-height:1.35; color:#15211E;">${listing.title}</p>
                <p style="color:#6D716C; font-size:12px; margin:0 0 6px;">${listing.district} · ${distLabel} från din bostad</p>
                <p style="font-weight:700; color:${BRAND}; font-size:13.5px; margin:0 0 10px;">${formatRent(listing.rent)}</p>
                <a href="/annonser/${listing.id}" style="display:block; background:${BRAND}; color:white; text-align:center; padding:8px; border-radius:8px; font-size:12.5px; font-weight:600; text-decoration:none;">
                  Visa annons
                </a>
              </div>
            </div>
          `,
            { maxWidth: 224, minWidth: 208 }
          )

        marker.on('click', () => onSelect?.(listing.id))
        cluster.addLayer(marker)
      })

      map.addLayer(cluster)
      clusterRef.current = cluster
    }

    initMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [listings, selectedId])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
