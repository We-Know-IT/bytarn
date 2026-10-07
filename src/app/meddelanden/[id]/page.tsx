'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Image as ImageIcon, Handshake, Loader2, ArrowDown, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import { fetchConversations, lastOwnConfirmed, type ConversationSummary } from '@/lib/messages'
import { useConversationMessages } from '@/hooks/useConversationMessages'
import { uploadListingImage } from '@/lib/storage'
import { formatMessageTime, cn } from '@/lib/utils'

/** Within this many px of the bottom counts as "at the bottom". */
const NEAR_BOTTOM_PX = 120

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.id as string
  const { user, loading } = useAuth()
  const [convState, setConvState] = useState<{ id: string; conv: ConversationSummary | null } | null>(null)
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [newBelow, setNewBelow] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  // Whether the user is (close to) the bottom of the list. Updated from
  // scroll events and before sending; read when messages arrive.
  const nearBottomRef = useRef(true)
  const scrolledOnce = useRef(false)

  const handleIncoming = useCallback(() => {
    if (!nearBottomRef.current) setNewBelow(true)
  }, [])

  const { messages, loaded, otherTyping, send, retry, notifyTyping } = useConversationMessages(
    conversationId,
    user?.id,
    handleIncoming
  )

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchConversations(user.id).then((convs) => {
      if (!cancelled) setConvState({ id: conversationId, conv: convs.find((c) => c.id === conversationId) ?? null })
    })
    return () => {
      cancelled = true
    }
  }, [user, conversationId])

  const conv = convState?.id === conversationId ? convState.conv : undefined

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Follow new messages only when the user is already at the bottom;
  // otherwise the "Nya meddelanden" pill (set in handleIncoming) shows.
  const last = messages[messages.length - 1]
  const lastKey = last ? (last.localId ?? last.id) : ''
  const ready = !!conv && loaded
  useEffect(() => {
    if (!ready || !nearBottomRef.current) return
    scrollToBottom(scrolledOnce.current)
    scrolledOnce.current = true
  }, [ready, lastKey, messages.length, scrollToBottom])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    nearBottomRef.current = near
    if (near && newBelow) setNewBelow(false)
  }

  function jumpToNew() {
    nearBottomRef.current = true
    setNewBelow(false)
    scrollToBottom(true)
  }

  if (!supabaseConfigured) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4 text-center text-gray-500 text-sm">
        Meddelanden är inte tillgängliga just nu.
      </div>
    )
  }

  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-sm">
        <p className="text-gray-500">Logga in för att se konversationen.</p>
        <Link href="/logga-in" className="text-emerald-600 font-medium hover:underline">
          Logga in
        </Link>
      </div>
    )
  }

  if (!user || conv === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
        Laddar konversation…
      </div>
    )
  }

  if (!conv) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Konversation hittades inte.</p>
      </div>
    )
  }

  const other = conv.other
  const lastOwn = lastOwnConfirmed(messages, user.id)

  function sendText() {
    const content = input.trim()
    if (!content) return
    setInput('')
    nearBottomRef.current = true
    setNewBelow(false)
    send(content)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const imageUrl = await uploadListingImage(file, user.id)
      nearBottomRef.current = true
      setNewBelow(false)
      send('', imageUrl)
    } catch {
      alert('Kunde inte ladda upp bilden. Försök igen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
        <Link href="/meddelanden" className="text-gray-400 hover:text-gray-600" aria-label="Tillbaka till meddelanden">
          <ArrowLeft size={20} />
        </Link>
        {other?.avatarUrl ? (
          <img src={other.avatarUrl} alt={other.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
            {other?.name[0] ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{other?.name ?? 'Okänd användare'}</p>
          <p className="text-xs text-gray-400 truncate">{conv.listingTitle}</p>
        </div>
        {conv.mutualInterest && (
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded-full">
            <Handshake size={12} strokeWidth={2} />
            Ömsesidigt intresse
          </span>
        )}
        {conv.listingId && (
          <Link href={`/annonser/${conv.listingId}`} className="flex-shrink-0">
            {conv.listingImage ? (
              <img
                src={conv.listingImage}
                alt={conv.listingTitle}
                className="w-12 h-12 rounded-lg object-cover border border-gray-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-100" />
            )}
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={`Meddelanden med ${other?.name ?? 'okänd användare'}`}
          className="h-full overflow-y-auto px-4 py-4 space-y-4 bg-gray-50"
        >
          {!loaded && (
            <p className="text-center text-xs text-gray-400" aria-live="off">
              Laddar meddelanden…
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === user.id
            const showRead = isMe && msg === lastOwn && msg.read
            return (
              <div key={msg.localId ?? msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                {!isMe &&
                  (other?.avatarUrl ? (
                    <img src={other.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto" />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-700 flex-shrink-0 mt-auto"
                    >
                      {other?.name[0] ?? '?'}
                    </div>
                  ))}
                <div
                  className={cn(
                    'max-w-xs lg:max-w-sm',
                    isMe && 'items-end flex flex-col',
                    msg.status === 'pending' && 'opacity-60'
                  )}
                >
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Bild" className="rounded-2xl max-w-full mb-1 border border-gray-100" />
                  )}
                  {msg.content && (
                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100',
                        msg.status === 'failed' && 'bg-red-50 text-red-900 border border-red-200'
                      )}
                    >
                      {msg.content}
                    </div>
                  )}
                  <div className={cn('flex items-center gap-1 mt-1 px-1', isMe ? 'justify-end' : '')}>
                    {msg.status === 'pending' ? (
                      <p className="text-xs text-gray-400">Skickar…</p>
                    ) : msg.status === 'failed' ? (
                      <p className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle size={12} aria-hidden="true" />
                        Kunde inte skickas.
                        <button
                          type="button"
                          onClick={() => retry(msg.localId!)}
                          className="font-medium underline hover:no-underline"
                        >
                          Försök igen
                        </button>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {formatMessageTime(msg.createdAt)}
                        {showRead && <span className="ml-1.5 text-emerald-600">· Läst</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {newBelow && (
          <button
            type="button"
            onClick={jumpToNew}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-emerald-700 transition-colors"
          >
            Nya meddelanden
            <ArrowDown size={14} aria-hidden="true" />
            <span className="sr-only">– gå till senaste</span>
          </button>
        )}
      </div>

      {/* Typing indicator */}
      <div role="status" aria-live="polite" className="bg-gray-50 px-4 h-5 text-xs text-gray-500 italic">
        {otherTyping ? `${other?.name ?? 'Den andra'} skriver…` : ''}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-end gap-2">
          <label className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            <span className="sr-only">Skicka en bild</span>
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </label>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (e.target.value.trim()) notifyTyping()
              }}
              onKeyDown={handleKey}
              placeholder="Skriv ett meddelande..."
              aria-label="Meddelande"
              rows={1}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
          </div>

          <button
            onClick={sendText}
            disabled={!input.trim()}
            className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Skicka meddelande"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Enter för att skicka · Shift+Enter för ny rad</p>
      </div>
    </div>
  )
}
