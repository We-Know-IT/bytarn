// Client-safe shared types (no server imports here).

/** GET/PUT /api/admin/smtp response. The password itself is never returned. */
export interface SmtpSettingsResponse {
  source: 'env' | 'database' | 'none'
  /** True when SMTP_* env vars are set — they override the form, which is then read-only. */
  envOverride: boolean
  /** Env vars are present but host/user/pass isn't complete. */
  envIncomplete: boolean
  host: string
  port: number
  secure: boolean
  username: string
  hasPassword: boolean
  fromName: string
  fromEmail: string
  updatedAt: string | null
}

/** POST /api/household/invite response. */
export interface HouseholdInviteResponse {
  ok: boolean
  emailSent: boolean
  link?: string
  /** Why the email wasn't sent (SMTP not configured / SMTP error). */
  emailError?: string
  error?: string
}
