'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, MessageSquare, Heart, PlusCircle, Home, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all link-underline',
        pathname === href
          ? 'text-emerald-600'
          : 'text-gray-600 hover:text-gray-900'
      )}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand-200" style={{ borderColor: '#DDD9D2' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[68px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-emerald-700 transition-colors">
              <Home size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[19px] font-semibold text-gray-900 tracking-[-0.3px]">
              Bytaren
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center">
            {navLink('/annonser', 'Hitta byte')}
            <div className="w-px h-4 bg-sand-200 mx-2" style={{ backgroundColor: '#DDD9D2' }} />
            <Link
              href="/annonser/ny"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
            >
              <PlusCircle size={15} strokeWidth={2} />
              Annonsera
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/meddelanden"
              className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-sand-100 rounded-xl transition-colors"
              style={{ '--hover-bg': '#EDEBE6' } as React.CSSProperties}
              title="Meddelanden"
            >
              <MessageSquare size={19} strokeWidth={1.75} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-400 rounded-full ring-2 ring-white" />
            </Link>
            <Link
              href="/mina-sidor"
              className="p-2.5 text-gray-500 hover:text-gray-700 rounded-xl transition-colors"
              title="Favoriter"
            >
              <Heart size={19} strokeWidth={1.75} />
            </Link>

            <div className="w-px h-6 mx-1" style={{ backgroundColor: '#DDD9D2' }} />

            <Link
              href="/mina-sidor"
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-sand-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center ring-1 ring-emerald-200">
                <span className="text-xs font-semibold text-emerald-700">A</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Anna</span>
              <ChevronDown size={13} className="text-gray-400" />
            </Link>

            <Link
              href="/logga-in"
              className="ml-1 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all"
            >
              Logga in
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white" style={{ borderColor: '#DDD9D2' }}>
          <div className="px-4 py-3 space-y-1">
            {[
              { href: '/annonser', label: 'Hitta byte' },
              { href: '/annonser/ny', label: 'Annonsera' },
              { href: '/meddelanden', label: 'Meddelanden' },
              { href: '/mina-sidor', label: 'Mina sidor' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-sand-50 rounded-xl transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t" style={{ borderColor: '#DDD9D2' }}>
              <Link
                href="/logga-in"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-3 text-sm font-semibold bg-emerald-600 text-white rounded-xl text-center hover:bg-emerald-700 transition-colors"
              >
                Logga in
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
