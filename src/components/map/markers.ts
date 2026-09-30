// Pure HTML/icon builders for ListingMap. Kept free of React so the map
// component itself only deals with lifecycle (create once, sync markers,
// swap icons) rather than markup.
import type * as Leaflet from 'leaflet'
import type { Listing } from '@/types'
import { formatRent, formatDate, haversineKm, formatDistance } from '@/lib/utils'
import type { HomeLocation } from '@/lib/useHomeLocation'

export type LeafletNS = typeof Leaflet
export type MarkerState = 'default' | 'hover' | 'selected'

export const BRAND = '#153F32'
const BRAND_DARK = '#0D2F26'
const TEXT = '#15211E'
const MUTED = '#6D716C'
const STYLE_ID = 'bytaren-map-style'

// Listing titles, addresses and districts are user-provided and end up in
// raw HTML strings (divIcon/popup content), so everything interpolated into
// markup must go through this — otherwise a listing titled
// `<img src=x onerror=...>` would run script for every visitor of the map.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Only allow http(s) and site-relative image URLs into src attributes, so a
// crafted `javascript:` URL can't be smuggled in via the images array.
function safeUrl(url: string | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return escapeHtml(trimmed)
  return null
}

// "9 800 kr" — full amount reads better than "9,8k" in Swedish rental
// context, and clustering keeps pills from piling on top of each other.
export function formatPriceTag(rent: number): string {
  return `${new Intl.NumberFormat('sv-SE').format(rent)} kr`
}

function compactKr(rent: number): string {
  return rent >= 1000 ? `${(rent / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k` : `${rent}`
}

// Injected once — restyles Leaflet's popup chrome to match the card look and
// holds the marker/cluster CSS (hover/selected states are class-driven so a
// state change is a cheap setIcon rather than new inline styles everywhere).
export function ensureMapStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .leaflet-container { font-family: inherit; background: #EEF1EC; }
    .leaflet-popup-content-wrapper { padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,30,24,0.12), 0 16px 40px rgba(15,30,24,0.16); }
    .leaflet-popup-content { margin: 0; width: 240px !important; }
    .leaflet-popup-tip { box-shadow: 0 2px 6px rgba(15,30,24,0.1); }
    .leaflet-popup-close-button {
      top: 10px !important; right: 10px !important; width: 26px !important; height: 26px !important;
      background: white !important; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center; font-size: 15px !important;
      color: ${TEXT} !important; line-height: 1 !important; z-index: 2;
    }
    .leaflet-popup-close-button:hover { background: #f3f4f6 !important; }

    /* Price tags: the Leaflet icon element is 0x0 at the coordinate and the
       pill is positioned above it, so pills can size to their text while the
       tail still points at the exact spot. */
    .bt-price-marker { width: 0 !important; height: 0 !important; background: none; border: none; }
    .bt-price {
      position: absolute; left: 0; bottom: 7px; transform: translateX(-50%);
      white-space: nowrap; padding: 5px 10px; border-radius: 999px;
      background: white; color: ${BRAND}; font-size: 12.5px; font-weight: 700; line-height: 1.2;
      border: 1px solid rgba(21,63,50,0.14);
      box-shadow: 0 1px 3px rgba(15,30,24,0.16), 0 4px 12px rgba(15,30,24,0.12);
      transition: transform 120ms ease, background 120ms ease, color 120ms ease;
      cursor: pointer; font-variant-numeric: tabular-nums;
    }
    .bt-price::after {
      content: ''; position: absolute; left: 50%; bottom: -5px; width: 8px; height: 8px;
      background: inherit; border-right: inherit; border-bottom: inherit;
      transform: translateX(-50%) rotate(45deg);
    }
    .bt-price-hover .bt-price { background: ${BRAND}; color: white; border-color: ${BRAND}; transform: translateX(-50%) scale(1.06); }
    .bt-price-selected .bt-price {
      background: ${BRAND_DARK}; color: white; border-color: ${BRAND_DARK};
      transform: translateX(-50%) scale(1.12);
      box-shadow: 0 0 0 3px rgba(21,63,50,0.22), 0 6px 18px rgba(15,30,24,0.28);
    }
    .bt-price-video { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #E0662F; margin-left: 5px; vertical-align: middle; }

    .bt-cluster { background: none; border: none; }
    .bt-cluster > div {
      width: 100%; height: 100%; border-radius: 50%;
      background: ${BRAND}; color: white;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 0 0 5px rgba(21,63,50,0.18), 0 4px 14px rgba(15,30,24,0.28);
      border: 2px solid white; transition: transform 120ms ease, box-shadow 120ms ease;
      line-height: 1.05;
    }
    .bt-cluster b { font-size: 14px; font-weight: 800; }
    .bt-cluster small { font-size: 9.5px; font-weight: 600; opacity: 0.8; }
    .bt-cluster:hover > div, .bt-cluster-active > div {
      transform: scale(1.1); box-shadow: 0 0 0 7px rgba(21,63,50,0.28), 0 6px 18px rgba(15,30,24,0.32);
    }

    .bt-home-pin { width: 34px !important; height: 34px !important; background: none; border: none; }
  `
  document.head.appendChild(style)
}

export function buildPriceIcon(L: LeafletNS, listing: Listing, state: MarkerState) {
  const video = listing.videoUrl ? '<span class="bt-price-video" title="Video"></span>' : ''
  return L.divIcon({
    html: `<div class="bt-price">${escapeHtml(formatPriceTag(listing.rent))}${video}</div>`,
    className: `bt-price-marker${state === 'default' ? '' : ` bt-price-${state}`}`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    // Popup opens just above the pill rather than on top of it.
    popupAnchor: [0, -34],
  })
}

// Cluster bubble grows with its count and shows the cheapest rent inside, so
// a zoomed-out map still says something useful about price.
export function buildClusterIcon(L: LeafletNS, count: number, minRent: number | null) {
  const size = count < 10 ? 44 : count < 50 ? 52 : 60
  return L.divIcon({
    html: `<div><b>${count}</b>${minRent !== null ? `<small>fr. ${escapeHtml(compactKr(minRent))}</small>` : ''}</div>`,
    className: 'bt-cluster',
    iconSize: [size, size],
  })
}

export function buildHomeIcon(L: LeafletNS) {
  return L.divIcon({
    html: `
      <div style="
        width: 34px; height: 34px; border-radius: 50%;
        background: ${TEXT}; border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(21,33,30,0.15), 0 2px 8px rgba(21,33,30,0.35);
        display:flex; align-items:center; justify-content:center;
      ">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11.5 12 4l9 7.5"/>
          <path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10"/>
        </svg>
      </div>
    `,
    className: 'bt-home-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

export function buildHomePopupHtml(home: HomeLocation): string {
  const place = [home.address, home.district].filter(Boolean).map(escapeHtml).join(', ')
  return `<div style="padding:12px 40px 12px 14px;font-size:13px;font-weight:700;color:${TEXT};">Din bostad${
    place ? `<br/><span style="font-weight:400;color:${MUTED};font-size:12px;">${place}</span>` : ''
  }</div>`
}

export function buildListingPopupHtml(listing: Listing, home: HomeLocation | null): string {
  const img = safeUrl(listing.images.find(Boolean))
  const distance = home
    ? ` · ${escapeHtml(formatDistance(haversineKm(home.lat, home.lng, listing.lat, listing.lng)))} från din bostad`
    : ''
  const amenityTags = [
    listing.balcony && 'Balkong',
    listing.elevator && 'Hiss',
    listing.furnished && 'Möblerad',
    listing.petsAllowed && 'Husdjur OK',
  ].filter(Boolean) as string[]
  const pill = (text: string) =>
    `<span style="background:rgba(21,63,50,0.08); color:${BRAND}; font-size:11px; font-weight:600; padding:3px 8px; border-radius:999px;">${escapeHtml(text)}</span>`

  return `
    <div style="width: 240px; overflow: hidden; font-family: inherit;">
      <div style="position: relative;">
        ${
          img
            ? `<img src="${img}" alt="" loading="lazy" style="width:100%; height:140px; object-fit:cover; display:block;" />`
            : `<div style="width:100%; height:90px; background:#E3EBE2;"></div>`
        }
        ${
          listing.videoUrl
            ? `<span style="position:absolute; left:10px; top:10px; display:flex; align-items:center; gap:4px; background:rgba(21,33,30,0.78); color:white; font-size:11px; font-weight:700; padding:3px 8px 3px 6px; border-radius:999px;">
                 <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>Video
               </span>`
            : ''
        }
      </div>
      <div style="padding: 14px;">
        <p style="font-weight:700; font-size:14px; margin:0 0 2px; line-height:1.3; color:${TEXT};">${escapeHtml(listing.address || listing.title)}</p>
        <p style="color:${MUTED}; font-size:12px; margin:0 0 8px;">${escapeHtml(listing.district)}${distance}</p>
        <p style="color:${TEXT}; font-size:12.5px; margin:0 0 8px; font-weight:500;">
          ${escapeHtml(listing.area)} m² · ${escapeHtml(listing.rooms)} rum${listing.floor != null ? ` · vån ${escapeHtml(listing.floor)}` : ''}
        </p>
        <p style="font-weight:700; color:${BRAND}; font-size:14.5px; margin:0 0 10px;">${escapeHtml(formatRent(listing.rent))}</p>
        ${
          amenityTags.length > 0
            ? `<div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:10px;">${amenityTags.map(pill).join('')}</div>`
            : ''
        }
        <div style="display:flex; align-items:center; justify-content:space-between; padding-top:8px; border-top:1px solid rgba(21,63,50,0.08); margin-bottom:10px;">
          <span style="color:#9EA69D; font-size:11px;">${escapeHtml(formatDate(listing.createdAt))}</span>
          <span style="color:#A8B9A4; font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">Bytaren</span>
        </div>
        <a href="/annonser/${encodeURIComponent(listing.id)}" style="display:block; background:${BRAND}; color:white; text-align:center; padding:9px; border-radius:10px; font-size:12.5px; font-weight:600; text-decoration:none;">
          Visa annons
        </a>
      </div>
    </div>
  `
}

// Keyless tile servers only — Carto's basemaps now require an API key and
// render "API KEY REQUIRED" watermarks without one.
export const BASEMAPS = {
  standard: {
    label: 'Karta',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  },
  transit: {
    label: 'Kollektivtrafik',
    url: 'https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap · ÖPNVKarte',
    maxZoom: 18,
  },
} as const
export type BasemapKey = keyof typeof BASEMAPS
