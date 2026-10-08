import { NextResponse, type NextRequest } from 'next/server'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  appBaseUrl,
  getSmtpConfig,
  interestEmail,
  isDeliverableEmail,
  sendEmail,
  NOTIFICATION_SETTINGS_PATH,
} from '@/lib/email'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Called fire-and-forget by expressInterest() after the interests row is
// inserted. E-mails the listing owner ("X är intresserad av din annons"),
// or — when the owner has also shown interest in one of the caller's active
// listings — both of them with the mutual "Ni har visat intresse för
// varandra" e-mail. Each person's own notify_interests decides whether they
// are mailed; nothing is sent if either has blocked the other.
//
// Dedupe: listing_notifications has PK (listing_id, user_id). For interest
// alerts the row records the INTERESTER as user_id (one row per interester
// per listing), so toggling interest off and on never mails the owner again.
// That slot may already be taken by a "new matching listing" alert sent to
// the interester for the same listing (kind 'saved_search' etc.); then we
// claim it by appending '+interest' to kind instead. Both statements are
// atomic, and we only send when one of them actually wrote the row.
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

  const { data: interest } = await supabase
    .from('interests')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!interest) return NextResponse.json({ error: 'Du har inte visat intresse för annonsen.' }, { status: 403 })

  const config = await getSmtpConfig()
  if (!config) return NextResponse.json({ sent: 0, skipped: 0, reason: 'smtp_not_configured' })

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'no_service_role' })
  }

  const interesterId = user.id
  const { data: listing } = await admin
    .from('listings')
    .select('id, user_id, title, status')
    .eq('id', listingId)
    .maybeSingle()
  if (!listing || listing.user_id === interesterId) return NextResponse.json({ sent: 0, skipped: 0, reason: 'no_recipient' })
  const ownerId = listing.user_id as string

  const [{ data: blocks }, { data: profiles }, { data: ownerInterests }] = await Promise.all([
    admin
      .from('user_blocks')
      .select('blocker_id')
      .or(
        `and(blocker_id.eq.${ownerId},blocked_id.eq.${interesterId}),and(blocker_id.eq.${interesterId},blocked_id.eq.${ownerId})`
      )
      .limit(1),
    admin.from('profiles').select('id, name, notify_interests').in('id', [ownerId, interesterId]),
    // Has the owner shown interest in any active listing owned by the caller?
    admin
      .from('interests')
      .select('listing_id, listings!inner ( id, title, user_id, status )')
      .eq('user_id', ownerId)
      .eq('listings.user_id', interesterId)
      .eq('listings.status', 'aktiv')
      .limit(1),
  ])
  if ((blocks ?? []).length > 0) return NextResponse.json({ sent: 0, skipped: 1, reason: 'blocked' })

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]))
  const wants = (id: string) => profileById.get(id)?.notify_interests !== false
  const nameOf = (id: string) => (profileById.get(id)?.name as string | undefined) || 'En användare'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawOther = (ownerInterests?.[0] as any)?.listings
  const otherListing: { id: string; title: string } | null = (Array.isArray(rawOther) ? rawOther[0] : rawOther) ?? null
  const mutual = !!otherListing

  const ownerWants = wants(ownerId)
  const interesterWants = mutual && wants(interesterId)
  if (!ownerWants && !interesterWants) return NextResponse.json({ sent: 0, skipped: 1, reason: 'opted_out' })

  // Claim the dedupe slot (see the comment at the top).
  const { data: inserted, error: insertError } = await admin
    .from('listing_notifications')
    .upsert(
      { listing_id: listing.id, user_id: interesterId, kind: 'interest' },
      { onConflict: 'listing_id,user_id', ignoreDuplicates: true }
    )
    .select('user_id')
  if (insertError) return NextResponse.json({ sent: 0, skipped: 1, reason: 'dedupe_error' })
  let claimed = (inserted ?? []).length > 0
  if (!claimed) {
    const { data: existing } = await admin
      .from('listing_notifications')
      .select('kind')
      .eq('listing_id', listing.id)
      .eq('user_id', interesterId)
      .maybeSingle()
    const kind = (existing?.kind as string | undefined) ?? ''
    if (kind && !kind.includes('interest')) {
      const { data: updated } = await admin
        .from('listing_notifications')
        .update({ kind: `${kind}+interest` })
        .eq('listing_id', listing.id)
        .eq('user_id', interesterId)
        .eq('kind', kind)
        .select('user_id')
      claimed = (updated ?? []).length > 0
    }
  }
  if (!claimed) return NextResponse.json({ sent: 0, skipped: 1, reason: 'already_notified' })

  const base = appBaseUrl(request.nextUrl.origin)
  const settingsLink = `${base}${NOTIFICATION_SETTINGS_PATH}`
  const listingTitle = (listing.title as string) || 'din annons'

  const jobs: { userId: string; content: ReturnType<typeof interestEmail> }[] = []
  if (ownerWants) {
    jobs.push({
      userId: ownerId,
      content: interestEmail({
        interesterName: nameOf(interesterId),
        listingTitle,
        mutual,
        otherListingTitle: otherListing?.title ?? null,
        link: mutual && otherListing ? `${base}/annonser/${otherListing.id}` : `${base}/mina-sidor?flik=intresse`,
        settingsLink,
      }),
    })
  }
  if (interesterWants && otherListing) {
    jobs.push({
      userId: interesterId,
      content: interestEmail({
        interesterName: nameOf(ownerId),
        listingTitle: otherListing.title,
        mutual: true,
        otherListingTitle: listingTitle,
        link: `${base}/annonser/${listing.id}`,
        settingsLink,
      }),
    })
  }

  const results = await Promise.all(
    jobs.map(async ({ userId, content }) => {
      const { data: authUser } = await admin.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      if (!isDeliverableEmail(email)) return false
      return (await sendEmail({ to: email, ...content }, config)).ok
    })
  )
  const sent = results.filter(Boolean).length
  return NextResponse.json({ sent, skipped: results.length - sent, mutual })
}
