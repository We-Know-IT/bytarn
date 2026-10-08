import { createClient, supabaseConfigured } from '@/lib/supabase/client'

// Blocking and reporting users (tables user_blocks and user_reports, see
// supabase/migrations/20261008_v6.sql). RLS only lets me see my own blocks,
// never who has blocked me — a block by the other side shows up only as a
// refused message insert or a refused get_or_create_conversation().

export interface BlockedUser {
  id: string
  name: string
  avatarUrl?: string
  blockedAt: string
}

export interface BlockRow {
  blocked_id: string
  created_at: string
  profiles: { name: string | null; avatar_url: string | null } | { name: string | null; avatar_url: string | null }[] | null
}

type NameEmbed = { name: string | null } | { name: string | null }[] | null

export interface UserReportRow {
  id: string
  reporter_id: string
  reported_id: string
  conversation_id: string | null
  reason: string
  created_at: string
  reporter: NameEmbed
  reported: NameEmbed
}

/** A report about a user, as shown to admins. */
export interface UserReport {
  id: string
  reporterId: string
  reporterName: string
  reportedId: string
  reportedName: string
  conversationId: string | null
  reason: string
  createdAt: string
}

/** Shown instead of a raw database error when a block stops a message. */
export const BLOCKED_MESSAGE = 'Du kan inte skicka meddelanden i den här konversationen.'
/** Shown when starting a conversation is refused because of a block. */
export const BLOCKED_CONVERSATION_MESSAGE = 'Du kan inte skicka meddelanden till den här användaren.'

export const REPORT_REASON_MIN = 3
export const REPORT_REASON_MAX = 2000

// ─── Pure helpers (tested in blocks.test.ts) ─────────────────────────────

export function rowToBlockedUser(row: BlockRow): BlockedUser {
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    id: row.blocked_id,
    name: p?.name?.trim() || 'Okänd användare',
    avatarUrl: p?.avatar_url ?? undefined,
    blockedAt: row.created_at,
  }
}

function embedName(embed: NameEmbed): string {
  const p = Array.isArray(embed) ? embed[0] : embed
  return p?.name?.trim() || 'Okänd användare'
}

export function rowToUserReport(row: UserReportRow): UserReport {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: embedName(row.reporter),
    reportedId: row.reported_id,
    reportedName: embedName(row.reported),
    conversationId: row.conversation_id,
    reason: row.reason,
    createdAt: row.created_at,
  }
}

/**
 * True when an error from sending a message or starting a conversation was
 * caused by a block: the RLS refusal of the messages insert, or the message
 * raised by get_or_create_conversation().
 */
export function isBlockedError(err: unknown): boolean {
  const e = err as { message?: string } | null
  const msg = e?.message ?? (typeof err === 'string' ? err : '')
  return (
    /row-level security policy for table "?messages"?/i.test(msg) ||
    msg.includes(BLOCKED_CONVERSATION_MESSAGE)
  )
}

/** Validates a report reason; returns an error text or null when it's fine. */
export function validateReportReason(reason: string): string | null {
  const len = reason.trim().length
  if (len < REPORT_REASON_MIN) return 'Beskriv kort vad som hänt (minst 3 tecken).'
  if (len > REPORT_REASON_MAX) return `Beskrivningen får vara högst ${REPORT_REASON_MAX} tecken.`
  return null
}

/** Moves conversations with people I've blocked to the end, keeping order otherwise. */
export function sortBlockedLast<T extends { other: { id: string } | null }>(list: T[], blockedIds: ReadonlySet<string>): T[] {
  if (blockedIds.size === 0) return list
  const open = list.filter((c) => !c.other || !blockedIds.has(c.other.id))
  if (open.length === list.length) return list
  return [...open, ...list.filter((c) => c.other && blockedIds.has(c.other.id))]
}

// ─── Database ────────────────────────────────────────────────────────────

/** The people I've blocked, newest first. */
export async function fetchMyBlocks(userId: string): Promise<BlockedUser[]> {
  if (!supabaseConfigured) return []
  const { data, error } = await createClient()
    .from('user_blocks')
    .select('blocked_id, created_at, profiles!blocked_id ( name, avatar_url )')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Kunde inte hämta blockerade användare', error)
    return []
  }
  return ((data ?? []) as unknown as BlockRow[]).map(rowToBlockedUser)
}

/** Ids of the people I've blocked. */
export async function fetchMyBlockedIds(userId: string): Promise<Set<string>> {
  if (!supabaseConfigured) return new Set()
  const { data, error } = await createClient().from('user_blocks').select('blocked_id').eq('blocker_id', userId)
  if (error) {
    console.error('Kunde inte hämta blockerade användare', error)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.blocked_id as string))
}

export async function blockUser(userId: string, blockedId: string): Promise<void> {
  const { error } = await createClient()
    .from('user_blocks')
    .upsert({ blocker_id: userId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function unblockUser(userId: string, blockedId: string): Promise<void> {
  const { error } = await createClient()
    .from('user_blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function reportUser(
  userId: string,
  reportedId: string,
  reason: string,
  conversationId?: string | null
): Promise<void> {
  const invalid = validateReportReason(reason)
  if (invalid) throw new Error(invalid)
  const { error } = await createClient()
    .from('user_reports')
    .insert({ reporter_id: userId, reported_id: reportedId, reason: reason.trim(), conversation_id: conversationId ?? null })
  if (error) throw error
}

// user_reports has two foreign keys to profiles, so each embed names its column.
const USER_REPORT_SELECT =
  'id, reporter_id, reported_id, conversation_id, reason, created_at, reporter:profiles!reporter_id ( name ), reported:profiles!reported_id ( name )'

/** All user reports, newest first (admins only — RLS shows others just their own). */
export async function fetchUserReports(): Promise<UserReport[]> {
  if (!supabaseConfigured) return []
  const { data, error } = await createClient()
    .from('user_reports')
    .select(USER_REPORT_SELECT)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('Kunde inte hämta anmälda användare', error)
    return []
  }
  return ((data ?? []) as unknown as UserReportRow[]).map(rowToUserReport)
}

/** Dismisses (deletes) a user report. Admins only. */
export async function dismissUserReport(id: string): Promise<void> {
  const { error } = await createClient().from('user_reports').delete().eq('id', id)
  if (error) throw error
}

/**
 * Whether a block (in either direction) stops messages in this conversation.
 * Used after a send fails, since I can't see who has blocked me.
 */
export async function isConversationBlocked(conversationId: string): Promise<boolean> {
  if (!supabaseConfigured) return false
  const { data, error } = await createClient().rpc('conversation_blocked', { p_conversation_id: conversationId })
  if (error) return false
  return data === true
}
