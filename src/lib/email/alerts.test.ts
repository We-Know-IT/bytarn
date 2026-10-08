import { describe, expect, it } from 'vitest'
import { isDeliverableEmail, savedSearchMatches, selectListingRecipients, type AlertListing, type AlertSavedSearch } from './alerts'
import { interestEmail, newMatchingListingEmail, newMessageEmail, settingsUrl } from './templates'
import { EMPTY_SWAP_PREFERENCES } from '@/types'

const listing: AlertListing = {
  id: 'l1',
  userId: 'owner',
  district: 'Södermalm',
  rooms: 2.5,
  rent: 9000,
  area: 60,
  elevator: true,
  balcony: false,
  petsAllowed: false,
  wheelchairAccessible: false,
  strollerFriendly: false,
}

const search = (over: Partial<AlertSavedSearch>): AlertSavedSearch => ({
  id: 's',
  userId: 'u1',
  name: 'Söder',
  districts: [],
  rooms: [],
  maxRent: null,
  notify: true,
  ...over,
})

describe('savedSearchMatches', () => {
  it('treats empty districts/rooms as any', () => {
    expect(savedSearchMatches(listing, search({}))).toBe(true)
  })
  it('filters on district, floored rooms and max rent', () => {
    expect(savedSearchMatches(listing, search({ districts: ['Södermalm'] }))).toBe(true)
    expect(savedSearchMatches(listing, search({ districts: ['Kungsholmen'] }))).toBe(false)
    expect(savedSearchMatches(listing, search({ rooms: [2] }))).toBe(true)
    expect(savedSearchMatches(listing, search({ rooms: [3] }))).toBe(false)
    expect(savedSearchMatches(listing, search({ maxRent: 9000 }))).toBe(true)
    expect(savedSearchMatches(listing, search({ maxRent: 8999 }))).toBe(false)
  })
  it('treats 5 as 5 or more', () => {
    expect(savedSearchMatches({ ...listing, rooms: 6 }, search({ rooms: [5] }))).toBe(true)
    expect(savedSearchMatches({ ...listing, rooms: 5.5 }, search({ rooms: [4] }))).toBe(false)
  })
})

describe('selectListingRecipients', () => {
  const goodPrefs = { ...EMPTY_SWAP_PREFERENCES, districts: ['Södermalm'], rooms: [2], maxRent: 10000 }
  const badPrefs = { ...EMPTY_SWAP_PREFERENCES, districts: ['Kungsholmen'] }

  it('combines saved searches and preferences per user', () => {
    const r = selectListingRecipients({
      listing,
      savedSearches: [search({ userId: 'a', name: 'A1' }), search({ userId: 'a', name: 'A2' }), search({ userId: 'b', notify: false })],
      preferences: [
        { userId: 'a', prefs: goodPrefs },
        { userId: 'c', prefs: goodPrefs },
        { userId: 'd', prefs: badPrefs },
        { userId: 'e', prefs: EMPTY_SWAP_PREFERENCES },
      ],
    })
    expect(r.map((x) => x.userId).sort()).toEqual(['a', 'c'])
    const a = r.find((x) => x.userId === 'a')!
    expect(a.searchNames).toEqual(['A1', 'A2'])
    expect(a.score).toBe(100)
    expect(a.kind).toBe('saved_search+preferences')
    expect(r.find((x) => x.userId === 'c')!.kind).toBe('preferences')
  })

  it('skips the owner, opted-out, blocked and already-notified users and caps', () => {
    const savedSearches = ['owner', 'x', 'y', 'z', 'w', 'v'].map((u) => search({ userId: u }))
    const r = selectListingRecipients({
      listing,
      savedSearches,
      preferences: [],
      optedOut: new Set(['x']),
      blocked: new Set(['y']),
      alreadyNotified: new Set(['z']),
    })
    expect(r.map((x) => x.userId).sort()).toEqual(['v', 'w'])
    expect(r[0].kind).toBe('saved_search')
    expect(selectListingRecipients({ listing, savedSearches, preferences: [], cap: 1 })).toHaveLength(1)
  })
})

describe('isDeliverableEmail', () => {
  it('skips synthetic BankID addresses', () => {
    expect(isDeliverableEmail('anna@example.se')).toBe(true)
    expect(isDeliverableEmail('bankid-123@bytarn.internal')).toBe(false)
    expect(isDeliverableEmail('')).toBe(false)
    expect(isDeliverableEmail(undefined)).toBe(false)
  })
})

describe('alert templates', () => {
  const settings = 'https://xn--hyresvgen-02a.se/mina-sidor?flik=konto'

  it('derives the settings link from the main link', () => {
    expect(settingsUrl('https://x.se/annonser/1')).toBe('https://x.se/mina-sidor?flik=konto')
    expect(settingsUrl('https://x.se/a', 'https://y.se/s')).toBe('https://y.se/s')
  })

  it('new matching listing: facts, reasons, escaping, opt-out footer', () => {
    const mail = newMatchingListingEmail({
      title: '<b>Ljus tvåa</b>',
      district: 'Södermalm',
      rooms: 2.5,
      rent: 9000,
      area: 60,
      imageUrl: 'https://cdn.example/1.jpg',
      searchNames: ['Söder & city'],
      matchScore: 86,
      link: 'https://xn--hyresvgen-02a.se/annonser/l1',
      settingsLink: settings,
    })
    expect(mail.subject).toBe('Ny annons som matchar: <b>Ljus tvåa</b>')
    expect(mail.html).not.toContain('<b>Ljus')
    expect(mail.html).toContain('&lt;b&gt;Ljus tvåa')
    expect(mail.html).toContain('Söder &amp; city')
    expect(mail.html).toContain('86 %')
    expect(mail.html).toContain('2,5 rum')
    expect(mail.html).toContain('src="https://cdn.example/1.jpg"')
    expect(mail.html).toContain(`href="${settings}"`)
    expect(mail.text).toContain(settings)
    expect(mail.text).toContain('https://xn--hyresvgen-02a.se/annonser/l1')
  })

  it('drops non-http images', () => {
    const mail = newMatchingListingEmail({ title: 'T', district: 'D', rooms: 1, rent: 1, imageUrl: 'javascript:x', link: 'https://x.se/a' })
    expect(mail.html).not.toContain('<img')
  })

  it('interest e-mail and its mutual variant', () => {
    const one = interestEmail({ interesterName: 'Bo', listingTitle: 'Min trea', link: 'https://x.se/mina-sidor?flik=intresse' })
    expect(one.subject).toBe('Bo är intresserad av din annons')
    expect(one.text).toContain('Min trea')
    expect(one.html).toContain('href="https://x.se/mina-sidor?flik=konto"')

    const mutual = interestEmail({ interesterName: 'Bo', listingTitle: 'Min trea', otherListingTitle: 'Bos etta', mutual: true, link: 'https://x.se/annonser/2' })
    expect(mutual.subject).toContain('Ni har visat intresse för varandra')
    expect(mutual.text).toContain('Bos etta')
    expect(mutual.text).toContain('https://x.se/mina-sidor?flik=konto')
  })

  it('message e-mail also explains how to turn it off', () => {
    const mail = newMessageEmail({ senderName: 'Anna', content: 'Hej', link: 'https://x.se/meddelanden/1' })
    expect(mail.text).toContain('https://x.se/mina-sidor?flik=konto')
  })
})
