import { describe, expect, it } from 'vitest'
import type { Listing } from '@/types'
import { describeHome, emptyParty, mergeDraft, pickListings, type ApplicationDraft } from './swapApplication'

const listing = (id: string, userId: string, extra: Partial<Listing> = {}): Listing => ({
  id, userId, title: '', description: '', rooms: 2, rent: 8500, area: 54, district: 'Södermalm', address: 'Hornsgatan 1',
  lat: 59.3, lng: 18.0, images: [], status: 'aktiv', userName: '', createdAt: '', updatedAt: '', expiresAt: '',
  viewCount: 0, interestedCount: 0, ...extra,
})

describe('pickListings', () => {
  const mine = [listing('m1', 'me'), listing('m2', 'me'), listing('hh', 'partner')]
  const theirs = [listing('t1', 'them'), listing('t2', 'them')]

  it('uses the conversation listing for its owner', () => {
    expect(pickListings('t2', mine, theirs, 'me')).toEqual({ mine: mine[0], theirs: theirs[1] })
    expect(pickListings('m2', mine, theirs, 'me')).toEqual({ mine: mine[1], theirs: theirs[0] })
  })

  it('ignores household members’ listings as my home', () => {
    expect(pickListings(null, [listing('hh', 'partner')], theirs, 'me').mine).toBeNull()
  })

  it('handles a deleted conversation listing', () => {
    expect(pickListings('gone', mine, theirs, 'me')).toEqual({ mine: mine[0], theirs: theirs[0] })
  })
})

describe('mergeDraft', () => {
  const defaults: ApplicationDraft = {
    me: emptyParty({ name: 'Anna', email: 'anna@x.se' }),
    them: emptyParty({ name: 'Bo' }),
    swapDate: '',
    myListingId: 'm1',
    theirListingId: 't1',
    attachments: [],
  }

  it('keeps prefilled values where the stored field is empty', () => {
    const merged = mergeDraft(defaults, { me: { ...emptyParty(), phone: '070' }, theirListingId: 't2' })
    expect(merged.me).toMatchObject({ name: 'Anna', email: 'anna@x.se', phone: '070' })
    expect(merged.theirListingId).toBe('t2')
    expect(merged.myListingId).toBe('m1')
  })

  it('returns defaults without a stored draft', () => {
    expect(mergeDraft(defaults, null)).toBe(defaults)
  })
})

describe('describeHome', () => {
  it('formats rent and floor', () => {
    const rows = describeHome(listing('x', 'me', { floor: 3, elevator: true }))
    expect(rows.find((r) => r.label === 'Hyra')?.value).toBe('8\u00a0500 kr/mån')
    expect(rows.find((r) => r.label === 'Våning')?.value).toBe('3, hiss finns')
  })
})
