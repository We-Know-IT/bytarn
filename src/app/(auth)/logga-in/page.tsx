'use client'

import Link from 'next/link'
import { LogoMark } from '@/components/ui/Logo'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import BankIdButton from '@/components/BankIdButton'
import GoogleSignInButton from '@/components/GoogleSignInButton'

const BANKID_ERRORS: Record<string, string> = {
  google: 'Inloggningen med Google misslyckades. Försök igen.',
  bankid: 'BankID-inloggningen misslyckades. Försök igen.',
  bankid_state: 'Sessionen tog för lång tid. Försök igen.',
  bankid_avbruten: 'BankID-inloggningen avbröts. Försök igen.',
}

// Supabase/Google error text, with the setup mistakes spelled out.
function describeOAuthDetail(detail: string | null): string | null {
  if (!detail) return null
  if (/provider is not enabled|unsupported provider/i.test(detail)) {
    return 'Google-inloggning är inte aktiverad i Supabase (Authentication → Sign In / Providers → Google).'
  }
  if (/access_denied|cancel/i.test(detail)) return 'Inloggningen avbröts.'
  if (/code verifier|flow state/i.test(detail)) {
    return 'Inloggningen startades i en annan webbläsare eller tog för lång tid. Försök igen.'
  }
  return detail
}

export default function LoggaInPage() {
  return (
    <Suspense fallback={null}>
      <LoggaInForm />
    </Suspense>
  )
}

function LoggaInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bankIdError = searchParams.get('fel')
  const errorDetail = describeOAuthDetail(searchParams.get('detalj'))
  const confirmed = searchParams.get('info') === 'bekraftad'
  // Where to go after signing in, e.g. back to /annonser/ny or a family
  // invite. Only same-site paths are accepted (no "//evil.com").
  const nastaParam = searchParams.get('nasta')
  const nasta = nastaParam && /^\/(?![\/\\])/.test(nastaParam) ? nastaParam : '/mina-sidor'
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError(null)
    if (!supabaseConfigured) {
      setError('Backend är inte konfigurerad i den här miljön ännu (saknar Supabase-uppgifter).')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    setLoading(false)
    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Fel e-post eller lösenord.' : authError.message)
      return
    }
    router.push(nasta)
    router.refresh()
  }

  return (
    <div className="relative flex min-h-[calc(100vh-var(--nav-h))] items-start justify-center overflow-hidden bg-[#F5F0E8] px-4 py-10 sm:items-center sm:py-16"
      style={{ backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(168,185,164,0.28) 0%, transparent 70%)' }}>
      <div className="w-full max-w-[420px]">
        <div className="card p-6 sm:p-9">
          <div className="text-center mb-8">
            <LogoMark size={40} className="mx-auto mb-5" />
            <h1 className="font-display text-[34px] italic leading-[1.1] tracking-[-0.02em] text-gray-900">Välkommen tillbaka</h1>
            <p className="text-gray-600 text-[14.5px] mt-2">Logga in på ditt konto</p>
          </div>

          {confirmed && (
            <div role="status" className="mb-4 rounded-[12px] border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-[14px] text-emerald-800">
              Din e-post är bekräftad. Logga in för att fortsätta.
            </div>
          )}

          {bankIdError && (
            <div role="alert" className="mb-4 rounded-[12px] border border-red-100 bg-red-50 px-3.5 py-3 text-[14px] text-red-700">
              {BANKID_ERRORS[bankIdError] ?? 'Något gick fel. Försök igen.'}
              {errorDetail && <p className="mt-1 text-[12.5px] text-red-600/80">{errorDetail}</p>}
            </div>
          )}

          {/* BankID */}
          <BankIdButton label="Logga in med BankID" />

          {/* Google */}
          <GoogleSignInButton mode="login" next={nasta} onError={setError} />

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500">eller med lösenord</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-[12px] border border-red-100 bg-red-50 px-3.5 py-3 text-[14px] text-red-700">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label">E-post</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="din@email.se"
                className="input"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Lösenord</label>
                <Link href="/aterstall-losenord" className="text-xs text-emerald-600 hover:underline">
                  Glömt lösenord?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !form.email || !form.password}
              className="btn btn-primary btn-lg btn-block"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Logga in
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Inget konto?{' '}
            <Link href="/registrera" className="text-emerald-600 font-medium hover:underline">
              Registrera dig gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
