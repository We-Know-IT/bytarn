'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Loader2, Crown, Mail, X, Pencil, Check, LogOut, Copy, CheckCircle2, AlertCircle, UserMinus,
  Home, Edit2, PauseCircle, RefreshCw, Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabaseConfigured } from '@/lib/supabase/client'
import {
  createHousehold,
  fetchMyHousehold,
  leaveHousehold,
  removeHouseholdMember,
  renameHousehold,
  revokeHouseholdInvite,
  sendHouseholdInvite,
  type Household,
} from '@/lib/household'
import { cn, formatDate } from '@/lib/utils'

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const primaryBtn =
  'inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap'

function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) {
    return err.message
  }
  return fallback
}

export default function FamiljPage() {
  const { user, loading: authLoading } = useAuth()
  const [household, setHousehold] = useState<Household | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setHousehold(await fetchMyHousehold())
    } catch (err) {
      setError(errorText(err, 'Kunde inte hämta familjekontot.'))
    } finally {
      setLoaded(true)
    }
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchMyHousehold()
      .then((h) => {
        if (!cancelled) setHousehold(h)
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, 'Kunde inte hämta familjekontot.'))
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (authLoading || (user && !loaded)) {
    return (
      <div className="flex justify-center py-24 text-gray-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  if (!supabaseConfigured) {
    return (
      <Shell>
        <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-2xl p-5 text-sm">
          Familjekonton kräver en backend, och ingen är konfigurerad i den här miljön ännu.
        </div>
      </Shell>
    )
  }

  if (!user) {
    return (
      <Shell>
        <Explainer />
        <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
          <p className="text-gray-600 text-sm mb-4">Logga in för att skapa eller gå med i ett familjekonto.</p>
          <div className="flex justify-center gap-3">
            <Link href="/logga-in" className={primaryBtn}>
              Logga in
            </Link>
            <Link
              href="/registrera"
              className="inline-flex items-center border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              Skapa konto
            </Link>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {error && <Alert kind="error" text={error} onClose={() => setError(null)} />}
      {household ? (
        <HouseholdView household={household} userId={user.id} onChange={reload} onError={setError} />
      ) : (
        <>
          <Explainer />
          <CreateHouseholdForm onCreated={reload} />
        </>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
          <Users size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Familjekonto</h1>
          <p className="text-gray-500 text-sm">Sköt ert lägenhetsbyte tillsammans.</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  )
}

function Explainer() {
  const perks = [
    { Icon: Edit2, text: 'Redigera varandras annonser' },
    { Icon: PauseCircle, text: 'Pausa och återaktivera' },
    { Icon: RefreshCw, text: 'Förnya annonser innan de löper ut' },
    { Icon: Trash2, text: 'Ta bort annonser' },
  ]
  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-6">
      <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Home size={18} className="text-emerald-600" /> Vad är ett familjekonto?
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Bor ni flera i samma lägenhet? Med ett familjekonto kopplar ni ihop era konton så att alla i hushållet kan
        hantera varandras annonser. Då kan en familj eller ett par sambos sköta bytet tillsammans — oavsett vem som
        skapade annonsen.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {perks.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
            <Icon size={16} className="text-emerald-600 flex-shrink-0" />
            {text}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400 mt-4">
        Du kan bara vara med i ett familjekonto åt gången, och du kan lämna det när du vill.
      </p>
    </section>
  )
}

function CreateHouseholdForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createHousehold(name.trim())
      await onCreated()
    } catch (err) {
      setError(errorText(err, 'Kunde inte skapa familjekontot.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Skapa ett familjekonto</h2>
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1.5">Namn på hushållet</span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="t.ex. Familjen Andersson"
          maxLength={80}
        />
      </label>
      {error && <Alert kind="error" text={error} />}
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        Skapa familjekonto
      </button>
    </form>
  )
}

function HouseholdView({
  household,
  userId,
  onChange,
  onError,
}: {
  household: Household
  userId: string
  onChange: () => Promise<void>
  onError: (msg: string) => void
}) {
  const isOwner = household.members.some((m) => m.userId === userId && m.role === 'owner')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)

  async function run(id: string, action: () => Promise<void>, fallback: string) {
    setBusyId(id)
    try {
      await action()
      await onChange()
    } catch (err) {
      onError(errorText(err, fallback))
    } finally {
      setBusyId(null)
    }
  }

  const soleMember = household.members.length === 1

  return (
    <>
      <HouseholdName name={household.name} canRename={isOwner} onRenamed={onChange} onError={onError} />

      <section className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Medlemmar ({household.members.length})</h2>
        <ul className="divide-y divide-gray-100">
          {household.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatarUrl} alt={m.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold flex-shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">
                  {m.name}
                  {m.userId === userId && <span className="text-gray-400 font-normal"> (du)</span>}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {m.role === 'owner' ? (
                    <>
                      <Crown size={12} className="text-amber-500" /> Ägare
                    </>
                  ) : (
                    'Medlem'
                  )}
                </p>
              </div>
              {isOwner && m.userId !== userId && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Ta bort ${m.name} från familjekontot?`)) {
                      run(m.userId, () => removeHouseholdMember(m.userId), 'Kunde inte ta bort medlemmen.')
                    }
                  }}
                  disabled={busyId === m.userId}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {busyId === m.userId ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
                  <span className="hidden sm:inline">Ta bort</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <InviteForm onInvited={onChange} />

      {household.invites.length > 0 && (
        <section className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Väntande inbjudningar</h2>
          <ul className="divide-y divide-gray-100">
            {household.invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-400">Inbjuden {formatDate(inv.createdAt).toLowerCase()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => run(inv.id, () => revokeHouseholdInvite(inv.id), 'Kunde inte återkalla inbjudan.')}
                  disabled={busyId === inv.id}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {busyId === inv.id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                  Återkalla
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white border border-gray-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Lämna familjekontot</h2>
        <p className="text-sm text-gray-500 mb-4">
          {soleMember
            ? 'Du är den enda medlemmen, så familjekontot tas bort när du lämnar det. Dina annonser påverkas inte.'
            : isOwner
              ? 'Om du lämnar blir den medlem som varit med längst ny ägare. De andra kan då inte längre hantera dina annonser.'
              : 'De andra i hushållet kan då inte längre hantera dina annonser, och du kan inte hantera deras.'}
        </p>
        {confirmLeave ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Är du säker?</span>
            <button
              type="button"
              onClick={() => run('leave', leaveHousehold, 'Kunde inte lämna familjekontot.')}
              disabled={busyId === 'leave'}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              {busyId === 'leave' && <Loader2 size={15} className="animate-spin" />}
              Ja, lämna
            </button>
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <LogOut size={15} /> Lämna familjekontot
          </button>
        )}
      </section>
    </>
  )
}

function HouseholdName({
  name,
  canRename,
  onRenamed,
  onError,
}: {
  name: string
  canRename: boolean
  onRenamed: () => Promise<void>
  onError: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || value.trim() === name) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await renameHousehold(value.trim())
      await onRenamed()
      setEditing(false)
    } catch (err) {
      onError(errorText(err, 'Kunde inte byta namn.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-6">
      <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mb-1">Ditt hushåll</p>
      {editing ? (
        <form onSubmit={save} className="flex gap-2">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={80}
            className="flex-1 min-w-0 bg-white/15 placeholder-emerald-100 text-white border border-white/30 rounded-xl px-3.5 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-white/60"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="Spara namn"
            className="w-10 h-10 flex items-center justify-center bg-white text-emerald-700 rounded-xl disabled:opacity-60"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={18} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(name)
              setEditing(false)
            }}
            aria-label="Avbryt"
            className="w-10 h-10 flex items-center justify-center bg-white/15 rounded-xl"
          >
            <X size={18} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold truncate">{name}</h2>
          {canRename && (
            <button
              type="button"
              onClick={() => {
                setValue(name)
                setEditing(true)
              }}
              aria-label="Byt namn"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      )}
      <p className="text-emerald-50 text-sm mt-2">
        Alla medlemmar kan redigera, pausa, förnya och ta bort varandras annonser.
      </p>
    </section>
  )
}

function InviteForm({ onInvited }: { onInvited: () => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; emailSent: boolean; link?: string; emailError?: string } | null>(
    null
  )
  const [copied, setCopied] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    setCopied(false)
    try {
      const to = email.trim()
      const res = await sendHouseholdInvite(to)
      setResult({ email: to, ...res })
      setEmail('')
      await onInvited()
    } catch (err) {
      setError(errorText(err, 'Kunde inte skicka inbjudan.'))
    } finally {
      setBusy(false)
    }
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Bjud in någon</h2>
        <p className="text-sm text-gray-500 mt-1">
          Personen får en länk och går med genom att logga in med samma e-postadress.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="namn@example.com"
        />
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          Skicka inbjudan
        </button>
      </form>

      {error && <Alert kind="error" text={error} />}

      {result?.emailSent && <Alert kind="success" text={`Inbjudan skickad till ${result.email}.`} />}

      {result && !result.emailSent && result.link && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm text-amber-900 space-y-3">
          <p>
            Inbjudan är skapad, men vi kunde inte mejla den
            {result.emailError ? ` (${result.emailError.replace(/\.$/, '')})` : ''}. Kopiera länken och skicka den
            till {result.email} själv:
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={result.link}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => copy(result.link!)}
              className={cn(
                'inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg',
                copied ? 'bg-emerald-600 text-white' : 'bg-white border border-amber-200 hover:bg-amber-100'
              )}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Kopierad' : 'Kopiera'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function Alert({ kind, text, onClose }: { kind: 'error' | 'success'; text: string; onClose?: () => void }) {
  return (
    <div
      className={cn(
        'flex gap-2 items-start rounded-xl px-3.5 py-2.5 text-sm',
        kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
      )}
    >
      {kind === 'success' ? (
        <CheckCircle2 size={17} className="flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle size={17} className="flex-shrink-0 mt-0.5" />
      )}
      <span className="flex-1">{text}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Stäng" className="opacity-60 hover:opacity-100">
          <X size={15} />
        </button>
      )}
    </div>
  )
}
