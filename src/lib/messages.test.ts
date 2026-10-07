import { describe, expect, it } from 'vitest'
import {
  addOptimistic,
  applyMessageToConversations,
  clearConversationUnread,
  compareMessages,
  confirmOptimistic,
  countUnread,
  lastOwnConfirmed,
  latestConfirmedAt,
  markReadLocally,
  mergeMessages,
  missingMessages,
  rowToConversation,
  rowToMessage,
  setLocalStatus,
  sortConversations,
  unreadIncoming,
  type ChatMessage,
  type ConversationSummary,
  type LocalChatMessage,
} from './messages'

const ME = 'me'
const OTHER = 'other'

function msg(id: string, createdAt: string, over: Partial<LocalChatMessage> = {}): LocalChatMessage {
  return { id, conversationId: 'c1', senderId: OTHER, content: id, read: false, createdAt, ...over }
}

function pending(localId: string, content = 'hej'): LocalChatMessage {
  return msg(localId, '2026-10-07T12:00:00.000Z', { localId, status: 'pending', senderId: ME, content })
}

describe('rowToMessage', () => {
  it('maps snake_case rows and normalises nulls', () => {
    expect(
      rowToMessage({
        id: 'm1', conversation_id: 'c1', sender_id: 'u1', content: null, image_url: null, read: null,
        created_at: '2026-10-07T10:00:00Z',
      })
    ).toEqual({
      id: 'm1', conversationId: 'c1', senderId: 'u1', content: '', imageUrl: undefined, read: false,
      createdAt: '2026-10-07T10:00:00Z',
    })
  })
})

describe('mergeMessages', () => {
  it('dedupes by id and sorts chronologically', () => {
    const a = msg('a', '2026-10-07T10:00:00Z')
    const b = msg('b', '2026-10-07T10:01:00Z')
    const c = msg('c', '2026-10-07T10:02:00Z')
    const out = mergeMessages([c, a], [b, a, c])
    expect(out.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('returns the same array when nothing changes (no re-render)', () => {
    const list = [msg('a', '2026-10-07T10:00:00Z')]
    expect(mergeMessages(list, [msg('a', '2026-10-07T10:00:00Z')])).toBe(list)
    expect(mergeMessages(list, [])).toBe(list)
  })

  it('never turns a read message back into unread (late INSERT echo)', () => {
    const read = msg('a', '2026-10-07T10:00:00Z', { read: true })
    const out = mergeMessages([read], [msg('a', '2026-10-07T10:00:00Z', { read: false })])
    expect(out[0].read).toBe(true)
  })

  it('applies read receipts from UPDATE events', () => {
    const out = mergeMessages([msg('a', '2026-10-07T10:00:00Z')], [msg('a', '2026-10-07T10:00:00Z', { read: true })])
    expect(out[0].read).toBe(true)
  })

  it('keeps pending messages after confirmed ones regardless of clock skew', () => {
    const p = pending('local-1')
    const late = msg('late', '2026-10-07T13:00:00Z')
    const out = mergeMessages([p], [late])
    expect(out.map((m) => m.id)).toEqual(['late', 'local-1'])
  })
})

describe('optimistic sending', () => {
  const saved: ChatMessage = {
    id: 'srv-1', conversationId: 'c1', senderId: ME, content: 'hej', read: false, createdAt: '2026-10-07T12:00:01Z',
  }

  it('replaces the pending message with the stored row and keeps its local key', () => {
    const list = addOptimistic([msg('a', '2026-10-07T10:00:00Z')], pending('local-1'))
    const out = confirmOptimistic(list, 'local-1', saved)
    expect(out.map((m) => m.id)).toEqual(['a', 'srv-1'])
    expect(out[1].status).toBeUndefined()
    expect(out[1].localId).toBe('local-1')
  })

  it('does not duplicate when the realtime echo arrived before the insert returned', () => {
    let list = addOptimistic([], pending('local-1'))
    list = mergeMessages(list, [saved]) // echo
    expect(list).toHaveLength(2)
    const out = confirmOptimistic(list, 'local-1', saved)
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('srv-1')
  })

  it('does not duplicate when the echo arrives after confirmation', () => {
    const list = confirmOptimistic(addOptimistic([], pending('local-1')), 'local-1', saved)
    expect(mergeMessages(list, [saved])).toHaveLength(1)
  })

  it('marks failed and back to pending for retry', () => {
    const list = addOptimistic([], pending('local-1'))
    const failed = setLocalStatus(list, 'local-1', 'failed')
    expect(failed[0].status).toBe('failed')
    expect(setLocalStatus(failed, 'local-1', 'pending')[0].status).toBe('pending')
  })

  it('does not touch confirmed messages when setting status', () => {
    const list = confirmOptimistic(addOptimistic([], pending('local-1')), 'local-1', saved)
    expect(setLocalStatus(list, 'local-1', 'failed')[0].status).toBeUndefined()
  })
})

describe('reconnect gap filling', () => {
  it('uses the newest confirmed timestamp, ignoring local messages', () => {
    const list = [
      msg('a', '2026-10-07T10:00:00Z'),
      msg('b', '2026-10-07T10:05:00Z'),
      pending('local-1'),
    ]
    expect(latestConfirmedAt(list)).toBe('2026-10-07T10:05:00Z')
    expect(latestConfirmedAt([pending('x')])).toBeNull()
    expect(latestConfirmedAt([])).toBeNull()
  })

  it('finds only messages the list does not have', () => {
    const list = [msg('a', '2026-10-07T10:00:00Z'), msg('b', '2026-10-07T10:05:00Z')]
    const fetched = [msg('b', '2026-10-07T10:05:00Z'), msg('c', '2026-10-07T10:06:00Z')]
    expect(missingMessages(list, fetched).map((m) => m.id)).toEqual(['c'])
    expect(mergeMessages(list, fetched).map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('unread helpers', () => {
  const list = [
    msg('a', '2026-10-07T10:00:00Z'),
    msg('b', '2026-10-07T10:01:00Z', { read: true }),
    msg('c', '2026-10-07T10:02:00Z', { senderId: ME }),
    msg('d', '2026-10-07T10:03:00Z'),
  ]

  it('counts unread messages from others only', () => {
    expect(countUnread(list, ME)).toBe(2)
    expect(unreadIncoming(list, ME)).toEqual(['a', 'd'])
  })

  it('ignores local messages', () => {
    expect(unreadIncoming([...list, pending('p')], ME)).toEqual(['a', 'd'])
  })

  it('marks read locally and keeps identity when nothing changes', () => {
    const out = markReadLocally(list, ['a', 'd'])
    expect(countUnread(out, ME)).toBe(0)
    expect(markReadLocally(out, ['a'])).toBe(out)
  })

  it('finds the last confirmed own message for "Läst"', () => {
    const withPending = [...list, pending('p')]
    expect(lastOwnConfirmed(withPending, ME)?.id).toBe('c')
    expect(lastOwnConfirmed([msg('x', '2026-10-07T10:00:00Z')], ME)).toBeUndefined()
  })
})

describe('compareMessages', () => {
  it('breaks timestamp ties by id for a stable order', () => {
    const t = '2026-10-07T10:00:00Z'
    expect([msg('b', t), msg('a', t)].sort(compareMessages).map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('inbox', () => {
  function conv(id: string, last: string | null, over: Partial<ConversationSummary> = {}): ConversationSummary {
    return {
      id,
      listingId: null,
      listingTitle: 'L',
      other: { id: OTHER, name: 'Anna' },
      lastMessage: last ? { id: `${id}-last`, content: 'x', senderId: OTHER, createdAt: last } : null,
      unreadMessageIds: [],
      unreadCount: 0,
      mutualInterest: false,
      createdAt: '2026-10-01T00:00:00Z',
      ...over,
    }
  }

  const list = sortConversations([
    conv('c1', '2026-10-07T09:00:00Z'),
    conv('c2', '2026-10-07T10:00:00Z'),
    conv('c3', null, { createdAt: '2026-10-07T08:00:00Z' }),
  ])

  it('sorts by latest activity, falling back to creation time', () => {
    expect(list.map((c) => c.id)).toEqual(['c2', 'c1', 'c3'])
  })

  it('moves a conversation to the top with a new incoming message and counts it unread', () => {
    const m = msg('n1', '2026-10-07T11:00:00Z', { conversationId: 'c3' })
    const out = applyMessageToConversations(list, m, ME)!
    expect(out.map((c) => c.id)).toEqual(['c3', 'c2', 'c1'])
    expect(out[0].lastMessage?.id).toBe('n1')
    expect(out[0].unreadCount).toBe(1)
  })

  it('does not count my own messages or double-count repeated events', () => {
    const mine = msg('n1', '2026-10-07T11:00:00Z', { conversationId: 'c1', senderId: ME })
    expect(applyMessageToConversations(list, mine, ME)!.find((c) => c.id === 'c1')!.unreadCount).toBe(0)
    const theirs = msg('n2', '2026-10-07T11:00:00Z', { conversationId: 'c1' })
    let out = applyMessageToConversations(list, theirs, ME)!
    out = applyMessageToConversations(out, theirs, ME)!
    expect(out.find((c) => c.id === 'c1')!.unreadCount).toBe(1)
  })

  it('drops the unread count on a read UPDATE', () => {
    const m = msg('n1', '2026-10-07T11:00:00Z', { conversationId: 'c1' })
    let out = applyMessageToConversations(list, m, ME)!
    out = applyMessageToConversations(out, { ...m, read: true }, ME)!
    expect(out.find((c) => c.id === 'c1')!.unreadCount).toBe(0)
  })

  it('keeps the last message when an older message is updated', () => {
    const old = msg('old', '2026-10-07T08:00:00Z', { conversationId: 'c2', read: true })
    const out = applyMessageToConversations(list, old, ME)!
    expect(out.find((c) => c.id === 'c2')!.lastMessage?.id).toBe('c2-last')
  })

  it('returns null for an unknown conversation (caller refetches)', () => {
    expect(applyMessageToConversations(list, msg('z', '2026-10-07T11:00:00Z', { conversationId: 'new' }), ME)).toBeNull()
  })

  it('clears unread for one conversation', () => {
    const withUnread = applyMessageToConversations(list, msg('n', '2026-10-07T11:00:00Z', { conversationId: 'c1' }), ME)!
    expect(clearConversationUnread(withUnread, 'c1').every((c) => c.unreadCount === 0)).toBe(true)
  })

  it('builds a summary from a joined row', () => {
    const summary = rowToConversation(
      {
        id: 'c1',
        listing_id: 'l1',
        created_at: '2026-10-01T00:00:00Z',
        listings: { id: 'l1', title: 'Trea på Söder', images: ['img.jpg'] },
        conversation_participants: [
          { user_id: ME, profiles: { id: ME, name: 'Jag', avatar_url: null } },
          { user_id: OTHER, profiles: { id: OTHER, name: 'Anna', avatar_url: 'a.jpg' } },
        ],
        messages: [
          { id: 'm2', conversation_id: 'c1', sender_id: OTHER, content: 'senast', image_url: null, read: false, created_at: '2026-10-07T10:00:00Z' },
          { id: 'm1', conversation_id: 'c1', sender_id: ME, content: 'först', image_url: null, read: false, created_at: '2026-10-07T09:00:00Z' },
        ],
      },
      ME,
      new Set([OTHER])
    )
    expect(summary.lastMessage?.content).toBe('senast')
    expect(summary.unreadMessageIds).toEqual(['m2'])
    expect(summary.unreadCount).toBe(1)
    expect(summary.other).toEqual({ id: OTHER, name: 'Anna', avatarUrl: 'a.jpg' })
    expect(summary.mutualInterest).toBe(true)
    expect(summary.listingImage).toBe('img.jpg')
  })
})
