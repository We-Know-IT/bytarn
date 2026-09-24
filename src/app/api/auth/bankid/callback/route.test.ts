import { createHash } from 'crypto'
import { exportJWK, generateKeyPair, SignJWT, type JWK, type KeyLike } from 'jose'
import { NextRequest } from 'next/server'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const DOMAIN = 'bytarn.test.idura.broker'
const CLIENT_ID = 'urn:my:application:identifier:816684'
const APP_URL = 'https://bytarn.example'
const SSN = '198501011234'

const mocks = vi.hoisted(() => ({
  jwks: { keys: [] as JWK[] },
  jwksUrls: [] as string[],
  createUser: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
}))

// jose fetches the JWKS over node:https, so serve the test key locally instead.
vi.mock('jose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('jose')>()
  return {
    ...actual,
    createRemoteJWKSet: (url: URL) => {
      mocks.jwksUrls.push(url.href)
      return actual.createLocalJWKSet(mocks.jwks)
    },
  }
})

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: mocks.createUser, generateLink: mocks.generateLink } },
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { verifyOtp: mocks.verifyOtp } }),
}))

let privateKey: KeyLike
let otherKey: KeyLike

beforeAll(async () => {
  process.env.IDURA_DOMAIN = DOMAIN
  process.env.IDURA_CLIENT_ID = CLIENT_ID
  process.env.IDURA_CLIENT_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_APP_URL = APP_URL

  const pair = await generateKeyPair('RS256')
  privateKey = pair.privateKey
  otherKey = (await generateKeyPair('RS256')).privateKey
  mocks.jwks.keys = [{ ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'RS256' }]
})

function signIdToken(
  claims: Record<string, unknown>,
  opts: { issuer?: string; audience?: string; key?: KeyLike } = {}
) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(opts.issuer ?? `https://${DOMAIN}`)
    .setAudience(opts.audience ?? CLIENT_ID)
    .setSubject('{a1b2c3}')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(opts.key ?? privateKey)
}

function callbackRequest(params: { code?: string; state?: string }, cookies = { state: 'st', nonce: 'nn' }) {
  const url = new URL(`${APP_URL}/api/auth/bankid/callback`)
  if (params.code) url.searchParams.set('code', params.code)
  if (params.state) url.searchParams.set('state', params.state)
  return new NextRequest(url, {
    headers: { cookie: `bankid_state=${cookies.state}; bankid_nonce=${cookies.nonce}` },
  })
}

let tokenFetch: ReturnType<typeof vi.fn>

function respondWithIdToken(idToken: string) {
  tokenFetch = vi.fn(async () => Response.json({ id_token: idToken, access_token: 'at' }))
  vi.stubGlobal('fetch', tokenFetch)
}

const { GET } = await import('./route')

beforeEach(() => {
  mocks.createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  mocks.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'hashed' } }, error: null })
  mocks.verifyOtp.mockResolvedValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('BankID callback (Idura Verify)', () => {
  it('logs in with the Idura ssn claim and redirects to /mina-sidor', async () => {
    respondWithIdToken(await signIdToken({ ssn: SSN, name: 'Anna Andersson', nonce: 'nn' }))

    const res = await GET(callbackRequest({ code: 'the-code', state: 'st' }))

    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/mina-sidor')
    expect(console.error).not.toHaveBeenCalled()

    // Code exchanged at Idura's token endpoint, JWKS read from Idura.
    const [tokenUrl, init] = tokenFetch.mock.calls[0]
    expect(tokenUrl).toBe(`https://${DOMAIN}/oauth2/token`)
    const body = new URLSearchParams(init.body as URLSearchParams)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('the-code')
    expect(body.get('client_id')).toBe(CLIENT_ID)
    expect(body.get('redirect_uri')).toBe(`${APP_URL}/api/auth/bankid/callback`)
    expect(mocks.jwksUrls).toContain(`https://${DOMAIN}/.well-known/jwks`)

    // Only the hash of the personal identity number reaches Supabase.
    const hash = createHash('sha256').update(SSN).digest('hex').slice(0, 32)
    const email = `bankid-${hash}@bytarn.internal`
    expect(mocks.createUser).toHaveBeenCalledWith({
      email,
      email_confirm: true,
      user_metadata: { name: 'Anna Andersson', auth_provider: 'bankid' },
    })
    expect(JSON.stringify(mocks.createUser.mock.calls)).not.toContain(SSN)
    expect(mocks.generateLink).toHaveBeenCalledWith({ type: 'magiclink', email })
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'hashed', email })
  })

  it('logs in an existing BankID user without creating a new account', async () => {
    mocks.createUser.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('already registered'), { code: 'email_exists' }),
    })
    respondWithIdToken(await signIdToken({ ssn: SSN, name: 'Anna Andersson', nonce: 'nn' }))

    const res = await GET(callbackRequest({ code: 'c', state: 'st' }))

    expect(new URL(res.headers.get('location')!).pathname).toBe('/mina-sidor')
    expect(mocks.verifyOtp).toHaveBeenCalled()
  })

  it('ignores the old Criipto personalIdentityNumber claim', async () => {
    respondWithIdToken(
      await signIdToken({ 'https://claims.oidc.se/1.0/personalIdentityNumber': SSN, nonce: 'nn' })
    )

    const res = await GET(callbackRequest({ code: 'c', state: 'st' }))

    expect(res.headers.get('location')).toBe(`${APP_URL}/logga-in?fel=bankid`)
    expect(console.error).toHaveBeenCalledWith(
      'BankID-inloggning misslyckades',
      new Error('Inget personnummer i BankID-svaret.')
    )
  })

  it('rejects a mismatched state without calling Idura', async () => {
    respondWithIdToken('unused')

    const res = await GET(callbackRequest({ code: 'c', state: 'other' }))

    expect(res.headers.get('location')).toBe(`${APP_URL}/logga-in?fel=bankid_state`)
    expect(tokenFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['wrong issuer', () => signIdToken({ ssn: SSN, nonce: 'nn' }, { issuer: 'https://evil.example' })],
    ['wrong audience', () => signIdToken({ ssn: SSN, nonce: 'nn' }, { audience: 'someone-else' })],
    ['wrong signing key', () => signIdToken({ ssn: SSN, nonce: 'nn' }, { key: otherKey })],
    ['wrong nonce', () => signIdToken({ ssn: SSN, nonce: 'replayed' })],
  ])('rejects an id_token with %s', async (_label, makeToken) => {
    respondWithIdToken(await makeToken())

    const res = await GET(callbackRequest({ code: 'c', state: 'st' }))

    expect(res.headers.get('location')).toBe(`${APP_URL}/logga-in?fel=bankid`)
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  it('clears the state and nonce cookies', async () => {
    respondWithIdToken(await signIdToken({ ssn: SSN, nonce: 'nn' }))

    const res = await GET(callbackRequest({ code: 'c', state: 'st' }))

    const setCookie = res.headers.getSetCookie().join('\n')
    expect(setCookie).toMatch(/bankid_state=;/)
    expect(setCookie).toMatch(/bankid_nonce=;/)
  })
})
