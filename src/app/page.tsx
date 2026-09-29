'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowRight, ArrowLeftRight, Wallet, ShieldCheck, Sparkles, Zap, BedDouble, Scale,
  ListChecks, MessageSquare, Flag, Fingerprint, Home, Check, Plus,
} from 'lucide-react'
import { fetchListings } from '@/lib/listings'
import type { Listing } from '@/types'
import ListingCard from '@/components/ListingCard'
import HeroSearch from '@/components/HeroSearch'

const ListingMap = dynamic(() => import('@/components/ListingMap'), { ssr: false })

/* ─── Static content ─────────────────────────────────────────────────── */

const BENEFITS = [
  {
    icon: Wallet,
    title: 'Kostnadsfritt',
    desc: 'Ingen mäklarprovision eller dolda avgifter. Alltid gratis att söka och byta.',
  },
  {
    icon: ShieldCheck,
    title: 'Tryggt & säkert',
    desc: 'Verifierade användare och tydliga profiler. Du vet alltid vem du pratar med.',
  },
  {
    icon: Sparkles,
    title: 'Smart matchning',
    desc: 'Vi hjälper dig hitta personer med omvända behov. Rätt byte, snabbare.',
  },
  {
    icon: Zap,
    title: 'Snabbt & enkelt',
    desc: 'Skapa din annons på några minuter. Kom igång redan idag.',
  },
]

const MATCH_CRITERIA = [
  {
    icon: ArrowLeftRight,
    title: 'Ömsesidig önskan',
    desc: 'Du vill dit de bor — de vill dit du bor. Matchningen kräver att båda parter pekar på varandra. Inga halvdana byten.',
  },
  {
    icon: BedDouble,
    title: 'Rumspassning',
    desc: 'Ditt antal rum matchar mot vad motparten söker, och vice versa. En 3 rok möter en som faktiskt vill ha 3 rok.',
  },
  {
    icon: Scale,
    title: 'Hyresbalans',
    desc: 'Motorn väger hyrornas nivåer mot varandra. Byten med rimliga skillnader lyfts — extrema obalanser sållas bort.',
  },
  {
    icon: ListChecks,
    title: 'Extrakrav matchas',
    desc: 'Balkong, hiss, husdjur tillåtet. Dina måsten vägs mot motpartens bostad, och tvärtom — så du aldrig behöver kompromissa i onödan.',
  },
]

const TRUST_POINTS = [
  'Verifierade profiler och identiteter',
  'Transparent kommunikation direkt i appen',
  'Rapporteringsfunktion för otillbörligt beteende',
  'Ingen mäklare behövs — du bestämmer',
  'Du väljer alltid vem du kontaktar',
]

const TRUST_FEATURES = [
  { icon: Fingerprint, title: 'Logga in med BankID', desc: 'Verifierad legitimation för dig som vill.' },
  { icon: MessageSquare, title: 'Chatt i appen', desc: 'Dela aldrig kontaktuppgifter innan du är redo.' },
  { icon: Flag, title: 'Rapportera annonser', desc: 'Vi går igenom varje rapport manuellt.' },
]

/* ─── Shared atoms ───────────────────────────────────────────────────── */

function SectionIntro({
  eyebrow,
  title,
  lead,
  action,
}: {
  eyebrow: string
  title: string
  lead?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-12">
      <div className="max-w-xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display-md">{title}</h2>
        {lead && <p className="mt-3 text-[15.5px] leading-relaxed text-gray-600">{lead}</p>}
      </div>
      {action}
    </div>
  )
}

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600">
      <Check size={12} strokeWidth={3} className="text-white" />
    </span>
  )
}

/* ─── Hero illustration: two abstract homes and a swap ───────────────── */

function Facade({ variant }: { variant: 'a' | 'b' }) {
  // Simple, clearly illustrated building — not a photo, not a real listing.
  const body = variant === 'a' ? '#153F32' : '#D9C2A3'
  const win = variant === 'a' ? '#F5F0E8' : '#FBFAF7'
  const accent = variant === 'a' ? '#D9C2A3' : '#153F32'
  const cols = variant === 'a' ? 3 : 4
  const rows = variant === 'a' ? 4 : 3
  return (
    <svg viewBox="0 0 200 150" className="h-full w-full" aria-hidden>
      <rect width="200" height="150" fill={variant === 'a' ? '#E3EBE2' : '#F5F0E8'} />
      <circle cx={variant === 'a' ? 160 : 40} cy="34" r="16" fill={variant === 'a' ? '#F5F0E8' : '#E3EBE2'} />
      <rect x="0" y="136" width="200" height="14" fill={variant === 'a' ? '#C9D8C6' : '#E7DCCB'} />
      <g transform={variant === 'a' ? 'translate(52 26)' : 'translate(40 44)'}>
        <rect
          width={variant === 'a' ? 96 : 120}
          height={variant === 'a' ? 112 : 94}
          rx="3"
          fill={body}
        />
        {variant === 'a' && <path d="M-4 0 L48 -16 L100 0 Z" fill={accent} />}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={12 + c * (variant === 'a' ? 26 : 26)}
              y={12 + r * (variant === 'a' ? 24 : 26)}
              width="14"
              height={variant === 'a' ? 14 : 16}
              rx="1.5"
              fill={win}
              opacity={(r + c) % 3 === 0 ? 0.55 : 0.95}
            />
          ))
        )}
        <rect
          x={variant === 'a' ? 38 : 50}
          y={variant === 'a' ? 92 : 74}
          width="20"
          height="20"
          rx="2"
          fill={accent}
        />
      </g>
    </svg>
  )
}

function SwapCard({
  variant,
  label,
  title,
  meta,
  className,
}: {
  variant: 'a' | 'b'
  label: string
  title: string
  meta: string
  className?: string
}) {
  return (
    <div className={`card overflow-hidden ${className ?? ''}`} style={{ boxShadow: 'var(--shadow-hero)' }}>
      <div className="aspect-[4/3] overflow-hidden">
        <Facade variant={variant} />
      </div>
      <div className="p-4 sm:p-5">
        <p className="eyebrow mb-1">{label}</p>
        <p className="text-[15px] font-semibold text-gray-900 sm:text-[16px]">{title}</p>
        <p className="mt-0.5 text-[13px] text-gray-500">{meta}</p>
      </div>
    </div>
  )
}

function HeroIllustration() {
  return (
    <figure className="relative mx-auto w-full max-w-[560px]" aria-label="Illustration av ett bostadsbyte">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[12%] rounded-full"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(163,200,187,0.30) 0%, transparent 65%)' }}
      />
      <div className="relative grid grid-cols-2 items-start gap-4 sm:gap-6">
        <SwapCard variant="a" label="Din bostad" title="2 rok · 54 m²" meta="Södermalm" />
        <SwapCard variant="b" label="Ditt nästa hem" title="3 rok · 72 m²" meta="Vasastan" className="mt-12 sm:mt-16" />
      </div>
      <div className="absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-[rgba(21,63,50,0.08)] sm:h-16 sm:w-16">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white sm:h-12 sm:w-12">
            <ArrowLeftRight size={20} strokeWidth={2} />
          </div>
        </div>
      </div>
      <figcaption className="relative mt-4 text-center text-[11.5px] text-gray-400">Illustration</figcaption>
    </figure>
  )
}

/* ─── Matching example: abstract parties, no real people ─────────────── */

function Party({ letter, has, wants }: { letter: string; has: string; wants: string }) {
  return (
    <div className="card flex-1 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3EBE2] font-display text-[20px] italic text-emerald-600"
        >
          {letter}
        </span>
        <p className="text-[14px] font-semibold text-gray-900">Bytare {letter}</p>
      </div>
      <dl className="space-y-1.5 text-[13.5px]">
        <div className="flex gap-1.5">
          <dt className="text-gray-500">Har:</dt>
          <dd className="font-semibold text-gray-900">{has}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-gray-500">Söker:</dt>
          <dd className="font-semibold text-gray-900">{wants}</dd>
        </div>
      </dl>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchListings()
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const featured = useMemo(() => listings.filter((l) => l.status === 'aktiv').slice(0, 6), [listings])

  return (
    <div>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 70% at 85% 10%, rgba(168,185,164,0.22) 0%, transparent 70%), radial-gradient(50% 50% at 0% 100%, rgba(217,194,163,0.16) 0%, transparent 70%)',
          }}
        />

        <div className="container-page relative grid items-center gap-14 pb-16 pt-10 sm:pt-14 lg:min-h-[calc(100vh-var(--nav-h)-40px)] lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-16">
          {/* Left column */}
          <div className="animate-fade-up min-w-0">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full bg-[rgba(168,185,164,0.22)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              100% gratis · Inga mellanhänder
            </p>

            <h1 className="display-xl mb-6">
              Byt bostad —<br />
              <span className="text-emerald-600">på dina villkor.</span>
            </h1>

            <p className="lead mb-8 max-w-[520px]">
              Hitta någon med omvända behov och byt bostad utan mäklare, utan kö och utan mellanhänder.
              Ett enklare sätt att hitta ditt nästa hem.
            </p>

            <div className="mb-8 max-w-[600px]">
              <HeroSearch />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/registrera" className="btn btn-primary btn-lg btn-arrow">
                Skapa konto — gratis
                <ArrowRight size={16} className="arrow-icon" />
              </Link>
              <Link href="/annonser/ny" className="btn btn-secondary btn-lg">
                <Plus size={16} strokeWidth={2.25} />
                Lägg upp annons
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-gray-500">
              Gratis att söka, annonsera och kontakta — alltid.
            </p>
          </div>

          {/* Right column */}
          <div className="min-w-0 lg:pl-4">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* ═══════════════ BENEFITS ═══════════════ */}
      <section className="section border-t border-[rgba(21,63,50,0.06)]">
        <div className="container-page">
          <SectionIntro eyebrow="Varför Bytaren?" title="Ett enklare sätt att byta bostad." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-muted p-6">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-emerald-600 shadow-xs">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">{title}</h3>
                <p className="text-[14px] leading-[1.65] text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURED LISTINGS ═══════════════ */}
      <section className="section bg-[#F5F0E8]">
        <div className="container-page">
          <SectionIntro
            eyebrow="Aktuella annonser"
            title="Utforska bostadsbyten."
            lead="Hitta ditt nästa hem bland aktuella annonser."
            action={
              <Link href="/annonser" className="btn btn-ghost btn-arrow hidden self-end sm:inline-flex">
                Visa alla <ArrowRight size={15} className="arrow-icon" />
              </Link>
            }
          />

          {featured.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : loaded ? (
            <div className="card flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3EBE2] text-emerald-600">
                <Home size={24} strokeWidth={1.75} />
              </span>
              <h3 className="text-[17px] font-semibold text-gray-900">Inga annonser att visa just nu</h3>
              <p className="mt-1.5 max-w-sm text-[14px] text-gray-600">
                Bli en av de första — lägg upp din bostad så att andra kan hitta dig.
              </p>
              <Link href="/annonser/ny" className="btn btn-primary mt-6">
                <Plus size={16} strokeWidth={2.25} />
                Lägg upp annons
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
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[#E9EEE7]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 sm:hidden">
            <Link href="/annonser" className="btn btn-primary btn-block">
              Visa alla annonser <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ MAP ═══════════════ */}
      <section className="section">
        <div className="container-page">
          <SectionIntro
            eyebrow="Kartvyn"
            title="Se var bytena finns."
            lead="Klicka på en markering för att se annonsens detaljer."
            action={
              <Link href="/annonser" className="btn btn-ghost btn-arrow hidden self-end sm:inline-flex">
                Öppna kartan <ArrowRight size={15} className="arrow-icon" />
              </Link>
            }
          />
          <div className="card h-[360px] overflow-hidden sm:h-[480px]">
            <ListingMap listings={featured} />
          </div>
        </div>
      </section>

      {/* ═══════════════ MATCHING ═══════════════ */}
      <section className="section border-t border-[rgba(21,63,50,0.06)]">
        <div className="container-page">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            {/* Copy */}
            <div>
              <p className="eyebrow">Smart matchning — kommer snart</p>
              <h2 className="display-md">Algoritmen som hittar ditt perfekta byte.</h2>
              <p className="mb-10 mt-5 text-[15.5px] leading-[1.75] text-gray-600">
                Vi bygger en matchningsmotor som ska göra det tunga jobbet åt dig. Istället för att bläddra igenom
                hundratals annonser ska den analysera era respektive önskemål och presentera bara de byten som
                faktiskt kan fungera för båda parter. Så här är tanken:
              </p>

              <div className="space-y-6">
                {MATCH_CRITERIA.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[rgba(21,63,50,0.07)] text-emerald-600">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="mb-1 text-[15px] font-semibold text-gray-900">{title}</p>
                      <p className="text-[14px] leading-[1.65] text-gray-600">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/hur-det-fungerar" className="btn btn-secondary btn-arrow mt-10">
                Se hur matchningen fungerar <ArrowRight size={15} className="arrow-icon" />
              </Link>
            </div>

            {/* Illustrative example */}
            <figure className="card-muted p-5 sm:p-8">
              <figcaption className="eyebrow mb-5 block text-center">Illustrativt exempel</figcaption>
              <div className="relative flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <Party letter="A" has="2 rok, Södermalm" wants="Vasastan eller Kungsholmen" />
                <div className="flex flex-shrink-0 justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-4 ring-[#F5F0E8]">
                    <ArrowLeftRight size={18} strokeWidth={2} className="rotate-90 sm:rotate-0" />
                  </span>
                </div>
                <Party letter="B" has="2 rok, Vasastan" wants="Södermalm" />
              </div>

              <div className="card mt-5 p-5">
                <p className="eyebrow">Så skulle bytet bedömas</p>
                <ul className="space-y-3">
                  {[
                    'Båda vill bo där den andra bor',
                    'Samma antal rum som efterfrågas',
                    'Hyrorna ligger på en rimlig nivå',
                    'Extrakraven jämförs åt båda håll',
                  ].map((row) => (
                    <li key={row} className="flex items-center gap-3 text-[14px] text-gray-800">
                      <CheckIcon />
                      {row}
                    </li>
                  ))}
                </ul>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST ═══════════════ */}
      <section className="section bg-[#E3EBE2]">
        <div className="container-page">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="eyebrow">Trygghet</p>
              <h2 className="display-md">Ett tryggare sätt att hitta ditt nästa hem.</h2>
              <p className="mb-8 mt-5 text-[15.5px] leading-[1.7] text-gray-600">
                Bytaren är byggt för ett av livets viktigaste beslut. Därför har vi lagt stor vikt vid att
                göra plattformen så trygg och transparent som möjligt.
              </p>
              <ul className="space-y-4">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-[15px] text-gray-900">
                    <CheckIcon />
                    {point}
                  </li>
                ))}
              </ul>
              <Link href="/trygghet" className="btn btn-primary btn-arrow mt-9">
                Läs om vår trygghet <ArrowRight size={15} className="arrow-icon" />
              </Link>
            </div>

            <div className="card p-3 sm:p-4" style={{ boxShadow: 'var(--shadow-hero)' }}>
              <ul className="divide-y divide-[rgba(21,63,50,0.07)]">
                {TRUST_FEATURES.map(({ icon: Icon, title, desc }) => (
                  <li key={title} className="flex items-center gap-4 p-4 sm:p-5">
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#E3EBE2] text-emerald-600">
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-gray-900">{title}</p>
                      <p className="text-[13.5px] text-gray-600">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="section relative overflow-hidden bg-[#0D2F26]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(50% 80% at 50% 0%, rgba(94,160,138,0.22) 0%, transparent 70%)' }}
        />
        <div className="container-page relative text-center">
          <p className="eyebrow text-[#A8B9A4]">Kom igång idag</p>
          <h2 className="display-lg mb-5 text-white">
            Nytt hem.<br />Utan omvägar.
          </h2>
          <p className="mx-auto mb-10 max-w-md text-[16px] leading-[1.65] text-white/60">
            Lägg upp din bostad på några minuter och hitta någon som vill byta med dig. Nu är det din tur.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/registrera" className="btn btn-inverse btn-lg btn-arrow">
              Skapa konto — helt gratis <ArrowRight size={15} className="arrow-icon" />
            </Link>
            <Link href="/annonser" className="btn btn-outline-inverse btn-lg">
              Utforska byten
            </Link>
          </div>
          <p className="mt-6 text-[13px] text-white/40">
            Ingen mäklarprovision · Inga dolda avgifter · Gratis för alla
          </p>
        </div>
      </section>
    </div>
  )
}
