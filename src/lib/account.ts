import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { DELETE_CONFIRMATION } from '@/lib/accountDeletion'

// "Ladda ner mina uppgifter" (GDPR art. 15/20): everything the signed-in
// user can read about themselves, as one JSON file. RLS already limits
// each query to the user's own rows and conversations.
export async function exportMyData(userId: string, email: string | undefined): Promise<Blob> {
  if (!supabaseConfigured) throw new Error('Backend är inte konfigurerad.')
  const supabase = createClient()

  const [profile, preferences, listings, favorites, interests, reports, participants, household] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('swap_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('listings').select('*').eq('user_id', userId),
    supabase.from('favorites').select('listing_id, created_at').eq('user_id', userId),
    supabase.from('interests').select('listing_id, created_at').eq('user_id', userId),
    supabase.from('reports').select('listing_id, reason, created_at').eq('reporter_id', userId),
    supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId),
    supabase.from('household_members').select('role, created_at, households ( name )').eq('user_id', userId),
  ])

  const conversationIds = (participants.data ?? []).map((p) => p.conversation_id as string)
  const messages = conversationIds.length
    ? await supabase
        .from('messages')
        .select('conversation_id, sender_id, content, image_url, read, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at')
    : { data: [] }

  let savedSearches: unknown = []
  try {
    savedSearches = JSON.parse(localStorage.getItem('hyresvagen_saved_searches') || '[]')
  } catch {}

  const data = {
    exportedAt: new Date().toISOString(),
    account: { id: userId, email },
    profile: profile.data,
    swapPreferences: preferences.data,
    listings: listings.data ?? [],
    favorites: favorites.data ?? [],
    interests: interests.data ?? [],
    reports: reports.data ?? [],
    householdMemberships: household.data ?? [],
    conversations: conversationIds.map((id) => ({
      id,
      messages: (messages.data ?? []).filter((m) => m.conversation_id === id),
    })),
    savedSearchesInThisBrowser: savedSearches,
  }
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

export async function deleteMyAccount(confirm: string): Promise<void> {
  const res = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(body.error ?? 'Kontot kunde inte raderas.')
}

export { DELETE_CONFIRMATION }
