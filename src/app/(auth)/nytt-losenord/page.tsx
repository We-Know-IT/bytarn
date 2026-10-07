'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

const MIN_LENGTH = 8

// Reached from a password-reset e-mail: /auth/callback has already turned
// the link into a signed-in session, so all that's left is to set the new
// password on it.
export default function NyttLosenordPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSave() {
    setError(null)
    if (password.length < MIN_LENGTH) {
      setError(`Lösenordet måste vara minst ${MIN_LENGTH} tecken.`)
      return
    }
    if (password !== repeat) {
      setError('Lösenorden matchar inte.')
      return
    }
    setSaving(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setSaving(false)
    if (updateError) {
      setError(
        /different from the old/i.test(updateError.message)
          ? 'Det nya lösenordet måste skilja sig från det gamla.'
          : /weak|short/i.test(updateError.message)
            ? 'Lösenordet är för svagt. Välj ett längre lösenord.'
            : updateError.message
      )
      return
    }
    setDone(true)
    setTimeout(() => router.push('/mina-sidor'), 1500)
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-var(--nav-h))] items-start justify-center overflow-hidden bg-[#F5F0E8] px-4 py-10 sm:items-center sm:py-16"
      style={{ backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(168,185,164,0.28) 0%, transparent 70%)' }}
    >
      <div className="w-full max-w-[420px]">
        <div className="card p-6 sm:p-9">
          {loading ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : !supabaseConfigured || !user ? (
            <div className="text-center">
              <h1 className="font-display text-[30px] italic leading-[1.1] text-gray-900 mb-2">Länken fungerar inte</h1>
              <p className="text-gray-600 text-sm mb-6">
                Länken för att återställa lösenordet har gått ut, redan använts eller öppnats i en annan webbläsare än
                den du beställde den från.
              </p>
              <Link href="/aterstall-losenord" className="btn btn-primary btn-block">
                Beställ en ny länk
              </Link>
            </div>
          ) : done ? (
            <div className="text-center" role="status">
              <div className="w-16 h-16 bg-[#E3EBE2] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={28} className="text-emerald-600" />
              </div>
              <h1 className="font-display text-[30px] italic leading-[1.1] text-gray-900 mb-2">Lösenordet är bytt</h1>
              <p className="text-gray-600 text-sm">Du skickas vidare till Mina sidor…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-display text-[34px] italic leading-[1.1] tracking-[-0.02em] text-gray-900">
                  Välj nytt lösenord
                </h1>
                <p className="text-gray-600 text-[14.5px] mt-2">För kontot {user.email}</p>
              </div>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSave()
                }}
              >
                <div>
                  <label htmlFor="nytt-losenord" className="label">Nytt lösenord</label>
                  <div className="relative">
                    <input
                      id="nytt-losenord"
                      type={show ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-11"
                      minLength={MIN_LENGTH}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? 'Dölj lösenord' : 'Visa lösenord'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <p className="hint">Minst {MIN_LENGTH} tecken.</p>
                </div>
                <div>
                  <label htmlFor="upprepa-losenord" className="label">Upprepa lösenordet</label>
                  <input
                    id="upprepa-losenord"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={saving || !password || !repeat} className="btn btn-primary btn-lg btn-block">
                  {saving ? 'Sparar…' : 'Spara nytt lösenord'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
