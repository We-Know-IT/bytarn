import { beforeAll, describe, expect, it } from 'vitest'
import { bankIdAuthorizeUrl } from './bankid'

beforeAll(() => {
  process.env.IDURA_DOMAIN = 'bytarn.test.idura.broker'
  process.env.IDURA_CLIENT_ID = 'urn:my:application:identifier:816684'
  process.env.IDURA_CLIENT_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_APP_URL = 'https://bytarn.example'
})

describe('bankIdAuthorizeUrl', () => {
  it('builds an Idura Authorization Code Flow request', () => {
    const url = new URL(bankIdAuthorizeUrl('st', 'nn', true))

    expect(url.origin + url.pathname).toBe('https://bytarn.test.idura.broker/oauth2/authorize')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'urn:my:application:identifier:816684',
      redirect_uri: 'https://bytarn.example/api/auth/bankid/callback',
      response_type: 'code',
      scope: 'openid',
      state: 'st',
      nonce: 'nn',
      acr_values: 'urn:grn:authn:se:bankid:same-device',
    })
  })

  it('uses the QR acr_value for another device', () => {
    const url = new URL(bankIdAuthorizeUrl('st', 'nn', false))
    expect(url.searchParams.get('acr_values')).toBe('urn:grn:authn:se:bankid:another-device:qr')
  })
})
