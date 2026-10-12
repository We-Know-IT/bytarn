import { describe, expect, it } from 'vitest'
import { isNewAccount } from './accountAge'

describe('isNewAccount', () => {
  const now = new Date('2026-10-12T12:00:00Z').getTime()

  it('is new only within the last ten minutes', () => {
    expect(isNewAccount('2026-10-12T11:58:00Z', now)).toBe(true)
    expect(isNewAccount('2026-10-12T11:40:00Z', now)).toBe(false)
    expect(isNewAccount('2026-01-01T00:00:00Z', now)).toBe(false)
  })

  it('treats a missing date as an existing account', () => {
    expect(isNewAccount(undefined, now)).toBe(false)
    expect(isNewAccount(null, now)).toBe(false)
  })
})
