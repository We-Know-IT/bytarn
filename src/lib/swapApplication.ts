import type { Listing } from '@/types'

// Pre-filled swap application ("bytesansökan") built from a conversation.
// Personal details typed into it are kept in this browser only
// (localStorage), never sent to the server.

export interface PartyDetails {
  name: string
  personalNumber: string
  phone: string
  email: string
  householdSize: string
  landlord: string
  objectNumber: string
  reason: string
  /** Only used when the party has no active listing to take the home from. */
  address: string
}

export interface ApplicationDraft {
  me: PartyDetails
  them: PartyDetails
  swapDate: string
  myListingId: string | null
  theirListingId: string | null
  attachments: string[]
}

export const ATTACHMENTS = [
  'Hyresvärdens ansökningsblankett',
  'Anställningsbevis / inkomstuppgift',
  'Personbevis',
  'Kopia av hyreskontrakt',
  'Referens från nuvarande hyresvärd',
] as const

export function emptyParty(defaults: Partial<PartyDetails> = {}): PartyDetails {
  return {
    name: '', personalNumber: '', phone: '', email: '', householdSize: '', landlord: '', objectNumber: '', reason: '', address: '',
    ...defaults,
  }
}

// Which two homes the application is about. The conversation was started
// about one listing; whoever owns it, the other side's home is their own
// first listing. Collaborator/household listings of other people are not
// "my" home, so only listings I own count for me.
export function pickListings(
  conversationListingId: string | null,
  myListings: Listing[],
  theirListings: Listing[],
  myId: string
): { mine: Listing | null; theirs: Listing | null } {
  const own = myListings.filter((l) => l.userId === myId)
  const convListing =
    [...theirListings, ...own].find((l) => l.id === conversationListingId) ?? null
  const mine = convListing && convListing.userId === myId ? convListing : own[0] ?? null
  const theirs = convListing && convListing.userId !== myId ? convListing : theirListings[0] ?? null
  return { mine, theirs }
}

export function draftKey(conversationId: string): string {
  return `hyresvagen_bytesansokan_${conversationId}`
}

export function loadDraft(conversationId: string): Partial<ApplicationDraft> | null {
  try {
    const raw = localStorage.getItem(draftKey(conversationId))
    return raw ? (JSON.parse(raw) as Partial<ApplicationDraft>) : null
  } catch {
    return null
  }
}

export function saveDraft(conversationId: string, draft: ApplicationDraft): void {
  try {
    localStorage.setItem(draftKey(conversationId), JSON.stringify(draft))
  } catch {}
}

export function clearDraft(conversationId: string): void {
  try {
    localStorage.removeItem(draftKey(conversationId))
  } catch {}
}

// Merges a stored draft over freshly prefilled defaults, keeping prefilled
// values where the stored field is empty (e.g. a name added to the profile
// after the draft was saved).
export function mergeDraft(defaults: ApplicationDraft, stored: Partial<ApplicationDraft> | null): ApplicationDraft {
  if (!stored) return defaults
  const party = (d: PartyDetails, s?: Partial<PartyDetails>): PartyDetails => {
    const out = { ...d }
    for (const k of Object.keys(d) as (keyof PartyDetails)[]) {
      const v = s?.[k]
      if (typeof v === 'string' && v !== '') out[k] = v
    }
    return out
  }
  return {
    me: party(defaults.me, stored.me),
    them: party(defaults.them, stored.them),
    swapDate: stored.swapDate || defaults.swapDate,
    myListingId: stored.myListingId ?? defaults.myListingId,
    theirListingId: stored.theirListingId ?? defaults.theirListingId,
    attachments: Array.isArray(stored.attachments) ? stored.attachments : defaults.attachments,
  }
}

export function describeHome(l: Listing): { label: string; value: string }[] {
  return [
    { label: 'Adress', value: l.address },
    { label: 'Stadsdel', value: l.district },
    { label: 'Storlek', value: `${l.rooms} rum, ${l.area} m²` },
    { label: 'Hyra', value: `${new Intl.NumberFormat('sv-SE').format(l.rent)} kr/mån` },
    { label: 'Våning', value: l.floor != null ? `${l.floor}${l.elevator ? ', hiss finns' : ''}` : '–' },
  ]
}
