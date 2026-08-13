import Link from 'next/link'
import { ArrowRight, Shield, Zap, Users, Star } from 'lucide-react'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import ListingCard from '@/components/ListingCard'
import { formatRent } from '@/lib/utils'

export default function HomePage() {
  const featured = MOCK_LISTINGS.filter((l) => l.status === 'aktiv').slice(0, 4)
  const heroListings = MOCK_LISTINGS.filter((l) => l.status === 'aktiv').slice(0, 2)

  return (
    <div>
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: '#F7F5F1' }}>

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(#1B4F3C 1px, transparent 1px), linear-gradient(90deg, #1B4F3C 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-5 gap-12 items-center py-20 lg:py-28">

            {/* Left — editorial text block */}
            <div className="lg:col-span-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7 border"
                style={{
                  color: '#1B4F3C',
                  backgroundColor: '#EBF3EE',
                  borderColor: '#D4E9DA',
                  letterSpacing: '0.04em',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STOCKHOLMS BYTESPLATTFORM
              </div>

              <h1 className="font-display italic text-[52px] sm:text-[64px] lg:text-[72px] text-gray-900 leading-[1.05] tracking-[-1px] mb-6" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Byt bostad —
                <br />
                <span style={{ color: '#1B4F3C' }}>direkt.</span>
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed max-w-lg mb-8" style={{ color: '#6C6862' }}>
                Hitta någon med omvända behov och byt lägenhet utan mäklare,
                utan kö och utan mellanhänder. Det är så enkelt det ska vara.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-10">
                <Link
                  href="/annonser"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#1B4F3C',
                    boxShadow: '0 4px 20px rgba(27, 79, 60, 0.25)',
                  }}
                >
                  Hitta ett byte
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/annonser/ny"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold rounded-xl border transition-all hover:-translate-y-0.5"
                  style={{
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DDD9D2',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  Lägg upp din annons
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t" style={{ borderColor: '#DDD9D2' }}>
                {[
                  { value: '1 200+', label: 'Aktiva annonser' },
                  { value: '340', label: 'Genomförda byten' },
                  { value: '4.8', label: 'Snittbetyg', suffix: '/ 5' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                      {stat.value}
                    </span>
                    {stat.suffix && (
                      <span className="text-sm font-medium" style={{ color: '#9B9690' }}>
                        {stat.suffix}
                      </span>
                    )}
                    <span className="text-sm" style={{ color: '#9B9690' }}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — floating listing previews */}
            <div className="lg:col-span-2 hidden lg:block relative">
              <div className="relative" style={{ height: '480px' }}>

                {/* Back card */}
                <div
                  className="absolute top-0 right-0 w-64 bg-white rounded-2xl overflow-hidden shadow-xl border"
                  style={{
                    transform: 'rotate(3deg) translateY(12px)',
                    borderColor: '#DDD9D2',
                    boxShadow: '0 20px 60px rgba(27,79,60,0.1)',
                  }}
                >
                  <img
                    src={heroListings[1]?.images[0]}
                    alt=""
                    className="w-full h-36 object-cover"
                    style={{ filter: 'brightness(0.95)' }}
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9B9690' }}>
                      {heroListings[1]?.district}
                    </p>
                    <p className="font-semibold text-sm text-gray-900 line-clamp-1 mb-1">{heroListings[1]?.rooms} rok · {heroListings[1]?.area} m²</p>
                    <p className="font-bold" style={{ color: '#1B4F3C', fontSize: '15px' }}>
                      {heroListings[1] && new Intl.NumberFormat('sv-SE').format(heroListings[1].rent)} kr/mån
                    </p>
                  </div>
                </div>

                {/* Front card — main */}
                <div
                  className="absolute bottom-0 left-0 w-72 bg-white rounded-2xl overflow-hidden shadow-2xl border"
                  style={{
                    transform: 'rotate(-2deg)',
                    borderColor: '#DDD9D2',
                    boxShadow: '0 24px 64px rgba(27,79,60,0.15)',
                    zIndex: 2,
                  }}
                >
                  <img
                    src={heroListings[0]?.images[0]}
                    alt=""
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#9B9690' }}>
                      {heroListings[0]?.district}
                    </p>
                    <p className="font-semibold text-[15px] text-gray-900 line-clamp-1 mb-3">
                      {heroListings[0]?.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base" style={{ color: '#1B4F3C' }}>
                        {heroListings[0] && new Intl.NumberFormat('sv-SE').format(heroListings[0].rent)} kr/mån
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#EBF3EE', color: '#1B4F3C' }}
                      >
                        3 matcher
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match indicator floating badge */}
                <div
                  className="absolute top-1/2 right-12 bg-white rounded-2xl px-4 py-3 shadow-lg border text-sm font-semibold"
                  style={{
                    borderColor: '#DDD9D2',
                    color: '#C49035',
                    transform: 'translateY(-50%) rotate(1deg)',
                    zIndex: 3,
                    boxShadow: '0 8px 24px rgba(196, 144, 53, 0.15)',
                  }}
                >
                  🤝 Match hittad!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          <div className="mb-14 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#9B9690' }}>
              Processen
            </p>
            <h2 className="text-3xl font-bold text-gray-900 tracking-[-0.5px]">
              Tre steg till ditt nya hem
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div
              className="hidden sm:block absolute top-6 left-[20%] right-[20%] h-px"
              style={{ backgroundColor: '#EDEBE6' }}
            />

            {[
              {
                step: '1',
                title: 'Annonsera din bostad',
                desc: 'Skapa en annons med bilder och beskrivning. Det tar fem minuter.',
                icon: '🏠',
              },
              {
                step: '2',
                title: 'Hitta din match',
                desc: 'Bläddra på karta eller lista. Filtrera på stadsdel, rum och hyra.',
                icon: '🗺️',
              },
              {
                step: '3',
                title: 'Kontakta och byt',
                desc: 'Chatta direkt, besikta varandras hem och genomför bytet.',
                icon: '🤝',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center sm:text-left">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-5 mx-auto sm:mx-0 ring-4"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  {item.icon}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#C49035' }}>
                  Steg {item.step}
                </p>
                <h3 className="font-semibold text-gray-900 mb-2 text-[15px]">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6C6862' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured listings ─── */}
      <section className="py-20" style={{ backgroundColor: '#F7F5F1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#9B9690' }}>
                Senaste annonserna
              </p>
              <h2 className="text-2xl font-bold text-gray-900 tracking-[-0.3px]">
                Byt nu i Stockholm
              </h2>
            </div>
            <Link
              href="/annonser"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all"
              style={{ color: '#1B4F3C' }}
            >
              Se alla annonser <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/annonser"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border"
              style={{ color: '#1B4F3C', borderColor: '#DDD9D2', backgroundColor: '#FFFFFF' }}
            >
              Se alla annonser <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: '🔒',
                title: 'Verifierade profiler',
                desc: 'E-postverifiering och profilgranskning för tryggare kontakt.',
              },
              {
                icon: '⚡',
                title: 'Direkt matchning',
                desc: 'Matchningsindikatorn aktiveras automatiskt när ni visat ömsesidigt intresse.',
              },
              {
                icon: '💬',
                title: 'Krypterad chatt',
                desc: 'Kommunicera direkt i appen — inga mellanhänder, inga avgifter.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-2xl border"
                style={{ borderColor: '#EDEBE6', backgroundColor: '#FAFAF9' }}
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2 text-[15px]">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6C6862' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 relative overflow-hidden" style={{ backgroundColor: '#1B4F3C' }}>
        {/* Texture */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 50%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display italic text-4xl sm:text-5xl text-white mb-4 leading-tight" style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}>
            Redo att hitta din
            <br />nästa bostad?
          </h2>
          <p className="mb-10 text-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Skapa ett konto gratis och lägg upp din annons på fem minuter.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/registrera"
              className="inline-flex items-center gap-2.5 px-7 py-4 bg-white text-sm font-bold rounded-xl hover:-translate-y-0.5 transition-all shadow-lg"
              style={{ color: '#1B4F3C', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            >
              Kom igång — det är gratis
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/annonser"
              className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold rounded-xl border transition-all"
              style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.25)' }}
            >
              Bläddra annonser
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ backgroundColor: '#111A16' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-5 gap-8 mb-12">

            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1B4F3C' }}>
                  <svg width="20" height="20" viewBox="0 0 28 27" fill="none">
                    <path d="M14 3L22 11V22H6V11L14 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M22 11V3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M19.5 5.5L22 3L24.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 22V25" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M3.5 23L6 25L8.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="9.5" y="13" width="3.5" height="3.5" rx="0.5" fill="white" fillOpacity="0.75"/>
                    <rect x="15" y="13" width="3.5" height="3.5" rx="0.5" fill="white" fillOpacity="0.75"/>
                    <rect x="9.5" y="18" width="3.5" height="3.5" rx="0.5" fill="white" fillOpacity="0.75"/>
                    <rect x="15" y="18" width="3.5" height="3.5" rx="0.5" fill="white" fillOpacity="0.75"/>
                  </svg>
                </div>
                <span className="font-display font-bold text-[18px] text-white">Bytaren</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Stockholms enklaste sätt att byta bostad direkt — utan kö och utan mäklare.
              </p>
              <div className="flex items-center gap-1.5 mt-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={12} className="fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>4.8 av 5</span>
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Plattform', links: ['Hitta byte', 'Lägg upp annons', 'Hur det fungerar', 'Kartvyn'] },
              { title: 'Konto', links: ['Logga in', 'Registrera dig', 'Mina sidor', 'Meddelanden'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white text-sm font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Info</h4>
              <ul className="space-y-2.5">
                {['Om Bytaren', 'Integritetspolicy', 'Villkor', 'Kontakt'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
            style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }}
          >
            <span>© 2026 Bytaren AB — Alla rättigheter förbehållna</span>
            <span>Byggd av <a href="https://weknowit.se" className="hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>We Know IT</a></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
