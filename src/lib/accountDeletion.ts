// Pure helpers for deleting an account's uploaded files (server and tests).

export const USER_BUCKETS = ['listing-images', 'listing-videos', 'avatars'] as const
export type UserBucket = (typeof USER_BUCKETS)[number]

// "https://x.supabase.co/storage/v1/object/public/listing-images/u1/a.jpg"
// -> { bucket: 'listing-images', path: 'u1/a.jpg' }
export function parsePublicStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = /\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?.*)?$/.exec(url)
  if (!m) return null
  try {
    return { bucket: m[1], path: decodeURIComponent(m[2]) }
  } catch {
    return null
  }
}

// The user's own uploads, minus any file still used by a listing that
// survives the deletion (e.g. a photo they uploaded to a family member's
// listing) — removing those would break someone else's ad.
export function pathsToDelete(ownPaths: string[], bucket: string, stillReferencedUrls: string[]): string[] {
  const keep = new Set(
    stillReferencedUrls
      .map(parsePublicStorageUrl)
      .filter((r): r is { bucket: string; path: string } => r !== null && r.bucket === bucket)
      .map((r) => r.path)
  )
  return ownPaths.filter((p) => !keep.has(p))
}

export const DELETE_CONFIRMATION = 'RADERA'
