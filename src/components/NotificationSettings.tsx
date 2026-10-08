'use client'

import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { createClient, supabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

type Key = 'notify_email' | 'notify_matches' | 'notify_interests'

const OPTIONS: { key: Key; label: string; hint: string }[] = [
  { key: 'notify_email', label: 'Nya meddelanden', hint: 'Ett mejl när någon skriver till dig.' },
  {
    key: 'notify_matches',
    label: 'Nya annonser som matchar mina sökningar och önskemål',
    hint: 'Gäller sparade sökningar med mejl påslaget och det du har fyllt i under ”Det här söker jag”.',
  },
  { key: 'notify_interests', label: 'När någon visar intresse för min annons', hint: 'Och när ni har visat intresse för varandra.' },
]

/** An on/off switch styled like the onboarding toggle. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-default',
        checked ? 'bg-emerald-600' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </button>
  )
}

/** E-postaviseringar — the three per-kind opt-outs on your own profiles row. */
export default function NotificationSettings({ userId }: { userId: string }) {
  const [values, setValues] = useState<Record<Key, boolean> | null>(null)
  const [saving, setSaving] = useState<Key | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    createClient()
      .from('profiles')
      .select('notify_email, notify_matches, notify_interests')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError('Kunde inte hämta dina aviseringsinställningar.')
          return
        }
        setValues({
          notify_email: data?.notify_email !== false,
          notify_matches: data?.notify_matches !== false,
          notify_interests: data?.notify_interests !== false,
        })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  // Keeps the cached profile (e.g. profile.notifyEmail) in sync after a save.
  const { refreshProfile } = useAuth()

  async function toggle(key: Key, next: boolean) {
    if (!values) return
    const previous = values
    setValues({ ...values, [key]: next })
    setSaving(key)
    setError(null)
    const { error: err } = await createClient().from('profiles').update({ [key]: next }).eq('id', userId)
    setSaving(null)
    if (err) {
      setValues(previous)
      setError('Kunde inte spara. Försök igen.')
      return
    }
    refreshProfile().catch(() => {})
  }

  if (!supabaseConfigured) return null

  return (
    <section className="card p-5 sm:p-6 mb-6" aria-labelledby="notification-settings-heading">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={16} className="text-emerald-700" />
        <h2 id="notification-settings-heading" className="font-semibold text-gray-900">
          E-postaviseringar
        </h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Välj vad vi får mejla dig om. Ändringar sparas direkt.</p>

      {!values && !error ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={14} className="animate-spin" /> Hämtar inställningar…
        </p>
      ) : (
        values && (
          <ul className="divide-y divide-gray-100">
            {OPTIONS.map((o) => (
              <li key={o.key} className="flex items-start gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{o.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{o.hint}</p>
                </div>
                <Switch
                  checked={values[o.key]}
                  onChange={(next) => toggle(o.key, next)}
                  label={o.label}
                  disabled={saving === o.key}
                />
              </li>
            ))}
          </ul>
        )
      )}

      {error && (
        <p role="alert" className="mt-3 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm break-words">
          {error}
        </p>
      )}
    </section>
  )
}
