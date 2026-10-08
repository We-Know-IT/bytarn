'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Loader2, Trash2, KeyRound, Ban } from 'lucide-react'
import { exportMyData, deleteMyAccount, DELETE_CONFIRMATION } from '@/lib/account'
import { fetchMyBlocks, unblockUser, type BlockedUser } from '@/lib/blocks'
import { formatDate } from '@/lib/utils'

interface AccountSectionProps {
  userId: string
  email?: string
  hasPassword: boolean
}

// "Konto" on Mina sidor: password, blocked users, data export and account deletion.
export default function AccountSection({ userId, email, hasPassword }: AccountSectionProps) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const blob = await exportMyData(userId, email)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hyresvagen-mina-uppgifter-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Kunde inte hämta dina uppgifter.')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteMyAccount(confirmText.trim())
      try {
        localStorage.removeItem('hyresvagen_saved_searches')
        localStorage.removeItem('hyresvagen_my_listing_draft')
      } catch {}
      // Full reload so every cached piece of the signed-in state is dropped.
      window.location.assign('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Kontot kunde inte raderas.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {hasPassword && (
        <section className="card p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><KeyRound size={16} /> Lösenord</h3>
          <p className="text-sm text-gray-600 mt-1 mb-4">Vill du byta lösenord skickar vi en länk till {email}.</p>
          <Link href="/aterstall-losenord" className="btn btn-secondary btn-sm">Byt lösenord</Link>
        </section>
      )}

      <BlockedUsersCard userId={userId} />

      <section className="card p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Download size={16} /> Ladda ner mina uppgifter</h3>
        <p className="text-sm text-gray-600 mt-1 mb-4">
          En fil (JSON) med din profil, dina annonser, önskemål, favoriter, intresseanmälningar och meddelanden.
        </p>
        <button onClick={handleExport} disabled={exporting} className="btn btn-secondary btn-sm">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? 'Hämtar…' : 'Ladda ner'}
        </button>
        {exportError && <p role="alert" className="text-sm text-red-600 mt-3">{exportError}</p>}
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <h3 className="font-semibold text-red-700 flex items-center gap-2"><Trash2 size={16} /> Radera konto</h3>
        <p className="text-sm text-gray-700 mt-1">
          Ditt konto, din profil, dina annonser (med bilder och video), önskemål, favoriter, intresseanmälningar och
          meddelanden du skickat raderas permanent. Det går inte att ångra. Är du med i ett familjekonto lämnar du det,
          och de andra medlemmarna behåller det.
        </p>
        <label htmlFor="radera-bekrafta" className="label mt-4">
          Skriv <strong>{DELETE_CONFIRMATION}</strong> för att bekräfta
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="radera-bekrafta"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="input sm:max-w-[200px]"
          />
          <button
            onClick={handleDelete}
            disabled={deleting || confirmText.trim() !== DELETE_CONFIRMATION}
            className="btn btn-danger"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {deleting ? 'Raderar…' : 'Radera mitt konto'}
          </button>
        </div>
        {deleteError && <p role="alert" className="text-sm text-red-600 mt-3">{deleteError}</p>}
      </section>
    </div>
  )
}

function BlockedUsersCard({ userId }: { userId: string }) {
  const [state, setState] = useState<{ userId: string; blocks: BlockedUser[] } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchMyBlocks(userId).then((blocks) => {
      if (!cancelled) setState({ userId, blocks })
    })
    return () => {
      cancelled = true
    }
  }, [userId])
  const blocks = state?.userId === userId ? state.blocks : null

  async function handleUnblock(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await unblockUser(userId, id)
      setState((prev) => (prev ? { ...prev, blocks: prev.blocks.filter((b) => b.id !== id) } : prev))
    } catch {
      setError('Kunde inte avblockera. Försök igen.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="card p-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Ban size={16} /> Blockerade användare</h3>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Ni kan inte skriva till varandra och deras annonser döljs för dig. De får inte veta att du blockerat dem.
      </p>
      {blocks === null ? (
        <p className="text-sm text-gray-400">Laddar…</p>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-gray-500">Du har inte blockerat någon.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3">
              {b.avatarUrl ? (
                <img src={b.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div aria-hidden="true" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm flex-shrink-0">
                  {b.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link href={`/profil/${b.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">
                  {b.name}
                </Link>
                <p className="text-xs text-gray-500">Blockerad {formatDate(b.blockedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(b.id)}
                disabled={busyId === b.id}
                className="btn btn-secondary btn-sm"
              >
                {busyId === b.id ? <Loader2 size={14} className="animate-spin" /> : null}
                {busyId === b.id ? 'Avblockerar…' : 'Avblockera'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
    </section>
  )
}
