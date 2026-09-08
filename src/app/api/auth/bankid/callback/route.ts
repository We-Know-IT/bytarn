import { createHash } from 'crypto'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { exchangeBankIdCode, type BankIdClaims } from '@/lib/bankid'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = request.cookies.get('bankid_state')?.value

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/logga-in?fel=bankid_state', request.url))
  }

  try {
    const domain = process.env.CRIIPTO_DOMAIN!
    const { id_token } = await exchangeBankIdCode(code)
    const jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks`))
    const { payload } = await jwtVerify(id_token, jwks, {
      issuer: `https://${domain}`,
      audience: process.env.CRIIPTO_CLIENT_ID,
    })
    const claims = payload as unknown as BankIdClaims

    const personalIdNumber = claims['https://claims.oidc.se/1.0/personalIdentityNumber']
    const name =
      claims.name ?? ([claims.given_name, claims.family_name].filter(Boolean).join(' ') || 'BankID-användare')

    if (!personalIdNumber) {
      throw new Error('Inget personnummer i BankID-svaret.')
    }

    // Personnumret används bara som stabil, hashad nyckel — det lagras aldrig i klartext.
    const idHash = createHash('sha256').update(personalIdNumber).digest('hex').slice(0, 32)
    const email = `bankid-${idHash}@bytarn.internal`

    const admin = createAdminClient()
    let userId: string | undefined

    const { data: existing } = await admin.auth.admin.listUsers()
    const existingUser = existing?.users.find((u) => u.email === email)

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name, auth_provider: 'bankid' },
      })
      if (createError || !created.user) throw createError ?? new Error('Kunde inte skapa BankID-konto.')
      userId = created.user.id
    }

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError || !link) throw linkError ?? new Error('Kunde inte generera inloggningslänk.')

    const supabase = await createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: link.properties.hashed_token,
      email,
    })
    if (verifyError) throw verifyError

    void userId
    return NextResponse.redirect(new URL('/mina-sidor', request.url))
  } catch (err) {
    console.error('BankID-inloggning misslyckades', err)
    return NextResponse.redirect(new URL('/logga-in?fel=bankid', request.url))
  }
}
