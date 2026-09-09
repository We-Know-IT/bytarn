'use client'

import { useEffect, useState } from 'react'
import { Users, Home, MessageSquare } from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'

interface Counts {
  users: number
  activeListings: number
  conversations: number
}

export default function AdminPage() {
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'aktiv'),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
    ]).then(([users, listings, conversations]) => {
      setCounts({
        users: users.count ?? 0,
        activeListings: listings.count ?? 0,
        conversations: conversations.count ?? 0,
      })
    })
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Översikt</h1>
        <p className="text-gray-500 text-sm mt-1">Grundläggande siffror från databasen.</p>
      </div>

      {!supabaseConfigured ? (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm">
          Ingen backend är konfigurerad i den här miljön ännu, så det finns inga siffror att visa.
          Sätt <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> och{' '}
          <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> för att aktivera detta.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: 'Registrerade användare', value: counts?.users, Icon: Users },
            { label: 'Aktiva annonser', value: counts?.activeListings, Icon: Home },
            { label: 'Konversationer', value: counts?.conversations, Icon: MessageSquare },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{value ?? '—'}</div>
              <span className="text-sm text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-8">
        Mer detaljerad analys (visningar, konverteringstratt, sökbeteende) kräver att vi bygger ut
        händelsespårning i backend — det finns inte ännu.
      </p>
    </div>
  )
}
