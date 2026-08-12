'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, MessageSquare, Heart, PlusCircle, User, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Home size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Bytaren</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/annonser"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              Hitta byte
            </Link>
            <Link
              href="/annonser/ny"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <PlusCircle size={16} />
              Lägg upp annons
            </Link>
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/meddelanden"
              className="relative p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Meddelanden"
            >
              <MessageSquare size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <Link
              href="/mina-sidor"
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Favoriter"
            >
              <Heart size={20} />
            </Link>
            <Link
              href="/mina-sidor"
              className="flex items-center gap-2 ml-2 pl-4 border-l border-gray-200"
            >
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-emerald-700" />
              </div>
              <span className="text-sm font-medium text-gray-700">Mina sidor</span>
            </Link>
            <Link
              href="/logga-in"
              className="ml-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Logga in
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            <Link href="/annonser" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg">
              Hitta byte
            </Link>
            <Link href="/annonser/ny" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg">
              Lägg upp annons
            </Link>
            <Link href="/meddelanden" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg">
              Meddelanden
            </Link>
            <Link href="/mina-sidor" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg">
              Mina sidor
            </Link>
            <div className="pt-2 border-t border-gray-100">
              <Link href="/logga-in" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg text-center">
                Logga in
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
