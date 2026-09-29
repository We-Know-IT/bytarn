'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Upload, X, Plus, MapPin, Info, MoveVertical, Trees, Sofa, PawPrint, Wand2, Loader2, Users, Mail, Video, AlertTriangle, LogIn } from 'lucide-react'
import { STOCKHOLM_DISTRICTS } from '@/types'
import { cn } from '@/lib/utils'
import AddressInput from '@/components/AddressInput'
import { createListing, updateListing, fetchListingById, geocodeAddress, describeListingError, LISTING_LIFETIME_DAYS } from '@/lib/listings'
import { uploadListingImage, uploadListingVideo, validateImage, validateVideo } from '@/lib/storage'
import { updateHome } from '@/lib/profile'
import { fetchCollaborators, inviteCollaboratorByEmail, removeCollaborator, type Collaborator } from '@/lib/collaborators'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'

const MAX_IMAGES = 10
const DRAFT_KEY = 'bytaren_my_listing_draft'

interface ListingFormData {
  title: string
  rooms: string
  area: string
  rent: string
  floor: string
  district: string
  address: string
  elevator: boolean
  balcony: boolean
  furnished: boolean
  petsAllowed: boolean
}

// Builds a title/description straight from the fields already filled in —
// no external calls, just a factual summary of real data instead of a blank page.
function suggestTitle(f: ListingFormData): string {
  const amenities = [f.elevator && 'hiss', f.balcony && 'balkong', f.furnished && 'möblerad'].filter(Boolean) as string[]
  const suffix = amenities.length > 0 ? ` — ${amenities.join(', ')}` : f.area ? ` — ${f.area} m²` : ''
  return `${f.rooms || '?'} rok på ${f.district || 'okänd stadsdel'}${suffix}`
}

function suggestDescription(f: ListingFormData): string {
  const amenities = [f.elevator && 'hiss', f.balcony && 'balkong', f.furnished && 'möblerad', f.petsAllowed && 'husdjur tillåtet'].filter(Boolean) as string[]
  const sentences = [
    `${f.rooms || '?'}-rumslägenhet på ${f.area || '?'} m² i ${f.district || 'Stockholm'}${f.address ? `, ${f.address}` : ''}.`,
  ]
  if (f.floor) sentences.push(`Ligger på våning ${f.floor}.`)
  if (amenities.length > 0) sentences.push(`Har ${amenities.join(', ')}.`)
  if (f.rent) sentences.push(`Hyra ${new Intl.NumberFormat('sv-SE').format(Number(f.rent))} kr/mån.`)
  sentences.push('Söker byte i Stockholmsområdet.')
  return sentences.join(' ')
}

export default function NyAnnonsPage() {
  return (
    <Suspense>
      <NyAnnonsForm />
    </Suspense>
  )
}

function NyAnnonsForm() {
  const router = useRouter()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const editId = searchParams.get('redigera')
  const isEditing = Boolean(editId)

  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [approximateLocation, setApproximateLocation] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
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
        if (!listing) {
          setLoadError('Annonsen hittades inte, eller så har du inte behörighet att redigera den.')
          return
        }
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
        setVideoUrl(listing.videoUrl ?? null)
      })
      fetchCollaborators(editId).then(setCollaborators)
      return
    }
    // Otherwise pre-fill from onboarding draft
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      setForm((f) => ({
        ...f,
        district: draft.district ?? f.district,
        address: draft.address ?? f.address,
        rooms: draft.rooms ?? f.rooms,
        area: draft.area ?? f.area,
        floor: draft.floor ?? f.floor,
        rent: draft.rent ?? f.rent,
        balcony: draft.balcony ?? f.balcony,
        elevator: draft.elevator ?? f.elevator,
      }))
    } catch {}
  }, [editId])

  // Uploads each file independently, so one oversized or failing image no
  // longer throws away the others — the old all-or-nothing Promise.all left
  // users stuck on this step with a generic error.
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - images.length)
    e.target.value = ''
    if (files.length === 0) return
    setUploadError(null)
    if (!supabaseConfigured || !user) {
      setUploadError('Du måste vara inloggad för att ladda upp bilder.')
      return
    }
    const problems: string[] = []
    const valid = files.filter((file) => {
      const problem = validateImage(file)
      if (problem) problems.push(problem)
      return !problem
    })
    setUploadingImages(true)
    const results = await Promise.allSettled(valid.map((file) => uploadListingImage(file, user.id)))
    const uploaded: string[] = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') uploaded.push(r.value)
      else problems.push(`${valid[i].name}: ${describeListingError(r.reason)}`)
    })
    setImages((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES))
    setUploadingImages(false)
    if (problems.length > 0) setUploadError(problems.join(' '))
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    if (!supabaseConfigured || !user) {
      setUploadError('Du måste vara inloggad för att ladda upp video.')
      return
    }
    const problem = validateVideo(file)
    if (problem) {
      setUploadError(problem)
      return
    }
    setUploadingVideo(true)
    try {
      setVideoUrl(await uploadListingVideo(file, user.id))
    } catch (err) {
      setUploadError(`Kunde inte ladda upp videon: ${describeListingError(err)}`)
    } finally {
      setUploadingVideo(false)
    }
  }

  function moveImageFirst(index: number) {
    setImages((prev) => [prev[index], ...prev.filter((_, i) => i !== index)])
  }

  // Places the listing on the map when the address was typed rather than
  // picked from the suggestions (previously this only surfaced as an error
  // on the very last step, after images had been uploaded).
  async function resolveLocation(): Promise<{ lat: number; lng: number } | null> {
    if (form.lat && form.lng) return { lat: form.lat, lng: form.lng }
    setLocating(true)
    const result = await geocodeAddress(form.address, form.district)
    setLocating(false)
    if (!result) return null
    setForm((f) => ({ ...f, lat: result.lat, lng: result.lng }))
    setApproximateLocation(!result.exact)
    return result
  }

  async function goToStep2() {
    setSubmitError(null)
    const errors = validateDetails()
    if (errors) {
      setSubmitError(errors)
      return
    }
    const location = await resolveLocation()
    if (!location) {
      setSubmitError('Vi kunde inte hitta adressen. Välj en adress från förslagslistan.')
      return
    }
    setStep(2)
  }

  function validateDetails(): string | null {
    if (!form.title.trim()) return 'Skriv en rubrik.'
    if (!form.rooms) return 'Välj antal rum.'
    if (!(Number(form.area) > 0)) return 'Ange bostadens yta i m².'
    if (!(Number(form.rent) > 0)) return 'Ange månadshyran i kronor.'
    if (!form.district) return 'Välj stadsdel.'
    if (!form.address.trim()) return 'Ange gatuadress.'
    return null
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleInvite() {
    if (!editId || !inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      await inviteCollaboratorByEmail(editId, inviteEmail.trim())
      setInviteEmail('')
      setCollaborators(await fetchCollaborators(editId))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Kunde inte bjuda in personen.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveCollaborator(userId: string) {
    if (!editId) return
    await removeCollaborator(editId, userId)
    setCollaborators((prev) => prev.filter((c) => c.userId !== userId))
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
    const detailsError = validateDetails()
    if (detailsError) {
      setSubmitError(detailsError)
      setStep(1)
      return
    }
    setSubmitting(true)
    try {
      const location = await resolveLocation()
      if (!location) {
        setSubmitError('Vi kunde inte placera adressen på kartan. Gå tillbaka och välj en adress från förslagslistan.')
        return
      }
      const input = {
        title: form.title,
        description: form.description,
        rooms: Number(form.rooms),
        rent: Number(form.rent),
        area: Number(form.area),
        district: form.district,
        address: form.address,
        lat: location.lat,
        lng: location.lng,
        images,
        videoUrl,
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
        const id = await createListing(input, user.id, profile?.name ?? user.email?.split('@')[0] ?? 'Användare')
        try { localStorage.removeItem(DRAFT_KEY) } catch {}
        // The first listing doubles as the user's home location (used for
        // distances and the home marker on the map) if they haven't set one.
        if (profile && profile.homeLat == null) {
          updateHome(user.id, { address: input.address, district: input.district, lat: input.lat, lng: input.lng })
            .then(refreshProfile)
            .catch(() => {})
        }
        router.push(`/annonser/${id}`)
      }
    } catch (err) {
      setSubmitError(describeListingError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const canGoToStep2 =
    form.title && form.rooms && form.area && form.rent && form.district && form.address

  // Images are recommended, not required — a failing upload must never
  // block publishing.
  const canGoToStep3 = !uploadingImages && !uploadingVideo

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
        <Loader2 className="animate-spin" size={22} />
      </div>
    )
  }

  if (!supabaseConfigured || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
          <LogIn size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Logga in för att lägga upp annons</h1>
        <p className="text-gray-500 text-sm mb-6">
          {supabaseConfigured
            ? 'Du behöver ett konto för att publicera en annons. Det är gratis och tar en minut.'
            : 'Backend är inte konfigurerad i den här miljön ännu, så annonser kan inte publiceras.'}
        </p>
        {supabaseConfigured && (
          <div className="flex gap-3 justify-center">
            <Link href="/logga-in" className="px-5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
              Logga in
            </Link>
            <Link href="/registrera" className="px-5 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">
              Skapa konto
            </Link>
          </div>
        )}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Kan inte redigera annonsen</h1>
        <p className="text-gray-500 text-sm mb-6">{loadError}</p>
        <Link href="/annonshanterare" className="text-emerald-600 font-medium hover:underline">Till Annonshanteraren</Link>
      </div>
    )
  }

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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Rubrik *</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, title: suggestTitle(form).slice(0, 80) })}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                <Wand2 size={12} />
                Föreslå
              </button>
            </div>
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
                // Typing a new address invalidates the old coordinates;
                // picking a suggestion supplies fresh ones.
                lat,
                lng,
              }))}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Beskrivning</label>
              <button
                type="button"
                onClick={() => setForm({ ...form, description: suggestDescription(form) })}
                className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                <Wand2 size={12} />
                Föreslå
              </button>
            </div>
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

          {submitError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{submitError}</div>
          )}

          <button
            onClick={goToStep2}
            disabled={!canGoToStep2 || locating}
            className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {locating && <Loader2 size={16} className="animate-spin" />}
            {locating ? 'Hittar adressen…' : 'Nästa — Bilder och video'}
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
            images.length >= MAX_IMAGES || uploadingImages
              ? 'border-gray-200 opacity-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
          )}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={images.length >= MAX_IMAGES || uploadingImages}
              className="hidden"
            />
            {uploadingImages ? (
              <Loader2 size={32} className="text-emerald-500 mx-auto mb-3 animate-spin" />
            ) : (
              <Upload size={32} className="text-gray-400 mx-auto mb-3" />
            )}
            <p className="text-sm font-medium text-gray-600">
              {uploadingImages ? 'Laddar upp…' : 'Klicka för att ladda upp bilder'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG upp till 10 MB · {images.length}/{MAX_IMAGES} tillagda
            </p>
          </label>

          {uploadError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{uploadError}</div>
          )}

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
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImageFirst(i)}
                      className="absolute bottom-2 left-2 bg-white/90 text-gray-800 text-xs px-2 py-0.5 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Gör till omslag
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Ta bort bild"
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* Video */}
          <div className="border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Video size={16} className="text-emerald-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Video (valfritt)</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              En kort visning med mobilen säger mer än tio bilder. MP4, WebM eller MOV, högst 100 MB.
            </p>
            {videoUrl ? (
              <div className="space-y-2">
                <video src={videoUrl} controls playsInline className="w-full rounded-xl bg-black max-h-72" />
                <button type="button" onClick={() => setVideoUrl(null)} className="text-xs text-red-500 hover:text-red-700">
                  Ta bort video
                </button>
              </div>
            ) : (
              <label className={cn(
                'flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-5 text-sm font-medium cursor-pointer transition-colors',
                uploadingVideo ? 'border-gray-200 text-gray-400 cursor-wait' : 'border-gray-300 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50'
              )}>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                  className="hidden"
                />
                {uploadingVideo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadingVideo ? 'Laddar upp video…' : 'Välj video'}
              </label>
            )}
          </div>

          {images.length === 0 && !uploadingImages && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Annonser med bilder får betydligt fler intressenter. Du kan publicera utan och lägga till bilder senare.
              </p>
            </div>
          )}

          {/* Dela annons med en medannonsör (t.ex. en sambo) */}
          {isEditing && editId && (
            <div className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-emerald-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Dela annonsen</h3>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Bjud in någon att hantera just den här annonsen. Personen måste redan ha ett konto på Bytaren.
                Vill ni dela alla era annonser? Skapa ett <Link href="/familj" className="text-emerald-700 underline">familjekonto</Link>.
              </p>

              {collaborators.length > 0 && (
                <div className="space-y-2 mb-4">
                  {collaborators.map((c) => (
                    <div key={c.userId} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold">
                          {c.name[0]}
                        </div>
                      )}
                      <span className="flex-1 text-sm text-gray-800">{c.name}</span>
                      <button
                        onClick={() => handleRemoveCollaborator(c.userId)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Ta bort
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e-post till medannonsör"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {inviting ? 'Bjuder in…' : 'Bjud in'}
                </button>
              </div>
              {inviteError && <p className="text-xs text-red-600 mt-2">{inviteError}</p>}
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
              {uploadingImages || uploadingVideo ? 'Väntar på uppladdning…' : 'Nästa — Granska'}
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
          {videoUrl && (
            <p className="flex items-center gap-1.5 text-sm text-gray-600">
              <Video size={14} className="text-emerald-600" /> Video bifogad
            </p>
          )}
          {approximateLocation && (
            <p className="flex items-start gap-1.5 text-sm text-amber-700">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" />
              Vi hittade inte exakt adress, så annonsen placeras mitt i {form.district} på kartan.
            </p>
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
              {isEditing
                ? 'Ändringarna syns direkt för alla på Bytaren.'
                : `Annonsen publiceras direkt och är synlig i ${LISTING_LIFETIME_DAYS} dagar. Du kan förlänga den i Annonshanteraren.`}
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
