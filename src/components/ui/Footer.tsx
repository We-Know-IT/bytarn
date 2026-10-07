'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { openConsentSettings } from '@/lib/consent'

const COLUMNS = [
  {
    title: 'Plattform',
    links: [
      { label: 'Hitta byte', href: '/annonser' },
      { label: 'Lägg upp annons', href: '/annonser/ny' },
      { label: 'Så fungerar det', href: '/hur-det-fungerar' },
    ],
  },
  {
    title: 'Konto',
    links: [
      { label: 'Logga in', href: '/logga-in' },
      { label: 'Skapa konto', href: '/registrera' },
      { label: 'Mina sidor', href: '/mina-sidor' },
      { label: 'Meddelanden', href: '/meddelanden' },
    ],
  },
  {
    title: 'Hyresvägen',
    links: [
      { label: 'Om oss', href: '/om-oss' },
      { label: 'Trygghet', href: '/trygghet' },
      { label: 'Kontakt', href: '/kontakt' },
    ],
  },
]

const LEGAL = [
  { label: 'Användarvillkor', href: '/villkor' },
  { label: 'Integritetspolicy', href: '/integritetspolicy' },
]

/** Routes that are full-height app views and should not get a footer. */
function hideOn(pathname: string) {
  return pathname === '/annonser' || pathname.startsWith('/meddelanden/')
}

export default function Footer() {
  const pathname = usePathname()
  if (hideOn(pathname)) return null

  return (
    <footer className="bg-[#0F1C18] text-white/60" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Sidfot</h2>
      <div className="container-page pt-14 pb-10 sm:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo inverse size={32} />
            <p className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-white/50">
              Stockholms enklaste sätt att byta hyresrätt — direkt med varandra, utan kö och utan mäklare.
            </p>
            <Link
              href="/annonser/ny"
              className="btn btn-outline-inverse btn-sm mt-6"
            >
              Lägg upp annons
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block py-0.5 text-[14px] text-white/60 transition-colors hover:text-white focus-visible:outline-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col-reverse gap-4 border-t border-white/10 pt-6 text-[12.5px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Hyresvägen · Bostadsbyte i Stockholm
            {/* Vercel exposes the deployed commit; shows which build you're on. */}
            {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
              <> · version {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}</>
            )}
          </span>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openConsentSettings}
                className="transition-colors hover:text-white focus-visible:outline-white"
              >
                Cookieinställningar
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
