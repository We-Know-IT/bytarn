'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, MessageSquare, Heart, PlusCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const NAV_LINKS = [
  { href: '/annonser', label: 'Hitta byte' },
  { href: '/hur-det-fungerar', label: 'Så fungerar det' },
  { href: '/trygghet', label: 'Trygghet' },
]

const MOBILE_LINKS = [
  { href: '/annonser', label: 'Hitta byte' },
  { href: '/hur-det-fungerar', label: 'Så fungerar det' },
  { href: '/trygghet', label: 'Trygghet' },
  { href: '/annonser/ny', label: 'Annonsera' },
  { href: '/meddelanden', label: 'Meddelanden' },
  { href: '/mina-sidor', label: 'Mina sidor' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const initial = (profile?.name ?? user?.email ?? '?').charAt(0).toUpperCase()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'h-[70px] shadow-[0_1px_0_rgba(21,63,50,0.08),0_4px_16px_rgba(21,63,50,0.06)]'
          : 'h-[86px]'
      )}
      style={{ backgroundColor: 'rgba(251,250,247,0.96)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-full flex items-center justify-between gap-8">

        {/* ─── Logo ─── */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
          <div
            className="rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-[0.96]"
            style={{ width: 36, height: 36, backgroundColor: '#153F32' }}
          >
            <svg width="22" height="22" viewBox="0 0 28 27" fill="none">
              <path d="M14 3L22 11V22H6V11L14 3Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M22 11V3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M19.5 5.5L22 3L24.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 22V25" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M3.5 23L6 25L8.5 23" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span
            className="text-[14px] font-bold tracking-[0.13em] uppercase"
            style={{ color: '#15211E' }}
          >
            BYTAREN
          </span>
        </Link>

        {/* ─── Desktop nav center ─── */}
        <div className="hidden lg:flex items-center gap-7 flex-1 justify-center">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'nav-link text-[14px] font-medium transition-colors duration-200 py-1',
                isActive(href) ? 'active text-[#153F32]' : 'text-[#6D716C] hover:text-[#15211E]'
              )}
            >
              {label}
            </Link>
          ))}

          <div className="w-px h-4" style={{ backgroundColor: 'rgba(21,63,50,0.15)' }} />

          <Link
            href="/annonser/ny"
            className={cn(
              'flex items-center gap-1.5 text-[14px] font-medium transition-colors duration-200 py-1',
              isActive('/annonser/ny') ? 'text-[#153F32]' : 'text-[#6D716C] hover:text-[#153F32]'
            )}
          >
            <PlusCircle size={14} strokeWidth={2} />
            Annonsera
          </Link>
        </div>

        {/* ─── Desktop right ─── */}
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          <Link
            href="/meddelanden"
            className="relative p-2.5 rounded-xl transition-colors hover:bg-[rgba(21,63,50,0.06)]"
            style={{ color: '#6D716C' }}
            title="Meddelanden"
          >
            <MessageSquare size={18} strokeWidth={1.75} />
            <span
              className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full ring-2 ring-[#FBFAF7]"
              style={{ backgroundColor: '#E05D5D' }}
            />
          </Link>

          <Link
            href="/mina-sidor"
            className="p-2.5 rounded-xl transition-colors hover:bg-[rgba(21,63,50,0.06)]"
            style={{ color: '#6D716C' }}
            title="Favoriter"
          >
            <Heart size={18} strokeWidth={1.75} />
          </Link>

          <div className="w-px h-5 mx-1" style={{ backgroundColor: 'rgba(21,63,50,0.12)' }} />

          {user ? (
            <Link
              href="/mina-sidor"
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-[rgba(21,63,50,0.06)]"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-[#A8B9A4] flex-shrink-0"
                style={{ backgroundColor: '#E3EBE2' }}
              >
                <span className="text-[11px] font-bold" style={{ color: '#153F32' }}>{initial}</span>
              </div>
              <span className="text-[14px] font-medium" style={{ color: '#15211E' }}>
                {profile?.name?.split(' ')[0] ?? 'Konto'}
              </span>
              <ChevronDown size={12} style={{ color: '#9EA69D' }} />
            </Link>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link
                href="/logga-in"
                className="px-4 py-2.5 text-[14px] font-semibold rounded-xl transition-colors hover:bg-[rgba(21,63,50,0.06)]"
                style={{ color: '#153F32' }}
              >
                Logga in
              </Link>
              <Link
                href="/registrera"
                className="px-5 py-2.5 text-[14px] font-semibold rounded-xl text-white transition-all hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0"
                style={{ backgroundColor: '#153F32' }}
              >
                Skapa konto
              </Link>
            </div>
          )}
        </div>

        {/* ─── Mobile toggle ─── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-lg transition-colors hover:bg-[rgba(21,63,50,0.06)]"
          style={{ color: '#6D716C' }}
          aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ─── Mobile menu ─── */}
      {mobileOpen && (
        <div
          className="lg:hidden border-t"
          style={{ backgroundColor: '#FBFAF7', borderColor: 'rgba(21,63,50,0.10)' }}
        >
          <div className="px-6 py-4 space-y-0.5">
            {MOBILE_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 text-[15px] font-medium rounded-xl transition-colors hover:bg-[rgba(21,63,50,0.06)]"
                style={{ color: isActive(href) ? '#153F32' : '#15211E' }}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t space-y-2" style={{ borderColor: 'rgba(21,63,50,0.10)' }}>
              {user ? (
                <Link
                  href="/mina-sidor"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-3.5 text-[15px] font-semibold text-white rounded-xl text-center transition-colors"
                  style={{ backgroundColor: '#153F32' }}
                >
                  Min profil
                </Link>
              ) : (
                <>
                  <Link
                    href="/registrera"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-3.5 text-[15px] font-semibold text-white rounded-xl text-center transition-colors"
                    style={{ backgroundColor: '#153F32' }}
                  >
                    Skapa konto
                  </Link>
                  <Link
                    href="/logga-in"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-3 text-[15px] font-medium rounded-xl text-center transition-colors"
                    style={{ color: '#153F32' }}
                  >
                    Logga in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
