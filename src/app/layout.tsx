import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import { SITE_URL } from '@/lib/site'
import Navbar from '@/components/Navbar'
import Footer from '@/components/ui/Footer'
import { AuthProvider } from '@/context/AuthContext'
import PendingHouseholdSetup from '@/components/PendingHouseholdSetup'
import CookieBanner from '@/components/CookieBanner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument',
  style: ['normal', 'italic'],
  weight: '400',
  display: 'swap',
})


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Hyresvägen',
  title: 'Hyresvägen — Bostadsbyte i Stockholm',
  description: 'Hitta ditt nästa hem genom bostadsbyte. Byt din lägenhet med någon annan i Stockholm.',
  keywords: 'bostadsbyte, lägenhetsbyte, hyreslägenhet, stockholm, andrahand',
  openGraph: {
    title: 'Hyresvägen — Bostadsbyte i Stockholm',
    description: 'Hitta ditt nästa hem genom bostadsbyte i Stockholm.',
    type: 'website',
    siteName: 'Hyresvägen',
    locale: 'sv_SE',
  },
}

export const viewport: Viewport = {
  themeColor: '#FBFAF7',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans`}>
        <a href="#innehall" className="skip-link">Hoppa till innehållet</a>
        {/* Early in the DOM so keyboard users reach it right after the skip link. */}
        <CookieBanner />
        <AuthProvider>
          <Navbar />
          <main id="innehall" className="min-h-[calc(100vh-var(--nav-h))]">
            {children}
          </main>
          <Footer />
          <PendingHouseholdSetup />
        </AuthProvider>
      </body>
    </html>
  )
}
