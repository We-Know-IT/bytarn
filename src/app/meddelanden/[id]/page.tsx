'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Image as ImageIcon, Paperclip } from 'lucide-react'
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '@/lib/mock-data'
import { formatMessageTime, cn } from '@/lib/utils'
import type { Message } from '@/types'

export default function ConversationPage() {
  const params = useParams()
  const conv = MOCK_CONVERSATIONS.find((c) => c.id === params.id)
  const [messages, setMessages] = useState<Message[]>(
    MOCK_MESSAGES.filter((m) => m.conversationId === params.id)
  )
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!conv) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Konversation hittades inte.</p>
      </div>
    )
  }

  const other = conv.participants.find((p) => p.id !== 'me')

  function sendMessage() {
    if (!input.trim()) return
    const msg: Message = {
      id: `m${Date.now()}`,
      conversationId: conv!.id,
      senderId: 'me',
      senderName: 'Du',
      content: input.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    }
    setMessages((prev) => [...prev, msg])
    setInput('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-4 py-3 flex items-center gap-3">
        <Link href="/meddelanden" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        {other?.avatar ? (
          <img src={other.avatar} alt={other.name} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
            {other?.name[0]}
          </div>
        )}
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{other?.name}</p>
          <p className="text-xs text-gray-400">{conv.listingTitle}</p>
        </div>
        {conv.mutualInterest && (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded-full">
            🤝 Match!
          </span>
        )}
        <Link
          href={`/annonser/${conv.listingId}`}
          className="flex-shrink-0"
        >
          <img
            src={conv.listingImage}
            alt={conv.listingTitle}
            className="w-12 h-12 rounded-lg object-cover border border-gray-100"
          />
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map((msg) => {
          const isMe = msg.senderId === 'me'
          return (
            <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
              {!isMe && (
                other?.avatar ? (
                  <img
                    src={other.avatar}
                    alt={other.name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-700 flex-shrink-0 mt-auto">
                    {other?.name[0]}
                  </div>
                )
              )}
              <div className={cn('max-w-xs lg:max-w-sm', isMe && 'items-end flex flex-col')}>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Bild"
                    className="rounded-2xl max-w-full mb-1 border border-gray-100"
                  />
                )}
                <div
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                    isMe
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100'
                  )}
                >
                  {msg.content}
                </div>
                <p className={cn(
                  'text-xs text-gray-400 mt-1 px-1',
                  isMe && 'text-right'
                )}>
                  {formatMessageTime(msg.createdAt)}
                </p>
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
            <input type="file" accept="image/*,video/*" className="hidden" />
            <ImageIcon size={20} />
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
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Enter för att skicka · Shift+Enter för ny rad
        </p>
      </div>
    </div>
  )
}
