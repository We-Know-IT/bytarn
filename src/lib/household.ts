import { createClient, supabaseConfigured } from '@/lib/supabase/client'

export interface HouseholdMember {
  userId: string
  name: string
  avatarUrl?: string
  role: 'owner' | 'member'
}

export interface HouseholdInvite {
  id: string
  email: string
  createdAt: string
}

export interface Household {
  id: string
  name: string
  members: HouseholdMember[]
  invites: HouseholdInvite[]
}

type MemberRow = {
  user_id: string
  role: 'owner' | 'member'
  profiles: { name: string; avatar_url: string | null } | null
}

// The signed-in user's family account, or null if they aren't in one.
// RLS only exposes the caller's own household, so no filters are needed.
export async function fetchMyHousehold(): Promise<Household | null> {
  if (!supabaseConfigured) return null
  const supabase = createClient()
  const { data: household } = await supabase.from('households').select('id, name').maybeSingle()
  if (!household) return null

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from('household_members')
      .select('user_id, role, created_at, profiles ( name, avatar_url )')
      .eq('household_id', household.id)
      .order('created_at'),
    supabase
      .from('household_invites')
      .select('id, email, created_at')
      .eq('household_id', household.id)
      .is('accepted_at', null)
      .order('created_at'),
  ])

  return {
    id: household.id,
    name: household.name,
    members: ((members ?? []) as unknown as MemberRow[]).map((m) => ({
      userId: m.user_id,
      role: m.role,
      name: m.profiles?.name ?? 'Okänd användare',
      avatarUrl: m.profiles?.avatar_url ?? undefined,
    })),
    invites: (invites ?? []).map((i) => ({ id: i.id, email: i.email, createdAt: i.created_at })),
  }
}

export async function createHousehold(name: string): Promise<void> {
  const { error } = await createClient().rpc('create_household', { p_name: name })
  if (error) throw error
}

export async function renameHousehold(name: string): Promise<void> {
  const { error } = await createClient().rpc('rename_household', { p_name: name })
  if (error) throw error
}

export async function revokeHouseholdInvite(inviteId: string): Promise<void> {
  const { error } = await createClient().rpc('revoke_household_invite', { p_invite_id: inviteId })
  if (error) throw error
}

export async function leaveHousehold(): Promise<void> {
  const { error } = await createClient().rpc('leave_household')
  if (error) throw error
}

export async function removeHouseholdMember(userId: string): Promise<void> {
  const { error } = await createClient().rpc('remove_household_member', { p_user_id: userId })
  if (error) throw error
}

export async function fetchInviteInfo(token: string) {
  const { data, error } = await createClient().rpc('household_invite_info', { p_token: token })
  if (error) throw error
  const row = (data as { household_name: string; invited_by_name: string; email: string; accepted: boolean }[])[0]
  return row ?? null
}

export interface SendInviteResult {
  emailSent: boolean
  /** The accept link — show it for manual sharing when emailSent is false. */
  link?: string
  emailError?: string
}

// Goes through the API route so the server can email the invite link.
export async function sendHouseholdInvite(email: string): Promise<SendInviteResult> {
  const res = await fetch('/api/household/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    emailSent?: boolean
    link?: string
    emailError?: string
    error?: string
  }
  if (!res.ok || !body.ok) throw new Error(body.error ?? 'Kunde inte skicka inbjudan.')
  return { emailSent: !!body.emailSent, link: body.link, emailError: body.emailError }
}

export async function acceptHouseholdInvite(token: string): Promise<void> {
  const { error } = await createClient().rpc('accept_household_invite', { p_token: token })
  if (error) throw error
}
