'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Upload, X, Plus, MapPin, Info, MoveVertical, Trees, Sofa, PawPrint } from 'lucide-react'
import { STOCKHOLM_DISTRICTS } from '@/types'
import { cn } from '@/lib/utils'
import AddressInput from '@/components/AddressInput'
import { createListing, updateListing, fetchListingById } from '@/lib/listings'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'

const MAX_IMAGES = 10

export default function NyAnnonsPage() {
  return (
    <Suspense>
      <NyAnnonsForm />
    </Suspense>
  )
}

function NyAnnonsForm() {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const editId = searchParams.get('redigera')
  const isEditing = Boolean(editId)

  const [images, setImages] = useState<string[]>([])
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    rooms: '',
    area: '',
    rent: '',
    floor: '',
    district: '',
    address: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    elevator: false,
    balcony: false,
    furnished: false,
    petsAllowed: false,
  })

  // If editing, pre-fill from the existing listing
  useEffect(() => {
    if (editId) {
      fetchListingById(editId).then((listing) => {
        if (!listing) return
        setForm((f) => ({
          ...f,
          title: listing.title,
          description: listing.description,
          rooms: String(listing.rooms),
          area: String(listing.area),
          rent: String(listing.rent),
          floor: String(listing.floor ?? ''),
          district: listing.district,
          address: listing.address,
          lat: listing.lat,
          lng: listing.lng,
          elevator: listing.elevator ?? false,
          balcony: listing.balcony ?? false,
          furnished: listing.furnished ?? false,
          petsAllowed: listing.petsAllowed ?? false,
        }))
        setImages(listing.images)
      })
      return
    }
    // Otherwise pre-fill from onboarding draft
    try {
      const raw = localStorage.getItem('bytaren_my_listing_draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      setForm((f) => ({
        ...f,
        district: draft.district ?? f.district,
        address: draft.address ?? f.address,
        rooms: draft.rooms ?? f.rooms,
        area: draft.area ?? f.area,
        rent: draft.rent ?? f.rent,
        balcony: draft.balcony ?? f.balcony,
        elevator: draft.elevator ?? f.elevator,
      }))
    } catch {}
  }, [editId])

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (images.length < MAX_IMAGES) {
          setImages((prev) => [...prev, ev.target?.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    setSubmitError(null)
    if (!supabaseConfigured || !user) {
      setSubmitError(
        !supabaseConfigured
          ? 'Backend är inte konfigurerad i den här miljön ännu.'
          : 'Du måste vara inloggad för att publicera en annons.'
      )
      return
    }
    if (!form.lat || !form.lng) {
      setSubmitError('Välj en adress från förslagslistan så vi kan placera annonsen på kartan.')
      return
    }
    setSubmitting(true)
    try {
      const input = {
        title: form.title,
        description: form.description,
        rooms: Number(form.rooms),
        rent: Number(form.rent),
        area: Number(form.area),
        district: form.district,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        images,
        floor: form.floor ? Number(form.floor) : undefined,
        elevator: form.elevator,
        balcony: form.balcony,
        furnished: form.furnished,
        petsAllowed: form.petsAllowed,
      }
      if (isEditing && editId) {
        await updateListing(editId, input)
        router.push(`/annonser/${editId}`)
      } else {
        const id = await createListing(input, user.id)
        router.push(`/annonser/${id}`)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Kunde inte publicera annonsen.')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoToStep2 =
    form.title && form.rooms && form.area && form.rent && form.district && form.address

  const canGoToStep3 = images.length > 0

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{isEditing ? 'Redigera annons' : 'Lägg upp annons'}</h1>
        <p className="text-gray-500 text-sm">{isEditing ? 'Uppdatera uppgifterna för din annons.' : 'Berätta om din bostad så hittar vi rätt bytespartner.'}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['Detaljer', 'Bilder', 'Granska'] as const).map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          const active = step === stepNum
          const done = step > stepNum
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                  done ? 'bg-emerald-600 text-white' : active ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                )}
              >
                {done ? '✓' : stepNum}
              </div>
              <span className={cn('text-sm font-medium', active ? 'text-emerald-700' : 'text-gray-400')}>
                {label}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
            </div>
          )
        })}
      </div>

      {/* Step 1 — Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rubrik *</label>
            <input
              type="text"
              placeholder="t.ex. 3 rok på Södermalm — ljus och central"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={80}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">{form.title.length}/80</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rum *</label>
              <select
                value={form.rooms}
                onChange={(e) => setForm({ ...form, rooms: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">Välj</option>
                {[1, 2, 3, 4, 5, 6].map((r) => (
                  <option key={r} value={r}>
                    {r} rok
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Yta (m²) *</label>
              <input
                type="number"
                placeholder="65"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Våning</label>
              <input
                type="number"
                placeholder="3"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: e.target.value })}
                className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Hyra (kr/mån) *</label>
            <div className="relative">
              <input
                type="number"
                placeholder="8500"
                value={form.rent}
                onChange={(e) => setForm({ ...form, rent: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                kr/mån
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Stadsdel *</label>
            <select
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Välj stadsdel</option>
              {STOCKHOLM_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1">
                <MapPin size={14} /> Gatuadress *
              </span>
            </label>
            <AddressInput
              value={form.address}
              onChange={(addr, dist, lat, lng) => setForm((f) => ({
                ...f,
                address: addr,
                district: dist || f.district,
                lat: lat ?? f.lat,
                lng: lng ?? f.lng,
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Beskrivning</label>
            <textarea
              placeholder="Beskriv din bostad, vad du letar efter i ett byte, och eventuella villkor..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Faciliteter</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'elevator', label: 'Hiss', Icon: MoveVertical },
                { key: 'balcony', label: 'Balkong', Icon: Trees },
                { key: 'furnished', label: 'Möblerad', Icon: Sofa },
                { key: 'petsAllowed', label: 'Husdjur OK', Icon: PawPrint },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, [item.key]: !form[item.key as keyof typeof form] })
                  }
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                    form[item.key as keyof typeof form]
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  <item.Icon size={16} strokeWidth={1.75} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!canGoToStep2}
            className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Nästa — Lägg till bilder
          </button>
        </div>
      )}

      {/* Step 2 — Images */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Bilder</h2>
            <p className="text-sm text-gray-500">
              Lägg till upp till {MAX_IMAGES} bilder. Bra bilder ger fler intressenter.
            </p>
          </div>

          {/* Upload area */}
          <label className={cn(
            'block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors',
            images.length >= MAX_IMAGES
              ? 'border-gray-200 opacity-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
          )}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={images.length >= MAX_IMAGES}
              className="hidden"
            />
            <Upload size={32} className="text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">
              Klicka för att ladda upp bilder
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG upp till 10 MB · {images.length}/{MAX_IMAGES} tillagda
            </p>
          </label>

          {/* Image grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                      Omslagsbild
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Plus size={24} className="text-gray-400" />
                </label>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Tillbaka
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canGoToStep3}
              className="flex-1 py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Nästa — Granska
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="font-semibold text-gray-900">Granska din annons</h2>

          {images[0] && (
            <img
              src={images[0]}
              alt="Omslagsbild"
              className="w-full h-48 object-cover rounded-2xl"
            />
          )}

          <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-sm">
            <h3 className="font-semibold text-gray-900">{form.title}</h3>
            <p className="text-gray-500">{form.district} · {form.address}</p>
            <div className="flex gap-4">
              <span className="text-gray-700">{form.rooms} rok</span>
              <span className="text-gray-700">{form.area} m²</span>
              <span className="font-bold text-emerald-700">
                {form.rent ? new Intl.NumberFormat('sv-SE').format(parseInt(form.rent)) : '—'} kr/mån
              </span>
            </div>
            {form.description && (
              <p className="text-gray-600 leading-relaxed">{form.description}</p>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Din annons kommer att granskas och publiceras inom några minuter.
            </p>
          </div>

          {submitError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{submitError}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Tillbaka
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Publicerar…' : isEditing ? 'Spara ändringar' : 'Publicera annons'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
