// Branded Swedish email templates. Everything user-provided goes through escapeHtml().

export interface EmailContent {
  subject: string
  html: string
  text: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only http(s) links end up in href attributes. */
function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : '#'
}

/** Strips CR/LF so user text can't break out of a header like Subject. */
export function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

/** One-line preview of a message: whitespace collapsed, cut at a word boundary. */
export function snippet(content: string, max = 200): string {
  const flat = content.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

interface LayoutOptions {
  preheader: string
  heading: string
  bodyHtml: string
  cta?: { label: string; url: string }
  footerHtml?: string
}

function layout({ preheader, heading, bodyHtml, cta, footerHtml }: LayoutOptions): string {
  const button = cta
    ? `<tr><td style="padding:8px 0 24px">
        <a href="${safeUrl(cta.url)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">${escapeHtml(cta.label)}</a>
      </td></tr>
      <tr><td style="font-size:12px;color:#6b7280;padding-bottom:8px">Fungerar inte knappen? Kopiera länken:<br><a href="${safeUrl(cta.url)}" style="color:#059669;word-break:break-all">${escapeHtml(cta.url)}</a></td></tr>`
    : ''

  return `<!doctype html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="padding-bottom:16px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;height:32px;background:#059669;border-radius:9px;color:#ffffff;font-weight:700;text-align:center;font-size:16px">B</td>
          <td style="padding-left:10px;font-weight:700;font-size:18px;color:#111827">Bytaren</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #f3f4f6;border-radius:16px;padding:28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">${escapeHtml(heading)}</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#374151;padding-bottom:16px">${bodyHtml}</td></tr>
          ${button}
        </table>
      </td></tr>
      <tr><td style="font-size:12px;color:#9ca3af;padding:16px 4px;line-height:1.5">
        ${footerHtml ?? ''}${footerHtml ? '<br>' : ''}Bytaren – byt lägenhet enkelt och tryggt.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function householdInviteEmail(opts: {
  householdName: string
  inviterName: string
  link: string
}): EmailContent {
  const household = opts.householdName || 'ett hushåll'
  const inviter = opts.inviterName || 'En användare'
  const subject = headerSafe(`${inviter} har bjudit in dig till familjekontot ”${household}” på Bytaren`)
  const html = layout({
    preheader: `Gå med i ${household} och hantera era bytesannonser tillsammans.`,
    heading: 'Du har blivit inbjuden till ett familjekonto',
    bodyHtml: `<strong>${escapeHtml(inviter)}</strong> vill att du går med i familjekontot <strong>${escapeHtml(household)}</strong> på Bytaren.<br><br>
      I ett familjekonto kan alla medlemmar hantera varandras annonser – redigera, pausa, förnya och ta bort – så att ni kan sköta ert lägenhetsbyte tillsammans.`,
    cta: { label: 'Visa inbjudan', url: opts.link },
    footerHtml: 'Väntade du dig inte den här inbjudan? Då kan du ignorera mejlet.',
  })
  const text = `${inviter} har bjudit in dig till familjekontot "${household}" på Bytaren.

I ett familjekonto kan alla medlemmar hantera varandras annonser – redigera, pausa, förnya och ta bort.

Öppna inbjudan: ${opts.link}

Väntade du dig inte den här inbjudan? Då kan du ignorera mejlet.`
  return { subject, html, text }
}

export function newMessageEmail(opts: {
  senderName: string
  content: string
  hasImage?: boolean
  listingTitle?: string | null
  link: string
}): EmailContent {
  const sender = opts.senderName || 'Någon'
  const preview = snippet(opts.content) || (opts.hasImage ? '[Bild]' : '')
  const about = opts.listingTitle ? ` om ”${opts.listingTitle}”` : ''
  const subject = headerSafe(`Nytt meddelande från ${sender}`)
  const html = layout({
    preheader: preview,
    heading: `Nytt meddelande från ${sender}`,
    bodyHtml: `${escapeHtml(sender)} har skickat ett meddelande till dig${escapeHtml(about)}:
      <div style="margin-top:12px;padding:12px 14px;background:#f9fafb;border-left:3px solid #059669;border-radius:8px;color:#111827">${escapeHtml(preview)}</div>`,
    cta: { label: 'Svara i Bytaren', url: opts.link },
    footerHtml:
      'Du får det här mejlet eftersom du har e-postaviseringar påslagna. Vi mejlar bara om det första olästa meddelandet i varje konversation.',
  })
  const text = `${sender} har skickat ett meddelande till dig${about}:

"${preview}"

Svara: ${opts.link}`
  return { subject, html, text }
}

export function testEmail(opts: { host: string; source: string }): EmailContent {
  const when = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
  const subject = 'Testmejl från Bytaren'
  const html = layout({
    preheader: 'SMTP-inställningarna fungerar.',
    heading: 'SMTP fungerar!',
    bodyHtml: `Det här är ett testmejl från Bytaren. Om du läser det här är e-postinställningarna korrekta.<br><br>
      <span style="color:#6b7280;font-size:13px">Server: ${escapeHtml(opts.host)} · Källa: ${escapeHtml(opts.source)} · Skickat: ${escapeHtml(when)}</span>`,
  })
  const text = `Det här är ett testmejl från Bytaren. Om du läser det här är e-postinställningarna korrekta.

Server: ${opts.host} · Källa: ${opts.source} · Skickat: ${when}`
  return { subject, html, text }
}
