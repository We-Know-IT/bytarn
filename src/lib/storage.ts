import { createClient } from '@/lib/supabase/client'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

async function upload(bucket: string, userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = (file.name.split('.').pop() ?? '').toLowerCase() || file.type.split('/')[1] || 'bin'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

// Checked before uploading so the user gets a clear reason instead of a
// generic storage error.
export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return `${file.name} är inte en bild.`
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} är större än 10 MB.`
  return null
}

export function validateVideo(file: File): string | null {
  if (!VIDEO_TYPES.includes(file.type)) return 'Videon måste vara MP4, WebM eller MOV.'
  if (file.size > MAX_VIDEO_BYTES) return 'Videon får vara högst 100 MB.'
  return null
}

export function uploadListingImage(file: File, userId: string): Promise<string> {
  return upload('listing-images', userId, file)
}

export function uploadListingVideo(file: File, userId: string): Promise<string> {
  return upload('listing-videos', userId, file)
}

export function uploadAvatar(file: File, userId: string): Promise<string> {
  return upload('avatars', userId, file)
}
