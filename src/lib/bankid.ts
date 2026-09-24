// BankID login via Idura Verify (formerly Criipto), a hosted OIDC broker for
// Swedish BankID (https://docs.idura.app/verify/e-ids/swedish-bankid/).
//
// Uses the Authorization Code Flow with scope "openid". Dynamic scopes are off
// in the Idura application, so the claims in the id_token come from the
// per-eID scope configuration in the Idura dashboard, not from the request.
//
// Required env vars: IDURA_DOMAIN, IDURA_CLIENT_ID, IDURA_CLIENT_SECRET,
// NEXT_PUBLIC_APP_URL, SUPABASE_SERVICE_ROLE_KEY (see .env.example).
// The older CRIIPTO_* names are still read as a fallback so existing
// deployments keep working.

import { createRemoteJWKSet, jwtVerify } from 'jose'

function env(name: 'DOMAIN' | 'CLIENT_ID' | 'CLIENT_SECRET'): string | undefined {
  return process.env[`IDURA_${name}`] || process.env[`CRIIPTO_${name}`]
}

export const bankIdConfigured =
  !!env('DOMAIN') && !!env('CLIENT_ID') && !!env('CLIENT_SECRET') && !!process.env.NEXT_PUBLIC_APP_URL

function requireEnv(name: 'DOMAIN' | 'CLIENT_ID' | 'CLIENT_SECRET'): string {
  const value = env(name)
  if (!value) throw new Error(`BankID är inte konfigurerat: IDURA_${name} saknas.`)
  return value
}

export function bankIdCallbackUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('BankID är inte konfigurerat: NEXT_PUBLIC_APP_URL saknas.')
  return `${appUrl}/api/auth/bankid/callback`
}

export function bankIdAuthorizeUrl(state: string, nonce: string, sameDevice: boolean): string {
  const domain = requireEnv('DOMAIN')
  const params = new URLSearchParams({
    client_id: requireEnv('CLIENT_ID'),
    redirect_uri: bankIdCallbackUrl(),
    response_type: 'code',
    scope: 'openid',
    state,
    nonce,
    acr_values: sameDevice
      ? 'urn:grn:authn:se:bankid:same-device'
      : 'urn:grn:authn:se:bankid:another-device:qr',
  })
  return `https://${domain}/oauth2/authorize?${params.toString()}`
}

export async function exchangeBankIdCode(code: string) {
  const domain = requireEnv('DOMAIN')
  const res = await fetch(`https://${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: bankIdCallbackUrl(),
      client_id: requireEnv('CLIENT_ID'),
      client_secret: requireEnv('CLIENT_SECRET'),
    }),
  })
  if (!res.ok) {
    throw new Error(`BankID-inloggning misslyckades (${res.status}): ${await res.text()}`)
  }
  return res.json() as Promise<{ id_token: string; access_token: string }>
}

let jwksCache: { domain: string; jwks: ReturnType<typeof createRemoteJWKSet> } | undefined

// Verifies signature (Idura JWKS), issuer, audience and nonce of the id_token.
export async function verifyBankIdToken(idToken: string, nonce: string): Promise<BankIdClaims> {
  const domain = requireEnv('DOMAIN')
  if (jwksCache?.domain !== domain) {
    jwksCache = { domain, jwks: createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks`)) }
  }
  const { payload } = await jwtVerify(idToken, jwksCache.jwks, {
    issuer: `https://${domain}`,
    audience: requireEnv('CLIENT_ID'),
  })
  if (payload.nonce !== nonce) throw new Error('Ogiltig nonce i BankID-svaret.')
  return payload as unknown as BankIdClaims
}

// Claims in an Idura Verify id_token for Swedish BankID.
export interface BankIdClaims {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  // Swedish personal identity number, e.g. "198501011234"
  ssn?: string
}
