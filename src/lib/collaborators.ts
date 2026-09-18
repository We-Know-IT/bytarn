import { createClient, supabaseConfigured } from '@/lib/supabase/client'

export interface Collaborator {
  userId: string
  name: string
  avatarUrl?: string
}

export async function fetchCollaborators(listingId: string): Promise<Collaborator[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listing_collaborators')
    .select('user_id, profiles ( name, avatar_url )')
    .eq('listing_id', listingId)

  if (error || !data) return []
  return data.map((row: any) => ({
    userId: row.user_id,
    name: row.profiles?.name ?? 'Okänd användare',
    avatarUrl: row.profiles?.avatar_url ?? undefined,
  }))
}

// Only works if the invitee already has a Bytaren account — there's no
// email-sending infrastructure to invite someone who doesn't.
export async function inviteCollaboratorByEmail(listingId: string, email: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('invite_collaborator_by_email', {
    p_listing_id: listingId,
    p_email: email,
  })
  if (error) throw error
}

export async function removeCollaborator(listingId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('listing_collaborators')
    .delete()
    .eq('listing_id', listingId)
    .eq('user_id', userId)
  if (error) throw error
}
