'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, Fingerprint, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'

export default function RegistreraPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  async function handleSignUp() {
    setError(null)
    if (!supabaseConfigured) {
      setError('Backend är inte konfigurerad i den här miljön ännu (saknar Supabase-uppgifter).')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    if (!data.session) {
      // E-postbekräftelse krävs i Supabase-projektet — det finns ännu ingen
      // inloggad session, så vi ska inte låtsas att kontot redan är aktivt.
      setConfirmSent(true)
      return
    }
    router.push('/onboarding')
  }

  async function handleGoogleSignUp() {
    setError(null)
    if (!supabaseConfigured) {
      setError('Backend är inte konfigurerad i den här miljön ännu (saknar Supabase-uppgifter).')
      return
    }
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    if (authError) setError(authError.message)
  }

  if (confirmSent) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bekräfta din e-post</h2>
            <p className="text-gray-500 text-sm mb-6">
              Vi har skickat ett bekräftelsemail till <strong className="text-gray-700">{form.email}</strong>.
              Klicka på länken i mejlet för att aktivera kontot och logga in.
            </p>
            <Link href="/logga-in" className="text-emerald-600 font-medium hover:underline text-sm">
              Till inloggning
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const passwordStrength = form.password.length === 0
    ? 0
    : form.password.length < 8
    ? 1
    : form.password.length < 12
    ? 2
    : 3

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold">B</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Skapa konto</h1>
            <p className="text-gray-500 text-sm mt-1">Gratis, alltid</p>
          </div>

          {/* BankID */}
          <a
            href="/api/auth/bankid/start"
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#0e5c9e] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a80] transition-colors mb-3"
          >
            <Fingerprint size={18} strokeWidth={2} />
            Skapa konto med BankID
          </a>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
            </svg>
            Registrera med Google
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">eller med lösenord</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Namn</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Anna Svensson"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-post</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="din@email.se"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lösenord</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minst 8 tecken"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'flex-1 h-1 rounded-full transition-colors',
                        passwordStrength >= level
                          ? level === 1 ? 'bg-red-400' : level === 2 ? 'bg-yellow-400' : 'bg-emerald-400'
                          : 'bg-gray-100'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={() => setAgreed(!agreed)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                  agreed ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                )}
              >
                {agreed && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-gray-600">
                Jag godkänner{' '}
                <a href="/villkor" target="_blank" className="text-emerald-600 hover:underline">
                  användarvillkoren
                </a>{' '}
                och{' '}
                <a href="/integritetspolicy" target="_blank" className="text-emerald-600 hover:underline">
                  integritetspolicyn
                </a>
              </span>
            </label>

            <button
              disabled={loading || !agreed || !form.name || !form.email || form.password.length < 8}
              onClick={handleSignUp}
              className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Skapar konto…' : 'Skapa konto'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Har du redan konto?{' '}
            <Link href="/logga-in" className="text-emerald-600 font-medium hover:underline">
              Logga in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
