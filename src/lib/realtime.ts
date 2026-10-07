// Supabase Realtime for the chat: a small subscription manager.
//
// Every topic gets ONE channel per browser tab, however many components
// listen to it (the navbar badge and the inbox share the "my messages" feed).
// Channels are reference counted and closed shortly after the last listener
// leaves; the grace period also absorbs React StrictMode's mount → unmount →
// mount in development, which would otherwise race `removeChannel` against a
// new `channel()` call for the same topic.
//
// Realtime applies the messages RLS policies, so the unfiltered feed only
// delivers rows from conversations the signed-in user takes part in.

import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { rowToMessage, type ChatMessage, type MessageRow } from '@/lib/messages'

export type MessagesEvent =
  | { type: 'insert' | 'update'; message: ChatMessage }
  | { type: 'typing'; userId: string }
  /**
   * The channel is (re)joined. `reconnect` is true after a drop, when events
   * may have been missed — listeners should refetch to fill the gap.
   */
  | { type: 'subscribed'; reconnect: boolean }

export type MessagesListener = (event: MessagesEvent) => void

interface Entry {
  channel: RealtimeChannel
  listeners: Set<MessagesListener>
  closeTimer?: ReturnType<typeof setTimeout>
  subscribedOnce: boolean
  dropped: boolean
}

const CLOSE_GRACE_MS = 1500
const entries = new Map<string, Entry>()
let warnedUnavailable = false

function emit(entry: Entry, event: MessagesEvent) {
  for (const listener of [...entry.listeners]) {
    try {
      listener(event)
    } catch (err) {
      console.error('Fel i realtidslyssnare', err)
    }
  }
}

function openChannel(topic: string, opts: { filter?: string; typing?: boolean }): Entry {
  const supabase = createClient()
  const channel = supabase.channel(topic, {
    config: opts.typing ? { broadcast: { self: false, ack: false } } : {},
  })
  const entry: Entry = { channel, listeners: new Set(), subscribedOnce: false, dropped: false }

  const filter = opts.filter ? { filter: opts.filter } : {}
  const onRow = (type: 'insert' | 'update') => (payload: { new: Record<string, unknown> }) => {
    const row = payload.new as unknown as MessageRow
    if (!row?.id) return
    emit(entry, { type, message: rowToMessage(row) })
  }

  channel
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', ...filter }, onRow('insert'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', ...filter }, onRow('update'))

  if (opts.typing) {
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const userId = (payload as { userId?: unknown } | undefined)?.userId
      if (typeof userId === 'string') emit(entry, { type: 'typing', userId })
    })
  }

  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      const reconnect = entry.subscribedOnce
      entry.subscribedOnce = true
      entry.dropped = false
      emit(entry, { type: 'subscribed', reconnect })
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      entry.dropped = true
      if (status !== 'CLOSED' && !warnedUnavailable) {
        warnedUnavailable = true
        console.warn(
          'Realtid för meddelanden är inte tillgänglig just nu (kontrollera att Realtime är aktiverat i Supabase).',
          err ?? status
        )
      }
    }
  })

  return entry
}

function subscribe(topic: string, opts: { filter?: string; typing?: boolean }, listener: MessagesListener) {
  if (!supabaseConfigured || typeof window === 'undefined') return () => {}

  let entry = entries.get(topic)
  if (!entry) {
    entry = openChannel(topic, opts)
    entries.set(topic, entry)
  }
  if (entry.closeTimer) {
    clearTimeout(entry.closeTimer)
    entry.closeTimer = undefined
  }
  entry.listeners.add(listener)
  ensureOnlineListener()

  const current = entry
  let active = true
  return () => {
    if (!active) return
    active = false
    current.listeners.delete(listener)
    if (current.listeners.size > 0) return
    current.closeTimer = setTimeout(() => {
      if (current.listeners.size > 0) return
      entries.delete(topic)
      createClient()
        .removeChannel(current.channel)
        .catch(() => {})
    }, CLOSE_GRACE_MS)
  }
}

// When the browser comes back online the socket reconnects by itself, but a
// tab that slept may have missed rows even if no CLOSED was reported. Ask
// listeners to resync after the connection settles.
let onlineListenerAdded = false
function ensureOnlineListener() {
  if (onlineListenerAdded || typeof window === 'undefined') return
  onlineListenerAdded = true
  window.addEventListener('online', () => {
    setTimeout(() => {
      for (const entry of entries.values()) {
        if (entry.subscribedOnce) emit(entry, { type: 'subscribed', reconnect: true })
      }
    }, 1000)
  })
}

/**
 * New and updated messages across all of the user's conversations. One
 * shared channel per tab (used by the navbar badge and the inbox).
 */
export function subscribeToMyMessages(userId: string, listener: MessagesListener): () => void {
  return subscribe(`meddelanden:${userId}`, {}, listener)
}

/**
 * New/updated messages of one conversation plus the typing broadcast. The
 * topic is shared by both participants so typing broadcasts reach the other
 * side; postgres changes are filtered per client to this conversation.
 */
export function subscribeToConversation(conversationId: string, listener: MessagesListener): () => void {
  return subscribe(
    `konversation:${conversationId}`,
    { filter: `conversation_id=eq.${conversationId}`, typing: true },
    listener
  )
}

/** Broadcasts "I'm typing" to the conversation. No database writes. */
export function sendTyping(conversationId: string, userId: string): void {
  const entry = entries.get(`konversation:${conversationId}`)
  // Only over an open socket — never fall back to a REST call per keystroke.
  if (!entry || !entry.subscribedOnce || entry.dropped) return
  entry.channel.send({ type: 'broadcast', event: 'typing', payload: { userId } }).catch(() => {})
}

// ─── Local change notifications ─────────────────────────────────────────
// When this tab marks messages read, tell other listeners (the navbar badge)
// right away instead of waiting for the Realtime UPDATE round trip — and so
// the badge still updates if Realtime isn't enabled.

const localListeners = new Set<() => void>()

export function onLocalMessagesChange(listener: () => void): () => void {
  localListeners.add(listener)
  return () => {
    localListeners.delete(listener)
  }
}

export function notifyLocalMessagesChange(): void {
  for (const listener of [...localListeners]) listener()
}
