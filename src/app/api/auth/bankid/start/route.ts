import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { bankIdAuthorizeUrl, bankIdConfigured } from '@/lib/bankid'

export async function GET(request: NextRequest) {
  if (!bankIdConfigured) {
    return NextResponse.json(
      { error: 'BankID är inte konfigurerat i denna miljö ännu.' },
      { status: 501 }
    )
  }

  const sameDevice = request.nextUrl.searchParams.get('device') !== 'qr'
  const state = randomBytes(16).toString('hex')
  const nonce = randomBytes(16).toString('hex')

  const response = NextResponse.redirect(bankIdAuthorizeUrl(state, nonce, sameDevice))
  const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 300, path: '/' }
  response.cookies.set('bankid_state', state, cookieOpts)
  response.cookies.set('bankid_nonce', nonce, cookieOpts)
  return response
}
