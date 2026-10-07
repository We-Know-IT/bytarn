'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Loader2, Mail, Send, Info, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import type { SmtpSettingsResponse } from '@/lib/email/types'

interface FormState {
  host: string
  port: string
  secure: boolean
  username: string
  password: string
  fromName: string
  fromEmail: string
}

type Status = { kind: 'success' | 'error'; text: string } | null

const inputClass =
  'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500'

function toForm(s: SmtpSettingsResponse): FormState {
  return {
    host: s.host,
    port: String(s.port),
    secure: s.secure,
    username: s.username,
    password: '',
    fromName: s.fromName,
    fromEmail: s.fromEmail,
  }
}

export default function AdminInstallningarPage() {
  const { user, profile, loading } = useAuth()
  const [settings, setSettings] = useState<SmtpSettingsResponse | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<Status>(null)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<Status>(null)

  const isAdmin = !!profile?.isAdmin

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/smtp')
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Kunde inte hämta inställningarna.')
        setSettings(body)
        setForm(toForm(body))
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [isAdmin])

  if (loading || (user && !profile)) {
    return (
      <div className="flex justify-center py-24 text-gray-400">
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={22} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Endast för administratörer</h1>
        <p className="text-gray-500 text-sm mb-6">
          {user
            ? 'Ditt konto har inte behörighet att ändra webbplatsens inställningar.'
            : 'Logga in med ett administratörskonto för att se inställningarna.'}
        </p>
        <Link
          href={user ? '/' : '/logga-in'}
          className="inline-flex bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
        >
          {user ? 'Till startsidan' : 'Logga in'}
        </Link>
      </div>
    )
  }

  const readOnly = !!settings?.envOverride

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setSaveStatus(null)
  }

  function applyGmailPreset() {
    setForm((f) =>
      f
        ? {
            ...f,
            host: 'smtp.gmail.com',
            port: '465',
            secure: true,
            fromEmail: f.fromEmail || (f.username.includes('@') ? f.username : ''),
          }
        : f
    )
    setSaveStatus(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form || readOnly) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Kunde inte spara.')
      setSettings(body)
      setForm(toForm(body))
      setSaveStatus({ kind: 'success', text: 'Inställningarna är sparade.' })
    } catch (err) {
      setSaveStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Kunde inte spara.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestStatus(null)
    try {
      const res = await fetch('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo.trim() || undefined }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Testmejlet kunde inte skickas.')
      setTestStatus({ kind: 'success', text: `Testmejl skickat till ${body.to}. Kolla inkorgen (och skräpposten).` })
    } catch (err) {
      setTestStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Testmejlet kunde inte skickas.' })
    } finally {
      setTesting(false)
    }
  }

  const passwordChanged = !!form?.password
  const unsavedChanges =
    !!form && !!settings && JSON.stringify({ ...form, password: '' }) !== JSON.stringify(toForm(settings))

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inställningar</h1>
        <p className="text-gray-500 text-sm mt-1">E-post (SMTP) för inbjudningar och meddelandeaviseringar.</p>
      </div>

      {loadError && (
        <div className="mb-6 flex gap-2 items-start border border-red-200 bg-red-50 text-red-700 rounded-2xl p-4 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          {loadError}
        </div>
      )}

      {!form && !loadError && (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      )}

      {form && settings && (
        <div className="space-y-6">
          <SourceBadge settings={settings} />

          {readOnly && (
            <div className="flex gap-2 items-start border border-amber-200 bg-amber-50 text-amber-800 rounded-2xl p-4 text-sm">
              <Lock size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                SMTP styrs av miljövariabler (<code className="font-mono text-xs">SMTP_HOST</code>,{' '}
                <code className="font-mono text-xs">SMTP_USER</code>, <code className="font-mono text-xs">SMTP_PASS</code>{' '}
                …) på servern. De har företräde framför inställningarna här, så formuläret är skrivskyddat. Ta bort
                variablerna för att hantera SMTP härifrån istället.
                {settings.envIncomplete && (
                  <p className="mt-2 font-medium">
                    Obs: miljövariablerna är ofullständiga — SMTP_HOST, SMTP_USER och SMTP_PASS måste alla vara satta.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Mail size={18} className="text-emerald-600" /> SMTP-server
              </h2>
              {!readOnly && (
                <button
                  type="button"
                  onClick={applyGmailPreset}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg"
                >
                  <Sparkles size={15} /> Använd Gmail-förinställning
                </button>
              )}
            </div>

            <fieldset disabled={readOnly} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="sm:col-span-2 block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Server (värd)</span>
                  <input
                    className={inputClass}
                    value={form.host}
                    onChange={(e) => update('host', e.target.value)}
                    placeholder="smtp.gmail.com"
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Port</span>
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port}
                    onChange={(e) => update('port', e.target.value)}
                    required
                  />
                </label>
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Kryptering</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { value: true, label: 'SSL/TLS', hint: 'Vanligtvis port 465' },
                    { value: false, label: 'STARTTLS', hint: 'Vanligtvis port 587' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                secure: opt.value,
                                // Switch the matching default port if the current one is the other default.
                                port: f.port === '465' && !opt.value ? '587' : f.port === '587' && opt.value ? '465' : f.port,
                              }
                            : f
                        )
                      }
                      className={cn(
                        'text-left border rounded-xl px-3.5 py-2.5 text-sm transition-colors disabled:cursor-not-allowed',
                        form.secure === opt.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      )}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Användarnamn</span>
                  <input
                    className={inputClass}
                    value={form.username}
                    onChange={(e) => update('username', e.target.value)}
                    placeholder="namn@gmail.com"
                    autoComplete="off"
                    required
                  />
                  <span className="block text-xs text-gray-400 mt-1">För Gmail: hela e-postadressen.</span>
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Applösenord</span>
                  <input
                    className={inputClass}
                    type="password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder={settings.hasPassword ? '•••••• (sparat)' : 'abcd efgh ijkl mnop'}
                    autoComplete="new-password"
                    required={!settings.hasPassword && !readOnly}
                  />
                  <span className="block text-xs text-gray-400 mt-1">
                    {settings.hasPassword
                      ? 'Lämna tomt för att behålla det sparade lösenordet.'
                      : 'Mellanslag tas bort automatiskt.'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Avsändarnamn</span>
                  <input
                    className={inputClass}
                    value={form.fromName}
                    onChange={(e) => update('fromName', e.target.value)}
                    placeholder="Hyresvägen"
                    maxLength={100}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Avsändaradress</span>
                  <input
                    className={inputClass}
                    type="email"
                    value={form.fromEmail}
                    onChange={(e) => update('fromEmail', e.target.value)}
                    placeholder={form.username || 'namn@gmail.com'}
                  />
                  <span className="block text-xs text-gray-400 mt-1">
                    Gmail: kontots adress eller ett verifierat ”Skicka e-post som”-alias.
                  </span>
                </label>
              </div>
            </fieldset>

            {saveStatus && <StatusMessage status={saveStatus} />}

            {!readOnly && (
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Spara inställningar
                </button>
                {(unsavedChanges || passwordChanged) && (
                  <span className="text-xs text-amber-600">Osparade ändringar</span>
                )}
              </div>
            )}
          </form>

          <section className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Send size={18} className="text-emerald-600" /> Skicka testmejl
            </h2>
            <p className="text-sm text-gray-500">
              Skickar med de <strong>sparade</strong> inställningarna. Lämna tomt för att skicka till {user.email}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className={inputClass}
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={user.email ?? 'du@example.com'}
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || settings.source === 'none'}
                className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl whitespace-nowrap"
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Skicka testmejl
              </button>
            </div>
            {settings.source === 'none' && (
              <p className="text-xs text-gray-400">Spara inställningarna först.</p>
            )}
            {unsavedChanges && settings.source !== 'none' && (
              <p className="text-xs text-amber-600">Du har osparade ändringar — testet använder de sparade värdena.</p>
            )}
            {testStatus && <StatusMessage status={testStatus} />}
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Så skickar du via Gmail</h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
              <li>
                Aktivera <strong>tvåstegsverifiering</strong> på Google-kontot som ska skicka mejlen (
                <a
                  href="https://myaccount.google.com/signinoptions/two-step-verification"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline"
                >
                  myaccount.google.com → Säkerhet
                </a>
                ). Applösenord finns bara när den är påslagen.
              </li>
              <li>
                Gå till{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline"
                >
                  myaccount.google.com/apppasswords
                </a>
                .
              </li>
              <li>
                Skapa ett nytt applösenord, t.ex. med namnet ”Hyresvägen”. Google visar en kod på 16 bokstäver.
              </li>
              <li>
                Klicka <em>Använd Gmail-förinställning</em> ovan, fyll i hela Gmail-adressen som användarnamn och
                klistra in koden som applösenord. Ditt vanliga Google-lösenord fungerar <strong>inte</strong>.
              </li>
              <li>Spara och skicka ett testmejl.</li>
            </ol>
            <p className="text-xs text-gray-400 mt-4">
              Google Workspace fungerar likadant. Gmail begränsar antalet utskick (runt 500 mottagare per dygn för
              vanliga konton), vilket räcker för inbjudningar och aviseringar på en mindre sajt.
            </p>
          </section>

          <section className="flex gap-3 items-start border border-sky-200 bg-sky-50 text-sky-900 rounded-2xl p-5 text-sm">
            <Info size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Supabase Auths egna mejl ställs in separat</p>
              <p>
                Bekräftelse av registrering, återställning av lösenord och inloggningslänkar skickas av Supabase, inte
                av Hyresvägen. För att även de ska gå via Gmail: öppna{' '}
                <strong>Supabase Dashboard → Authentication → SMTP Settings</strong>, aktivera Custom SMTP och fyll i
                samma värden (värd smtp.gmail.com, port 465, användarnamn = Gmail-adressen, lösenord = applösenordet,
                avsändare = Gmail-adressen).
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SourceBadge({ settings }: { settings: SmtpSettingsResponse }) {
  const map = {
    env: { text: 'Aktiv — från miljövariabler', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    database: { text: 'Aktiv — sparad i databasen', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    none: { text: 'Inte konfigurerad — inga mejl skickas', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  } as const
  const entry = settings.envIncomplete
    ? { text: 'Ofullständiga miljövariabler — inga mejl skickas', cls: 'bg-red-50 text-red-700 border-red-200' }
    : map[settings.source]
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-full', entry.cls)}>
        {settings.source !== 'none' && !settings.envIncomplete ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
        {entry.text}
      </span>
      {settings.updatedAt && (
        <span className="text-xs text-gray-400">
          Senast ändrad {new Date(settings.updatedAt).toLocaleString('sv-SE')}
        </span>
      )}
    </div>
  )
}

function StatusMessage({ status }: { status: NonNullable<Status> }) {
  return (
    <div
      className={cn(
        'flex gap-2 items-start rounded-xl px-3.5 py-2.5 text-sm',
        status.kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
      )}
    >
      {status.kind === 'success' ? (
        <CheckCircle2 size={17} className="flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle size={17} className="flex-shrink-0 mt-0.5" />
      )}
      <span>{status.text}</span>
    </div>
  )
}
