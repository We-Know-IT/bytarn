import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic'],
  weight: ['400', '700'],
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
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
