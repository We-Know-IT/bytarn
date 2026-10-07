'use client'

import { useEffect, useState } from 'react'
import { supabaseConfigured } from '@/lib/supabase/client'
import { fetchUnreadCount } from '@/lib/messages'
import { onLocalMessagesChange, subscribeToMyMessages } from '@/lib/realtime'

const REFETCH_DEBOUNCE_MS = 300

/**
 * Number of unread messages from others across the user's conversations,
 * kept live over the shared "my messages" Realtime channel. 0 when signed
 * out or when Supabase isn't configured.
 */
export function useUnreadCount(userId: string | null | undefined): number {
  const [state, setState] = useState<{ userId: string; count: number } | null>(null)

  useEffect(() => {
    if (!userId || !supabaseConfigured) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    // Ignore responses that started before a newer request (out-of-order).
    let seq = 0

    const load = () => {
      const mine = ++seq
      fetchUnreadCount(userId).then((count) => {
        if (!cancelled && mine === seq) setState({ userId, count })
      })
    }
    // A burst of events (e.g. a whole conversation marked read) → one count query.
    const scheduleLoad = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(load, REFETCH_DEBOUNCE_MS)
    }

    load()
    const unsubscribe = subscribeToMyMessages(userId, (event) => {
      if (event.type === 'insert' || event.type === 'update') {
        // My own new messages never change my unread count.
        if (event.type === 'insert' && event.message.senderId === userId) return
        scheduleLoad()
      } else if (event.type === 'subscribed' && event.reconnect) {
        scheduleLoad()
      }
    })
    const offLocal = onLocalMessagesChange(scheduleLoad)
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleLoad()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      unsubscribe()
      offLocal()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])

  return userId && state?.userId === userId ? state.count : 0
}
