// Server-only: sends mail over SMTP with nodemailer.
import nodemailer from 'nodemailer'
import { getSmtpConfig, isGmailHost, type SmtpConfig } from './config'
import { headerSafe } from './templates'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export type SendEmailResult =
  | { ok: true; messageId: string; source: SmtpConfig['source'] }
  | { ok: false; reason: 'not_configured' | 'smtp_error'; error: string }

interface SmtpLikeError {
  code?: string
  responseCode?: number
  command?: string
  message?: string
}

/**
 * Turns a nodemailer/SMTP error into an actionable Swedish message.
 * Never includes credentials (nodemailer doesn't put them in errors, and
 * we don't add them).
 */
export function explainSmtpError(err: unknown, config?: Pick<SmtpConfig, 'host' | 'port' | 'secure'>): string {
  const e = (err ?? {}) as SmtpLikeError
  const raw = (e.message ?? String(err)).slice(0, 300)
  const gmail = config ? isGmailHost(config.host) : /gmail|google/i.test(raw)
  const where = config ? `${config.host}:${config.port}` : 'SMTP-servern'

  if (e.code === 'EAUTH' || e.responseCode === 535 || e.responseCode === 534 || /\b53[45]\b/.test(raw)) {
    return gmail
      ? 'Gmail nekade inloggningen (535). Använd ett applösenord – inte ditt vanliga Google-lösenord. ' +
          'Aktivera tvåstegsverifiering, skapa ett applösenord på myaccount.google.com/apppasswords och ' +
          'kontrollera att användarnamnet är hela Gmail-adressen.'
      : `Inloggningen nekades av ${where}. Kontrollera användarnamn och lösenord. (${raw})`
  }
  if (/wrong version number|ssl3_get_record|tls_validate_record_header|EPROTO/i.test(raw) || e.code === 'EPROTO') {
    return `Fel krypteringsläge för ${where}. Port 465 kräver SSL/TLS (secure), port 587 kräver STARTTLS.`
  }
  if (e.code === 'ETIMEDOUT' || e.code === 'ECONNECTION' || e.code === 'ESOCKET' || e.code === 'ECONNREFUSED' || e.code === 'EDNS' || /ENOTFOUND|ECONNREFUSED|timeout/i.test(raw)) {
    return `Kunde inte ansluta till ${where}. Kontrollera servernamn och port, och att servern tillåter utgående SMTP. (${raw})`
  }
  if (e.code === 'EENVELOPE' || e.responseCode === 550 || e.responseCode === 553 || e.responseCode === 501) {
    return gmail
      ? `Gmail godtog inte avsändaren eller mottagaren. Avsändaradressen måste vara Gmail-kontot eller ett verifierat ”Skicka e-post som”-alias. (${raw})`
      : `Servern godtog inte avsändaren eller mottagaren. (${raw})`
  }
  return `Mejlet kunde inte skickas: ${raw}`
}

function formatFrom(config: SmtpConfig): string {
  const name = headerSafe(config.fromName).replace(/"/g, "'")
  return name ? `"${name}" <${config.fromEmail}>` : config.fromEmail
}

export function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    // Port 587 = STARTTLS: refuse to continue in plaintext if the upgrade fails.
    requireTLS: !config.secure && config.port === 587,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })
}

/**
 * Sends one email. Returns a result instead of throwing, so callers can
 * decide whether a failed mail matters (e.g. an invite still succeeds).
 * Pass `config` to skip the lookup (useful when sending several).
 */
export async function sendEmail(input: SendEmailInput, config?: SmtpConfig | null): Promise<SendEmailResult> {
  const cfg = config === undefined ? await getSmtpConfig() : config
  if (!cfg) return { ok: false, reason: 'not_configured', error: 'E-post (SMTP) är inte konfigurerad.' }

  try {
    const info = await createTransport(cfg).sendMail({
      from: formatFrom(cfg),
      to: input.to,
      subject: headerSafe(input.subject),
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    })
    return { ok: true, messageId: info.messageId, source: cfg.source }
  } catch (err) {
    const error = explainSmtpError(err, cfg)
    // Log code + message only; never the config (it holds the password).
    const e = err as SmtpLikeError
    console.error(`E-post misslyckades (${cfg.host}:${cfg.port}, ${e.code ?? '?'}/${e.responseCode ?? '?'}):`, e.message)
    return { ok: false, reason: 'smtp_error', error }
  }
}
