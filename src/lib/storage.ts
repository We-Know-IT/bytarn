import { createClient } from '@/lib/supabase/client'

async function upload(bucket: string, userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function uploadListingImage(file: File, userId: string): Promise<string> {
  return upload('listing-images', userId, file)
}

export function uploadAvatar(file: File, userId: string): Promise<string> {
  return upload('avatars', userId, file)
}
