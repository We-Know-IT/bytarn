'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { fetchListingsByUser } from '@/lib/listings'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import ListingCard from '@/components/ListingCard'
import type { Listing } from '@/types'
import Link from 'next/link'
import { MessageSquare, ArrowLeft, Ban, Flag, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { fetchMyBlockedIds, unblockUser } from '@/lib/blocks'
import { BlockUserDialog, ReportUserDialog } from '@/components/BlockReportDialogs'

export default function ProfilPage() {
  const params = useParams()
  const id = params.id as string
  const [profileUser, setProfileUser] = useState<{ name: string; avatar?: string; bio?: string; joinedAt: string } | null | undefined>(supabaseConfigured ? undefined : null)
  const [listings, setListings] = useState<Listing[]>([])
  const { user: me } = useAuth()
  const myId = me?.id
  const isOther = !!myId && myId !== id
  // Whether I've blocked this person (keyed by profile id).
  const [blockState, setBlockState] = useState<{ id: string; blocked: boolean } | null>(null)
  const [dialog, setDialog] = useState<'block' | 'report' | null>(null)
  const [unblocking, setUnblocking] = useState(false)

  useEffect(() => {
    if (!myId || myId === id) return
    let cancelled = false
    fetchMyBlockedIds(myId).then((ids) => {
      if (!cancelled) setBlockState({ id, blocked: ids.has(id) })
    })
    return () => {
      cancelled = true
    }
  }, [myId, id])
  const blocked = isOther && blockState?.id === id && blockState.blocked

  async function handleUnblock() {
    if (!myId) return
    setUnblocking(true)
    try {
      await unblockUser(myId, id)
      setBlockState({ id, blocked: false })
    } catch {
      alert('Kunde inte avblockera. Försök igen.')
    } finally {
      setUnblocking(false)
    }
  }

  useEffect(() => {
    if (!supabaseConfigured) return
    fetchListingsByUser(id).then(setListings)
    createClient()
      .from('profiles')
      .select('name, avatar_url, bio, created_at')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setProfileUser(
          data
            ? { name: data.name, avatar: data.avatar_url ?? undefined, bio: data.bio ?? undefined, joinedAt: data.created_at }
            : null
        )
      })
  }, [id])

  if (profileUser === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Laddar profil…</div>
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profil hittades inte</h1>
          <Link href="/annonser" className="text-emerald-600 hover:underline">Tillbaka</Link>
        </div>
      </div>
    )
  }

  const user = profileUser

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/annonser" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} />
        Tillbaka
      </Link>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6 flex items-start gap-5">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl flex-shrink-0">
            {user.name[0]}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{user.name}</h1>
          <p className="text-sm text-gray-500 mb-2">Medlem sedan {formatDate(user.joinedAt)}</p>
          {user.bio && <p className="text-sm text-gray-600">{user.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-3">
            {!blocked && (
            <Link
              href="/meddelanden"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare size={15} />
              Skicka meddelande
            </Link>
            )}
            {isOther && (
              <>
                {blocked ? (
                  <button type="button" onClick={handleUnblock} disabled={unblocking} className="btn btn-secondary btn-sm">
                    <ShieldCheck size={14} />
                    {unblocking ? 'Avblockerar…' : 'Avblockera'}
                  </button>
                ) : (
                  <button type="button" onClick={() => setDialog('block')} className="btn btn-ghost btn-sm">
                    <Ban size={14} />
                    Blockera
                  </button>
                )}
                <button type="button" onClick={() => setDialog('report')} className="btn btn-ghost btn-sm text-red-600">
                  <Flag size={14} />
                  Anmäl
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {dialog === 'block' && myId && (
        <BlockUserDialog
          userId={myId}
          other={{ id, name: user.name }}
          onClose={() => setDialog(null)}
          onBlocked={() => {
            setBlockState({ id, blocked: true })
            setDialog(null)
          }}
        />
      )}
      {dialog === 'report' && myId && (
        <ReportUserDialog userId={myId} other={{ id, name: user.name }} onClose={() => setDialog(null)} />
      )}

      {blocked ? (
        <p className="card p-5 text-sm text-gray-600">
          Du har blockerat {user.name}. Annonserna visas inte för dig så länge blockeringen gäller.
        </p>
      ) : (
      <>
      <h2 className="font-semibold text-gray-900 mb-4">
        {user.name.split(' ')[0]}s annonser ({listings.length})
      </h2>

      {listings.length === 0 ? (
        <p className="text-gray-500 text-sm">Inga aktiva annonser.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
      </>
      )}
    </div>
  )
}
