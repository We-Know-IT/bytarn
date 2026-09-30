import { describe, expect, it } from 'vitest'
import { isLive } from './ads'

describe('isLive', () => {
  const now = new Date('2026-10-01T12:00:00Z').getTime()

  it('requires active', () => {
    expect(isLive({ active: false, startsAt: null, endsAt: null }, now)).toBe(false)
    expect(isLive({ active: true, startsAt: null, endsAt: null }, now)).toBe(true)
  })

  it('respects start and end dates', () => {
    expect(isLive({ active: true, startsAt: '2026-10-02T00:00:00Z', endsAt: null }, now)).toBe(false)
    expect(isLive({ active: true, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' }, now)).toBe(false)
    expect(isLive({ active: true, startsAt: '2026-09-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' }, now)).toBe(true)
  })
})
