'use client'

import Link from 'next/link'
import { LogoMark } from '@/components/ui/Logo'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'

const BANKID_ERRORS: Record<string, string> = {
  bankid: 'BankID-inloggningen misslyckades. Försök igen.',
  bankid_state: 'Sessionen tog för lång tid. Försök igen.',
  bankid_avbruten: 'BankID-inloggningen avbröts. Försök igen.',
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

  async function handleGoogleLogin() {
    setError(null)
    if (!supabaseConfigured) {
      setError('Backend är inte konfigurerad i den här miljön ännu (saknar Supabase-uppgifter).')
      return
    }
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${nasta}` },
    })
    if (authError) setError(authError.message)
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

          {bankIdError && (
            <div role="alert" className="mb-4 rounded-[12px] border border-red-100 bg-red-50 px-3.5 py-3 text-[14px] text-red-700">
              {BANKID_ERRORS[bankIdError] ?? 'Något gick fel. Försök igen.'}
            </div>
          )}

          {/* BankID */}
          <a
            href="/api/auth/bankid/start"
            className="btn btn-block mb-3 bg-[#0e5c9e] text-white hover:bg-[#0a4a80]"
          >
            <Fingerprint size={18} strokeWidth={2} />
            Logga in med BankID
          </a>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn btn-secondary btn-block mb-4 gap-3 text-gray-800"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
            </svg>
            Fortsätt med Google
          </button>

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
