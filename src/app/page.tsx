'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, Home, Plus } from 'lucide-react'
import { fetchListings } from '@/lib/listings'
import type { Listing } from '@/types'
import ListingCard from '@/components/ListingCard'
import HeroSearch from '@/components/HeroSearch'
import AdSlot from '@/components/AdSlot'

const ListingMap = dynamic(() => import('@/components/ListingMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#E9EEE7]" />,
})

const STEPS = [
  {
    title: 'Lägg upp din lägenhet',
    desc: 'Bilder, adress och hyra. Annonsen ligger ute i 60 dagar och kan förnyas. Berätta också vad du själv letar efter.',
  },
  {
    title: 'Hitta någon att byta med',
    desc: 'Sök på kartan eller filtrera på rum, hyra och tillgänglighet. Sortera på bäst match för att se vilka lägenheter som passar det du söker — och där din lägenhet passar det de söker.',
  },
  {
    title: 'Prata ihop er och ansök',
    desc: 'Skriv till varandra här på Hyresvägen. Ett byte måste godkännas av era hyresvärdar innan ni flyttar.',
  },
]

const SAFETY = [
  {
    title: 'Chatta utan att lämna ut nummer',
    desc: 'All kontakt kan ske i meddelandena här tills du själv vill dela mer.',
  },
  {
    title: 'Betala aldrig för ett byte',
    desc: 'Att ta betalt för en hyresrätt är olagligt. Ber någon om pengar för kontraktet, avbryt och anmäl annonsen.',
  },
  {
    title: 'Anmäl annonser som verkar fel',
    desc: 'Varje annons har en anmälningsknapp. Anmälningar granskas och falska annonser tas bort.',
  },
]

function formatRentShort(rent: number) {
  return `${new Intl.NumberFormat('sv-SE').format(rent)} kr/mån`
}

function HeroListingCard({ listing, size }: { listing: Listing; size: 'lg' | 'sm' }) {
  const image = listing.images.find(Boolean)
  return (
    <Link
      href={`/annonser/${listing.id}`}
      className="group block overflow-hidden rounded-[24px] bg-white shadow-[0_20px_60px_rgba(13,45,38,0.16)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-offset-4"
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#E3EBE2]">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#A8B9A4]">
            <Home size={size === 'lg' ? 40 : 28} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className={size === 'lg' ? 'p-5' : 'p-4'}>
        <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#8FA38B]">{listing.district}, Stockholm</p>
        <p className={size === 'lg' ? 'text-[17px] font-semibold text-gray-900' : 'text-[14.5px] font-semibold text-gray-900'}>
          {listing.rooms} rok · {listing.area} m²
        </p>
        <p className={size === 'lg' ? 'mt-0.5 text-[15px] font-bold text-[#153F32]' : 'mt-0.5 text-[13.5px] font-bold text-[#153F32]'}>
          {formatRentShort(listing.rent)}
        </p>
      </div>
    </Link>
  )
}

// The two newest real listings, overlapping. No placeholders or invented
// listings: with none published yet it invites the visitor to be first.
function HeroListings({ listings, loaded, total }: { listings: Listing[]; loaded: boolean; total: number }) {
  if (!loaded) {
    return <div className="mx-auto aspect-[4/3] w-full max-w-[520px] animate-pulse rounded-[24px] bg-[#E9EEE7]" aria-hidden />
  }
  if (listings.length === 0) {
    return (
      <div className="card-muted mx-auto flex max-w-[520px] flex-col items-start gap-4 p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#153F32]">
          <Home size={22} strokeWidth={1.75} />
        </span>
        <p className="text-[18px] font-semibold text-gray-900">Bli först ut</p>
        <p className="text-[14.5px] text-gray-600">Inga lägenheter är upplagda ännu. Lägg upp din så syns den här.</p>
        <Link href="/annonser/ny" className="btn btn-primary">
          <Plus size={16} strokeWidth={2.25} /> Lägg upp annons
        </Link>
      </div>
    )
  }
  const [first, second] = listings
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className={second ? 'w-[82%]' : 'w-full'}>
        <HeroListingCard listing={first} size="lg" />
      </div>
      {second && (
        <div className="relative -mt-24 ml-auto w-[52%] sm:-mt-32">
          <HeroListingCard listing={second} size="sm" />
        </div>
      )}
      <Link
        href="/annonser"
        className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-[#153F32] hover:underline"
      >
        {total === 1 ? 'Se annonsen' : `Se alla ${total} annonser`} <ArrowRight size={15} />
      </Link>
    </div>
  )
}

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const active = useMemo(() => listings.filter((l) => l.status === 'aktiv'), [listings])
  const newest = active.slice(0, 6)

  return (
    <div>
      {/* ── Hero: search + the real map ─────────────────────────────── */}
      <section className="border-b border-[rgba(21,63,50,0.07)]">
        <div className="container-page grid items-center gap-10 pb-12 pt-10 sm:pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:pb-16">
          <div className="min-w-0">
            <p className="mb-4 text-[13px] font-medium text-[#6F8A6A]">Bostadsbyte i Stockholm</p>
            <h1 className="mb-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#15211E] sm:text-[52px] lg:text-[60px]">
              Byt lägenhet med någon som vill ha din.
            </h1>
            <p className="mb-8 max-w-[500px] text-[17px] leading-relaxed text-gray-600">
              Lägg upp din hyresrätt, hitta en lägenhet du gillar och byt direkt med den som bor där. Att söka,
              annonsera och skriva till andra kostar ingenting.
            </p>

            <div className="max-w-[580px]">
              <HeroSearch />
            </div>

            <p className="mt-7 text-[14.5px] text-gray-600">
              Har du en lägenhet att byta bort?{' '}
              <Link href="/annonser/ny" className="font-semibold text-[#153F32] underline-offset-4 hover:underline">
                Lägg upp annons
              </Link>
            </p>
          </div>

          <div className="min-w-0">
            <HeroListings listings={active.slice(0, 2)} loaded={loaded} total={active.length} />
          </div>
        </div>
      </section>

      {/* ── Newest listings ─────────────────────────────────────────── */}
      <section className="section">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-[26px] font-semibold tracking-[-0.015em] text-gray-900 sm:text-[30px]">Senast upplagda</h2>
            {active.length > 0 && (
              <Link href="/annonser" className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#153F32] hover:underline">
                Visa alla <ArrowRight size={15} />
              </Link>
            )}
          </div>

          {newest.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newest.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : loaded ? (
            <div className="card-muted flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[#153F32]">
                  <Home size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[16px] font-semibold text-gray-900">Inga annonser ännu</p>
                  <p className="text-[14px] text-gray-600">Lägg upp din lägenhet så syns den här för alla som söker.</p>
                </div>
              </div>
              <Link href="/annonser/ny" className="btn btn-primary">
                <Plus size={16} strokeWidth={2.25} /> Lägg upp annons
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="aspect-[4/3] animate-pulse bg-[#E9EEE7]" />
                  <div className="space-y-3 p-5">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-[#E9EEE7]" />
                    <div className="h-4 w-4/5 animate-pulse rounded bg-[#E9EEE7]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <AdSlot placement="home" className="mt-10" />
        </div>
      </section>

      {/* ── Map ─────────────────────────────────────────────────────── */}
      <section className="section pt-0">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-[26px] font-semibold tracking-[-0.015em] text-gray-900 sm:text-[30px]">Se var bytena finns</h2>
            <Link href="/annonser?vy=karta" className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#153F32] hover:underline">
              Öppna kartan <ArrowRight size={15} />
            </Link>
          </div>
          <div className="card h-[360px] overflow-hidden sm:h-[460px]">
            {/* An empty map's own hint talks about filters, which don't exist here. */}
            <ListingMap listings={active} loading={!loaded || active.length === 0} />
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="section bg-[#F5F0E8]">
        <div className="container-page">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="text-[26px] font-semibold tracking-[-0.015em] text-gray-900 sm:text-[30px]">Så går ett byte till</h2>
            <Link href="/hur-det-fungerar" className="hidden text-[14px] font-semibold text-[#153F32] hover:underline sm:inline">
              Läs mer
            </Link>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="mb-4 block text-[15px] font-semibold tabular-nums text-[#6F8A6A]">0{i + 1}</span>
                <h3 className="mb-2 text-[18px] font-semibold text-gray-900">{step.title}</h3>
                <p className="text-[15px] leading-relaxed text-gray-600">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Safety ──────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container-page">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="text-[26px] font-semibold tracking-[-0.015em] text-gray-900 sm:text-[30px]">Byt tryggt</h2>
            <Link href="/trygghet" className="hidden text-[14px] font-semibold text-[#153F32] hover:underline sm:inline">
              Fler tips
            </Link>
          </div>
          <div className="grid gap-8 border-t border-[rgba(21,63,50,0.08)] pt-8 sm:grid-cols-3 sm:gap-10">
            {SAFETY.map((item) => (
              <div key={item.title}>
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">{item.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing ─────────────────────────────────────────────────── */}
      <section className="border-t border-[rgba(21,63,50,0.07)] bg-[#E3EBE2]">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.015em] text-gray-900">Har du en hyresrätt du vill byta?</h2>
            <p className="mt-1 text-[15px] text-gray-600">Lägg upp den gratis och se vem som hör av sig.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/annonser/ny" className="btn btn-primary btn-lg">
              <Plus size={16} strokeWidth={2.25} /> Lägg upp annons
            </Link>
            <Link href="/annonser" className="btn btn-secondary btn-lg">
              Se annonser
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
