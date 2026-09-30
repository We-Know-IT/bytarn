'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Upload, MousePointerClick } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import {
  AD_PLACEMENTS, deleteAd, fetchAllAds, isLive, saveAd, setAdActive, type Ad, type AdInput, type AdPlacement,
} from '@/lib/ads'
import { uploadListingImage, validateImage } from '@/lib/storage'
import { describeListingError } from '@/lib/listings'
import { cn, formatDate } from '@/lib/utils'

const EMPTY: AdInput = {
  advertiser: '',
  headline: '',
  body: '',
  imageUrl: '',
  linkUrl: 'https://',
  placement: 'listing_grid',
  active: true,
  startsAt: '',
  endsAt: '',
}

// <input type="date"> wants yyyy-mm-dd
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

function adToInput(ad: Ad): AdInput {
  return {
    advertiser: ad.advertiser,
    headline: ad.headline,
    body: ad.body ?? '',
    imageUrl: ad.imageUrl ?? '',
    linkUrl: ad.linkUrl,
    placement: ad.placement,
    active: ad.active,
    startsAt: toDateInput(ad.startsAt),
    endsAt: toDateInput(ad.endsAt),
  }
}

export default function AdminAdsPage() {
  const { user, profile, loading } = useAuth()
  const [ads, setAds] = useState<Ad[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id?: string; input: AdInput } | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const isAdmin = profile?.isAdmin ?? false

  async function reload() {
    try {
      setAds(await fetchAllAds())
    } catch (err) {
      setError(`Kunde inte hämta annonsörer: ${describeListingError(err)}. Har migreringen 20260930_v3.sql körts?`)
      setAds([])
    }
  }

  useEffect(() => {
    if (supabaseConfigured && isAdmin) reload()
  }, [isAdmin])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      await saveAd(editing.input, editing.id)
      setEditing(null)
      await reload()
    } catch (err) {
      setError(`Kunde inte spara: ${describeListingError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user || !editing) return
    const invalid = validateImage(file)
    if (invalid) return setError(invalid)
    setUploading(true)
    try {
      const url = await uploadListingImage(file, user.id)
      setEditing((ed) => ed && { ...ed, input: { ...ed.input, imageUrl: url } })
    } catch (err) {
      setError(`Kunde inte ladda upp bilden: ${describeListingError(err)}`)
    } finally {
      setUploading(false)
    }
  }

  async function toggle(ad: Ad) {
    await setAdActive(ad.id, !ad.active).catch((err) => setError(describeListingError(err)))
    await reload()
  }

  async function remove(ad: Ad) {
    if (!confirm(`Ta bort annonsen från ${ad.advertiser}?`)) return
    await deleteAd(ad.id).catch((err) => setError(describeListingError(err)))
    await reload()
  }

  if (!supabaseConfigured) {
    return <p className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-500">Ingen backend är konfigurerad.</p>
  }
  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
  }
  if (!isAdmin) {
    return <p className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-gray-500">Endast för administratörer.</p>
  }

  const set = <K extends keyof AdInput>(key: K, value: AdInput[K]) =>
    setEditing((ed) => ed && { ...ed, input: { ...ed.input, [key]: value } })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={15} /> Admin
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annonsörer</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sponsrade platser på sajten. Visas märkta med &quot;Sponsrat&quot;. Klick räknas per annons.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing({ input: EMPTY })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#153F32] text-white rounded-xl text-sm font-semibold hover:bg-[#0F2F25]"
          >
            <Plus size={15} /> Ny annonsör
          </button>
        )}
      </div>

      {error && <div role="alert" className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {editing && (
        <form onSubmit={handleSave} className="mb-8 bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Annonsör *">
              <input required value={editing.input.advertiser} onChange={(e) => set('advertiser', e.target.value)} className="input" placeholder="Flyttfirman AB" />
            </Field>
            <Field label="Placering *">
              <select value={editing.input.placement} onChange={(e) => set('placement', e.target.value as AdPlacement)} className="input">
                {AD_PLACEMENTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Rubrik *">
            <input required maxLength={80} value={editing.input.headline} onChange={(e) => set('headline', e.target.value)} className="input" placeholder="Flytta tryggt i Stockholm" />
          </Field>
          <Field label="Text">
            <textarea maxLength={200} rows={2} value={editing.input.body} onChange={(e) => set('body', e.target.value)} className="input resize-none" />
          </Field>
          <Field label="Länk *">
            <input required type="url" pattern="https?://.+" value={editing.input.linkUrl} onChange={(e) => set('linkUrl', e.target.value)} className="input" />
          </Field>
          <Field label="Bild">
            <div className="flex items-center gap-3">
              {editing.input.imageUrl && <img src={editing.input.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />}
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm cursor-pointer hover:bg-gray-50">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Ladda upp
                <input type="file" accept="image/*" className="sr-only" onChange={handleImage} />
              </label>
              {editing.input.imageUrl && (
                <button type="button" onClick={() => set('imageUrl', '')} className="text-xs text-gray-500 underline">Ta bort</button>
              )}
            </div>
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Startdatum">
              <input type="date" value={editing.input.startsAt} onChange={(e) => set('startsAt', e.target.value)} className="input" />
            </Field>
            <Field label="Slutdatum">
              <input type="date" value={editing.input.endsAt} onChange={(e) => set('endsAt', e.target.value)} className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700 self-end pb-3">
              <input type="checkbox" checked={editing.input.active} onChange={(e) => set('active', e.target.checked)} />
              Aktiv
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving || uploading} className="px-4 py-2.5 bg-[#153F32] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {saving ? 'Sparar…' : 'Spara'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
              Avbryt
            </button>
          </div>
        </form>
      )}

      {ads === null ? (
        <div className="py-10 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
      ) : ads.length === 0 ? (
        <p className="text-sm text-gray-500 py-10 text-center">Inga annonsörer ännu.</p>
      ) : (
        <ul className="space-y-2">
          {ads.map((ad) => {
            const live = isLive(ad)
            return (
              <li key={ad.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-3">
                {ad.imageUrl ? (
                  <img src={ad.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{ad.headline}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {ad.advertiser} · {AD_PLACEMENTS.find((p) => p.value === ad.placement)?.label}
                    {ad.endsAt && ` · t.o.m. ${formatDate(ad.endsAt)}`}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500" title="Klick">
                  <MousePointerClick size={13} /> {ad.clicks}
                </span>
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', live ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                  {live ? 'Visas' : ad.active ? 'Schemalagd/slut' : 'Pausad'}
                </span>
                <button onClick={() => toggle(ad)} className="p-2 text-gray-500 hover:text-gray-900" aria-label={ad.active ? 'Pausa' : 'Aktivera'}>
                  {ad.active ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button onClick={() => setEditing({ id: ad.id, input: adToInput(ad) })} className="p-2 text-gray-500 hover:text-gray-900" aria-label="Redigera">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(ad)} className="p-2 text-gray-500 hover:text-red-600" aria-label="Ta bort">
                  <Trash2 size={15} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  )
}
