'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

// "Skapa konto" for visitors; signed-in users get the next useful step
// instead of being asked to sign up again.
export default function SignupCta({ className }: { className?: string }) {
  const { user, loading } = useAuth()
  if (loading) return <span className={className} style={{ visibility: 'hidden' }} aria-hidden>Skapa konto</span>
  return user ? (
    <Link href="/annonser/ny" className={className}>
      Lägg upp annons <ArrowRight size={15} className="arrow-icon" />
    </Link>
  ) : (
    <Link href="/registrera" className={className}>
      Skapa konto <ArrowRight size={15} className="arrow-icon" />
    </Link>
  )
}
