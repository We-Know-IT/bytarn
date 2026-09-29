import { NextResponse, type NextRequest } from 'next/server'
import { getSmtpConfig, isValidEmail, sendEmail, testEmail } from '@/lib/email'
import { requireAdmin } from '../../_lib/require-admin'

// Sends a test email with the active SMTP config (env or database).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  let body: { to?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Empty body is fine — defaults to the admin's own address.
  }
  const to = typeof body.to === 'string' && body.to.trim() ? body.to.trim() : auth.user.email ?? ''
  if (!isValidEmail(to)) {
    return NextResponse.json({ ok: false, error: 'Ange en giltig mottagaradress.' }, { status: 400 })
  }

  const config = await getSmtpConfig()
  if (!config) {
    return NextResponse.json(
      { ok: false, error: 'SMTP är inte konfigurerat ännu. Fyll i och spara inställningarna först.' },
      { status: 400 }
    )
  }

  const result = await sendEmail(
    { to, ...testEmail({ host: config.host, source: config.source === 'env' ? 'miljövariabler' : 'databasen' }) },
    config
  )
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  return NextResponse.json({ ok: true, to, source: config.source })
}
