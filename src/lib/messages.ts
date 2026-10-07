import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { fetchMutualMatchUserIds } from '@/lib/interests'

export interface ConversationSummary {
  id: string
  listingId: string | null
  listingTitle: string
  listingImage?: string
  other: { id: string; name: string; avatarUrl?: string } | null
  lastMessage: { id: string; content: string; imageUrl?: string; senderId: string; createdAt: string } | null
  /** Ids of messages from the other party that I haven't read. */
  unreadMessageIds: string[]
  unreadCount: number
  mutualInterest: boolean
  createdAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  imageUrl?: string
  read: boolean
  createdAt: string
}

/** A message in the chat UI: either confirmed by the database or still local. */
export interface LocalChatMessage extends ChatMessage {
  /** Undefined once the database has the message. */
  status?: 'pending' | 'failed'
  /** The client-side id an optimistic message was created with. */
  localId?: string
}

/** A row of the messages table, as selected or delivered by Realtime. */
export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  image_url: string | null
  read: boolean | null
  created_at: string
}

const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, content, image_url, read, created_at'

// ─── Pure helpers (tested in messages.test.ts) ───────────────────────────

export function rowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content ?? '',
    imageUrl: row.image_url ?? undefined,
    read: !!row.read,
    createdAt: row.created_at,
  }
}

function time(iso: string): number {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * Chronological order. Messages the database hasn't confirmed yet (pending or
 * failed) always come after confirmed ones: their timestamps come from the
 * client's clock, which can't be compared reliably with the server's.
 */
export function compareMessages(a: LocalChatMessage, b: LocalChatMessage): number {
  const aLocal = a.status ? 1 : 0
  const bLocal = b.status ? 1 : 0
  if (aLocal !== bLocal) return aLocal - bLocal
  const diff = time(a.createdAt) - time(b.createdAt)
  if (diff !== 0) return diff
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Merges incoming messages (initial fetch, Realtime events, gap refetches)
 * into a list: one entry per id, sorted. An incoming copy replaces the stored
 * one, except that `read` never goes back from true to false (an INSERT echo
 * or a stale refetch can arrive after the UPDATE that marked it read).
 */
export function mergeMessages<T extends LocalChatMessage>(existing: T[], incoming: ChatMessage[]): T[] {
  if (incoming.length === 0) return existing
  const byId = new Map<string, T>()
  for (const m of existing) byId.set(m.id, m)
  let changed = false
  for (const m of incoming) {
    const prev = byId.get(m.id)
    if (prev && !prev.status && prev.read === (prev.read || m.read) && sameMessage(prev, m)) continue
    changed = true
    byId.set(m.id, { ...prev, ...m, read: (prev?.read ?? false) || m.read, status: undefined } as T)
  }
  if (!changed) return existing
  return [...byId.values()].sort(compareMessages)
}

function sameMessage(a: ChatMessage, b: ChatMessage): boolean {
  return (
    a.content === b.content &&
    a.imageUrl === b.imageUrl &&
    a.createdAt === b.createdAt &&
    a.senderId === b.senderId &&
    a.conversationId === b.conversationId
  )
}

/** Adds an optimistic (pending) message to the end of the list. */
export function addOptimistic<T extends LocalChatMessage>(list: T[], message: T): T[] {
  return [...list.filter((m) => m.localId !== message.localId), message].sort(compareMessages)
}

/**
 * The insert of an optimistic message succeeded: swap it for the stored row.
 * If the Realtime echo of the same row arrived first, the row is already in
 * the list, so the optimistic copy is simply dropped — no duplicate either way.
 */
export function confirmOptimistic<T extends LocalChatMessage>(list: T[], localId: string, saved: ChatMessage): T[] {
  const echoed = list.some((m) => m.id === saved.id)
  const without = list.filter((m) => m.localId !== localId || !m.status)
  const merged = mergeMessages(without, [saved])
  // Keep the local id on the confirmed row (it's the React key), so the
  // bubble isn't remounted — unless the echo already rendered under its own id.
  return echoed ? merged : merged.map((m) => (m.id === saved.id ? { ...m, localId } : m))
}

/** Sets the delivery state of an optimistic message (pending ↔ failed). */
export function setLocalStatus<T extends LocalChatMessage>(
  list: T[],
  localId: string,
  status: 'pending' | 'failed'
): T[] {
  return list.map((m) => (m.localId === localId && m.status ? { ...m, status } : m))
}

/** Marks the given messages as read (locally). */
export function markReadLocally<T extends LocalChatMessage>(list: T[], ids: readonly string[]): T[] {
  if (ids.length === 0) return list
  const set = new Set(ids)
  let changed = false
  const next = list.map((m) => {
    if (!set.has(m.id) || m.read) return m
    changed = true
    return { ...m, read: true }
  })
  return changed ? next : list
}

/**
 * The newest created_at among confirmed messages — the point to refetch from
 * after a Realtime reconnect. Null when nothing is confirmed yet.
 */
export function latestConfirmedAt(list: readonly LocalChatMessage[]): string | null {
  let best: string | null = null
  for (const m of list) {
    if (m.status) continue
    if (best === null || time(m.createdAt) > time(best)) best = m.createdAt
  }
  return best
}

/** Messages in `fetched` that the list doesn't already have (the gap). */
export function missingMessages(list: readonly LocalChatMessage[], fetched: readonly ChatMessage[]): ChatMessage[] {
  const known = new Set(list.map((m) => m.id))
  return fetched.filter((m) => !known.has(m.id))
}

/** Confirmed messages from the other party that I haven't read. */
export function unreadIncoming(list: readonly LocalChatMessage[], userId: string): string[] {
  return list.filter((m) => !m.status && m.senderId !== userId && !m.read).map((m) => m.id)
}

export function countUnread(list: readonly ChatMessage[], userId: string): number {
  return list.filter((m) => m.senderId !== userId && !m.read).length
}

/** The last of my messages the database has confirmed (for "Läst"). */
export function lastOwnConfirmed<T extends LocalChatMessage>(list: readonly T[], userId: string): T | undefined {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]
    if (m.senderId === userId && !m.status) return m
  }
  return undefined
}

function sortKey(c: ConversationSummary): number {
  return time(c.lastMessage?.createdAt ?? c.createdAt)
}

/** Newest activity first. */
export function sortConversations(list: ConversationSummary[]): ConversationSummary[] {
  return [...list].sort((a, b) => sortKey(b) - sortKey(a))
}

/**
 * Applies a message (INSERT or UPDATE from Realtime) to the inbox: last
 * message, unread ids/count and ordering. Returns null when the message
 * belongs to a conversation the list doesn't know yet — the caller should
 * refetch the inbox then.
 */
export function applyMessageToConversations(
  list: ConversationSummary[],
  message: ChatMessage,
  userId: string
): ConversationSummary[] | null {
  const idx = list.findIndex((c) => c.id === message.conversationId)
  if (idx === -1) return null
  const conv = list[idx]

  let lastMessage = conv.lastMessage
  if (
    !lastMessage ||
    lastMessage.id === message.id ||
    time(message.createdAt) >= time(lastMessage.createdAt)
  ) {
    lastMessage = {
      id: message.id,
      content: message.content,
      imageUrl: message.imageUrl,
      senderId: message.senderId,
      createdAt: message.createdAt,
    }
  }

  let unreadMessageIds = conv.unreadMessageIds
  if (message.senderId !== userId) {
    const has = unreadMessageIds.includes(message.id)
    if (!message.read && !has) unreadMessageIds = [...unreadMessageIds, message.id]
    if (message.read && has) unreadMessageIds = unreadMessageIds.filter((id) => id !== message.id)
  }

  const next = [...list]
  next[idx] = { ...conv, lastMessage, unreadMessageIds, unreadCount: unreadMessageIds.length }
  return sortConversations(next)
}

/** Clears the unread state of one conversation (e.g. after opening it). */
export function clearConversationUnread(list: ConversationSummary[], conversationId: string): ConversationSummary[] {
  return list.map((c) =>
    c.id === conversationId && c.unreadCount > 0 ? { ...c, unreadMessageIds: [], unreadCount: 0 } : c
  )
}

// ─── Data access ──────────────────────────────────────────────────────────

interface ConversationRow {
  id: string
  listing_id: string | null
  created_at: string
  listings: { id: string; title: string; images: string[] | null } | null
  conversation_participants: {
    user_id: string
    profiles: { id: string; name: string; avatar_url: string | null } | null
  }[]
  messages: MessageRow[]
}

export function rowToConversation(
  row: ConversationRow,
  userId: string,
  mutualUserIds: ReadonlySet<string>
): ConversationSummary {
  const otherParticipant = row.conversation_participants.find((p) => p.user_id !== userId)
  const profile = otherParticipant?.profiles ?? null
  const messages = (row.messages ?? []).map(rowToMessage).sort(compareMessages)
  const last = messages[messages.length - 1]
  const unreadMessageIds = messages.filter((m) => m.senderId !== userId && !m.read).map((m) => m.id)

  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listings?.title ?? 'Borttagen annons',
    listingImage: row.listings?.images?.[0],
    other: profile
      ? { id: profile.id, name: profile.name, avatarUrl: profile.avatar_url ?? undefined }
      : null,
    lastMessage: last
      ? {
          id: last.id,
          content: last.content,
          imageUrl: last.imageUrl,
          senderId: last.senderId,
          createdAt: last.createdAt,
        }
      : null,
    unreadMessageIds,
    unreadCount: unreadMessageIds.length,
    mutualInterest: profile ? mutualUserIds.has(profile.id) : false,
    createdAt: row.created_at,
  }
}

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()

  const { data: partRows } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
  const convIds = (partRows ?? []).map((r) => r.conversation_id as string)
  if (convIds.length === 0) return []

  const [{ data, error }, mutualUserIds] = await Promise.all([
    supabase
      .from('conversations')
      .select(
        `id, listing_id, created_at,
         listings ( id, title, images ),
         conversation_participants ( user_id, profiles ( id, name, avatar_url ) ),
         messages ( ${MESSAGE_COLUMNS} )`
      )
      .in('id', convIds),
    fetchMutualMatchUserIds(userId),
  ])

  if (error || !data) {
    console.error('Kunde inte hämta konversationer', error)
    return []
  }

  return sortConversations(
    (data as unknown as ConversationRow[]).map((row) => rowToConversation(row, userId, mutualUserIds))
  )
}

/**
 * Messages of a conversation, oldest first. With `since`, only those created
 * at or after it — used to fill the gap after a Realtime reconnect (the
 * boundary is inclusive so same-timestamp rows aren't lost; merging dedupes).
 */
export async function fetchMessages(conversationId: string, since?: string): Promise<ChatMessage[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()
  let query = supabase.from('messages').select(MESSAGE_COLUMNS).eq('conversation_id', conversationId)
  if (since) query = query.gte('created_at', since)
  const { data, error } = await query.order('created_at', { ascending: true })

  if (error || !data) {
    console.error('Kunde inte hämta meddelanden', error)
    return []
  }
  return (data as MessageRow[]).map(rowToMessage)
}

/** Inserts a message and returns the stored row (its id reconciles the optimistic copy). */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  imageUrl?: string
): Promise<ChatMessage> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content, image_url: imageUrl })
    .select(MESSAGE_COLUMNS)
    .single()
  if (error) throw error
  const saved = rowToMessage(data as MessageRow)

  // Email the other participant(s). Fire-and-forget: never blocks or fails the send.
  if (saved.id) {
    fetch('/api/notify/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: saved.id }),
      keepalive: true,
    }).catch(() => {})
  }
  return saved
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  if (!supabaseConfigured) return
  const supabase = createClient()
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false)
  if (error) console.error('Kunde inte markera som läst', error)
}

/** Marks specific messages as read. Returns false if the update failed. */
export async function markMessagesRead(ids: readonly string[]): Promise<boolean> {
  if (!supabaseConfigured || ids.length === 0) return true
  const { error } = await createClient().from('messages').update({ read: true }).in('id', [...ids])
  if (error) {
    console.error('Kunde inte markera som läst', error)
    return false
  }
  return true
}

/**
 * Unread messages from others across all my conversations (RLS limits the
 * rows to conversations I take part in).
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  if (!supabaseConfigured) return 0
  const { count, error } = await createClient()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .eq('read', false)
  if (error) {
    console.error('Kunde inte hämta olästa meddelanden', error)
    return 0
  }
  return count ?? 0
}

// Finds an existing 1:1 conversation about this listing between the two
// users, or creates one — atomically, in the get_or_create_conversation()
// database function (the caller can't read a new conversation back until
// they're a participant, so this can't be done as separate client inserts).
export async function getOrCreateConversation(
  listingId: string,
  // Kept for call-site compatibility; the database uses the session user.
  _userId: string,
  otherUserId: string
): Promise<string> {
  const { data, error } = await createClient().rpc('get_or_create_conversation', {
    p_listing_id: listingId,
    p_other_user_id: otherUserId,
  })
  if (error || !data) throw error ?? new Error('Kunde inte starta konversationen.')
  return data as string
}
