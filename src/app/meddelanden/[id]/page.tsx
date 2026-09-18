'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Image as ImageIcon, Handshake, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  type ChatMessage,
  type ConversationSummary,
} from '@/lib/messages'
import { uploadListingImage } from '@/lib/storage'
import { formatMessageTime, cn } from '@/lib/utils'

export default function ConversationPage() {
  const params = useParams()
  const conversationId = params.id as string
  const { user } = useAuth()
  const [conv, setConv] = useState<ConversationSummary | null | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    fetchConversations(user.id).then((convs) => {
      setConv(convs.find((c) => c.id === conversationId) ?? null)
    })
    fetchMessages(conversationId).then(setMessages)
    markConversationRead(conversationId, user.id)
  }, [user, conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  async function handleSend() {
    if (!input.trim() || !user) return
    const content = input.trim()
    setInput('')
    await sendMessage(conversationId, user.id, content)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), conversationId, senderId: user.id, content, read: false, createdAt: new Date().toISOString() },
    ])
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const imageUrl = await uploadListingImage(file, user.id)
      await sendMessage(conversationId, user.id, '', imageUrl)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), conversationId, senderId: user.id, content: '', imageUrl, read: false, createdAt: new Date().toISOString() },
      ])
    } catch {
      alert('Kunde inte skicka bilden. Försök igen.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
        <Link href="/meddelanden" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        {other?.avatarUrl ? (
          <img src={other.avatarUrl} alt={other.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
            {other?.name[0] ?? '?'}
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{other?.name ?? 'Okänd användare'}</p>
          <p className="text-xs text-gray-400">{conv.listingTitle}</p>
        </div>
        {conv.mutualInterest && (
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded-full">
            <Handshake size={12} strokeWidth={2} />
            Match!
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.id
          return (
            <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
              {!isMe &&
                (other?.avatarUrl ? (
                  <img src={other.avatarUrl} alt={other.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-700 flex-shrink-0 mt-auto">
                    {other?.name[0] ?? '?'}
                  </div>
                ))}
              <div className={cn('max-w-xs lg:max-w-sm', isMe && 'items-end flex flex-col')}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Bild" className="rounded-2xl max-w-full mb-1 border border-gray-100" />
                )}
                {msg.content && (
                  <div
                    className={cn(
                      'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                      isMe ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100'
                    )}
                  >
                    {msg.content}
                  </div>
                )}
                <div className={cn('flex items-center gap-1 mt-1 px-1', isMe ? 'justify-end' : '')}>
                  <p className="text-xs text-gray-400">{formatMessageTime(msg.createdAt)}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-end gap-2">
          <label className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
          </label>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Skriv ett meddelande..."
              rows={1}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
          </div>

          <button
            onClick={handleSend}
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
