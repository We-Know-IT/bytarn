'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus, Eye, Heart, Pencil, Pause, Play, RefreshCw, Archive, Trash2, Search, Loader2,
  Home, Clock, Users, Video, ImageOff, CheckSquare, Square, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import {
  fetchMyListings, setListingStatus, renewListing, deleteListing, isExpired,
  describeListingError, LISTING_LIFETIME_DAYS,
} from '@/lib/listings'
import { fetchInterestCount } from '@/lib/interests'
import { fetchMyHousehold, type Household } from '@/lib/household'
import { cn, formatRent } from '@/lib/utils'
import type { Listing } from '@/types'

type Filter = 'alla' | 'aktiva' | 'pausade' | 'avslutade'

const DAY_MS = 86_400_000

// Groups an ad's lifecycle into what the owner has to act on: live,
// paused, or no longer shown (ended by the owner or expired).
function effectiveState(l: Listing): 'aktiv' | 'pausad' | 'avslutad' {
  if (l.status === 'aktiv' && isExpired(l)) return 'avslutad'
  return l.status
}

function daysLeft(l: Listing): number {
  return Math.max(0, Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / DAY_MS))
}

export default function AnnonshanterarePage() {
  const { user, loading: authLoading } = useAuth()
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [interests, setInterests] = useState<Record<string, number>>({})
  const [household, setHousehold] = useState<Household | null>(null)
  const [filter, setFilter] = useState<Filter>('alla')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    fetchMyListings(user.id).then((rows) => {
      setListings(rows)
      Promise.all(rows.map(async (l) => [l.id, await fetchInterestCount(l.id)] as const)).then((pairs) =>
        setInterests(Object.fromEntries(pairs))
      )
    })
    fetchMyHousehold().then(setHousehold)
  }, [user])

  const counts = useMemo(() => {
    const all = listings ?? []
    return {
      alla: all.length,
      aktiva: all.filter((l) => effectiveState(l) === 'aktiv').length,
      pausade: all.filter((l) => effectiveState(l) === 'pausad').length,
      avslutade: all.filter((l) => effectiveState(l) === 'avslutad').length,
      views: all.reduce((sum, l) => sum + l.viewCount, 0),
      interests: Object.values(interests).reduce((a, b) => a + b, 0),
      expiringSoon: all.filter((l) => effectiveState(l) === 'aktiv' && daysLeft(l) <= 7).length,
    }
  }, [listings, interests])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (listings ?? []).filter((l) => {
      const state = effectiveState(l)
      if (filter === 'aktiva' && state !== 'aktiv') return false
      if (filter === 'pausade' && state !== 'pausad') return false
      if (filter === 'avslutade' && state !== 'avslutad') return false
      if (q && !`${l.title} ${l.address} ${l.district}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [listings, filter, query])

  function patch(id: string, update: Partial<Listing>) {
    setListings((prev) => prev?.map((l) => (l.id === id ? { ...l, ...update } : l)) ?? prev)
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(describeListingError(err))
    } finally {
      setBusy(null)
    }
  }

  const renew = (id: string) => run(id, async () => {
    const expiresAt = await renewListing(id)
    patch(id, { status: 'aktiv', expiresAt })
  })

  const setStatus = (id: string, status: Listing['status']) => run(id, async () => {
    await setListingStatus(id, status)
    patch(id, {
      status,
      ...(status === 'aktiv' ? { expiresAt: new Date(Date.now() + LISTING_LIFETIME_DAYS * DAY_MS).toISOString() } : {}),
    })
  })

  const remove = (id: string) => {
    if (!confirm('Ta bort annonsen permanent? Detta går inte att ångra.')) return
    run(id, async () => {
      await deleteListing(id)
      setListings((prev) => prev?.filter((l) => l.id !== id) ?? prev)
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
    })
  }

  async function bulk(kind: 'renew' | 'pause' | 'end' | 'delete') {
    const ids = [...selected]
    if (ids.length === 0) return
    if (kind === 'delete' && !confirm(`Ta bort ${ids.length} annonser permanent?`)) return
    await run('bulk', async () => {
      for (const id of ids) {
        if (kind === 'renew') patch(id, { status: 'aktiv', expiresAt: await renewListing(id) })
        if (kind === 'pause') { await setListingStatus(id, 'pausad'); patch(id, { status: 'pausad' }) }
        if (kind === 'end') { await setListingStatus(id, 'avslutad'); patch(id, { status: 'avslutad' }) }
        if (kind === 'delete') {
          await deleteListing(id)
          setListings((prev) => prev?.filter((l) => l.id !== id) ?? prev)
        }
      }
      setSelected(new Set())
    })
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id))

  if (authLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
  }

  if (!supabaseConfigured || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonshanteraren</h1>
        <p className="text-gray-500 text-sm mb-6">Logga in för att hantera dina annonser.</p>
        <Link href="/logga-in?nasta=/annonshanterare" className="px-5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
          Logga in
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Annonshanteraren</h1>
          <p className="text-gray-500 text-sm mt-1">
            Följ upp, förläng och städa bland dina annonser. Annonser är aktiva i {LISTING_LIFETIME_DAYS} dagar åt gången.
          </p>
        </div>
        <Link
          href="/annonser/ny"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700"
        >
          <Plus size={16} /> Ny annons
        </Link>
      </div>

      {household ? (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
          <Users size={16} />
          Du hanterar annonser tillsammans med familjekontot <strong>{household.name}</strong> ({household.members.length} medlemmar).
          <Link href="/familj" className="ml-auto font-medium underline">Hantera</Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-600">
          <Users size={16} />
          Bor ni flera? Med ett familjekonto kan alla i hushållet hantera varandras annonser.
          <Link href="/familj" className="ml-auto font-medium text-emerald-700 underline">Skapa familjekonto</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Aktiva annonser', value: counts.aktiva, Icon: Home },
          { label: 'Visningar totalt', value: counts.views, Icon: Eye },
          { label: 'Intresseanmälningar', value: counts.interests, Icon: Heart },
          { label: 'Går ut inom 7 dagar', value: counts.expiringSoon, Icon: Clock, warn: counts.expiringSoon > 0 },
        ].map(({ label, value, Icon, warn }) => (
          <div key={label} className={cn('rounded-2xl border p-4 bg-white', warn ? 'border-amber-200' : 'border-gray-100')}>
            <Icon size={18} className={warn ? 'text-amber-600' : 'text-emerald-600'} />
            <div className="text-2xl font-bold text-gray-900 mt-2">{listings ? value : '—'}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide">
          {([
            ['alla', 'Alla'],
            ['aktiva', 'Aktiva'],
            ['pausade', 'Pausade'],
            ['avslutade', 'Avslutade & utgångna'],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label} <span className="text-gray-400">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök på rubrik eller adress"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-gray-900 text-white text-sm">
          <span className="font-medium mr-2">{selected.size} valda</span>
          <button onClick={() => bulk('renew')} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Förläng</button>
          <button onClick={() => bulk('pause')} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Pausa</button>
          <button onClick={() => bulk('end')} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">Avsluta</button>
          <button onClick={() => bulk('delete')} className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500">Ta bort</button>
          {busy === 'bulk' && <Loader2 size={15} className="animate-spin" />}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-white/60 hover:text-white">Avmarkera</button>
        </div>
      )}

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {listings === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
          <Home size={28} className="text-gray-300 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900 mb-1">Inga annonser ännu</h2>
          <p className="text-sm text-gray-500 mb-5">Lägg upp din bostad så börjar vi leta bytespartners.</p>
          <Link href="/annonser/ny" className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
            Lägg upp annons
          </Link>
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((l) => l.id)))}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 mb-2 px-1"
          >
            {allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            Markera alla som visas
          </button>
          <div className="space-y-3">
            {visible.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-10">Inga annonser matchar filtret.</p>
            )}
            {visible.map((l) => {
              const state = effectiveState(l)
              const left = daysLeft(l)
              const expired = l.status === 'aktiv' && isExpired(l)
              const ownedByOther = l.userId !== user.id
              return (
                <div
                  key={l.id}
                  className={cn(
                    'flex flex-col sm:flex-row gap-4 p-3 sm:p-4 bg-white border rounded-2xl transition-colors',
                    selected.has(l.id) ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-gray-100'
                  )}
                >
                  <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                    <button onClick={() => toggle(l.id)} aria-label="Markera annons" className="self-start pt-1 text-gray-400 hover:text-emerald-600">
                      {selected.has(l.id) ? <CheckSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
                    </button>
                    <div className="relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {l.images[0] ? (
                        <img src={l.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageOff size={20} /></div>
                      )}
                      {l.videoUrl && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded-md px-1.5 py-0.5 text-[10px] flex items-center gap-0.5">
                          <Video size={10} /> Video
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          state === 'aktiv' && 'bg-emerald-50 text-emerald-700',
                          state === 'pausad' && 'bg-amber-50 text-amber-700',
                          state === 'avslutad' && 'bg-gray-100 text-gray-500'
                        )}>
                          {expired ? 'Utgången' : state === 'aktiv' ? 'Aktiv' : state === 'pausad' ? 'Pausad' : 'Avslutad'}
                        </span>
                        {ownedByOther && (
                          <span className="text-[11px] text-gray-500 flex items-center gap-1"><Users size={11} /> {l.userName}</span>
                        )}
                      </div>
                      <Link href={`/annonser/${l.id}`} className="font-semibold text-gray-900 hover:underline line-clamp-1">
                        {l.title}
                      </Link>
                      <p className="text-xs text-gray-500 truncate">{l.address} · {l.district} · {l.rooms} rok · {formatRent(l.rent)}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye size={12} /> {l.viewCount} visningar</span>
                        <span className="flex items-center gap-1"><Heart size={12} /> {interests[l.id] ?? '–'} intresserade</span>
                        {state === 'aktiv' && (
                          <span className={cn('flex items-center gap-1', left <= 7 && 'text-amber-600 font-medium')}>
                            <Clock size={12} /> {left} dagar kvar
                          </span>
                        )}
                      </div>
                      {state === 'aktiv' && (
                        <div className="h-1 bg-gray-100 rounded-full mt-2 max-w-xs">
                          <div
                            className={cn('h-full rounded-full', left <= 7 ? 'bg-amber-500' : 'bg-emerald-500')}
                            style={{ width: `${Math.min(100, (left / LISTING_LIFETIME_DAYS) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-col lg:flex-row items-start sm:items-end lg:items-start gap-1.5 sm:w-auto">
                    {busy === l.id && <Loader2 size={16} className="animate-spin text-gray-400 m-2" />}
                    <ActionButton href={`/annonser/ny?redigera=${l.id}`} icon={Pencil} label="Redigera" />
                    {(state !== 'aktiv' || left <= 14) && (
                      <ActionButton onClick={() => renew(l.id)} icon={RefreshCw} label={state === 'aktiv' ? 'Förläng' : 'Återpublicera'} primary />
                    )}
                    {state === 'aktiv' && <ActionButton onClick={() => setStatus(l.id, 'pausad')} icon={Pause} label="Pausa" />}
                    {state === 'pausad' && <ActionButton onClick={() => setStatus(l.id, 'aktiv')} icon={Play} label="Aktivera" />}
                    {state !== 'avslutad' && <ActionButton onClick={() => setStatus(l.id, 'avslutad')} icon={Archive} label="Avsluta" />}
                    <ActionButton href={`/annonser/${l.id}`} icon={ExternalLink} label="Visa" />
                    <ActionButton onClick={() => remove(l.id)} icon={Trash2} label="Ta bort" danger />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ActionButton({
  href, onClick, icon: Icon, label, primary, danger,
}: {
  href?: string
  onClick?: () => void
  icon: React.ComponentType<{ size?: number }>
  label: string
  primary?: boolean
  danger?: boolean
}) {
  const className = cn(
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
    primary && 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700',
    danger && 'border-transparent text-red-500 hover:bg-red-50',
    !primary && !danger && 'border-gray-200 text-gray-700 hover:bg-gray-50'
  )
  if (href) {
    return <Link href={href} className={className}><Icon size={13} /> {label}</Link>
  }
  return <button type="button" onClick={onClick} className={className}><Icon size={13} /> {label}</button>
}
