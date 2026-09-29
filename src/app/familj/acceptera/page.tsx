'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import { acceptHouseholdInvite, fetchInviteInfo } from '@/lib/household'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface InviteInfo {
  household_name: string
  invited_by_name: string
  email: string
  accepted: boolean
}

export default function AccepteraInbjudanPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AcceptInvite />
    </Suspense>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-24 text-gray-400">
      <Loader2 className="animate-spin" size={24} />
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users size={22} />
        </div>
        {children}
      </div>
    </div>
  )
}

function AcceptInvite() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const validToken = UUID_RE.test(token)
  const { user, loading: authLoading } = useAuth()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [infoState, setInfoState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!validToken || !supabaseConfigured) return
    // household_invite_info is security definer, so it works signed out too.
    fetchInviteInfo(token)
      .then((row) => {
        setInfo(row)
        setInfoState(row ? 'ready' : 'missing')
      })
      .catch(() => setInfoState('missing'))
  }, [token, validToken])

  async function accept() {
    setAccepting(true)
    setError(null)
    try {
      await acceptHouseholdInvite(token)
      router.push('/familj')
      router.refresh()
    } catch (err) {
      // Supabase RPC errors are plain objects with a (Swedish) message.
      const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
      setError(message || 'Kunde inte gå med i familjekontot.')
      setAccepting(false)
    }
  }

  if (!supabaseConfigured) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Familjekonton kräver en backend, och ingen är konfigurerad här ännu.</p>
      </Card>
    )
  }

  if (!validToken || infoState === 'missing') {
    return (
      <Card>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Inbjudan hittades inte</h1>
        <p className="text-sm text-gray-500 mb-6">
          Länken är ogiltig eller så har inbjudan återkallats. Be personen som bjöd in dig att skicka en ny.
        </p>
        <Link href="/familj" className="text-sm font-semibold text-emerald-700 hover:underline">
          Till familjekonton
        </Link>
      </Card>
    )
  }

  if (infoState === 'loading' || authLoading || !info) return <Spinner />

  if (info.accepted) {
    return (
      <Card>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Inbjudan är redan använd</h1>
        <p className="text-sm text-gray-500 mb-6">
          Den här inbjudan till <strong>{info.household_name}</strong> har redan accepterats.
        </p>
        <Link
          href="/familj"
          className="inline-flex bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          Gå till familjekontot
        </Link>
      </Card>
    )
  }

  const emailMismatch = !!user?.email && user.email.toLowerCase() !== info.email.toLowerCase()

  return (
    <Card>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Gå med i {info.household_name}</h1>
      <p className="text-sm text-gray-600 mb-1">
        <strong>{info.invited_by_name}</strong> har bjudit in dig till sitt familjekonto på Bytaren.
      </p>
      <p className="text-xs text-gray-400 mb-6">Inbjudan skickades till {info.email}</p>

      <div className="text-left text-sm text-gray-600 bg-gray-50 rounded-xl p-4 mb-6">
        Som medlem kan ni hantera varandras annonser — redigera, pausa, förnya och ta bort — och sköta bytet
        tillsammans. Du kan lämna familjekontot när du vill.
      </div>

      {error && (
        <div className="mb-4 flex gap-2 items-start text-left px-3 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle size={17} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!user ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Logga in eller skapa ett konto med <strong>{info.email}</strong> och öppna sedan länken i mejlet igen.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/logga-in"
              className="inline-flex bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Logga in
            </Link>
            <Link
              href="/registrera"
              className="inline-flex border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Skapa konto
            </Link>
          </div>
        </div>
      ) : (
        <>
          {emailMismatch && (
            <p className="mb-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5">
              Du är inloggad som {user.email}. Inbjudan gäller {info.email} — logga in med den adressen för att gå med.
            </p>
          )}
          <button
            type="button"
            onClick={accept}
            disabled={accepting}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-3 rounded-xl"
          >
            {accepting && <Loader2 size={16} className="animate-spin" />}
            Gå med i familjekontot
          </button>
        </>
      )}
    </Card>
  )
}
