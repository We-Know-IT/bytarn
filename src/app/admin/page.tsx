'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Users, Home, MessageSquare, Flag, Mail, Megaphone, Loader2, Sparkles, Trash2, Archive, Search, ImageOff, CheckSquare, Square, UserX,
} from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { LISTING_SELECT, rowToListing, isExpired, setListingStatus, deleteListing, describeListingError, type ListingRow } from '@/lib/listings'
import { cn, formatDate } from '@/lib/utils'
import { fetchUserReports, dismissUserReport, type UserReport } from '@/lib/blocks'
import type { Listing } from '@/types'

interface Counts {
  users: number
  activeListings: number
  conversations: number
}

interface Report {
  id: string
  reason: string
  createdAt: string
  listingId: string
  listingTitle: string
}

type Filter = 'alla' | 'aktiva' | 'utgangna' | 'avslutade' | 'rapporterade' | 'utan-bilder'

const STALE_DAYS = 45

function isStale(l: Listing) {
  return Date.now() - new Date(l.updatedAt).getTime() > STALE_DAYS * 86_400_000
}

export default function AdminPage() {
  const { profile, loading } = useAuth()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [userReports, setUserReports] = useState<UserReport[]>([])
  const [filter, setFilter] = useState<Filter>('alla')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const isAdmin = profile?.isAdmin ?? false

  useEffect(() => {
    if (!supabaseConfigured || !isAdmin) return
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'aktiv'),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
    ]).then(([users, active, conversations]) => {
      setCounts({
        users: users.count ?? 0,
        activeListings: active.count ?? 0,
        conversations: conversations.count ?? 0,
      })
    })
    supabase
      .from('listings')
      .select(LISTING_SELECT)
      .order('updated_at', { ascending: true })
      .then(({ data }) => setListings(((data ?? []) as unknown as ListingRow[]).map(rowToListing)))
    supabase
      .from('reports')
      .select('id, reason, created_at, listing_id, listings ( title )')
      .order('created_at', { ascending: false })
      .then(({ data }) =>
        setReports(
          ((data ?? []) as unknown as { id: string; reason: string; created_at: string; listing_id: string; listings: { title: string } | null }[]).map((r) => ({
            id: r.id,
            reason: r.reason,
            createdAt: r.created_at,
            listingId: r.listing_id,
            listingTitle: r.listings?.title ?? 'Borttagen annons',
          }))
        )
      )
    fetchUserReports().then(setUserReports)
  }, [isAdmin])

  const reportedIds = useMemo(() => new Set(reports.map((r) => r.listingId)), [reports])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (listings ?? []).filter((l) => {
      if (filter === 'aktiva' && !(l.status === 'aktiv' && !isExpired(l))) return false
      if (filter === 'utgangna' && !(l.status === 'aktiv' && isExpired(l))) return false
      if (filter === 'avslutade' && l.status !== 'avslutad') return false
      if (filter === 'rapporterade' && !reportedIds.has(l.id)) return false
      if (filter === 'utan-bilder' && l.images.length > 0) return false
      if (q && !`${l.title} ${l.address} ${l.userName}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [listings, filter, query, reportedIds])

  async function runCleanup() {
    setBusy(true)
    setMessage(null)
    const { data, error } = await createClient().rpc('expire_stale_listings')
    setBusy(false)
    if (error) {
      setMessage({ ok: false, text: describeListingError(error) })
      return
    }
    setMessage({ ok: true, text: `${data ?? 0} utgångna annonser markerades som avslutade.` })
    setListings((prev) => prev?.map((l) => (l.status !== 'avslutad' && isExpired(l) ? { ...l, status: 'avslutad' } : l)) ?? prev)
  }

  async function bulk(kind: 'end' | 'delete') {
    const ids = [...selected]
    if (ids.length === 0) return
    if (kind === 'delete' && !confirm(`Ta bort ${ids.length} annonser permanent?`)) return
    setBusy(true)
    setMessage(null)
    try {
      for (const id of ids) {
        if (kind === 'end') await setListingStatus(id, 'avslutad')
        else await deleteListing(id)
      }
      setListings((prev) =>
        kind === 'delete'
          ? prev?.filter((l) => !selected.has(l.id)) ?? prev
          : prev?.map((l) => (selected.has(l.id) ? { ...l, status: 'avslutad' } : l)) ?? prev
      )
      setMessage({ ok: true, text: `${ids.length} annonser ${kind === 'delete' ? 'togs bort' : 'avslutades'}.` })
      setSelected(new Set())
    } catch (err) {
      setMessage({ ok: false, text: describeListingError(err) })
    } finally {
      setBusy(false)
    }
  }

  async function dismissReport(id: string) {
    await createClient().from('reports').delete().eq('id', id)
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  async function dismissUserReportById(id: string) {
    try {
      await dismissUserReport(id)
      setUserReports((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      setMessage({ ok: false, text: describeListingError(err) })
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!supabaseConfigured) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm">
          Ingen backend är konfigurerad i den här miljön ännu. Sätt{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> och{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> för att aktivera admin.
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Endast för administratörer</h1>
        <p className="text-sm text-gray-500">
          Ditt konto har inte adminbehörighet. En administratör sätts i Supabase med{' '}
          <code className="font-mono text-xs">update profiles set is_admin = true where id = &apos;…&apos;</code>.
        </p>
      </div>
    )
  }

  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Översikt, moderering och städning av annonser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/annonsorer"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Megaphone size={15} /> Annonsörer
          </Link>
          <Link
            href="/admin/installningar"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Mail size={15} /> SMTP-inställningar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Registrerade användare', value: counts?.users, Icon: Users },
          { label: 'Aktiva annonser', value: counts?.activeListings, Icon: Home },
          { label: 'Konversationer', value: counts?.conversations, Icon: MessageSquare },
          { label: 'Öppna anmälningar', value: reports.length + userReports.length, Icon: Flag },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <Icon size={18} className="text-emerald-600" />
            <div className="text-2xl font-bold text-gray-900 mt-2">{value ?? '—'}</div>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {reports.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-gray-900 mb-3">Anmälda annonser</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 bg-white border border-red-100 rounded-xl text-sm">
                <Flag size={14} className="text-red-500" />
                <Link href={`/annonser/${r.listingId}`} className="font-medium text-gray-900 hover:underline">{r.listingTitle}</Link>
                <span className="text-gray-500 flex-1 min-w-[12rem]">”{r.reason}”</span>
                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                <button onClick={() => dismissReport(r.id)} className="text-xs text-gray-500 hover:text-gray-800">Avfärda</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {userReports.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-gray-900 mb-3">Anmälda användare</h2>
          <div className="space-y-2">
            {userReports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 bg-white border border-red-100 rounded-xl text-sm">
                <UserX size={14} className="text-red-500" />
                <Link href={`/profil/${r.reportedId}`} className="font-medium text-gray-900 hover:underline">{r.reportedName}</Link>
                <span className="text-gray-500 flex-1 min-w-[12rem] whitespace-pre-wrap break-words">”{r.reason}”</span>
                <span className="text-xs text-gray-400">
                  av <Link href={`/profil/${r.reporterId}`} className="hover:underline">{r.reporterName}</Link>
                  {r.conversationId ? ' · från en chatt' : ''} · {formatDate(r.createdAt)}
                </span>
                <button onClick={() => dismissUserReportById(r.id)} className="text-xs text-gray-500 hover:text-gray-800">Avfärda</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-gray-900">Alla annonser</h2>
          <button
            onClick={runCleanup}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Städa utgångna annonser
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto scrollbar-hide">
            {([
              ['alla', 'Alla'],
              ['aktiva', 'Aktiva'],
              ['utgangna', 'Utgångna'],
              ['avslutade', 'Avslutade'],
              ['rapporterade', 'Anmälda'],
              ['utan-bilder', 'Utan bilder'],
            ] as [Filter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap',
                  filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök rubrik, adress eller annonsör"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {message && (
          <div className={cn('mb-3 px-4 py-3 rounded-xl text-sm', message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
          <button
            onClick={() => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((l) => l.id)))}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 px-1"
          >
            {allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            Markera alla som visas ({visible.length})
          </button>
          {selected.size > 0 && (
            <>
              <button onClick={() => bulk('end')} disabled={busy} className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                <Archive size={13} /> Avsluta {selected.size}
              </button>
              <button onClick={() => bulk('delete')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600">
                <Trash2 size={13} /> Ta bort {selected.size}
              </button>
            </>
          )}
        </div>

        {listings === null ? (
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {visible.length === 0 && <p className="text-center text-sm text-gray-400 py-10">Inga annonser.</p>}
            {visible.map((l) => (
              <div key={l.id} className={cn('flex items-center gap-3 p-3 text-sm', selected.has(l.id) && 'bg-emerald-50/50')}>
                <button onClick={() => toggle(l.id)} aria-label="Markera" className="text-gray-400 hover:text-emerald-600">
                  {selected.has(l.id) ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                </button>
                <div className="w-12 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {l.images[0] ? (
                    <img src={l.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageOff size={14} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/annonser/${l.id}`} className="font-medium text-gray-900 hover:underline line-clamp-1">{l.title}</Link>
                  <p className="text-xs text-gray-500 truncate">{l.userName} · {l.address} · uppdaterad {formatDate(l.updatedAt)}</p>
                </div>
                <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                  {reportedIds.has(l.id) && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">Anmäld</span>}
                  {l.status === 'aktiv' && isExpired(l) && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">Utgången</span>}
                  {l.status === 'aktiv' && !isExpired(l) && isStale(l) && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">Gammal</span>}
                  <span className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full font-semibold',
                    l.status === 'aktiv' ? 'bg-emerald-50 text-emerald-700' : l.status === 'pausad' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'
                  )}>
                    {l.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
