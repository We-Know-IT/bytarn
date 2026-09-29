import { isGmailHost } from './config'

const EMAIL_RE = /^[^@\s"<>,;]+@[^@\s"<>,;]+\.[^@\s"<>,;]+$/

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim())
}

export interface SmtpSettingsInput {
  host: string
  port: number
  secure: boolean
  username: string
  /** Empty string / undefined = keep the stored password. */
  password?: string
  fromName: string
  fromEmail: string
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** Validates the admin SMTP form body. */
export function validateSmtpInput(body: unknown): ValidationResult<SmtpSettingsInput> {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Ogiltig förfrågan.' }
  const b = body as Record<string, unknown>

  const host = str(b.host)
  if (!host) return { ok: false, error: 'Ange SMTP-server (värd).' }
  if (host.length > 255 || !/^[a-z0-9.-]+$/i.test(host)) {
    return { ok: false, error: 'SMTP-servern får bara innehålla bokstäver, siffror, punkter och bindestreck.' }
  }

  const port = typeof b.port === 'string' ? Number(b.port) : b.port
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: 'Porten måste vara ett heltal mellan 1 och 65535.' }
  }

  if (typeof b.secure !== 'boolean') return { ok: false, error: 'Välj SSL/TLS eller STARTTLS.' }

  const username = str(b.username)
  if (!username) return { ok: false, error: 'Ange användarnamn.' }
  if (username.length > 254) return { ok: false, error: 'Användarnamnet är för långt.' }
  if (isGmailHost(host) && !isValidEmail(username)) {
    return { ok: false, error: 'För Gmail ska användarnamnet vara hela e-postadressen, t.ex. namn@gmail.com.' }
  }

  if (b.password !== undefined && b.password !== null && typeof b.password !== 'string') {
    return { ok: false, error: 'Ogiltigt lösenord.' }
  }
  const password = typeof b.password === 'string' ? b.password : ''
  if (password.length > 512) return { ok: false, error: 'Lösenordet är för långt.' }

  const fromName = str(b.fromName)
  if (fromName.length > 100) return { ok: false, error: 'Avsändarnamnet får vara högst 100 tecken.' }
  if (/[\r\n<>"]/.test(fromName)) return { ok: false, error: 'Avsändarnamnet innehåller ogiltiga tecken.' }

  const fromEmail = str(b.fromEmail)
  if (fromEmail && !isValidEmail(fromEmail)) {
    return { ok: false, error: 'Avsändaradressen är inte en giltig e-postadress.' }
  }
  if (!fromEmail && !isValidEmail(username)) {
    return { ok: false, error: 'Ange en avsändaradress (användarnamnet är ingen e-postadress).' }
  }

  return { ok: true, value: { host, port, secure: b.secure, username, password, fromName, fromEmail } }
}
