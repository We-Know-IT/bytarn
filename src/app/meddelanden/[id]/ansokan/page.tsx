'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Loader2, Lock, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import { fetchConversations, type ConversationSummary } from '@/lib/messages'
import { fetchListingsByUser, fetchMyListings } from '@/lib/listings'
import {
  ATTACHMENTS, clearDraft, describeHome, emptyParty, loadDraft, mergeDraft, pickListings, saveDraft,
  type ApplicationDraft, type PartyDetails,
} from '@/lib/swapApplication'
import type { Listing } from '@/types'
import { cn } from '@/lib/utils'

interface Loaded {
  conv: ConversationSummary
  myListings: Listing[]
  theirListings: Listing[]
}

export default function SwapApplicationPage() {
  const params = useParams()
  const conversationId = params.id as string
  const { user, profile, loading } = useAuth()
  const [data, setData] = useState<Loaded | null | undefined>(undefined)
  const [draft, setDraft] = useState<ApplicationDraft | null>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const convs = await fetchConversations(user.id)
      const conv = convs.find((c) => c.id === conversationId)
      if (!conv?.other) {
        if (!cancelled) setData(null)
        return
      }
      const [mine, theirs] = await Promise.all([fetchMyListings(user.id), fetchListingsByUser(conv.other.id)])
      if (!cancelled) setData({ conv, myListings: mine.filter((l) => l.userId === user.id), theirListings: theirs })
    })()
    return () => {
      cancelled = true
    }
  }, [user, conversationId])

  // Prefill once data and profile are in, then layer the saved draft on top.
  useEffect(() => {
    if (!data || !user || initialised.current) return
    initialised.current = true
    const picked = pickListings(data.conv.listingId, data.myListings, data.theirListings, user.id)
    const defaults: ApplicationDraft = {
      me: emptyParty({ name: profile?.name ?? '', email: user.email ?? '' }),
      them: emptyParty({ name: data.conv.other?.name ?? '' }),
      swapDate: '',
      myListingId: picked.mine?.id ?? null,
      theirListingId: picked.theirs?.id ?? null,
      attachments: [],
    }
    setDraft(mergeDraft(defaults, loadDraft(conversationId)))
  }, [data, user, profile, conversationId])

  useEffect(() => {
    if (draft) saveDraft(conversationId, draft)
  }, [draft, conversationId])

  const myHome = useMemo(
    () => data?.myListings.find((l) => l.id === draft?.myListingId) ?? null,
    [data, draft?.myListingId]
  )
  const theirHome = useMemo(
    () => data?.theirListings.find((l) => l.id === draft?.theirListingId) ?? null,
    [data, draft?.theirListingId]
  )

  if (!supabaseConfigured) {
    return <Centered>Bytesansökan är inte tillgänglig just nu.</Centered>
  }
  if (!loading && !user) {
    return (
      <Centered>
        <Link href={`/logga-in?nasta=/meddelanden/${conversationId}/ansokan`} className="font-medium text-emerald-700 hover:underline">
          Logga in för att skapa en bytesansökan
        </Link>
      </Centered>
    )
  }
  if (data === null) return <Centered>Konversationen hittades inte.</Centered>
  if (!data || !draft || !user) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-gray-400" />
      </Centered>
    )
  }

  const setParty = (who: 'me' | 'them', key: keyof PartyDetails, value: string) =>
    setDraft((d) => d && { ...d, [who]: { ...d[who], [key]: value } })

  const toggleAttachment = (a: string) =>
    setDraft((d) => d && {
      ...d,
      attachments: d.attachments.includes(a) ? d.attachments.filter((x) => x !== a) : [...d.attachments, a],
    })

  function reset() {
    if (!confirm('Rensa allt du har fyllt i?')) return
    clearDraft(conversationId)
    initialised.current = false
    setDraft(null)
    setData((d) => (d ? { ...d } : d))
  }

  const today = new Date().toLocaleDateString('sv-SE')
  const otherName = data.conv.other?.name ?? 'Bytespartnern'

  return (
    <div className="bg-[#F3F1EC] print:bg-white">
      <div className="mx-auto max-w-[880px] px-4 py-6 sm:py-10 print:p-0">
        {/* Controls (not printed) */}
        <div className="print-hidden mb-6 space-y-4">
          <Link href={`/meddelanden/${conversationId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft size={15} /> Tillbaka till chatten
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bytesansökan</h1>
              <p className="mt-1 max-w-xl text-sm text-gray-600">
                Fyll i det som saknas och skriv ut eller spara som PDF. Har hyresvärden en egen blankett kan du använda
                den här som underlag eller bilaga.{' '}
                <Link href="/ansokan-om-byte" className="font-medium text-emerald-700 underline">Så går ansökan till</Link>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="btn btn-secondary btn-sm">
                <Trash2 size={14} /> Rensa
              </button>
              <button onClick={() => window.print()} className="btn btn-primary btn-sm">
                <Printer size={14} /> Skriv ut / spara PDF
              </button>
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock size={12} /> Det du skriver sparas bara i den här webbläsaren och skickas inte till oss eller till {otherName}.
          </p>
          {(data.myListings.length > 1 || data.theirListings.length > 1) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ListingSelect
                label="Din lägenhet"
                listings={data.myListings}
                value={draft.myListingId}
                onChange={(id) => setDraft((d) => d && { ...d, myListingId: id })}
              />
              <ListingSelect
                label={`${otherName}s lägenhet`}
                listings={data.theirListings}
                value={draft.theirListingId}
                onChange={(id) => setDraft((d) => d && { ...d, theirListingId: id })}
              />
            </div>
          )}
        </div>

        {/* The document */}
        <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-4">
            <h2 className="text-[22px] font-semibold text-gray-900">Ansökan om lägenhetsbyte</h2>
            <p className="text-sm text-gray-500">Datum: {today}</p>
          </header>

          <p className="mb-8 text-[14px] leading-relaxed text-gray-700">
            Vi ansöker om att få byta lägenheter med varandra enligt 12 kap. 35 § jordabalken. Part 1 flyttar till part
            2:s lägenhet och part 2 flyttar till part 1:s lägenhet.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2">
            <PartySection
              title="Part 1"
              party={draft.me}
              home={myHome}
              missingHome="Du har ingen aktiv annons, så fyll i lägenheten själv."
              onChange={(k, v) => setParty('me', k, v)}
            />
            <PartySection
              title="Part 2"
              party={draft.them}
              home={theirHome}
              missingHome={`${otherName} har ingen aktiv annons, så fyll i lägenheten själv.`}
              onChange={(k, v) => setParty('them', k, v)}
            />
          </div>

          <section className="mt-8 border-t border-gray-200 pt-6">
            <Field label="Önskat bytesdatum">
              <input
                type="date"
                value={draft.swapDate}
                onChange={(e) => setDraft((d) => d && { ...d, swapDate: e.target.value })}
                className="doc-input max-w-[220px] print:hidden"
              />
              {/* Printed as text: date inputs print in the browser's own format. */}
              <span className="doc-input hidden max-w-[220px] print:block">{draft.swapDate || '\u00a0'}</span>
            </Field>
          </section>

          <section className="mt-6 grid gap-6 sm:grid-cols-2 print:break-inside-avoid print:grid-cols-2">
            <Field label="Skäl för bytet, part 1">
              <AutoTextarea value={draft.me.reason} onChange={(v) => setParty('me', 'reason', v)} placeholder="T.ex. vi har fått barn och behöver ett rum till." />
            </Field>
            <Field label="Skäl för bytet, part 2">
              <AutoTextarea value={draft.them.reason} onChange={(v) => setParty('them', 'reason', v)} placeholder="T.ex. nytt jobb närmare den nya lägenheten." />
            </Field>
          </section>

          <section className="mt-8 border-t border-gray-200 pt-6 print:break-inside-avoid">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-gray-500">Bifogade handlingar</h3>
            <ul className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
              {ATTACHMENTS.map((a) => (
                <li key={a}>
                  <label className="flex items-center gap-2 text-[14px] text-gray-700">
                    <input type="checkbox" checked={draft.attachments.includes(a)} onChange={() => toggleAttachment(a)} />
                    {a}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 grid gap-10 sm:grid-cols-2 print:break-inside-avoid print:grid-cols-2">
            {[draft.me.name || 'Part 1', draft.them.name || 'Part 2'].map((name, i) => (
              <div key={i}>
                <div className="h-12 border-b border-gray-400" />
                <p className="mt-1.5 text-[12.5px] text-gray-600">Underskrift, {name}</p>
                <div className="mt-6 h-8 border-b border-gray-400" />
                <p className="mt-1.5 text-[12.5px] text-gray-600">Ort och datum</p>
              </div>
            ))}
          </section>

          <p className="mt-10 text-[11.5px] text-gray-400">
            Sammanställd via Hyresvägen. Hyresvägen är inte part i bytet. Bytet gäller först när båda hyresvärdarna har
            godkänt det, eller när hyresnämnden har gett tillstånd.
          </p>
        </article>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4 text-center text-sm text-gray-500">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

function AutoTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={Math.max(3, value.split('\n').length + Math.floor(value.length / 60))}
      className="doc-input resize-none"
    />
  )
}

const PARTY_FIELDS: { key: keyof PartyDetails; label: string; type?: string }[] = [
  { key: 'name', label: 'Namn' },
  { key: 'personalNumber', label: 'Personnummer' },
  { key: 'phone', label: 'Telefon', type: 'tel' },
  { key: 'email', label: 'E-post', type: 'email' },
  { key: 'householdSize', label: 'Antal personer som flyttar' },
]

function PartySection({
  title, party, home, missingHome, onChange,
}: {
  title: string
  party: PartyDetails
  home: Listing | null
  missingHome: string
  onChange: (key: keyof PartyDetails, value: string) => void
}) {
  return (
    <section>
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-3">
        {PARTY_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input type={f.type ?? 'text'} value={party[f.key]} onChange={(e) => onChange(f.key, e.target.value)} className="doc-input" />
          </Field>
        ))}
      </div>

      <h4 className="mb-3 mt-6 text-[13px] font-semibold text-gray-800">Nuvarande lägenhet</h4>
      {home ? (
        <dl className="space-y-1.5 text-[14px]">
          {describeHome(home).map((row) => (
            <div key={row.label} className="flex gap-2">
              <dt className="w-20 flex-shrink-0 text-gray-500">{row.label}</dt>
              <dd className="text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <>
          <p className="print-hidden mb-3 text-[13px] text-amber-700">{missingHome}</p>
          <Field label="Adress, storlek och hyra">
            <AutoTextarea value={party.address} onChange={(v) => onChange('address', v)} placeholder="Hornsgatan 1, 2 rum, 54 m², 8 500 kr/mån" />
          </Field>
        </>
      )}
      <div className="mt-3 space-y-3">
        <Field label="Hyresvärd">
          <input value={party.landlord} onChange={(e) => onChange('landlord', e.target.value)} className="doc-input" />
        </Field>
        <Field label="Objekts- eller kontraktsnummer">
          <input value={party.objectNumber} onChange={(e) => onChange('objectNumber', e.target.value)} className="doc-input" />
        </Field>
      </div>
    </section>
  )
}

function ListingSelect({
  label, listings, value, onChange,
}: {
  label: string
  listings: Listing[]
  value: string | null
  onChange: (id: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-gray-600">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={listings.length < 2}
        className={cn('input', listings.length < 2 && 'opacity-60')}
      >
        {listings.map((l) => (
          <option key={l.id} value={l.id}>
            {l.address}, {l.rooms} rum
          </option>
        ))}
      </select>
    </label>
  )
}
