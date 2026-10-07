// Server-only: reads SMTP credentials. Never import from client components.
import { createAdminClient } from '@/lib/supabase/admin'

export type SmtpSource = 'env' | 'database'

export interface SmtpConfig {
  host: string
  port: number
  /** true = implicit TLS (port 465). false = plain connection upgraded with STARTTLS (port 587). */
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
  source: SmtpSource
}

/** The row in `smtp_settings` (id = 1), as stored. */
export interface SmtpSettingsRow {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from_name: string
  from_email: string
  updated_at?: string
}

export const DEFAULT_FROM_NAME = 'Hyresvägen'

export const GMAIL_PRESET = { host: 'smtp.gmail.com', port: 465, secure: true } as const

export function isGmailHost(host: string): boolean {
  const h = host.trim().toLowerCase()
  return h === 'smtp.gmail.com' || h === 'smtp.googlemail.com' || h === 'smtp-relay.gmail.com'
}

/**
 * Google shows app passwords in four groups of four ("abcd efgh ijkl mnop").
 * The spaces aren't part of the password, so strip them for Gmail hosts —
 * and for anything that looks exactly like a grouped app password.
 */
export function normalizePassword(host: string, pass: string): string {
  if (isGmailHost(host) || /^[a-z]{4}(\s+[a-z]{4}){3}$/i.test(pass.trim())) {
    return pass.replace(/\s+/g, '')
  }
  return pass.trim()
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined
  return ['1', 'true', 'yes', 'ja', 'on'].includes(value.trim().toLowerCase())
}

type Env = Record<string, string | undefined>

/** True when any SMTP_* connection variable is set (then env "owns" the config). */
export function envSmtpPresent(env: Env = process.env): boolean {
  return !!(env.SMTP_HOST?.trim() || env.SMTP_USER?.trim() || env.SMTP_PASS?.trim())
}

/** SMTP config from environment variables, or null if host/user/pass are missing. */
export function smtpConfigFromEnv(env: Env = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim() ?? ''
  const user = env.SMTP_USER?.trim() ?? ''
  const rawPass = env.SMTP_PASS ?? ''
  if (!host || !user || !rawPass.trim()) return null

  const explicitSecure = parseBool(env.SMTP_SECURE)
  const parsedPort = Number.parseInt(env.SMTP_PORT ?? '', 10)
  const port =
    Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
      ? parsedPort
      : explicitSecure === false
        ? 587
        : 465
  const secure = explicitSecure ?? port === 465

  return {
    host,
    port,
    secure,
    user,
    pass: normalizePassword(host, rawPass),
    fromName: env.SMTP_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL?.trim() || user,
    source: 'env',
  }
}

export function smtpConfigFromRow(row: SmtpSettingsRow | null | undefined): SmtpConfig | null {
  if (!row) return null
  const host = row.host?.trim() ?? ''
  const user = row.username?.trim() ?? ''
  const pass = row.password ?? ''
  if (!host || !user || !pass) return null
  return {
    host,
    port: row.port,
    secure: row.secure,
    user,
    pass: normalizePassword(host, pass),
    fromName: row.from_name?.trim() || DEFAULT_FROM_NAME,
    fromEmail: row.from_email?.trim() || user,
    source: 'database',
  }
}

/** Reads the smtp_settings row with the service role. Returns null if missing or unreadable. */
export async function readSmtpSettingsRow(): Promise<SmtpSettingsRow | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('smtp_settings')
      .select('host, port, secure, username, password, from_name, from_email, updated_at')
      .eq('id', 1)
      .maybeSingle()
    if (error) {
      console.error('Kunde inte läsa smtp_settings:', error.message)
      return null
    }
    return (data as SmtpSettingsRow | null) ?? null
  } catch (err) {
    // Typically: SUPABASE_SERVICE_ROLE_KEY isn't set.
    console.error('Kunde inte läsa smtp_settings:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * The active SMTP configuration. SMTP_* env vars take precedence over the
 * database row; returns null when neither is complete. `source` on the
 * result says which one was used.
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  if (envSmtpPresent()) return smtpConfigFromEnv()
  return smtpConfigFromRow(await readSmtpSettingsRow())
}
