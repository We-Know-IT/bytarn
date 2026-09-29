import { NextResponse, type NextRequest } from 'next/server'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { appBaseUrl, getSmtpConfig, newMessageEmail, sendEmail } from '@/lib/email'
import { decideNotification, type SkipReason } from '@/lib/email/notify'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Called fire-and-forget by sendMessage() after a message is inserted.
// Emails the other participants, unless they opted out or already have an
// unread message in this conversation (we only notify on the first one).
export async function POST(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.json({ sent: false, reason: 'not_configured' })

  let messageId: unknown
  try {
    messageId = (await request.json())?.messageId
  } catch {
    return NextResponse.json({ error: 'Ogiltig förfrågan.' }, { status: 400 })
  }
  if (typeof messageId !== 'string' || !UUID_RE.test(messageId)) {
    return NextResponse.json({ error: 'Ogiltigt meddelande-id.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Du måste vara inloggad.' }, { status: 401 })

  // RLS: only participants can see the message.
  const { data: message } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, image_url, created_at')
    .eq('id', messageId)
    .maybeSingle()
  if (!message) return NextResponse.json({ error: 'Meddelandet hittades inte.' }, { status: 404 })
  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: 'Du kan bara avisera om dina egna meddelanden.' }, { status: 403 })
  }

  const config = await getSmtpConfig()
  if (!config) return NextResponse.json({ sent: false, reason: 'smtp_not_configured' })

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ sent: false, reason: 'no_service_role' })
  }

  const conversationId = message.conversation_id as string
  const [{ data: participants }, { data: conversation }] = await Promise.all([
    admin.from('conversation_participants').select('user_id').eq('conversation_id', conversationId),
    admin.from('conversations').select('listings ( title )').eq('id', conversationId).maybeSingle(),
  ])
  const recipientIds = (participants ?? []).map((p) => p.user_id as string).filter((id) => id !== user.id)
  if (recipientIds.length === 0) return NextResponse.json({ sent: false, reason: 'no_recipients' })

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, notify_email')
    .in('id', [user.id, ...recipientIds])
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]))
  const senderName = (profileById.get(user.id)?.name as string | undefined) ?? 'En användare'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = (conversation as any)?.listings
  const listingTitle: string | null = (Array.isArray(listing) ? listing[0]?.title : listing?.title) ?? null

  const link = `${appBaseUrl(request.nextUrl.origin)}/meddelanden/${conversationId}`
  const content = newMessageEmail({
    senderName,
    content: message.content ?? '',
    hasImage: !!message.image_url,
    listingTitle,
    link,
  })

  const results = await Promise.all(
    recipientIds.map(async (recipientId): Promise<{ userId: string; sent: boolean; reason?: SkipReason | 'smtp_error' }> => {
      const profile = profileById.get(recipientId)
      const notifyEmail = profile?.notify_email !== false
      if (!notifyEmail) return { userId: recipientId, sent: false, reason: 'opted_out' }

      const [{ data: authUser }, { data: earlier }] = await Promise.all([
        admin.auth.admin.getUserById(recipientId),
        admin
          .from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .neq('sender_id', recipientId)
          .eq('read', false)
          .neq('id', message.id)
          .lt('created_at', message.created_at)
          .limit(1),
      ])

      const decision = decideNotification(user.id, {
        userId: recipientId,
        notifyEmail,
        email: authUser?.user?.email,
        hasEarlierUnread: (earlier ?? []).length > 0,
      })
      if (!decision.send) return { userId: recipientId, sent: false, reason: decision.reason }

      const result = await sendEmail({ to: authUser!.user!.email!, ...content }, config)
      return { userId: recipientId, sent: result.ok, reason: result.ok ? undefined : 'smtp_error' }
    })
  )

  const sentCount = results.filter((r) => r.sent).length
  return NextResponse.json({
    sent: sentCount > 0,
    sentCount,
    skipped: results.filter((r) => !r.sent).map((r) => r.reason),
  })
}
