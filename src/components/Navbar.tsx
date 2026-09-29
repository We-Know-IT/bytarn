'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, X, MessageSquare, Heart, Plus, ChevronDown, User, LayoutGrid, Users,
  ShieldCheck, Mail, LogOut, Search, BookOpen, Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import Logo from '@/components/ui/Logo'

const NAV_LINKS = [
  { href: '/annonser', label: 'Hitta byte', icon: Search },
  { href: '/hur-det-fungerar', label: 'Så fungerar det', icon: BookOpen },
  { href: '/trygghet', label: 'Trygghet', icon: Shield },
]

interface MenuLink {
  href: string
  label: string
  icon: LucideIcon
}

const ACCOUNT_LINKS: MenuLink[] = [
  { href: '/mina-sidor', label: 'Mina sidor', icon: User },
  { href: '/meddelanden', label: 'Meddelanden', icon: MessageSquare },
  { href: '/annonshanterare', label: 'Annonshanteraren', icon: LayoutGrid },
  { href: '/familj', label: 'Familjekonto', icon: Users },
]

const ADMIN_LINKS: MenuLink[] = [
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
  { href: '/admin/installningar', label: 'SMTP-inställningar', icon: Mail },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.name?.split(' ')[0] || 'Konto'
  const initial = (profile?.name || user?.email || '?').charAt(0).toUpperCase()
  const isAdmin = !!profile?.isAdmin

  // Close menus whenever the route changes (incl. back/forward).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMobileOpen(false)
    setMenuOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Escape closes any open menu
  useEffect(() => {
    if (!mobileOpen && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen, menuOpen])

  // Click outside closes the account dropdown
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  // Lock page scroll behind the mobile menu
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  async function handleSignOut() {
    setMenuOpen(false)
    setMobileOpen(false)
    await signOut()
    router.push('/')
    router.refresh()
  }

  const menuItemClass =
    'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-gray-800 transition-colors hover:bg-[rgba(21,63,50,0.06)] hover:text-emerald-600'

  return (
    <>
    <header
      className={cn(
        'sticky top-0 z-50 h-[var(--nav-h)] border-b transition-[background-color,border-color,box-shadow] duration-300',
        scrolled || mobileOpen
          ? 'border-[rgba(21,63,50,0.08)] bg-[rgba(251,250,247,0.92)] shadow-[0_4px_20px_rgba(21,63,50,0.05)]'
          : 'border-transparent bg-[rgba(251,250,247,0.75)]'
      )}
      style={{ WebkitBackdropFilter: 'saturate(1.4) blur(14px)', backdropFilter: 'saturate(1.4) blur(14px)' }}
    >
      <nav
        aria-label="Huvudmeny"
        className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10"
      >
        <Logo onClick={() => setMobileOpen(false)} />

        {/* ─── Desktop center ─── */}
        <ul className="hidden flex-1 items-center justify-center gap-8 lg:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'nav-link py-1 text-[14px] font-medium transition-colors duration-200',
                  isActive(href) ? 'active text-emerald-600' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ─── Desktop right ─── */}
        <div className="hidden flex-shrink-0 items-center gap-1.5 lg:flex">
          {user ? (
            <>
              <Link
                href="/meddelanden"
                className={cn('btn btn-ghost btn-icon btn-sm text-gray-600', isActive('/meddelanden') && 'text-emerald-600 bg-[rgba(21,63,50,0.06)]')}
                aria-label="Meddelanden"
                title="Meddelanden"
              >
                <MessageSquare size={18} strokeWidth={1.75} />
              </Link>
              <Link
                href="/mina-sidor"
                className="btn btn-ghost btn-icon btn-sm text-gray-600"
                aria-label="Favoriter"
                title="Favoriter"
              >
                <Heart size={18} strokeWidth={1.75} />
              </Link>

              <div ref={menuRef} className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  aria-controls="konto-meny"
                  className={cn(
                    'flex h-10 items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors',
                    menuOpen
                      ? 'border-[rgba(21,63,50,0.22)] bg-white'
                      : 'border-[rgba(21,63,50,0.12)] bg-white/70 hover:border-[rgba(21,63,50,0.22)] hover:bg-white'
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3EBE2] text-[12px] font-bold text-emerald-600">
                    {initial}
                  </span>
                  <span className="max-w-[120px] truncate text-[14px] font-medium text-gray-900">{displayName}</span>
                  <ChevronDown size={14} className={cn('text-gray-400 transition-transform', menuOpen && 'rotate-180')} />
                </button>

                {menuOpen && (
                  <div
                    id="konto-meny"
                    className="card animate-menu-in absolute right-0 top-[calc(100%+10px)] w-[264px] p-2"
                    style={{ boxShadow: 'var(--shadow-hover)' }}
                  >
                    <div className="mb-1 border-b border-[rgba(21,63,50,0.08)] px-3 pb-3 pt-2">
                      <p className="truncate text-[14px] font-semibold text-gray-900">{profile?.name || 'Ditt konto'}</p>
                      {user.email && <p className="truncate text-[12.5px] text-gray-500">{user.email}</p>}
                    </div>
                    <ul>
                      {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                        <li key={href}>
                          <Link href={href} onClick={() => setMenuOpen(false)} className={menuItemClass}>
                            <Icon size={16} strokeWidth={1.75} className="text-gray-500" />
                            {label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {isAdmin && (
                      <>
                        <p className="mt-2 border-t border-[rgba(21,63,50,0.08)] px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                          Administration
                        </p>
                        <ul>
                          {ADMIN_LINKS.map(({ href, label, icon: Icon }) => (
                            <li key={href}>
                              <Link href={href} onClick={() => setMenuOpen(false)} className={menuItemClass}>
                                <Icon size={16} strokeWidth={1.75} className="text-gray-500" />
                                {label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <div className="mt-1 border-t border-[rgba(21,63,50,0.08)] pt-1">
                      <button type="button" onClick={handleSignOut} className={cn(menuItemClass, 'w-full')}>
                        <LogOut size={16} strokeWidth={1.75} className="text-gray-500" />
                        Logga ut
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/logga-in" className="btn btn-ghost btn-sm">
                Logga in
              </Link>
              <Link href="/registrera" className="btn btn-secondary btn-sm">
                Skapa konto
              </Link>
            </>
          )}

          <Link href="/annonser/ny" className="btn btn-primary btn-sm ml-2">
            <Plus size={16} strokeWidth={2.25} />
            Lägg upp annons
          </Link>
        </div>

        {/* ─── Mobile right ─── */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link
            href="/annonser/ny"
            className="btn btn-primary btn-sm"
            aria-label="Lägg upp annons"
          >
            <Plus size={16} strokeWidth={2.25} />
            <span className="hidden min-[400px]:inline">Annonsera</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="btn btn-ghost btn-icon text-gray-800"
            aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
            aria-expanded={mobileOpen}
            aria-controls="mobilmeny"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
    </header>

      {/* ─── Mobile menu (outside <header>: its backdrop-filter would trap position:fixed) ─── */}
      {mobileOpen && (
        <div
          id="mobilmeny"
          className="animate-fade-up fixed inset-x-0 bottom-0 top-[var(--nav-h)] z-40 overflow-y-auto border-t border-[rgba(21,63,50,0.08)] bg-[#FBFAF7] lg:hidden"
        >
          <div className="mx-auto max-w-lg px-4 pb-10 pt-4 sm:px-6">
            <ul className="space-y-0.5">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive(href) ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3.5 text-[16px] font-medium transition-colors hover:bg-[rgba(21,63,50,0.06)]',
                      isActive(href) ? 'bg-[rgba(21,63,50,0.06)] text-emerald-600' : 'text-gray-900'
                    )}
                  >
                    <Icon size={18} strokeWidth={1.75} className="text-gray-500" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/annonser/ny"
              onClick={() => setMobileOpen(false)}
              className="btn btn-primary btn-lg btn-block mt-4"
            >
              <Plus size={18} strokeWidth={2.25} />
              Lägg upp annons
            </Link>

            <div className="mt-6 border-t border-[rgba(21,63,50,0.08)] pt-6">
              {user ? (
                <>
                  <div className="mb-3 flex items-center gap-3 px-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3EBE2] text-[14px] font-bold text-emerald-600">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-gray-900">{profile?.name || 'Ditt konto'}</p>
                      {user.email && <p className="truncate text-[13px] text-gray-500">{user.email}</p>}
                    </div>
                  </div>
                  <MobileLinkList links={ACCOUNT_LINKS} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
                  {isAdmin && (
                    <>
                      <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Administration
                      </p>
                      <MobileLinkList links={ADMIN_LINKS} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-medium text-gray-600 transition-colors hover:bg-[rgba(21,63,50,0.06)]"
                  >
                    <LogOut size={18} strokeWidth={1.75} className="text-gray-500" />
                    Logga ut
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/logga-in" onClick={() => setMobileOpen(false)} className="btn btn-secondary">
                    Logga in
                  </Link>
                  <Link href="/registrera" onClick={() => setMobileOpen(false)} className="btn btn-secondary">
                    Skapa konto
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MobileLinkList({
  links,
  isActive,
  onNavigate,
}: {
  links: MenuLink[]
  isActive: (href: string) => boolean
  onNavigate: () => void
}) {
  return (
    <ul className="space-y-0.5">
      {links.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={isActive(href) ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors hover:bg-[rgba(21,63,50,0.06)]',
              isActive(href) ? 'text-emerald-600' : 'text-gray-800'
            )}
          >
            <Icon size={18} strokeWidth={1.75} className="text-gray-500" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
