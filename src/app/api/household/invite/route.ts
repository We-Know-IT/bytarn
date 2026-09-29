import { NextResponse, type NextRequest } from 'next/server'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'
import { appBaseUrl, getSmtpConfig, householdInviteEmail, isValidEmail, sendEmail } from '@/lib/email'
import type { HouseholdInviteResponse } from '@/lib/email/types'

function json(body: HouseholdInviteResponse, status = 200) {
  return NextResponse.json(body, { status })
}

// Creates (or reuses) an invite via the invite_household_member RPC — which
// enforces that the caller is in a household — and emails the link. Without
// SMTP the invite still succeeds and the link is returned for manual sharing.
export async function POST(request: NextRequest) {
  if (!supabaseConfigured) return json({ ok: false, emailSent: false, error: 'Supabase är inte konfigurerat.' }, 503)

  let email: unknown
  try {
    email = (await request.json())?.email
  } catch {
    return json({ ok: false, emailSent: false, error: 'Ogiltig förfrågan.' }, 400)
  }
  if (!isValidEmail(email)) return json({ ok: false, emailSent: false, error: 'Ogiltig e-postadress.' }, 400)
  const to = email.trim().toLowerCase()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ ok: false, emailSent: false, error: 'Du måste vara inloggad.' }, 401)

  const { data: token, error } = await supabase.rpc('invite_household_member', { p_email: to })
  if (error || !token) {
    return json({ ok: false, emailSent: false, error: error?.message ?? 'Kunde inte skapa inbjudan.' }, 400)
  }

  const link = `${appBaseUrl(request.nextUrl.origin)}/familj/acceptera?token=${encodeURIComponent(String(token))}`

  const config = await getSmtpConfig()
  if (!config) {
    return json({ ok: true, emailSent: false, link, emailError: 'E-post är inte konfigurerad på sajten.' })
  }

  const [{ data: household }, { data: inviter }] = await Promise.all([
    supabase.from('households').select('name').maybeSingle(),
    supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
  ])

  const result = await sendEmail(
    {
      to,
      replyTo: user.email ?? undefined,
      ...householdInviteEmail({
        householdName: household?.name ?? '',
        inviterName: inviter?.name ?? user.email ?? '',
        link,
      }),
    },
    config
  )

  if (!result.ok) return json({ ok: true, emailSent: false, link, emailError: result.error })
  return json({ ok: true, emailSent: true, link })
}
