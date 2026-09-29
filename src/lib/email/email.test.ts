import { describe, expect, it } from 'vitest'
import { envSmtpPresent, normalizePassword, smtpConfigFromEnv, smtpConfigFromRow } from './config'
import { explainSmtpError } from './send'
import { escapeHtml, householdInviteEmail, newMessageEmail, snippet } from './templates'
import { isValidEmail, validateSmtpInput } from './validate'
import { decideNotification } from './notify'
import { appBaseUrl } from './url'

describe('smtpConfigFromEnv', () => {
  it('returns null unless host, user and pass are all set', () => {
    expect(smtpConfigFromEnv({})).toBeNull()
    expect(smtpConfigFromEnv({ SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'a@gmail.com' })).toBeNull()
    expect(envSmtpPresent({ SMTP_PORT: '465' })).toBe(false)
    expect(envSmtpPresent({ SMTP_HOST: 'smtp.gmail.com' })).toBe(true)
  })

  it('applies Gmail-friendly defaults and strips app password spaces', () => {
    const cfg = smtpConfigFromEnv({
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_USER: 'anna@gmail.com',
      SMTP_PASS: 'abcd efgh ijkl mnop',
    })
    expect(cfg).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: 'anna@gmail.com',
      pass: 'abcdefghijklmnop',
      fromName: 'Bytaren',
      fromEmail: 'anna@gmail.com',
      source: 'env',
    })
  })

  it('infers STARTTLS from port 587 and respects explicit values', () => {
    const base = { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'u', SMTP_PASS: 'p w' }
    expect(smtpConfigFromEnv({ ...base, SMTP_PORT: '587' })).toMatchObject({ port: 587, secure: false, pass: 'p w' })
    expect(smtpConfigFromEnv({ ...base, SMTP_SECURE: 'false' })).toMatchObject({ port: 587, secure: false })
    expect(
      smtpConfigFromEnv({ ...base, SMTP_PORT: '2525', SMTP_SECURE: 'true', SMTP_FROM_EMAIL: 'no-reply@example.com' })
    ).toMatchObject({ port: 2525, secure: true, fromEmail: 'no-reply@example.com' })
  })
})

describe('smtpConfigFromRow', () => {
  it('requires a password and falls back to username as sender', () => {
    const row = { host: 'smtp.gmail.com', port: 465, secure: true, username: 'a@gmail.com', password: '', from_name: '', from_email: '' }
    expect(smtpConfigFromRow(row)).toBeNull()
    expect(smtpConfigFromRow({ ...row, password: 'abcd efgh ijkl mnop' })).toMatchObject({
      pass: 'abcdefghijklmnop',
      fromEmail: 'a@gmail.com',
      fromName: 'Bytaren',
      source: 'database',
    })
  })
})

describe('normalizePassword', () => {
  it('only strips inner spaces for Gmail or grouped app passwords', () => {
    expect(normalizePassword('smtp.gmail.com', ' ab cd ')).toBe('abcd')
    expect(normalizePassword('mail.example.com', 'abcd efgh ijkl mnop')).toBe('abcdefghijklmnop')
    expect(normalizePassword('mail.example.com', ' my pass ')).toBe('my pass')
  })
})

describe('validateSmtpInput', () => {
  const valid = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    username: 'anna@gmail.com',
    password: '',
    fromName: 'Bytaren',
    fromEmail: '',
  }

  it('accepts a Gmail config with empty password (keep existing)', () => {
    expect(validateSmtpInput(valid)).toEqual({ ok: true, value: valid })
  })

  it('rejects bad ports, hosts and emails', () => {
    expect(validateSmtpInput({ ...valid, port: 0 }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, port: 70000 }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, port: 46.5 }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, host: 'smtp gmail' }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, username: 'anna' }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, fromEmail: 'nope' }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, fromName: 'Evil\r\nBcc: x@y.z' }).ok).toBe(false)
    expect(validateSmtpInput({ ...valid, secure: 'yes' }).ok).toBe(false)
    expect(validateSmtpInput(null).ok).toBe(false)
  })

  it('accepts port as a numeric string', () => {
    expect(validateSmtpInput({ ...valid, port: '587', secure: false })).toMatchObject({ ok: true, value: { port: 587 } })
  })
})

describe('isValidEmail', () => {
  it('checks basic shape', () => {
    expect(isValidEmail('a@b.se')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a b@c.se')).toBe(false)
    expect(isValidEmail(42)).toBe(false)
  })
})

describe('templates', () => {
  it('escapes HTML', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })

  it('escapes user content in the invite email', () => {
    const mail = householdInviteEmail({
      householdName: '<script>alert(1)</script>',
      inviterName: 'Anna & Bo',
      link: 'https://bytaren.se/familj/acceptera?token=abc',
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('Anna &amp; Bo')
    expect(mail.html).toContain('href="https://bytaren.se/familj/acceptera?token=abc"')
    expect(mail.text).toContain('https://bytaren.se/familj/acceptera?token=abc')
  })

  it('keeps the subject on one line and never links to non-http URLs', () => {
    const mail = newMessageEmail({ senderName: 'Eve\r\nBcc: x', content: 'Hej', link: 'javascript:alert(1)' })
    expect(mail.subject).toBe('Nytt meddelande från Eve Bcc: x')
    expect(mail.html).not.toContain('href="javascript:')
  })

  it('uses [Bild] for image-only messages', () => {
    const mail = newMessageEmail({ senderName: 'Anna', content: '', hasImage: true, link: 'https://x.se' })
    expect(mail.text).toContain('"[Bild]"')
  })

  it('snippet collapses whitespace and truncates on a word', () => {
    expect(snippet('  hej\n\n  där ')).toBe('hej där')
    const long = 'ord '.repeat(100)
    const s = snippet(long, 50)
    expect(s.length).toBeLessThanOrEqual(51)
    expect(s.endsWith('ord…')).toBe(true)
  })
})

describe('explainSmtpError', () => {
  it('explains Gmail 535 with app password guidance', () => {
    const msg = explainSmtpError(
      { code: 'EAUTH', responseCode: 535, message: 'Invalid login: 535-5.7.8 Username and Password not accepted' },
      { host: 'smtp.gmail.com', port: 465, secure: true }
    )
    expect(msg).toContain('applösenord')
    expect(msg).toContain('myaccount.google.com/apppasswords')
  })

  it('explains TLS mode mismatch and connection failures', () => {
    const cfg = { host: 'smtp.gmail.com', port: 587, secure: true }
    expect(explainSmtpError({ code: 'ESOCKET', message: 'ssl3_get_record:wrong version number' }, cfg)).toContain('STARTTLS')
    expect(explainSmtpError({ code: 'ETIMEDOUT', message: 'Connection timeout' }, cfg)).toContain('Kunde inte ansluta')
  })
})

describe('decideNotification', () => {
  const r = { userId: 'b', notifyEmail: true, email: 'b@x.se', hasEarlierUnread: false }
  it('notifies only on the first unread message for opted-in recipients', () => {
    expect(decideNotification('a', r)).toEqual({ send: true })
    expect(decideNotification('b', r)).toEqual({ send: false, reason: 'sender' })
    expect(decideNotification('a', { ...r, notifyEmail: false })).toEqual({ send: false, reason: 'opted_out' })
    expect(decideNotification('a', { ...r, email: null })).toEqual({ send: false, reason: 'no_email' })
    expect(decideNotification('a', { ...r, hasEarlierUnread: true })).toEqual({ send: false, reason: 'already_notified' })
  })
})

describe('appBaseUrl', () => {
  it('prefers NEXT_PUBLIC_APP_URL and trims trailing slashes', () => {
    expect(appBaseUrl('http://localhost:3000', { NEXT_PUBLIC_APP_URL: 'https://bytaren.se/' })).toBe('https://bytaren.se')
    expect(appBaseUrl('http://localhost:3000', {})).toBe('http://localhost:3000')
  })
})
