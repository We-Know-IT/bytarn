import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { fetchMutualMatchUserIds } from '@/lib/interests'

export interface ConversationSummary {
  id: string
  listingId: string | null
  listingTitle: string
  listingImage?: string
  other: { id: string; name: string; avatarUrl?: string } | null
  lastMessage: { content: string; senderId: string; createdAt: string } | null
  unreadCount: number
  mutualInterest: boolean
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
         messages ( id, sender_id, content, read, created_at )`
      )
      .in('id', convIds),
    fetchMutualMatchUserIds(userId),
  ])

  if (error || !data) {
    console.error('Kunde inte hämta konversationer', error)
    return []
  }

  return data
    .map((row: any) => {
      const otherParticipant = row.conversation_participants.find((p: any) => p.user_id !== userId)
      const messages = [...row.messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const last = messages[messages.length - 1]
      const unreadCount = messages.filter((m) => m.sender_id !== userId && !m.read).length

      return {
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listings?.title ?? 'Borttagen annons',
        listingImage: row.listings?.images?.[0],
        other: otherParticipant
          ? {
              id: otherParticipant.profiles.id,
              name: otherParticipant.profiles.name,
              avatarUrl: otherParticipant.profiles.avatar_url ?? undefined,
            }
          : null,
        lastMessage: last
          ? { content: last.content, senderId: last.sender_id, createdAt: last.created_at }
          : null,
        unreadCount,
        mutualInterest: otherParticipant ? mutualUserIds.has(otherParticipant.profiles.id) : false,
        _sortKey: last?.created_at ?? row.created_at,
      }
    })
    .sort((a: any, b: any) => new Date(b._sortKey).getTime() - new Date(a._sortKey).getTime())
}

export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!supabaseConfigured) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, image_url, read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    console.error('Kunde inte hämta meddelanden', error)
    return []
  }
  return data.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  }))
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  imageUrl?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content, image_url: imageUrl })
  if (error) throw error
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('read', false)
  if (error) console.error('Kunde inte markera som läst', error)
}

// Finds an existing 1:1 conversation about this listing between the two
// users, or creates one. Participants are added as two separate inserts —
// RLS only lets you add yourself, or add someone else once you're already
// a participant, so the second insert must happen after the first commits.
export async function getOrCreateConversation(
  listingId: string,
  userId: string,
  otherUserId: string
): Promise<string> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('conversations')
    .select('id, conversation_participants(user_id)')
    .eq('listing_id', listingId)

  const match = (existing ?? []).find((c: any) => {
    const ids = c.conversation_participants.map((p: any) => p.user_id)
    return ids.includes(userId) && ids.includes(otherUserId)
  })
  if (match) return match.id

  const { data: conv, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId })
    .select('id')
    .single()
  if (error || !conv) throw error ?? new Error('Kunde inte starta konversationen.')

  const { error: selfError } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: conv.id, user_id: userId })
  if (selfError) throw selfError

  const { error: otherError } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: conv.id, user_id: otherUserId })
  if (otherError) throw otherError

  return conv.id
}
