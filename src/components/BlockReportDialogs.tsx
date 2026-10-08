'use client'

import { useEffect, useId, useState } from 'react'
import { Ban, Flag, Loader2, X } from 'lucide-react'
import { blockUser, reportUser, validateReportReason, REPORT_REASON_MAX } from '@/lib/blocks'

// Shared dialogs for blocking and reporting another user (chat, profile,
// listing). Both follow the ProfileEditModal pattern on Mina sidor.

function useEscape(onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, enabled])
}

function DialogShell({
  titleId,
  title,
  icon,
  onClose,
  children,
}: {
  titleId: string
  title: string
  icon: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 id={titleId} className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {icon}
            {title}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Stäng">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Confirm dialog for blocking someone. Calls onBlocked after a successful block. */
export function BlockUserDialog({
  userId,
  other,
  onClose,
  onBlocked,
}: {
  userId: string
  other: { id: string; name: string }
  onClose: () => void
  onBlocked: () => void
}) {
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEscape(onClose, !busy)

  async function handleBlock() {
    setBusy(true)
    setError(null)
    try {
      await blockUser(userId, other.id)
      onBlocked()
    } catch {
      setError('Kunde inte blockera. Försök igen.')
      setBusy(false)
    }
  }

  return (
    <DialogShell titleId={titleId} title={`Blockera ${other.name}?`} icon={<Ban size={18} className="text-red-600" />} onClose={onClose}>
      <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
        <li>Ingen av er kan skriva till den andra, i någon konversation.</li>
        <li>{other.name}s annonser döljs för dig.</li>
        <li>{other.name} får inte veta att du har blockerat hen.</li>
      </ul>
      <p className="text-sm text-gray-500 mt-3">Du kan avblockera när som helst under Mina sidor → Konto.</p>
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={busy}>
          Avbryt
        </button>
        <button type="button" onClick={handleBlock} className="btn btn-danger btn-sm" disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
          {busy ? 'Blockerar…' : 'Blockera'}
        </button>
      </div>
    </DialogShell>
  )
}

/** Modal for reporting someone to the admins. */
export function ReportUserDialog({
  userId,
  other,
  conversationId,
  onClose,
  onReported,
}: {
  userId: string
  other: { id: string; name: string }
  conversationId?: string | null
  onClose: () => void
  onReported?: () => void
}) {
  const titleId = useId()
  const fieldId = useId()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEscape(onClose, !busy)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const invalid = validateReportReason(reason)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await reportUser(userId, other.id, reason, conversationId)
      setSent(true)
      onReported?.()
    } catch {
      setError('Kunde inte skicka anmälan. Försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell titleId={titleId} title={`Anmäl ${other.name}`} icon={<Flag size={18} className="text-red-600" />} onClose={onClose}>
      {sent ? (
        <div role="status">
          <p className="text-sm text-gray-700">
            Tack, din anmälan är skickad. Vi går igenom den så snart vi kan. {other.name} får inte veta vem som anmält.
          </p>
          <div className="flex justify-end mt-5">
            <button type="button" onClick={onClose} className="btn btn-primary btn-sm">
              Stäng
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor={fieldId} className="label">
            Vad har hänt?
          </label>
          <textarea
            id={fieldId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            maxLength={REPORT_REASON_MAX}
            placeholder="Beskriv kort vad som hänt, t.ex. trakasserier, bedrägeriförsök eller falska uppgifter."
            className="input resize-none"
            autoFocus
          />
          <p className="hint">Anmälan går till Hyresvägens moderatorer.{conversationId ? ' Konversationen bifogas.' : ''}</p>
          {error && <p role="alert" className="field-error">{error}</p>}
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={busy}>
              Avbryt
            </button>
            <button type="submit" className="btn btn-danger btn-sm" disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
              {busy ? 'Skickar…' : 'Skicka anmälan'}
            </button>
          </div>
        </form>
      )}
    </DialogShell>
  )
}
