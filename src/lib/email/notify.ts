// Pure decision logic for new-message notifications (unit tested).

export interface RecipientCandidate {
  userId: string
  notifyEmail: boolean
  email: string | null | undefined
  /** Recipient already has an older unread message in this conversation. */
  hasEarlierUnread: boolean
}

export type SkipReason = 'sender' | 'opted_out' | 'no_email' | 'already_notified'

/**
 * Decides who gets a "Nytt meddelande" email. To avoid flooding someone
 * during a chat, we only notify on the *first* unread message in a
 * conversation — once they've read it, the next message notifies again.
 */
export function decideNotification(
  senderId: string,
  r: RecipientCandidate
): { send: true } | { send: false; reason: SkipReason } {
  if (r.userId === senderId) return { send: false, reason: 'sender' }
  if (!r.notifyEmail) return { send: false, reason: 'opted_out' }
  if (!r.email) return { send: false, reason: 'no_email' }
  if (r.hasEarlierUnread) return { send: false, reason: 'already_notified' }
  return { send: true }
}
