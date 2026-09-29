import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_FROM_NAME,
  GMAIL_PRESET,
  envSmtpPresent,
  normalizePassword,
  readSmtpSettingsRow,
  smtpConfigFromEnv,
  smtpConfigFromRow,
  validateSmtpInput,
} from '@/lib/email'
import type { SmtpSettingsResponse } from '@/lib/email/types'
import { requireAdmin } from '../_lib/require-admin'

async function currentSettings(): Promise<SmtpSettingsResponse> {
  if (envSmtpPresent()) {
    const env = smtpConfigFromEnv()
    return {
      source: 'env',
      envOverride: true,
      envIncomplete: !env,
      host: env?.host ?? process.env.SMTP_HOST ?? '',
      port: env?.port ?? GMAIL_PRESET.port,
      secure: env?.secure ?? true,
      username: env?.user ?? process.env.SMTP_USER ?? '',
      hasPassword: !!env?.pass || !!process.env.SMTP_PASS,
      fromName: env?.fromName ?? DEFAULT_FROM_NAME,
      fromEmail: env?.fromEmail ?? process.env.SMTP_FROM_EMAIL ?? '',
      updatedAt: null,
    }
  }
  const row = await readSmtpSettingsRow()
  return {
    source: smtpConfigFromRow(row) ? 'database' : 'none',
    envOverride: false,
    envIncomplete: false,
    host: row?.host ?? GMAIL_PRESET.host,
    port: row?.port ?? GMAIL_PRESET.port,
    secure: row?.secure ?? GMAIL_PRESET.secure,
    username: row?.username ?? '',
    hasPassword: !!row?.password,
    fromName: row?.from_name ?? DEFAULT_FROM_NAME,
    fromEmail: row?.from_email ?? '',
    updatedAt: row?.updated_at ?? null,
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response
  return NextResponse.json(await currentSettings())
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  if (envSmtpPresent()) {
    return NextResponse.json(
      { error: 'SMTP styrs av miljövariabler (SMTP_*) och kan inte ändras här.' },
      { status: 409 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ogiltig JSON.' }, { status: 400 })
  }
  const parsed = validateSmtpInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  const row: Record<string, unknown> = {
    id: 1,
    host: input.host,
    port: input.port,
    secure: input.secure,
    username: input.username,
    from_name: input.fromName || DEFAULT_FROM_NAME,
    from_email: input.fromEmail,
    updated_at: new Date().toISOString(),
    updated_by: auth.user.id,
  }
  // Empty password = keep the stored one (the form never receives it).
  if (input.password && input.password.trim()) {
    row.password = normalizePassword(input.host, input.password)
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('smtp_settings').upsert(row, { onConflict: 'id' })
    if (error) {
      console.error('Kunde inte spara smtp_settings:', error.message)
      return NextResponse.json({ error: 'Kunde inte spara inställningarna.' }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kunde inte spara inställningarna.' },
      { status: 503 }
    )
  }

  return NextResponse.json(await currentSettings())
}
