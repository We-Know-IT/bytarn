import { describe, expect, it } from 'vitest'
import { parsePublicStorageUrl, pathsToDelete } from './accountDeletion'

const base = 'https://abc.supabase.co/storage/v1/object/public'

describe('parsePublicStorageUrl', () => {
  it('extracts bucket and path', () => {
    expect(parsePublicStorageUrl(`${base}/listing-images/u1/a%20b.jpg?t=1`)).toEqual({ bucket: 'listing-images', path: 'u1/a b.jpg' })
  })
  it('ignores other URLs', () => {
    expect(parsePublicStorageUrl('https://example.com/a.jpg')).toBeNull()
  })
})

describe('pathsToDelete', () => {
  it('keeps files still used by surviving listings, in the same bucket only', () => {
    const own = ['u1/a.jpg', 'u1/b.jpg', 'u1/c.jpg']
    const refs = [`${base}/listing-images/u1/b.jpg`, `${base}/avatars/u1/c.jpg`]
    expect(pathsToDelete(own, 'listing-images', refs)).toEqual(['u1/a.jpg', 'u1/c.jpg'])
  })
})
