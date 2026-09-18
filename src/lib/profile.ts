import { createClient } from '@/lib/supabase/client'

export interface ProfileUpdate {
  name?: string
  bio?: string
  avatarUrl?: string
}

export async function updateProfile(userId: string, update: ProfileUpdate): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, string> = {}
  if (update.name !== undefined) payload.name = update.name
  if (update.bio !== undefined) payload.bio = update.bio
  if (update.avatarUrl !== undefined) payload.avatar_url = update.avatarUrl

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
  if (error) throw error
}
