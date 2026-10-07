import { describe, expect, it } from 'vitest'
import { CONSENT_KEY, getConsent, parseConsent, setConsent } from './consent'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('parseConsent', () => {
  it('accepts a valid v1 value', () => {
    expect(parseConsent('{"version":1,"ads":true,"decidedAt":"2026-10-01T00:00:00.000Z"}')).toEqual({
      version: 1,
      ads: true,
      decidedAt: '2026-10-01T00:00:00.000Z',
    })
  })

  it('treats missing, malformed or other versions as no decision', () => {
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('')).toBeNull()
    expect(parseConsent('not json')).toBeNull()
    expect(parseConsent('null')).toBeNull()
    expect(parseConsent('{"version":2,"ads":true,"decidedAt":"x"}')).toBeNull()
    expect(parseConsent('{"version":1,"ads":"yes","decidedAt":"x"}')).toBeNull()
    expect(parseConsent('{"version":1,"ads":true}')).toBeNull()
  })
})

describe('getConsent / setConsent', () => {
  it('round-trips through storage under the documented key', () => {
    const storage = memoryStorage()
    expect(getConsent(storage)).toBeNull()
    const now = new Date('2026-10-07T10:00:00Z')
    const stored = setConsent({ ads: false }, storage, now)
    expect(stored).toEqual({ version: 1, ads: false, decidedAt: '2026-10-07T10:00:00.000Z' })
    expect(JSON.parse(storage.getItem(CONSENT_KEY)!)).toEqual(stored)
    expect(getConsent(storage)).toEqual(stored)
  })

  it('survives blocked storage', () => {
    expect(getConsent(throwingStorage)).toBeNull()
    expect(setConsent({ ads: true }, throwingStorage).ads).toBe(true)
  })
})
