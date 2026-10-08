import { NextResponse, type NextRequest } from 'next/server'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  appBaseUrl,
  getSmtpConfig,
  isDeliverableEmail,
  newMatchingListingEmail,
  selectListingRecipients,
  sendEmail,
  NOTIFICATION_SETTINGS_PATH,
  type AlertListing,
  type AlertPreferences,
  type AlertSavedSearch,
} from '@/lib/email'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const BATCH = 10
const IN_CHUNK = 150

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// Called fire-and-forget by the new-listing form after createListing().
// E-mails users whose saved searches (notify = true) or swap preferences
// (fit ≥ 70 %) match the new listing.
//
// Dedupe: listing_notifications has PK (listing_id, user_id). A row is
// inserted with ON CONFLICT DO NOTHING before each e-mail, and we only send
// when that insert actually created the row — so repeated or concurrent
// calls never mail the same person twice about the same listing.
export async function POST(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.json({ sent: 0, skipped: 0, reason: 'not_configured' })

  let listingId: unknown
  try {
    listingId = (await request.json())?.listingId
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 })
  }
  if (typeof listingId !== 'string' || !UUID_RE.test(listingId)) {
    return NextResponse.json({ error: 'Ogiltigt annons-id.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Du måste vara inloggad.' }, { status: 401 })

  const { data: row } = await supabase
    .from('listings')
    .select(
      'id, user_id, title, district, rooms, rent, area, images, status, created_at, elevator, balcony, pets_allowed, wheelchair_accessible, stroller_friendly'
    )
    .eq('id', listingId)
    .maybeSingle()
  if (!row) return NextResponse.json({ error: 'Annonsen hittades inte.' }, { status: 404 })
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: 'Du kan bara avisera om dina egna annonser.' }, { status: 403 })
  }
  if (row.status !== 'aktiv' || Date.now() - new Date(row.created_at as string).getTime() > MAX_AGE_MS) {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'not_new' })
  }

  const config = await getSmtpConfig()
  if (!config) return NextResponse.json({ sent: 0, skipped: 0, reason: 'smtp_not_configured' })

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'no_service_role' })
  }

  const ownerId = user.id
  const listing: AlertListing = {
    id: row.id as string,
    userId: ownerId,
    district: row.district as string,
    rooms: Number(row.rooms),
    rent: Number(row.rent),
    area: Number(row.area),
    elevator: !!row.elevator,
    balcony: !!row.balcony,
    petsAllowed: !!row.pets_allowed,
    wheelchairAccessible: !!row.wheelchair_accessible,
    strollerFriendly: !!row.stroller_friendly,
  }

  const [searchesRes, prefsRes, blocksRes, notifiedRes] = await Promise.all([
    admin
      .from('saved_searches')
      .select('id, user_id, name, districts, rooms, max_rent, notify')
      .eq('notify', true)
      .neq('user_id', ownerId),
    admin
      .from('swap_preferences')
      .select(
        'user_id, districts, rooms, max_rent, min_area, needs_elevator, needs_balcony, needs_pets, needs_wheelchair, needs_stroller'
      )
      .neq('user_id', ownerId),
    admin
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${ownerId},blocked_id.eq.${ownerId}`),
    admin.from('listing_notifications').select('user_id').eq('listing_id', listing.id),
  ])
  if (searchesRes.error) console.error('notify/listing: saved_searches', searchesRes.error.message)
  if (prefsRes.error) console.error('notify/listing: swap_preferences', prefsRes.error.message)

  const savedSearches: AlertSavedSearch[] = (searchesRes.data ?? []).map((s) => ({
    id: s.id as string,
    userId: s.user_id as string,
    name: (s.name as string) ?? '',
    districts: (s.districts as string[] | null) ?? [],
    rooms: (s.rooms as number[] | null) ?? [],
    maxRent: (s.max_rent as number | null) ?? null,
    notify: s.notify !== false,
  }))
  const preferences: AlertPreferences[] = (prefsRes.data ?? []).map((p) => ({
    userId: p.user_id as string,
    prefs: {
      districts: (p.districts as string[] | null) ?? [],
      rooms: (p.rooms as number[] | null) ?? [],
      maxRent: (p.max_rent as number | null) ?? null,
      minArea: (p.min_area as number | null) ?? null,
      needsElevator: !!p.needs_elevator,
      needsBalcony: !!p.needs_balcony,
      needsPets: !!p.needs_pets,
      needsWheelchair: !!p.needs_wheelchair,
      needsStroller: !!p.needs_stroller,
    },
  }))
  const blocked = new Set<string>()
  for (const b of blocksRes.data ?? []) {
    blocked.add(b.blocker_id === ownerId ? (b.blocked_id as string) : (b.blocker_id as string))
  }
  const alreadyNotified = new Set((notifiedRes.data ?? []).map((n) => n.user_id as string))

  // First pass without opt-outs, so we only look up the candidates' profiles.
  const candidates = selectListingRecipients({
    listing,
    savedSearches,
    preferences,
    blocked,
    alreadyNotified,
    cap: Number.POSITIVE_INFINITY,
  })
  const optedOut = new Set<string>()
  for (const ids of chunks(candidates.map((c) => c.userId), IN_CHUNK)) {
    const { data } = await admin.from('profiles').select('id, notify_matches').in('id', ids)
    for (const p of data ?? []) if (p.notify_matches === false) optedOut.add(p.id as string)
  }
  const recipients = selectListingRecipients({ listing, savedSearches, preferences, blocked, alreadyNotified, optedOut })

  const base = appBaseUrl(request.nextUrl.origin)
  const link = `${base}/annonser/${listing.id}`
  const settingsLink = `${base}${NOTIFICATION_SETTINGS_PATH}`
  const images = (row.images as string[] | null) ?? []

  let sent = 0
  let skipped = candidates.length - recipients.length
  for (const batch of chunks(recipients, BATCH)) {
    const results = await Promise.all(
      batch.map(async (r): Promise<boolean> => {
        const { data: authUser } = await admin.auth.admin.getUserById(r.userId)
        const email = authUser?.user?.email
        if (!isDeliverableEmail(email)) return false

        // Claim the (listing, user) slot; only the call that creates the row sends.
        const { data: claimed, error } = await admin
          .from('listing_notifications')
          .upsert(
            { listing_id: listing.id, user_id: r.userId, kind: r.kind },
            { onConflict: 'listing_id,user_id', ignoreDuplicates: true }
          )
          .select('user_id')
        if (error || !claimed || claimed.length === 0) return false

        const content = newMatchingListingEmail({
          title: row.title as string,
          district: listing.district,
          rooms: listing.rooms,
          rent: listing.rent,
          area: listing.area,
          imageUrl: images[0] ?? null,
          searchNames: r.searchNames,
          matchScore: r.score,
          link,
          settingsLink,
        })
        const result = await sendEmail({ to: email, ...content }, config)
        return result.ok
      })
    )
    for (const ok of results) {
      if (ok) sent++
      else skipped++
    }
  }

  return NextResponse.json({ sent, skipped })
}
