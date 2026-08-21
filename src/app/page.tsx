'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, Shield } from 'lucide-react'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import ListingCard from '@/components/ListingCard'
import HeroSearch from '@/components/HeroSearch'

const ListingMap = dynamic(() => import('@/components/ListingMap'), { ssr: false })

/* ─── Static content ─────────────────────────────────────────────────── */

const BENEFITS = [
  {
    icon: '✦',
    title: 'Kostnadsfritt',
    desc: 'Ingen mäklarprovision eller dolda avgifter. Alltid gratis att söka och byta.',
  },
  {
    icon: '◈',
    title: 'Tryggt & säkert',
    desc: 'Verifierade användare och tydliga profiler. Du vet alltid vem du pratar med.',
  },
  {
    icon: '⊕',
    title: 'Smart matchning',
    desc: 'Vi hjälper dig hitta personer med omvända behov. Rätt byte, snabbare.',
  },
  {
    icon: '◎',
    title: 'Snabbt & enkelt',
    desc: 'Skapa din annons på några minuter. Kom igång redan idag.',
  },
]

const TRUST_POINTS = [
  'Verifierade profiler och identiteter',
  'Transparent kommunikation direkt i appen',
  'Rapporteringsfunktion för otillbörligt beteende',
  'Ingen mäklare behövs — du bestämmer',
  'Du väljer alltid vem du kontaktar',
]

/* ─── Shared atoms ───────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
      {children}
    </p>
  )
}

function SectionHeading({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <h2
      className="font-display leading-[1.05] tracking-[-0.025em]"
      style={{
        fontSize: 'clamp(32px, 3.5vw, 46px)',
        fontStyle: 'italic',
        color: light ? 'white' : '#15211E',
      }}
    >
      {children}
    </h2>
  )
}

function CheckIcon() {
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#153F32' }}>
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

/* ─── Hero property card (static) ────────────────────────────────────── */

interface HeroCardProps {
  listing: (typeof MOCK_LISTINGS)[0]
  matchPct: number
  style?: React.CSSProperties
  imageStyle?: React.CSSProperties
  compact?: boolean
}

function HeroCard({ listing, matchPct, style, imageStyle, compact }: HeroCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(13,45,38,0.16)',
        ...style,
      }}
    >
      <div style={{ aspectRatio: '4/3', overflow: 'hidden', backgroundColor: '#E3EBE2', ...imageStyle }}>
        {listing.images[0] && (
          <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className={compact ? 'p-4' : 'p-5'}>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.10em] mb-1"
          style={{ color: '#A8B9A4' }}
        >
          {listing.district}, Stockholm
        </p>
        <p
          className={compact ? 'text-[14px] font-semibold mb-0.5' : 'text-[16px] font-semibold mb-1'}
          style={{ color: '#15211E' }}
        >
          {listing.rooms} rok, {listing.area} m²
        </p>
        <p className={compact ? 'text-[13px] font-bold' : 'text-[15px] font-bold'} style={{ color: '#153F32' }}>
          {new Intl.NumberFormat('sv-SE').format(listing.rent)} kr/mån
        </p>
      </div>
      {/* Match badge */}
      <div
        className="absolute top-4 left-4 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-white"
        style={{ backgroundColor: '#153F32' }}
      >
        ♥ {matchPct}% match
      </div>
    </div>
  )
}

/* ─── Matching user card ─────────────────────────────────────────────── */

interface MatchUserProps {
  avatar: string
  name: string
  age: number
  district: string
  from: string
  to: string
}

function MatchUser({ avatar, name, age, district, from, to }: MatchUserProps) {
  return (
    <div
      className="flex-1 max-w-[260px] p-6 rounded-[20px]"
      style={{ backgroundColor: 'rgba(168,185,164,0.15)', border: '1px solid rgba(21,63,50,0.10)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <img src={avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white" alt={name} />
        <div>
          <p className="text-[14px] font-semibold" style={{ color: '#15211E' }}>{name}, {age}</p>
          <p className="text-[12px]" style={{ color: '#9EA69D' }}>{district}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[13px]" style={{ color: '#6D716C' }}>
          Har: <span className="font-semibold" style={{ color: '#15211E' }}>{from}</span>
        </p>
        <p className="text-[13px]" style={{ color: '#6D716C' }}>
          Söker: <span className="font-semibold" style={{ color: '#15211E' }}>{to}</span>
        </p>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function HomePage() {
  const featured = useMemo(() => MOCK_LISTINGS.filter((l) => l.status === 'aktiv').slice(0, 6), [])
  const card1 = featured[0]
  const card2 = featured[1]
  const card3 = featured[2]

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ═══════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FBFAF7', position: 'relative' }}>
        {/* Soft radial blob top-right */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-8%',
            width: '65vw',
            height: '90vh',
            background: 'radial-gradient(ellipse, rgba(168,185,164,0.22) 0%, transparent 68%)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="max-w-[1360px] mx-auto px-6 sm:px-10 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-20 items-center"
          style={{ paddingTop: 72, paddingBottom: 88, minHeight: 800 }}
        >
          {/* ── Left column ── */}
          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* Eyebrow pill */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] mb-8"
              style={{ backgroundColor: 'rgba(168,185,164,0.22)', color: '#153F32' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#153F32' }} />
              100% GRATIS · INGA MELLANHÄNDER
            </div>

            {/* Headline */}
            <h1
              className="font-display mb-7"
              style={{
                fontSize: 'clamp(52px, 6vw, 96px)',
                fontStyle: 'italic',
                lineHeight: 0.95,
                letterSpacing: '-0.03em',
                color: '#15211E',
              }}
            >
              Byt bostad —<br />
              <span style={{ color: '#153F32' }}>på dina villkor.</span>
            </h1>

            {/* Ingress */}
            <p
              className="mb-8 leading-[1.65] max-w-[520px]"
              style={{ fontSize: 'clamp(16px, 1.4vw, 19px)', color: '#6D716C' }}
            >
              Hitta någon med omvända behov och byt bostad utan mäklare, utan kö och utan mellanhänder.
              Ett enklare sätt att hitta ditt nästa hem.
            </p>

            {/* Search */}
            <div className="mb-6">
              <HeroSearch />
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 mb-12">
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href="/registrera"
                  className="btn-arrow flex items-center gap-2 px-7 py-4 rounded-[14px] text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0"
                  style={{ backgroundColor: '#153F32' }}
                >
                  Skapa konto — gratis
                  <ArrowRight size={15} className="arrow-icon" />
                </Link>
                <Link
                  href="/annonser"
                  className="flex items-center gap-2 px-7 py-4 rounded-[14px] text-[15px] font-semibold transition-all hover:-translate-y-[1px]"
                  style={{
                    color: '#153F32',
                    border: '1.5px solid rgba(21,63,50,0.22)',
                    backgroundColor: 'transparent',
                  }}
                >
                  Hitta byte
                </Link>
              </div>
              <p className="text-[13px]" style={{ color: '#9EA69D' }}>
                Gratis att söka, annonsera och kontakta — alltid.
              </p>
            </div>

          </div>

          {/* ── Right column: property cards ── */}
          <div className="relative hidden lg:block" style={{ height: 600 }}>
            {/* Extra soft blob behind cards */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: '-20%',
                background: 'radial-gradient(ellipse 80% 80% at 55% 50%, rgba(163,200,187,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Main card */}
            {card1 && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: '18%' }}>
                <div style={{ position: 'relative' }}>
                  <HeroCard listing={card1} matchPct={98} />
                </div>
              </div>
            )}

            {/* Secondary card */}
            {card2 && (
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '52%' }}>
                <div style={{ position: 'relative' }}>
                  <HeroCard listing={card2} matchPct={94} compact />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          BENEFITS
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FBFAF7', paddingTop: 96, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="mb-14 max-w-lg">
            <Eyebrow>Varför Bytaren?</Eyebrow>
            <SectionHeading>Ett enklare sätt att byta bostad.</SectionHeading>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {BENEFITS.map((b) => (
              <div key={b.title}>
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-5"
                  style={{ backgroundColor: 'rgba(168,185,164,0.22)', color: '#153F32' }}
                >
                  {b.icon}
                </div>
                <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#15211E' }}>
                  {b.title}
                </h3>
                <p className="text-[14px] leading-[1.65]" style={{ color: '#6D716C' }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURED LISTINGS
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#F5F0E8', paddingTop: 96, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Eyebrow>Aktuella annonser</Eyebrow>
              <SectionHeading>Utforska bostadsbyten.</SectionHeading>
              <p className="mt-3 text-[15px]" style={{ color: '#6D716C' }}>
                Hitta ditt nästa hem bland aktuella annonser.
              </p>
            </div>
            <Link
              href="/annonser"
              className="hidden sm:flex items-center gap-1.5 text-[14px] font-semibold btn-arrow flex-shrink-0 mb-1"
              style={{ color: '#153F32' }}
            >
              Visa alla <ArrowRight size={14} className="arrow-icon" />
            </Link>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            {['Alla', 'Lägenhet'].map((chip, i) => (
              <button
                key={chip}
                className="px-4 py-2 rounded-full text-[13px] font-medium transition-all"
                style={
                  i === 0
                    ? { backgroundColor: '#153F32', color: 'white' }
                    : {
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        color: '#6D716C',
                        border: '1px solid rgba(21,63,50,0.12)',
                      }
                }
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          <div className="mt-10 text-center sm:hidden">
            <Link
              href="/annonser"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[14px] text-[15px] font-semibold text-white"
              style={{ backgroundColor: '#153F32' }}
            >
              Visa alla annonser <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MAP
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FBFAF7', paddingTop: 96, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="flex items-end justify-between mb-10">
            <div>
              <Eyebrow>Kartvyn</Eyebrow>
              <SectionHeading>Se var bytena finns.</SectionHeading>
              <p className="mt-3 text-[15px]" style={{ color: '#6D716C' }}>
                Klicka på en markering för att se annonsens detaljer.
              </p>
            </div>
            <Link
              href="/annonser"
              className="hidden sm:flex items-center gap-1.5 text-[14px] font-semibold btn-arrow flex-shrink-0 mb-1"
              style={{ color: '#153F32' }}
            >
              Visa alla annonser <ArrowRight size={14} className="arrow-icon" />
            </Link>
          </div>
          <div
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              height: 480,
              boxShadow: '0 4px 24px rgba(15,30,24,0.10)',
              border: '1px solid rgba(21,63,50,0.08)',
            }}
          >
            <ListingMap listings={featured} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          MATCHING EXPLANATION
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#FBFAF7', paddingTop: 96, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="text-center max-w-xl mx-auto mb-14">
            <Eyebrow>Smart matchning</Eyebrow>
            <SectionHeading>Vi letar efter rätt byte åt dig.</SectionHeading>
            <p className="mt-4 text-[15px] leading-[1.65]" style={{ color: '#6D716C' }}>
              Vår algoritm matchar dig med personer som har precis omvända önskemål.
              Rätt byte, vid rätt tid, utan onödiga omvägar.
            </p>
          </div>

          {/* Match visual */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mb-12 flex-wrap sm:flex-nowrap">
            <MatchUser
              avatar="https://i.pravatar.cc/80?img=9"
              name="Sara"
              age={29}
              district="Södermalm"
              from="2 rok, Södermalm"
              to="Vasastan eller Kungsholmen"
            />

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold"
                style={{ backgroundColor: '#153F32' }}
              >
                ⇄
              </div>
              <div
                className="px-3 py-1 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: 'rgba(21,63,50,0.10)', color: '#153F32' }}
              >
                98% match
              </div>
            </div>

            <MatchUser
              avatar="https://i.pravatar.cc/80?img=22"
              name="Erik"
              age={34}
              district="Vasastan"
              from="2 rok, Vasastan"
              to="Södermalm"
            />
          </div>

          <div className="text-center">
            <Link
              href="/hur-det-fungerar"
              className="btn-arrow inline-flex items-center gap-2 px-6 py-3.5 rounded-[14px] text-[15px] font-semibold transition-all hover:-translate-y-[1px]"
              style={{
                color: '#153F32',
                border: '1.5px solid rgba(21,63,50,0.22)',
              }}
            >
              Se hur matchningen fungerar <ArrowRight size={15} className="arrow-icon" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRUST / SAFETY
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#E3EBE2', paddingTop: 96, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Text side */}
            <div>
              <Eyebrow>Trygghet</Eyebrow>
              <SectionHeading>Ett tryggare sätt att hitta ditt nästa hem.</SectionHeading>
              <p className="mt-5 text-[15px] leading-[1.65] mb-8" style={{ color: '#6D716C' }}>
                Bytaren är byggt för ett av livets viktigaste beslut. Därför har vi lagt stor vikt vid att
                göra plattformen så trygg och transparent som möjligt.
              </p>
              <div className="space-y-4">
                {TRUST_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-3">
                    <CheckIcon />
                    <span className="text-[15px]" style={{ color: '#15211E' }}>{point}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href="/trygghet"
                  className="btn-arrow inline-flex items-center gap-2 px-6 py-3.5 rounded-[14px] text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-lg"
                  style={{ backgroundColor: '#153F32' }}
                >
                  Läs om vår trygghet <ArrowRight size={15} className="arrow-icon" />
                </Link>
              </div>
            </div>

            {/* Card side */}
            {card3 && (
              <div className="relative">
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 28,
                    overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(13,45,38,0.10)',
                  }}
                >
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img src={card3.images[0]} alt="Trygg bostad" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(21,63,50,0.10)' }}
                      >
                        <Shield size={18} style={{ color: '#153F32' }} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: '#15211E' }}>
                          Verifierad profil
                        </p>
                        <p className="text-[12px]" style={{ color: '#9EA69D' }}>Identitet bekräftad</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA
      ════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: '#0D2F26', paddingTop: 96, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: '#A8B9A4' }}>
            Kom igång idag
          </p>
          <h2
            className="font-display mb-5"
            style={{
              fontSize: 'clamp(36px, 4.5vw, 64px)',
              fontStyle: 'italic',
              lineHeight: 1.0,
              letterSpacing: '-0.03em',
              color: 'white',
            }}
          >
            Nytt hem.<br />Utan omvägar.
          </h2>
          <p
            className="leading-[1.65] mb-10 max-w-md mx-auto"
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}
          >
            Tusentals stockholmare har redan hittat sitt nästa hem via Bytaren. Nu är det din tur.
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/registrera"
                className="btn-arrow flex items-center gap-2 px-8 py-4 rounded-[14px] text-[15px] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-xl active:translate-y-0"
                style={{ backgroundColor: 'white', color: '#153F32' }}
              >
                Skapa konto — helt gratis <ArrowRight size={15} className="arrow-icon" />
              </Link>
              <Link
                href="/annonser"
                className="flex items-center gap-2 px-8 py-4 rounded-[14px] text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px]"
                style={{ border: '1.5px solid rgba(255,255,255,0.18)' }}
              >
                Utforska byten
              </Link>
            </div>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Ingen mäklarprovision · Inga dolda avgifter · Gratis för alla
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{ backgroundColor: '#111A16' }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 py-16">
          <div className="grid sm:grid-cols-4 lg:grid-cols-5 gap-10 mb-12">

            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#153F32' }}
                >
                  <svg width="20" height="20" viewBox="0 0 28 27" fill="none">
                    <path d="M14 3L22 11V22H6V11L14 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M22 11V3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M19.5 5.5L22 3L24.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 22V25" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M3.5 23L6 25L8.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[13px] font-bold tracking-[0.13em] uppercase text-white">
                  BYTAREN
                </span>
              </div>
              <p className="text-[14px] leading-relaxed max-w-[230px] mb-5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                Stockholms enklaste sätt att byta bostad — utan kö och utan mäklare.
              </p>
            </div>

            {/* Link columns */}
            {[
              { title: 'Plattform', links: ['Hitta byte', 'Lägg upp annons', 'Hur det fungerar', 'Kartvyn'] },
              { title: 'Konto', links: ['Logga in', 'Registrera dig', 'Mina sidor', 'Meddelanden'] },
              { title: 'Bytaren', links: ['Om oss', 'Trygghet', 'Integritetspolicy', 'Villkor', 'Kontakt'] },
            ].map((col) => (
              <div key={col.title}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-4"
                  style={{ color: 'rgba(255,255,255,0.38)' }}
                >
                  {col.title}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[13px] transition-colors hover:text-white"
                        style={{ color: 'rgba(255,255,255,0.45)' }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="border-t flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[12px]"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.28)' }}
          >
            <span>© 2026 Bytaren AB — Alla rättigheter förbehållna</span>
            <div className="flex items-center gap-5">
              {['Integritetspolicy', 'Villkor', 'Kontakt'].map((l) => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
