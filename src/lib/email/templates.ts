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

/** Where e-mail alerts are turned on and off. */
export const NOTIFICATION_SETTINGS_PATH = '/mina-sidor?flik=konto'

/**
 * Absolute link to the notification settings. Uses `settingsLink` when
 * given, else the origin of the e-mail's main link.
 */
export function settingsUrl(link: string, settingsLink?: string): string {
  if (settingsLink) return settingsLink
  try {
    return new URL(NOTIFICATION_SETTINGS_PATH, link).toString()
  } catch {
    return NOTIFICATION_SETTINGS_PATH
  }
}

/** The "how to turn this off" footer every alert e-mail carries. */
function optOutFooter(url: string): { html: string; text: string } {
  return {
    html: `Vill du inte få de här mejlen? <a href="${safeUrl(url)}" style="color:#6b7280">Stäng av dem under Mina sidor → Konto</a>.`,
    text: `Vill du inte få de här mejlen? Stäng av dem under Mina sidor → Konto: ${url}`,
  }
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
          <td style="padding-left:10px;font-weight:700;font-size:18px;color:#111827">Hyresvägen</td>
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
        ${footerHtml ?? ''}${footerHtml ? '<br>' : ''}Hyresvägen – byt lägenhet enkelt och tryggt.
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
  const subject = headerSafe(`${inviter} har bjudit in dig till familjekontot ”${household}” på Hyresvägen`)
  const html = layout({
    preheader: `Gå med i ${household} och hantera era bytesannonser tillsammans.`,
    heading: 'Du har blivit inbjuden till ett familjekonto',
    bodyHtml: `<strong>${escapeHtml(inviter)}</strong> vill att du går med i familjekontot <strong>${escapeHtml(household)}</strong> på Hyresvägen.<br><br>
      I ett familjekonto kan alla medlemmar hantera varandras annonser – redigera, pausa, förnya och ta bort – så att ni kan sköta ert lägenhetsbyte tillsammans.`,
    cta: { label: 'Visa inbjudan', url: opts.link },
    footerHtml: 'Väntade du dig inte den här inbjudan? Då kan du ignorera mejlet.',
  })
  const text = `${inviter} har bjudit in dig till familjekontot "${household}" på Hyresvägen.

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
  settingsLink?: string
}): EmailContent {
  const optOut = optOutFooter(settingsUrl(opts.link, opts.settingsLink))
  const sender = opts.senderName || 'Någon'
  const preview = snippet(opts.content) || (opts.hasImage ? '[Bild]' : '')
  const about = opts.listingTitle ? ` om ”${opts.listingTitle}”` : ''
  const subject = headerSafe(`Nytt meddelande från ${sender}`)
  const html = layout({
    preheader: preview,
    heading: `Nytt meddelande från ${sender}`,
    bodyHtml: `${escapeHtml(sender)} har skickat ett meddelande till dig${escapeHtml(about)}:
      <div style="margin-top:12px;padding:12px 14px;background:#f9fafb;border-left:3px solid #059669;border-radius:8px;color:#111827">${escapeHtml(preview)}</div>`,
    cta: { label: 'Svara på Hyresvägen', url: opts.link },
    footerHtml:
      'Du får det här mejlet eftersom du har e-postaviseringar påslagna. Vi mejlar bara om det första olästa meddelandet i varje konversation.<br>' +
      optOut.html,
  })
  const text = `${sender} har skickat ett meddelande till dig${about}:

"${preview}"

Svara: ${opts.link}

${optOut.text}`
  return { subject, html, text }
}

export function testEmail(opts: { host: string; source: string }): EmailContent {
  const when = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })
  const subject = 'Testmejl från Hyresvägen'
  const html = layout({
    preheader: 'SMTP-inställningarna fungerar.',
    heading: 'SMTP fungerar!',
    bodyHtml: `Det här är ett testmejl från Hyresvägen. Om du läser det här är e-postinställningarna korrekta.<br><br>
      <span style="color:#6b7280;font-size:13px">Server: ${escapeHtml(opts.host)} · Källa: ${escapeHtml(opts.source)} · Skickat: ${escapeHtml(when)}</span>`,
  })
  const text = `Det här är ett testmejl från Hyresvägen. Om du läser det här är e-postinställningarna korrekta.

Server: ${opts.host} · Källa: ${opts.source} · Skickat: ${when}`
  return { subject, html, text }
}

const sek = new Intl.NumberFormat('sv-SE')

function formatRooms(rooms: number): string {
  return `${String(rooms).replace('.', ',')} rum`
}

export function newMatchingListingEmail(opts: {
  title: string
  district: string
  rooms: number
  rent: number
  area?: number | null
  imageUrl?: string | null
  /** Names of the recipient's saved searches the listing matched. */
  searchNames?: string[]
  /** Match % against the recipient's swap preferences, if that's why. */
  matchScore?: number | null
  link: string
  settingsLink?: string
}): EmailContent {
  const optOut = optOutFooter(settingsUrl(opts.link, opts.settingsLink))
  const title = opts.title || 'Ny annons'
  const facts = [
    opts.district,
    formatRooms(opts.rooms),
    opts.area ? `${sek.format(opts.area)} m²` : null,
    `${sek.format(opts.rent)} kr/mån`,
  ]
    .filter(Boolean)
    .join(' · ')

  const searches = (opts.searchNames ?? []).filter(Boolean)
  const reasons: string[] = []
  if (searches.length > 0) {
    reasons.push(
      searches.length === 1
        ? `Den matchar din sparade sökning ”${searches[0]}”.`
        : `Den matchar dina sparade sökningar ${searches.map((n) => `”${n}”`).join(', ')}.`
    )
  }
  if (opts.matchScore != null) {
    reasons.push(`Den passar ${Math.round(opts.matchScore)} % av det du har sagt att du söker.`)
  }

  const subject = headerSafe(`Ny annons som matchar: ${title}`)
  const image =
    opts.imageUrl && /^https?:\/\//i.test(opts.imageUrl)
      ? `<img src="${safeUrl(opts.imageUrl)}" alt="" width="464" style="display:block;width:100%;max-width:464px;height:auto;border-radius:12px;margin-bottom:14px">`
      : ''
  const html = layout({
    preheader: `${title} – ${facts}`,
    heading: 'En ny annons matchar det du söker',
    bodyHtml: `${image}<strong style="color:#111827;font-size:16px">${escapeHtml(title)}</strong><br>
      <span style="color:#6b7280">${escapeHtml(facts)}</span>
      ${reasons.length > 0 ? `<div style="margin-top:12px;padding:12px 14px;background:#ecfdf5;border-radius:8px;color:#065f46">${reasons.map(escapeHtml).join('<br>')}</div>` : ''}`,
    cta: { label: 'Visa annonsen', url: opts.link },
    footerHtml: optOut.html,
  })
  const text = `En ny annons matchar det du söker:

${title}
${facts}
${reasons.length > 0 ? `\n${reasons.join('\n')}\n` : ''}
Visa annonsen: ${opts.link}

${optOut.text}`
  return { subject, html, text }
}

export function interestEmail(opts: {
  /** Who showed interest (for the mutual variant: the other person). */
  interesterName: string
  /** The listing the interest is about (for the mutual variant: the recipient's own listing). */
  listingTitle: string
  /** Mutual: both have shown interest in each other's listings. */
  mutual?: boolean
  /** Mutual: the other person's listing. */
  otherListingTitle?: string | null
  link: string
  settingsLink?: string
}): EmailContent {
  const optOut = optOutFooter(settingsUrl(opts.link, opts.settingsLink))
  const name = opts.interesterName || 'Någon'
  const listing = opts.listingTitle || 'din annons'

  if (opts.mutual) {
    const other = opts.otherListingTitle ? ` och du är intresserad av ”${opts.otherListingTitle}”` : ''
    const subject = headerSafe(`Ni har visat intresse för varandra – ${name}`)
    const body = `${name} är intresserad av ”${listing}”${other}. Ni har visat intresse för varandra – hör av dig och se om bytet kan bli av!`
    const html = layout({
      preheader: body,
      heading: 'Ni har visat intresse för varandra',
      bodyHtml: escapeHtml(body),
      cta: { label: 'Visa på Hyresvägen', url: opts.link },
      footerHtml: optOut.html,
    })
    const text = `Ni har visat intresse för varandra!

${body}

Visa på Hyresvägen: ${opts.link}

${optOut.text}`
    return { subject, html, text }
  }

  const subject = headerSafe(`${name} är intresserad av din annons`)
  const body = `${name} har visat intresse för din annons ”${listing}”. Titta på deras bostad och hör av dig om bytet verkar intressant.`
  const html = layout({
    preheader: body,
    heading: 'Någon är intresserad av din annons',
    bodyHtml: escapeHtml(body),
    cta: { label: 'Se vem som är intresserad', url: opts.link },
    footerHtml: optOut.html,
  })
  const text = `${body}

Se vem som är intresserad: ${opts.link}

${optOut.text}`
  return { subject, html, text }
}
