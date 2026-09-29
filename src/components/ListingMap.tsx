'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker, MarkerClusterGroup, TileLayer, LayerGroup, LatLngBoundsExpression } from 'leaflet'
import { Plus, Minus, LocateFixed, Maximize2, Layers, Loader2, MapPin } from 'lucide-react'
import { DISTRICT_CENTERS, type Listing } from '@/types'
import { useHomeLocation, type HomeLocation } from '@/lib/useHomeLocation'
import {
  BASEMAPS,
  type BasemapKey,
  type LeafletNS,
  type MarkerState,
  buildClusterIcon,
  buildHomeIcon,
  buildHomePopupHtml,
  buildListingPopupHtml,
  buildPriceIcon,
  ensureMapStyles,
} from '@/components/map/markers'

import type { MapBounds } from '@/components/map/bounds'

interface ListingMapProps {
  listings: Listing[]
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  /** Listing hovered in a list next to the map (highlighted, panned to if off-screen). */
  hoveredId?: string | null
  /** Called when a marker is hovered, so the list can highlight the card. */
  onHover?: (id: string | null) => void
  /** Called (debounced) with the visible area after the map moves. */
  onBoundsChange?: (bounds: MapBounds) => void
  /** Shows the "Sök när kartan flyttas" toggle when both are given. */
  searchInBounds?: boolean
  onSearchInBoundsChange?: (value: boolean) => void
  /** Districts filtered on — used to centre the map when no listings match. */
  focusDistricts?: string[]
  /** Suppresses the empty-state hint while listings are still loading. */
  loading?: boolean
  zoom?: number
  /** A fixed centre disables automatic fit-to-listings (e.g. the detail page). */
  center?: [number, number]
}

const STOCKHOLM: [number, number] = [59.334591, 18.06324]
const FIT_OPTIONS = { padding: [48, 48] as [number, number], maxZoom: 15 }

export default function ListingMap({
  listings,
  selectedId = null,
  onSelect,
  hoveredId = null,
  onHover,
  onBoundsChange,
  searchInBounds,
  onSearchInBoundsChange,
  focusDistricts,
  loading = false,
  zoom = 12,
  center,
}: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<LeafletNS | null>(null)
  const clusterRef = useRef<MarkerClusterGroup | null>(null)
  const tileRef = useRef<TileLayer | null>(null)
  const homeLayerRef = useRef<Marker | null>(null)
  const locateLayerRef = useRef<LayerGroup | null>(null)
  const markersRef = useRef(new Map<string, { marker: Marker; listing: Listing; state: MarkerState }>())
  const listingByMarkerRef = useRef(new WeakMap<Marker, Listing>())
  const activeClusterElRef = useRef<HTMLElement | null>(null)
  const lastFitKeyRef = useRef<string | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Leaflet listeners are registered once, so they read the latest props
  // through refs instead of capturing stale closures (re-registering them
  // on every render would mean rebuilding markers on every hover).
  const home = useHomeLocation()
  const homeRef = useRef<HomeLocation | null>(home)
  const onSelectRef = useRef(onSelect)
  const onHoverRef = useRef(onHover)
  const onBoundsChangeRef = useRef(onBoundsChange)
  const selectedIdRef = useRef(selectedId)
  const hoveredIdRef = useRef(hoveredId)
  useEffect(() => {
    homeRef.current = home
    onSelectRef.current = onSelect
    onHoverRef.current = onHover
    onBoundsChangeRef.current = onBoundsChange
    selectedIdRef.current = selectedId
    hoveredIdRef.current = hoveredId
  })

  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState<BasemapKey>('voyager')
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const showNotice = useCallback((text: string) => {
    setNotice(text)
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000)
  }, [])

  // ── 1. Create the map exactly once ──────────────────────────────────────
  // Intentionally has no reactive deps: an earlier version re-created the
  // whole map whenever selection changed (marker click → onSelect →
  // selectedId → teardown), which also closed the popup that was just
  // opened. Everything after creation happens in the targeted effects below.
  useEffect(() => {
    let cancelled = false
    let map: LeafletMap | null = null
    let resizeObserver: ResizeObserver | null = null
    let boundsTimer: ReturnType<typeof setTimeout> | null = null
    const markerEntries = markersRef.current

    async function init() {
      const mod = await import('leaflet')
      // leaflet ships as CommonJS; depending on bundler interop the namespace
      // is either the module itself or its `default`.
      const L = ((mod as unknown as { default?: LeafletNS }).default ?? mod) as LeafletNS
      await import('leaflet/dist/leaflet.css')
      await import('leaflet.markercluster')
      await import('leaflet.markercluster/dist/MarkerCluster.css')
      if (cancelled || !containerRef.current) return
      ensureMapStyles()
      leafletRef.current = L

      map = L.map(containerRef.current, {
        center: center ?? STOCKHOLM,
        zoom,
        zoomControl: false, // replaced by our own control stack
      })
      mapRef.current = map

      // Clean, low-saturation basemap — closer to Booli/Bostadsförmedlingen than a busy street map.
      tileRef.current = L.tileLayer(BASEMAPS.voyager.url, {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map)

      const cluster = L.markerClusterGroup({
        maxClusterRadius: 52,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c) => {
          const rents = c
            .getAllChildMarkers()
            .map((m) => findListingByMarker(m)?.rent)
            .filter((r): r is number => typeof r === 'number')
          return buildClusterIcon(L, c.getChildCount(), rents.length ? Math.min(...rents) : null)
        },
      })
      map.addLayer(cluster)
      clusterRef.current = cluster

      const emitBounds = () => {
        if (!map) return
        const b = map.getBounds()
        onBoundsChangeRef.current?.({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() })
      }
      // Light debounce: flyTo/fitBounds fire several moveends in a row and
      // the list shouldn't re-render for each of them.
      map.on('moveend', () => {
        if (boundsTimer) clearTimeout(boundsTimer)
        boundsTimer = setTimeout(emitBounds, 200)
      })
      // Clusters are re-rendered on zoom, which drops our highlight class.
      map.on('zoomend', () => highlightCluster())

      // Parent layout changes (sidebar toggles, mobile list overlay, window
      // resizes) otherwise leave grey untiled strips.
      resizeObserver = new ResizeObserver(() => map?.invalidateSize())
      resizeObserver.observe(containerRef.current)

      emitBounds()
      setReady(true)
    }

    init()

    return () => {
      cancelled = true
      if (boundsTimer) clearTimeout(boundsTimer)
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
      resizeObserver?.disconnect()
      map?.remove()
      mapRef.current = null
      clusterRef.current = null
      tileRef.current = null
      homeLayerRef.current = null
      locateLayerRef.current = null
      activeClusterElRef.current = null
      markerEntries.clear()
      lastFitKeyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cluster icons are rebuilt on every zoom, so the marker → listing lookup
  // must be O(1) rather than a scan of all markers.
  function findListingByMarker(m: Marker): Listing | undefined {
    return listingByMarkerRef.current.get(m)
  }

  function stateFor(id: string): MarkerState {
    if (id === selectedIdRef.current) return 'selected'
    if (id === hoveredIdRef.current) return 'hover'
    return 'default'
  }

  // When the active marker is hidden inside a cluster, highlight that
  // cluster bubble instead so hovering a card still shows *where* it is.
  function highlightCluster() {
    activeClusterElRef.current?.classList.remove('bt-cluster-active')
    activeClusterElRef.current = null
    const cluster = clusterRef.current
    const activeId = hoveredIdRef.current ?? selectedIdRef.current
    const entry = activeId ? markersRef.current.get(activeId) : undefined
    if (!cluster || !entry) return
    const parent = cluster.getVisibleParent(entry.marker)
    if (parent && parent !== entry.marker) {
      const el = parent.getElement()
      el?.classList.add('bt-cluster-active')
      activeClusterElRef.current = el ?? null
    }
  }

  function fitToListings(list: Listing[], animate: boolean) {
    const map = mapRef.current
    const L = leafletRef.current
    if (!map || !L) return
    if (list.length > 0) {
      map.fitBounds(L.latLngBounds(list.map((l) => [l.lat, l.lng] as [number, number])), { ...FIT_OPTIONS, animate })
      return
    }
    // Nothing to show: centre on the districts being filtered on, if known,
    // so the user at least sees the area they asked about.
    const centers = (focusDistricts ?? []).map((d) => DISTRICT_CENTERS[d]).filter(Boolean)
    if (centers.length === 1) map.setView(centers[0], 14, { animate })
    else if (centers.length > 1) map.fitBounds(centers as LatLngBoundsExpression, { ...FIT_OPTIONS, animate })
    else map.setView(center ?? STOCKHOLM, zoom, { animate })
  }

  // ── 2. Sync markers with `listings` ─────────────────────────────────────
  // Rebuilds only the marker layer; the map, tiles and viewport survive.
  useEffect(() => {
    const L = leafletRef.current
    const cluster = clusterRef.current
    if (!ready || !L || !cluster) return

    cluster.clearLayers()
    markersRef.current.clear()
    activeClusterElRef.current = null

    const markers = listings.map((listing) => {
      const state = stateFor(listing.id)
      const marker = L.marker([listing.lat, listing.lng], {
        icon: buildPriceIcon(L, listing, state),
        zIndexOffset: state === 'default' ? 0 : 1000,
        title: listing.address,
        riseOnHover: true,
      })
      // Popup content is built lazily on open so it always reflects the
      // current home location (which loads after the listings).
      marker.bindPopup(() => buildListingPopupHtml(listing, homeRef.current), { maxWidth: 260, minWidth: 240 })
      marker.on('click', () => onSelectRef.current?.(listing.id))
      marker.on('popupclose', () => {
        if (selectedIdRef.current === listing.id) onSelectRef.current?.(null)
      })
      marker.on('mouseover', () => onHoverRef.current?.(listing.id))
      marker.on('mouseout', () => onHoverRef.current?.(null))
      markersRef.current.set(listing.id, { marker, listing, state })
      listingByMarkerRef.current.set(marker, listing)
      return marker
    })
    cluster.addLayers(markers)

    // Fit only when the *set* of listings changes (first load, filter
    // change) — not on re-sorts or unrelated re-renders, which would yank
    // the viewport away from wherever the user panned to.
    const fitKey = listings.map((l) => l.id).sort().join(',')
    // Skipped while loading so the first real fit is instant rather than a
    // fly-over from the empty default view.
    if (!center && !loading && fitKey !== lastFitKeyRef.current) {
      const isFirst = lastFitKeyRef.current === null
      lastFitKeyRef.current = fitKey
      fitToListings(listings, !isFirst)
    }
    highlightCluster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, ready, loading])

  // ── 3. Selection / hover → swap icons, raise, pan if off-screen ─────────
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!ready || !L || !map) return

    markersRef.current.forEach((entry, id) => {
      const next = stateFor(id)
      if (next === entry.state) return
      entry.state = next
      entry.marker.setIcon(buildPriceIcon(L, entry.listing, next))
      entry.marker.setZIndexOffset(next === 'selected' ? 2000 : next === 'hover' ? 1000 : 0)
    })
    highlightCluster()

    const activeId = hoveredId ?? selectedId
    const entry = activeId ? markersRef.current.get(activeId) : undefined
    if (entry && !map.getBounds().contains(entry.marker.getLatLng())) {
      map.flyTo(entry.marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.6 })
    }
  }, [selectedId, hoveredId, ready])

  // ── 4. Home marker ──────────────────────────────────────────────────────
  // Depends on primitives: useHomeLocation returns a fresh object each render.
  const homeLat = home?.lat
  const homeLng = home?.lng
  const homeAddress = home?.address
  const homeDistrict = home?.district
  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!ready || !L || !map) return
    homeLayerRef.current?.remove()
    homeLayerRef.current = null
    if (homeLat == null || homeLng == null) return
    homeLayerRef.current = L.marker([homeLat, homeLng], {
      icon: buildHomeIcon(L),
      zIndexOffset: 3000,
      title: 'Din bostad',
    })
      .bindPopup(
        buildHomePopupHtml({ lat: homeLat, lng: homeLng, address: homeAddress ?? '', district: homeDistrict ?? '' }),
        { maxWidth: 220, minWidth: 160 }
      )
      .addTo(map)
  }, [ready, homeLat, homeLng, homeAddress, homeDistrict])

  // ── 5. Basemap ──────────────────────────────────────────────────────────
  useEffect(() => {
    tileRef.current?.setUrl(BASEMAPS[basemap].url)
  }, [basemap, ready])

  function locateMe() {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return
    if (!('geolocation' in navigator)) {
      showNotice('Din webbläsare stöder inte platstjänster.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        if (!mapRef.current) return
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        locateLayerRef.current?.remove()
        locateLayerRef.current = L.layerGroup([
          L.circle(latlng, {
            radius: Math.min(pos.coords.accuracy, 1500),
            color: '#2563EB',
            weight: 1,
            opacity: 0.35,
            fillOpacity: 0.1,
            interactive: false,
          }),
          L.circleMarker(latlng, {
            radius: 7,
            color: 'white',
            weight: 3,
            fillColor: '#2563EB',
            fillOpacity: 1,
          }).bindTooltip('Du är här', { direction: 'top', offset: [0, -8] }),
        ]).addTo(mapRef.current)
        mapRef.current.flyTo(latlng, Math.max(mapRef.current.getZoom(), 14), { duration: 0.8 })
      },
      (err) => {
        setLocating(false)
        showNotice(
          err.code === err.PERMISSION_DENIED
            ? 'Platsåtkomst nekad. Tillåt plats i webbläsarens inställningar.'
            : 'Kunde inte hämta din position just nu.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const showBoundsToggle = searchInBounds !== undefined && !!onSearchInBoundsChange
  const controlBtn =
    'w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-50 hover:text-emerald-700 transition-colors disabled:opacity-50'

  return (
    <div className="relative w-full h-full isolate">
      <div ref={containerRef} className="w-full h-full" />

      {/* Leaflet panes go up to z-index ~700, so overlays sit at z-[1000]. */}
      {showBoundsToggle && (
        <label
          className="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-3.5 py-2 text-xs font-semibold text-gray-800 shadow-[0_2px_10px_rgba(15,30,24,0.14)] cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={searchInBounds}
            onChange={(e) => onSearchInBoundsChange?.(e.target.checked)}
            className="w-4 h-4 accent-emerald-600 cursor-pointer"
          />
          Sök när kartan flyttas
        </label>
      )}

      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,30,24,0.14)] divide-y divide-gray-100">
          <button type="button" className={controlBtn} onClick={() => mapRef.current?.zoomIn()} aria-label="Zooma in" title="Zooma in">
            <Plus size={18} />
          </button>
          <button type="button" className={controlBtn} onClick={() => mapRef.current?.zoomOut()} aria-label="Zooma ut" title="Zooma ut">
            <Minus size={18} />
          </button>
        </div>
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(15,30,24,0.14)] divide-y divide-gray-100">
          <button
            type="button"
            className={controlBtn}
            onClick={locateMe}
            disabled={locating}
            aria-label="Min position"
            title="Min position"
          >
            {locating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
          </button>
          {!center && (
            <button
              type="button"
              className={controlBtn}
              onClick={() => fitToListings(listings, true)}
              aria-label="Visa alla annonser"
              title="Visa alla"
            >
              <Maximize2 size={16} />
            </button>
          )}
          {home && (
            <button
              type="button"
              className={controlBtn}
              onClick={() => mapRef.current?.flyTo([home.lat, home.lng], 15, { duration: 0.8 })}
              aria-label="Visa din bostad"
              title="Din bostad"
            >
              <MapPin size={17} />
            </button>
          )}
          <button
            type="button"
            className={controlBtn}
            onClick={() => setBasemap((b) => (b === 'voyager' ? 'light' : 'voyager'))}
            aria-label={`Byt kartstil (nu: ${BASEMAPS[basemap].label})`}
            title={`Kartstil: ${BASEMAPS[basemap].label}`}
          >
            <Layers size={17} />
          </button>
        </div>
      </div>

      {ready && !loading && listings.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-[1000] flex justify-center px-4">
          <div className="rounded-2xl bg-white/95 px-4 py-3 text-center text-sm shadow-[0_4px_16px_rgba(15,30,24,0.14)]">
            <p className="font-semibold text-gray-900">Inga annonser att visa här</p>
            <p className="text-xs text-gray-500 mt-0.5">Prova att ändra dina filter.</p>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[1000] max-w-[90%] rounded-xl bg-gray-900/90 px-4 py-2.5 text-xs font-medium text-white shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  )
}
