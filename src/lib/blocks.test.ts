import { describe, expect, it } from 'vitest'
import { isBlockedError, rowToBlockedUser, sortBlockedLast, validateReportReason } from './blocks'

describe('rowToBlockedUser', () => {
  it('maps the embedded profile', () => {
    expect(
      rowToBlockedUser({
        blocked_id: 'u2',
        created_at: '2026-10-08T10:00:00Z',
        profiles: { name: 'Anna', avatar_url: 'https://x/a.png' },
      })
    ).toEqual({ id: 'u2', name: 'Anna', avatarUrl: 'https://x/a.png', blockedAt: '2026-10-08T10:00:00Z' })
  })

  it('handles array embeds and missing profiles', () => {
    expect(rowToBlockedUser({ blocked_id: 'u3', created_at: 't', profiles: [{ name: 'Bo', avatar_url: null }] }).name).toBe('Bo')
    const missing = rowToBlockedUser({ blocked_id: 'u4', created_at: 't', profiles: null })
    expect(missing.name).toBe('Okänd användare')
    expect(missing.avatarUrl).toBeUndefined()
  })
})

describe('isBlockedError', () => {
  it('recognises the RLS refusal of a message insert', () => {
    expect(isBlockedError({ code: '42501', message: 'new row violates row-level security policy for table "messages"' })).toBe(true)
  })

  it('recognises the get_or_create_conversation refusal', () => {
    expect(isBlockedError({ message: 'Du kan inte skicka meddelanden till den här användaren.' })).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isBlockedError({ message: 'new row violates row-level security policy for table "listings"' })).toBe(false)
    expect(isBlockedError(new Error('Failed to fetch'))).toBe(false)
    expect(isBlockedError(null)).toBe(false)
  })
})

describe('validateReportReason', () => {
  it('requires 3–2000 characters after trimming', () => {
    expect(validateReportReason('  ab ')).not.toBeNull()
    expect(validateReportReason('abc')).toBeNull()
    expect(validateReportReason('a'.repeat(2000))).toBeNull()
    expect(validateReportReason('a'.repeat(2001))).not.toBeNull()
  })
})

describe('sortBlockedLast', () => {
  const list = [
    { id: 'c1', other: { id: 'a' } },
    { id: 'c2', other: { id: 'b' } },
    { id: 'c3', other: null },
    { id: 'c4', other: { id: 'c' } },
  ]

  it('moves blocked conversations last, keeping relative order', () => {
    expect(sortBlockedLast(list, new Set(['a', 'c'])).map((c) => c.id)).toEqual(['c2', 'c3', 'c1', 'c4'])
  })

  it('returns the same array when nothing is blocked', () => {
    expect(sortBlockedLast(list, new Set())).toBe(list)
    expect(sortBlockedLast(list, new Set(['zzz']))).toBe(list)
  })
})
