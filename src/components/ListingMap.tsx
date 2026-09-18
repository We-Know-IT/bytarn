'use client'

import { useEffect, useRef } from 'react'
import type { Listing } from '@/types'
import { formatRent, formatDate, haversineKm, formatDistance } from '@/lib/utils'
import { CURRENT_USER_HOME } from '@/lib/mock-data'

interface ListingMapProps {
  listings: Listing[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  zoom?: number
  center?: [number, number]
}

const BRAND = '#153F32'
const STYLE_ID = 'bytaren-map-popup-style'

// Injected once — restyles Leaflet's default popup chrome (close button, box,
// tip) to match the card look below, since those parts aren't part of the
// per-marker HTML string.
function ensurePopupStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .leaflet-popup-content-wrapper { padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,30,24,0.12), 0 16px 40px rgba(15,30,24,0.16); }
    .leaflet-popup-content { margin: 0; width: 240px !important; }
    .leaflet-popup-tip { box-shadow: 0 2px 6px rgba(15,30,24,0.1); }
    .leaflet-popup-close-button {
      top: 10px !important; right: 10px !important; width: 26px !important; height: 26px !important;
      background: white !important; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center; font-size: 15px !important;
      color: #15211E !important; line-height: 1 !important;
    }
    .leaflet-popup-close-button:hover { background: #f3f4f6 !important; }
    /* Leaflet's divIcon defaults the marker container to 12x12px regardless of
       the iconSize option passed to L.marker (only iconCreateFunction icons,
       used for clusters, pick it up) — force the real sizes here so the
       clickable hit-area matches what's actually drawn. */
    .bt-pin-30 { width: 30px !important; height: 30px !important; }
    .bt-pin-36 { width: 36px !important; height: 36px !important; }
    .bt-home-pin { width: 32px !important; height: 32px !important; }
  `
  document.head.appendChild(style)
}

const buildingSvg = (size: number) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="1"/>
    <path d="M9 21v-4h6v4"/>
    <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/>
  </svg>
`

function buildPinIcon(L: any, isSelected: boolean) {
  const size = isSelected ? 36 : 30
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${isSelected ? '#0D2F26' : BRAND};
        border: 2.5px solid white;
        box-shadow: 0 1px 4px rgba(15,30,24,0.2), 0 3px 10px rgba(15,30,24,0.18);
        display:flex; align-items:center; justify-content:center;
      ">
        ${buildingSvg(isSelected ? 17 : 14)}
      </div>
    `,
    className: isSelected ? 'bt-pin-36' : 'bt-pin-30',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export default function ListingMap({ listings, selectedId, onSelect, zoom = 12, center }: ListingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const clusterRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)
  const markersByIdRef = useRef<Map<string, any>>(new Map())

  // Creates the map and all markers. Intentionally does NOT depend on
  // selectedId — a marker click used to call onSelect(), which changed
  // selectedId, which was in this effect's dependency array, which tore
  // down and rebuilt the entire map (and closed the just-opened popup)
  // on every single click. Selection is now handled by the effect below,
  // which just swaps icons on the existing markers.
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
      ensurePopupStyles()
      leafletRef.current = L

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      markersByIdRef.current.clear()

      const defaultCenter: [number, number] = center ?? [59.334591, 18.063240]
      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom,
        zoomControl: true,
      })

      // Standard OpenStreetMap tiles — no API key required, and shows transit
      // stations, shops and other POIs (Carto's Voyager basemap needs a paid
      // API key now and its style hides most of that anyway).
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '©OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setTimeout(() => map.invalidateSize(), 0)

      // Home marker — a plain circular pin, no emoji.
      const homeIcon = L.divIcon({
        html: `
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: ${BRAND}; border: 3px solid white;
            box-shadow: 0 2px 6px rgba(21,63,50,0.35);
            display:flex; align-items:center; justify-content:center;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 11.5 12 4l9 7.5"/>
              <path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10"/>
            </svg>
          </div>
        `,
        className: 'bt-home-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })
      L.marker([CURRENT_USER_HOME.lat, CURRENT_USER_HOME.lng], { icon: homeIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(
          `<div style="padding:12px;font-size:13px;font-weight:600;color:${BRAND};">Din bostad<br/><span style="font-weight:400;color:#6b7280;font-size:12px;">${CURRENT_USER_HOME.address}, ${CURRENT_USER_HOME.district}</span></div>`,
          { maxWidth: 200, minWidth: 160 }
        )

      // Clustered listing markers — round building-icon pins with a count
      // bubble when zoomed out, the same visual language as Booli/
      // Bostadsförmedlingen's map (rather than the old rectangular price tags).
      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c: any) =>
          L.divIcon({
            html: `<div style="
              width: 38px; height: 38px; border-radius: 50%;
              background: ${BRAND}; color: white; font-weight: 700; font-size: 14px;
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

        const amenityTags = [
          listing.balcony && 'Balkong',
          listing.elevator && 'Hiss',
          listing.furnished && 'Möblerad',
          listing.petsAllowed && 'Husdjur OK',
        ].filter(Boolean) as string[]

        const marker = L.marker([listing.lat, listing.lng], { icon: buildPinIcon(L, isSelected) })
          .bindPopup(
            `
            <div style="width: 240px; overflow: hidden; font-family: inherit;">
              <div style="position: relative;">
                ${
                  listing.images[0]
                    ? `<img src="${listing.images[0]}" style="width:100%; height:140px; object-fit:cover; display:block;" />`
                    : `<div style="width:100%; height:100px; background:#E3EBE2;"></div>`
                }
              </div>
              <div style="padding: 14px;">
                <p style="font-weight:700; font-size:14px; margin:0 0 2px; line-height:1.3; color:#15211E;">${listing.address}</p>
                <p style="color:#6D716C; font-size:12px; margin:0 0 8px;">${listing.district} · Stockholm · ${distLabel} från din bostad</p>
                <p style="color:#15211E; font-size:12.5px; margin:0 0 8px; font-weight:500;">
                  ${listing.area} m² · ${listing.rooms} rum${listing.floor !== undefined ? ` · vån ${listing.floor}` : ''}
                </p>
                <p style="font-weight:700; color:${BRAND}; font-size:14.5px; margin:0 0 10px;">${formatRent(listing.rent)}</p>
                ${
                  amenityTags.length > 0
                    ? `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px;">
                        ${amenityTags
                          .map(
                            (t) =>
                              `<span style="background:rgba(21,63,50,0.08); color:${BRAND}; font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px;">${t}</span>`
                          )
                          .join('')}
                      </div>`
                    : ''
                }
                <div style="display:flex; align-items:center; justify-content:space-between; padding-top:8px; border-top:1px solid rgba(21,63,50,0.08); margin-bottom:10px;">
                  <span style="color:#9EA69D; font-size:11px;">${formatDate(listing.createdAt)}</span>
                  <span style="color:#A8B9A4; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Bytaren</span>
                </div>
                <a href="/annonser/${listing.id}" style="display:block; background:${BRAND}; color:white; text-align:center; padding:9px; border-radius:10px; font-size:12.5px; font-weight:600; text-decoration:none;">
                  Visa annons
                </a>
              </div>
            </div>
          `,
            { maxWidth: 260, minWidth: 240 }
          )

        marker.on('click', () => onSelect?.(listing.id))
        markersByIdRef.current.set(listing.id, marker)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings])

  // Highlights the selected marker without touching the map/markers otherwise.
  useEffect(() => {
    const L = leafletRef.current
    if (!L) return
    markersByIdRef.current.forEach((marker, id) => {
      marker.setIcon(buildPinIcon(L, id === selectedId))
    })
  }, [selectedId])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
