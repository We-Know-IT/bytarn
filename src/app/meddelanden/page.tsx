'use client'

import Link from 'next/link'
import { MessageSquare, Handshake } from 'lucide-react'
import { MOCK_CONVERSATIONS } from '@/lib/mock-data'
import { formatMessageTime, cn } from '@/lib/utils'

export default function MeddelandenPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meddelanden</h1>

      {MOCK_CONVERSATIONS.length === 0 ? (
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
        <div className="space-y-1">
          {MOCK_CONVERSATIONS.map((conv) => {
            const other = conv.participants.find((p) => p.id !== 'me')
            return (
              <Link
                key={conv.id}
                href={`/meddelanden/${conv.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {other?.avatar ? (
                    <img
                      src={other.avatar}
                      alt={other.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
                      {other?.name[0]}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                      'text-sm font-semibold',
                      conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                    )}>
                      {other?.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {conv.lastMessage ? formatMessageTime(conv.lastMessage.createdAt) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1">
                    re: {conv.listingTitle}
                  </p>
                  {conv.lastMessage && (
                    <p className={cn(
                      'text-sm truncate',
                      conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                    )}>
                      {conv.lastMessage.senderId === 'me' ? 'Du: ' : ''}
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>

                {/* Match badge */}
                {conv.mutualInterest && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded-full">
                    <Handshake size={12} strokeWidth={2} />
                    Match
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
