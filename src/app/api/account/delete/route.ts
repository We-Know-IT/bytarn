import { NextResponse, type NextRequest } from 'next/server'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DELETE_CONFIRMATION, USER_BUCKETS, pathsToDelete } from '@/lib/accountDeletion'

// Permanently deletes the signed-in user's account. Deleting the auth user
// cascades through profiles to their listings, favorites, interests, sent
// messages, preferences and memberships (see supabase/schema.sql). Before
// that, ownership of a family account is handed over and the user's
// uploaded files are removed from Storage.
export async function POST(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.json({ error: 'Supabase är inte konfigurerat.' }, { status: 503 })

  let confirm: unknown
  try {
    confirm = (await request.json())?.confirm
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 })
  }
  if (confirm !== DELETE_CONFIRMATION) {
    return NextResponse.json({ error: `Skriv ${DELETE_CONFIRMATION} för att bekräfta.` }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Du måste vara inloggad.' }, { status: 401 })

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Kontoradering är inte konfigurerad på servern.' }, { status: 503 })
  }

  // Hand a family account over to the next member (as the user, so the RPC
  // sees auth.uid()). Failing here is not fatal: the household survives
  // either way since created_by is "on delete set null" (migration v5).
  await supabase.rpc('leave_household').then(
    () => {},
    () => {}
  )

  // Files still used by listings that survive (other users' listings).
  const { data: surviving } = await admin.from('listings').select('images, video_url').neq('user_id', user.id)
  const referenced = (surviving ?? []).flatMap((l: { images: string[] | null; video_url: string | null }) => [
    ...(l.images ?? []),
    ...(l.video_url ? [l.video_url] : []),
  ])

  for (const bucket of USER_BUCKETS) {
    const own: string[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(bucket).list(user.id, { limit: 1000, offset })
      if (error || !data || data.length === 0) break
      own.push(...data.map((f) => `${user.id}/${f.name}`))
      if (data.length < 1000) break
    }
    const remove = pathsToDelete(own, bucket, referenced)
    for (let i = 0; i < remove.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(remove.slice(i, i + 100))
      if (error) console.error(`Kunde inte ta bort filer i ${bucket}`, error.message)
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('Kunde inte radera konto', deleteError.message)
    return NextResponse.json({ error: 'Kontot kunde inte raderas. Försök igen eller kontakta oss.' }, { status: 500 })
  }

  // Clear the session cookies; the user no longer exists.
  await supabase.auth.signOut().catch(() => {})
  return NextResponse.json({ ok: true })
}
