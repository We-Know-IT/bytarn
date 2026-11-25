'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { isNewAccount } from '@/lib/accountAge'

// With NEXT_PUBLIC_GOOGLE_CLIENT_ID set, Google's own sign-in button runs on
// our site (Google Identity Services) and hands Supabase an ID token, so
// Google's dialog names our domain instead of "<project>.supabase.co".
// Without it, the usual OAuth redirect through Supabase is used.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

interface Props {
  mode: 'login' | 'register'
  /** Where to go after signing in to an existing account. */
  next: string
  /** Runs before the sign-in starts (e.g. remember a family-account choice). */
  onBefore?: () => void
  onError: (message: string) => void
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: Record<string, unknown>): void
      renderButton(el: HTMLElement, options: Record<string, unknown>): void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
}

export default function GoogleSignInButton({ mode, next, onBefore, onError }: Props) {
  if (!CLIENT_ID) return <RedirectButton mode={mode} next={next} onBefore={onBefore} onError={onError} />
  return <GisButton clientId={CLIENT_ID} mode={mode} next={next} onBefore={onBefore} onError={onError} />
}

function GisButton({ clientId, mode, next, onBefore, onError }: Props & { clientId: string }) {
  const router = useRouter()
  const holder = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [busy, setBusy] = useState(false)
  // Kept in refs so the Google callback, registered once, sees current props.
  const latest = useRef({ mode, next, onBefore, onError })
  useEffect(() => {
    latest.current = { mode, next, onBefore, onError }
  })

  useEffect(() => {
    const google = window.google
    if (!scriptReady || !google || !holder.current) return
    let cancelled = false
    const nonce = randomNonce()
    sha256Hex(nonce).then((hashedNonce) => {
      if (cancelled || !holder.current) return
      google.accounts.id.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        ux_mode: 'popup',
        use_fedcm_for_prompt: true,
        callback: async ({ credential }: GoogleCredentialResponse) => {
          const { mode, next, onBefore, onError } = latest.current
          if (!supabaseConfigured) return onError('Backend är inte konfigurerad i den här miljön ännu.')
          onBefore?.()
          setBusy(true)
          const { data, error } = await createClient().auth.signInWithIdToken({ provider: 'google', token: credential, nonce })
          if (error || !data.user) {
            setBusy(false)
            return onError(`Inloggningen med Google misslyckades. ${error?.message ?? ''}`.trim())
          }
          // Same routing as /auth/callback for the redirect flow.
          const isNew = isNewAccount(data.user.created_at)
          const to = isNew ? '/onboarding' : mode === 'register' ? '/mina-sidor?info=befintligt-konto' : next
          router.push(to)
          router.refresh()
        },
      })
      google.accounts.id.renderButton(holder.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: mode === 'register' ? 'signup_with' : 'continue_with',
        logo_alignment: 'center',
        locale: 'sv',
        width: Math.min(400, holder.current.offsetWidth || 320),
      })
    })
    return () => {
      cancelled = true
    }
  }, [scriptReady, clientId, mode, router])

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div className="mb-4 flex min-h-[44px] justify-center" aria-busy={busy}>
        <div ref={holder} className="w-full flex justify-center" />
      </div>
    </>
  )
}

function RedirectButton({ mode, next, onBefore, onError }: Props) {
  async function start() {
    if (!supabaseConfigured) return onError('Backend är inte konfigurerad i den här miljön ännu (saknar Supabase-uppgifter).')
    onBefore?.()
    const target = mode === 'register' ? '/onboarding' : next
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` },
    })
    if (error) onError(error.message)
  }

  return (
    <button type="button" onClick={start} className="btn btn-secondary btn-block mb-4 gap-3 text-gray-800">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
        <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
        <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
      </svg>
      {mode === 'register' ? 'Registrera med Google' : 'Fortsätt med Google'}
    </button>
  )
}
