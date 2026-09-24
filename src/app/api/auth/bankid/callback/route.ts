import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { exchangeBankIdCode, verifyBankIdToken } from '@/lib/bankid'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function redirectTo(path: string, request: NextRequest) {
  const response = NextResponse.redirect(new URL(path, request.url))
  response.cookies.delete('bankid_state')
  response.cookies.delete('bankid_nonce')
  return response
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = request.cookies.get('bankid_state')?.value
  const storedNonce = request.cookies.get('bankid_nonce')?.value

  if (!code || !state || !storedState || !storedNonce || state !== storedState) {
    return redirectTo('/logga-in?fel=bankid_state', request)
  }

  try {
    const { id_token } = await exchangeBankIdCode(code)
    const claims = await verifyBankIdToken(id_token, storedNonce)

    const personalIdNumber = claims.ssn
    const name =
      claims.name ?? ([claims.given_name, claims.family_name].filter(Boolean).join(' ') || 'BankID-användare')

    if (!personalIdNumber) {
      throw new Error('Inget personnummer i BankID-svaret.')
    }

    // Personnumret används bara som stabil, hashad nyckel — det lagras aldrig i klartext.
    const idHash = createHash('sha256').update(personalIdNumber).digest('hex').slice(0, 32)
    const email = `bankid-${idHash}@bytarn.internal`

    const admin = createAdminClient()

    // Skapa kontot vid första inloggningen; finns det redan loggar vi bara in.
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name, auth_provider: 'bankid' },
    })
    if (createError && createError.code !== 'email_exists') throw createError

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError || !link) throw linkError ?? new Error('Kunde inte generera inloggningslänk.')

    // Supabase tar bara emot type + token_hash när en token_hash verifieras. Sessionens
    // cookies skrivs via cookies() och Next lägger på dem på redirect-svaret nedan.
    const supabase = await createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: link.properties.hashed_token,
    })
    if (verifyError) throw verifyError

    return redirectTo('/mina-sidor', request)
  } catch (err) {
    console.error('BankID-inloggning misslyckades', err)
    return redirectTo('/logga-in?fel=bankid', request)
  }
}
