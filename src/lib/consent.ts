import { useSyncExternalStore } from 'react'

/**
 * Cookie consent for non-essential storage (today: Google AdSense only).
 *
 * Strictly necessary storage (Supabase login cookies) and the site's own
 * functional localStorage (drafts, saved searches, map layer, this choice)
 * never need consent. Google AdSense may only load once `ads === true`.
 */

export const CONSENT_KEY = 'hyresvagen_consent'
export const CONSENT_VERSION = 1
/** Fired on window when the stored choice changes. */
export const CONSENT_EVENT = 'hyresvagen:consent'
/** Fired on window to (re)open the cookie settings banner. */
export const OPEN_SETTINGS_EVENT = 'hyresvagen:consent-open'
export const COOKIE_POLICY_HREF = '/integritetspolicy#cookies'

/** True when Google AdSense is configured, i.e. there is something to consent to. */
export const ADSENSE_ENABLED = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT)

export interface Consent {
  version: typeof CONSENT_VERSION
  ads: boolean
  decidedAt: string
}

/** Fallback when localStorage is blocked, so a choice still sticks for the session. */
let memoryRaw: string | null = null

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null // Blocked storage (privacy mode, disabled cookies).
  }
}

/** Parse a stored value; anything malformed or from another version counts as "no decision". */
export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<Consent> | null
    if (!v || v.version !== CONSENT_VERSION || typeof v.ads !== 'boolean' || typeof v.decidedAt !== 'string') {
      return null
    }
    return { version: CONSENT_VERSION, ads: v.ads, decidedAt: v.decidedAt }
  } catch {
    return null
  }
}

function readRaw(storage: StorageLike | null): string | null {
  try {
    return storage?.getItem(CONSENT_KEY) ?? null
  } catch {
    return null
  }
}

export function getConsent(storage: StorageLike | null = defaultStorage()): Consent | null {
  return parseConsent(readRaw(storage))
}

/** Store the choice and notify listeners. Returns the stored consent (also when storage fails). */
export function setConsent(
  choice: { ads: boolean },
  storage: StorageLike | null = defaultStorage(),
  now: Date = new Date(),
): Consent {
  const consent: Consent = { version: CONSENT_VERSION, ads: choice.ads, decidedAt: now.toISOString() }
  const raw = JSON.stringify(consent)
  try {
    storage?.setItem(CONSENT_KEY, raw)
  } catch {
    // Storage unavailable: the choice still applies for this page view.
  }
  memoryRaw = raw
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: consent }))
  }
  return consent
}

/** Subscribe to consent changes (this tab and other tabs). Returns an unsubscribe function. */
export function subscribeConsent(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CONSENT_KEY) callback()
  }
  window.addEventListener(CONSENT_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

/** Re-open the cookie banner/settings (used by the footer link). */
export function openConsentSettings() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))
}

export function onOpenConsentSettings(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(OPEN_SETTINGS_EVENT, callback)
  return () => window.removeEventListener(OPEN_SETTINGS_EVENT, callback)
}

// useSyncExternalStore needs a stable snapshot: cache the parsed value per raw string.
let cachedRaw: string | null | undefined
let cachedConsent: Consent | null = null

function getSnapshot(): Consent | null {
  const raw = readRaw(defaultStorage()) ?? memoryRaw
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedConsent = parseConsent(raw)
  }
  return cachedConsent
}

function getServerSnapshot(): undefined {
  return undefined
}

/**
 * Current consent in a client component.
 * `undefined` = not known yet (server render / hydration), `null` = no decision.
 */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore<Consent | null | undefined>(subscribeConsent, getSnapshot, getServerSnapshot)
}
