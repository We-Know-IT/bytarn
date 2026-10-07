'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Mail } from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'

export default function AterstallLosenordPage() {
  return (
    <Suspense>
      <AterstallLosenord />
    </Suspense>
  )
}

function AterstallLosenord() {
  // ?fel=lank: the reset link was expired, already used, or opened in a
  // different browser than the one that requested it.
  const linkFailed = useSearchParams().get('fel') === 'lank'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset() {
    setError(null)
    if (!supabaseConfigured) {
      setError('Backend är inte konfigurerad i den här miljön ännu.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      // The link is exchanged for a session in /auth/callback, which then
      // sends the user to /nytt-losenord to choose a new password.
      redirectTo: `${window.location.origin}/auth/callback?typ=aterstallning`,
    })
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="relative flex min-h-[calc(100vh-var(--nav-h))] items-start justify-center overflow-hidden bg-[#F5F0E8] px-4 py-10 sm:items-center sm:py-16"
      style={{ backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(168,185,164,0.28) 0%, transparent 70%)' }}>
      <div className="w-full max-w-[420px]">
        <div className="card p-6 sm:p-9">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#E3EBE2] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-emerald-600" />
              </div>
              <h2 className="font-display text-[30px] italic leading-[1.1] text-gray-900 mb-2">Kolla din e-post</h2>
              <p className="text-gray-500 text-sm mb-6">
                Vi har skickat en länk för att återställa ditt lösenord till{' '}
                <strong className="text-gray-700">{email}</strong>.
              </p>
              <Link
                href="/logga-in"
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline"
              >
                <ArrowLeft size={14} />
                Tillbaka till inloggning
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-display text-[34px] italic leading-[1.1] tracking-[-0.02em] text-gray-900">Glömt lösenord?</h1>
                <p className="text-gray-600 text-[14.5px] mt-2">
                  Ange din e-post så skickar vi en återställningslänk.
                </p>
              </div>

              <div className="space-y-4">
                {linkFailed && (
                  <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Länken har gått ut eller redan använts. Öppna den i samma webbläsare som du begärde den från,
                    eller beställ en ny nedan.
                  </p>
                )}
                <div>
                  <label className="label">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    className="input"
                  />
                </div>
                <button
                  onClick={handleReset}
                  disabled={!email || loading}
                  className="btn btn-primary btn-lg btn-block"
                >
                  {loading ? 'Skickar…' : 'Skicka återställningslänk'}
                </button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="text-center mt-6">
                <Link
                  href="/logga-in"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft size={14} />
                  Tillbaka till inloggning
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
