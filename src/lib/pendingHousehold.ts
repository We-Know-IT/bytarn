import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// "Hela hushållet" chosen at sign-up. The household can only be created once
// the user is signed in, which happens after email confirmation or an
// OAuth/BankID redirect — so the choice is remembered in user metadata
// (survives confirming on another device) and localStorage (Google/BankID,
// where no metadata can be passed at sign-up).

export interface PendingHousehold {
  name: string
  inviteEmail?: string
}

const KEY = 'bytaren_pending_household'
const META_KEY = 'pending_household'

function isPending(v: unknown): v is PendingHousehold {
  return !!v && typeof v === 'object' && typeof (v as PendingHousehold).name === 'string'
}

export function savePendingHousehold(p: PendingHousehold): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}

export function pendingHouseholdMetadata(p: PendingHousehold): Record<string, PendingHousehold> {
  return { [META_KEY]: p }
}

export function readPendingHousehold(user: User): PendingHousehold | null {
  const fromMeta = user.user_metadata?.[META_KEY]
  if (isPending(fromMeta)) return fromMeta
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return isPending(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function clearPendingHousehold(user: User): Promise<void> {
  try {
    localStorage.removeItem(KEY)
  } catch {}
  if (user.user_metadata?.[META_KEY]) {
    await createClient().auth.updateUser({ data: { [META_KEY]: null } })
  }
}
