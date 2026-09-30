import { NextResponse, type NextRequest } from 'next/server'
import { createClient, supabaseConfigured } from '@/lib/supabase/server'

// Google sign-in and email confirmation links land here with ?code=…
// (PKCE). The code is exchanged for a session server-side so the auth
// cookies are set before the user reaches the next page.
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const nextParam = url.searchParams.get('next')
  // Same-site paths only (no "//evil.com" open redirects).
  const next = nextParam && /^\/(?![\/\\])/.test(nextParam) ? nextParam : '/mina-sidor'

  const fail = (detail?: string | null) => {
    const to = new URL('/logga-in', url.origin)
    to.searchParams.set('fel', 'google')
    if (detail) to.searchParams.set('detalj', detail.slice(0, 200))
    if (next !== '/mina-sidor') to.searchParams.set('nasta', next)
    return NextResponse.redirect(to)
  }

  // Google or Supabase reporting an error (cancelled, provider disabled, …).
  const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  if (providerError) return fail(providerError)

  const code = url.searchParams.get('code')
  if (!code || !supabaseConfigured) return fail(code ? 'Backend är inte konfigurerad.' : 'Ingen inloggningskod mottogs.')

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // A confirmation link opened on another device can't finish the sign-in
    // (the PKCE verifier lives in the browser that signed up), but Supabase
    // has already confirmed the address — so just ask them to log in.
    if (url.searchParams.get('typ') === 'bekraftelse') {
      const to = new URL('/logga-in', url.origin)
      to.searchParams.set('info', 'bekraftad')
      to.searchParams.set('nasta', next)
      return NextResponse.redirect(to)
    }
    return fail(error.message)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
