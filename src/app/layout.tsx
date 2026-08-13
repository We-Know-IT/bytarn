import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

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
  title: 'Bytaren — Bostadsbyte i Stockholm',
  description: 'Hitta ditt nästa hem genom bostadsbyte. Byt din lägenhet med någon annan i Stockholm.',
  keywords: 'bostadsbyte, lägenhetsbyte, hyreslägenhet, stockholm, andrahand',
  openGraph: {
    title: 'Bytaren — Bostadsbyte i Stockholm',
    description: 'Hitta ditt nästa hem genom bostadsbyte i Stockholm.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className={`${inter.variable} ${instrumentSerif.variable} font-sans`}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
