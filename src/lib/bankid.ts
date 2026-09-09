// BankID login via Criipto Verify — a hosted OIDC broker for Swedish BankID.
// Going live requires a Criipto account with the BankID add-on enabled
// (https://docs.criipto.com/verify/e-ids/sweden-bankid/get-started/), since
// real BankID access needs a bank-issued agreement Criipto already holds.
//
// Required env vars: CRIIPTO_DOMAIN, CRIIPTO_CLIENT_ID, CRIIPTO_CLIENT_SECRET,
// NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY (see .env.example).

export const bankIdConfigured =
  !!process.env.CRIIPTO_DOMAIN &&
  !!process.env.CRIIPTO_CLIENT_ID &&
  !!process.env.CRIIPTO_CLIENT_SECRET &&
  !!process.env.NEXT_PUBLIC_APP_URL

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`BankID är inte konfigurerat: ${name} saknas.`)
  return value
}

export function bankIdCallbackUrl(): string {
  return `${requireEnv('NEXT_PUBLIC_APP_URL')}/api/auth/bankid/callback`
}

export function bankIdAuthorizeUrl(state: string, nonce: string, sameDevice: boolean): string {
  const domain = requireEnv('CRIIPTO_DOMAIN')
  const params = new URLSearchParams({
    client_id: requireEnv('CRIIPTO_CLIENT_ID'),
    redirect_uri: bankIdCallbackUrl(),
    response_type: 'code',
    scope: 'openid',
    state,
    nonce,
    // urn:grn:authn:se:bankid:same-device | :another-device:qr
    acr_values: sameDevice
      ? 'urn:grn:authn:se:bankid:same-device'
      : 'urn:grn:authn:se:bankid:another-device:qr',
  })
  return `https://${domain}/oauth2/authorize?${params.toString()}`
}

export async function exchangeBankIdCode(code: string) {
  const domain = requireEnv('CRIIPTO_DOMAIN')
  const res = await fetch(`https://${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: bankIdCallbackUrl(),
      client_id: requireEnv('CRIIPTO_CLIENT_ID'),
      client_secret: requireEnv('CRIIPTO_CLIENT_SECRET'),
    }),
  })
  if (!res.ok) {
    throw new Error(`BankID-inloggning misslyckades (${res.status}): ${await res.text()}`)
  }
  return res.json() as Promise<{ id_token: string; access_token: string }>
}

export interface BankIdClaims {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  // Swedish personal identity number, e.g. "198501011234"
  'https://claims.oidc.se/1.0/personalIdentityNumber'?: string
}
