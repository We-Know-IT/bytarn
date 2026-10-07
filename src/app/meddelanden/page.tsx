'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Handshake } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  applyMessageToConversations,
  fetchConversations,
  type ConversationSummary,
} from '@/lib/messages'
import { subscribeToMyMessages } from '@/lib/realtime'
import { formatMessageTime, cn } from '@/lib/utils'

const REFETCH_DEBOUNCE_MS = 300

export default function MeddelandenPage() {
  const { user, loading } = useAuth()
  const userId = user?.id
  const [inbox, setInbox] = useState<{ userId: string; conversations: ConversationSummary[] } | null>(null)
  const conversations = userId && inbox?.userId === userId ? inbox.conversations : EMPTY
  const loadingConvs = userId ? inbox?.userId !== userId : loading

  const conversationsRef = useRef(conversations)
  useEffect(() => {
    conversationsRef.current = conversations
  })

  // Initial load + live updates: one shared Realtime feed of my messages
  // (RLS limits it to my conversations) updates last message, order and
  // unread counts in place; anything unknown triggers a refetch.
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let seq = 0

    const load = () => {
      const mine = ++seq
      fetchConversations(userId).then((list) => {
        if (!cancelled && mine === seq) setInbox({ userId, conversations: list })
      })
    }
    const scheduleLoad = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(load, REFETCH_DEBOUNCE_MS)
    }

    load()
    const unsubscribe = subscribeToMyMessages(userId, (event) => {
      if (event.type === 'insert' || event.type === 'update') {
        const { message } = event
        if (!conversationsRef.current.some((c) => c.id === message.conversationId)) {
          // A brand-new conversation (or the list hasn't loaded yet).
          scheduleLoad()
          return
        }
        setInbox((prev) => {
          if (!prev || prev.userId !== userId) return prev
          const next = applyMessageToConversations(prev.conversations, message, userId)
          return next ? { userId, conversations: next } : prev
        })
      } else if (event.type === 'subscribed' && event.reconnect) {
        scheduleLoad()
      }
    })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      unsubscribe()
    }
  }, [userId])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meddelanden</h1>

      {!loading && !user ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-4">Logga in för att se dina meddelanden.</p>
          <Link href="/logga-in" className="text-emerald-600 font-medium hover:underline">
            Logga in
          </Link>
        </div>
      ) : loadingConvs ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={24} className="text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Inga meddelanden än</h3>
          <p className="text-gray-500 text-sm">
            När du kontaktar en annonsör hamnar konversationen här.
          </p>
        </div>
      ) : (
        <ul className="space-y-1" aria-label="Konversationer">
          {conversations.map((conv) => (
            <li key={conv.id}>
            <Link
              href={`/meddelanden/${conv.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {conv.other?.avatarUrl ? (
                  <img
                    src={conv.other.avatarUrl}
                    alt={conv.other.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
                    {conv.other?.name[0] ?? '?'}
                  </div>
                )}
                {conv.unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn('text-sm', conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700')}>
                    {conv.other?.name ?? 'Okänd användare'}
                    {conv.unreadCount > 0 && (
                      <span className="sr-only">
                        {` – ${conv.unreadCount} ${conv.unreadCount === 1 ? 'oläst meddelande' : 'olästa meddelanden'}`}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    {conv.lastMessage ? formatMessageTime(conv.lastMessage.createdAt) : ''}
                    {conv.unreadCount > 0 && (
                      <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-1">re: {conv.listingTitle}</p>
                {conv.lastMessage && (
                  <p className={cn('text-sm truncate', conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500')}>
                    {conv.lastMessage.senderId === user?.id ? 'Du: ' : ''}
                    {conv.lastMessage.content || (conv.lastMessage.imageUrl ? 'Bild' : '')}
                  </p>
                )}
              </div>

              {conv.mutualInterest && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded-full">
                  <Handshake size={12} strokeWidth={2} />
                  Match
                </span>
              )}
            </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const EMPTY: ConversationSummary[] = []
