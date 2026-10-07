'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseConfigured } from '@/lib/supabase/client'
import {
  addOptimistic,
  confirmOptimistic,
  fetchMessages,
  latestConfirmedAt,
  markMessagesRead,
  markReadLocally,
  mergeMessages,
  missingMessages,
  sendMessage,
  setLocalStatus,
  unreadIncoming,
  type ChatMessage,
  type LocalChatMessage,
} from '@/lib/messages'
import { notifyLocalMessagesChange, sendTyping, subscribeToConversation } from '@/lib/realtime'
import { useDocumentVisible } from '@/hooks/useDocumentVisible'

/** How long "skriver…" stays up after the last typing signal. */
export const TYPING_TIMEOUT_MS = 3000
/** At most one typing broadcast per this interval while typing. */
const TYPING_THROTTLE_MS = 2000

interface State {
  conversationId: string
  messages: LocalChatMessage[]
  loaded: boolean
}

function newLocalId(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `local-${uuid}`
}

/**
 * Live messages of one conversation: initial fetch, Realtime INSERT/UPDATE
 * (filtered to the conversation), gap refetch after reconnects, optimistic
 * sending with retry, read marking while the tab is visible, and the typing
 * indicator over a Realtime broadcast.
 *
 * `onIncoming` is called with messages from the other party as they arrive
 * live (not for the initial load).
 */
export function useConversationMessages(
  conversationId: string,
  userId: string | null | undefined,
  onIncoming?: (messages: ChatMessage[]) => void
) {
  const [state, setState] = useState<State>({ conversationId, messages: [], loaded: false })
  const [otherTyping, setOtherTyping] = useState(false)
  const visible = useDocumentVisible()

  const current = state.conversationId === conversationId ? state : null
  const messages = current?.messages ?? EMPTY
  const loaded = current?.loaded ?? false

  // Latest values for callbacks that outlive a render.
  const messagesRef = useRef<LocalChatMessage[]>(messages)
  const onIncomingRef = useRef(onIncoming)
  useEffect(() => {
    messagesRef.current = messages
    onIncomingRef.current = onIncoming
  })

  const update = useCallback(
    (id: string, fn: (list: LocalChatMessage[]) => LocalChatMessage[], markLoaded = false) => {
      setState((prev) => {
        const base = prev.conversationId === id ? prev : { conversationId: id, messages: [], loaded: false }
        const nextMessages = fn(base.messages)
        if (nextMessages === base.messages && (!markLoaded || base.loaded) && base === prev) return prev
        return { conversationId: id, messages: nextMessages, loaded: base.loaded || markLoaded }
      })
    },
    []
  )

  // ─── Load + subscribe ───
  useEffect(() => {
    if (!userId || !supabaseConfigured) return
    let cancelled = false
    let typingTimer: ReturnType<typeof setTimeout> | undefined

    const reportIncoming = (list: ChatMessage[]) => {
      const incoming = list.filter((m) => m.senderId !== userId)
      if (incoming.length > 0) onIncomingRef.current?.(incoming)
    }

    fetchMessages(conversationId).then((rows) => {
      if (!cancelled) update(conversationId, (list) => mergeMessages(list, rows), true)
    })

    const fillGap = () => {
      const since = latestConfirmedAt(messagesRef.current)
      fetchMessages(conversationId, since ?? undefined).then((rows) => {
        if (cancelled) return
        const missing = missingMessages(messagesRef.current, rows)
        update(conversationId, (list) => mergeMessages(list, rows), true)
        if (since) reportIncoming(missing)
      })
    }

    const unsubscribe = subscribeToConversation(conversationId, (event) => {
      if (cancelled) return
      switch (event.type) {
        case 'insert':
        case 'update': {
          const isNew = !messagesRef.current.some((m) => m.id === event.message.id)
          update(conversationId, (list) => mergeMessages(list, [event.message]))
          if (event.type === 'insert' && event.message.senderId !== userId) {
            setOtherTyping(false)
            if (isNew) reportIncoming([event.message])
          }
          break
        }
        case 'typing':
          if (event.userId === userId) break
          setOtherTyping(true)
          if (typingTimer) clearTimeout(typingTimer)
          typingTimer = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT_MS)
          break
        case 'subscribed':
          // Rows inserted between the initial fetch and the join, or while
          // the connection was down, never arrive as events: refetch them.
          fillGap()
          break
      }
    })

    return () => {
      cancelled = true
      if (typingTimer) clearTimeout(typingTimer)
      unsubscribe()
      setOtherTyping(false)
    }
  }, [conversationId, userId, update])

  // ─── Mark incoming messages read while the chat is open and visible ───
  const inFlightRead = useRef(new Set<string>())
  useEffect(() => {
    if (!userId || !visible || !supabaseConfigured) return
    const ids = unreadIncoming(messages, userId).filter((id) => !inFlightRead.current.has(id))
    if (ids.length === 0) return
    const pending = inFlightRead.current
    ids.forEach((id) => pending.add(id))
    markMessagesRead(ids).then((ok) => {
      ids.forEach((id) => pending.delete(id))
      if (!ok) return
      update(conversationId, (list) => markReadLocally(list, ids))
      notifyLocalMessagesChange()
    })
  }, [messages, visible, userId, conversationId, update])

  // ─── Sending ───
  const deliver = useCallback(
    (message: LocalChatMessage) => {
      const localId = message.localId!
      const convId = message.conversationId
      sendMessage(convId, message.senderId, message.content, message.imageUrl)
        .then((saved) => update(convId, (list) => confirmOptimistic(list, localId, saved)))
        .catch((err) => {
          console.error('Kunde inte skicka meddelandet', err)
          update(convId, (list) => setLocalStatus(list, localId, 'failed'))
        })
    },
    [update]
  )

  const lastTypingSent = useRef(0)

  const send = useCallback(
    (content: string, imageUrl?: string) => {
      if (!userId) return
      const localId = newLocalId()
      const optimistic: LocalChatMessage = {
        id: localId,
        localId,
        conversationId,
        senderId: userId,
        content,
        imageUrl,
        read: false,
        createdAt: new Date().toISOString(),
        status: 'pending',
      }
      lastTypingSent.current = 0
      update(conversationId, (list) => addOptimistic(list, optimistic))
      deliver(optimistic)
    },
    [conversationId, userId, update, deliver]
  )

  const retry = useCallback(
    (localId: string) => {
      const message = messagesRef.current.find((m) => m.localId === localId && m.status === 'failed')
      if (!message) return
      update(message.conversationId, (list) => setLocalStatus(list, localId, 'pending'))
      deliver(message)
    },
    [update, deliver]
  )

  /** Call on input; broadcasts "typing" at most every couple of seconds. */
  const notifyTyping = useCallback(() => {
    if (!userId) return
    const now = Date.now()
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return
    lastTypingSent.current = now
    sendTyping(conversationId, userId)
  }, [conversationId, userId])

  return { messages, loaded, otherTyping, send, retry, notifyTyping }
}

const EMPTY: LocalChatMessage[] = []
