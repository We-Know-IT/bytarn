import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/ui/Footer'
import { AuthProvider } from '@/context/AuthContext'
import Script from 'next/script'

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

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

// The canonical site address (punycode for hyresvägen.se). Used to build
// absolute URLs for social previews; override with NEXT_PUBLIC_APP_URL.
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://xn--hyresvgen-02a.se'

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
        <AuthProvider>
          <Navbar />
          <main id="innehall" className="min-h-[calc(100vh-var(--nav-h))]">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        {ADSENSE_CLIENT && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  )
}
