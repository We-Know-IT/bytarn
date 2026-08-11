'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'

export default function AterstallLosenordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Kolla din e-post</h2>
              <p className="text-gray-500 text-sm mb-6">
                Vi har skickat en länk för att återställa ditt lösenord till{' '}
                <strong className="text-gray-700">{email}</strong>.
              </p>
              <Link
                href="/(auth)/logga-in"
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline"
              >
                <ArrowLeft size={14} />
                Tillbaka till inloggning
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Glömt lösenord?</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Ange din e-post så skickar vi en återställningslänk.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={() => setSent(true)}
                  disabled={!email}
                  className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Skicka återställningslänk
                </button>
              </div>

              <div className="text-center mt-6">
                <Link
                  href="/(auth)/logga-in"
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
