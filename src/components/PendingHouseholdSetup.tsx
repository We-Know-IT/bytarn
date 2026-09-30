'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { createHousehold, fetchMyHousehold, sendHouseholdInvite } from '@/lib/household'
import { clearPendingHousehold, readPendingHousehold } from '@/lib/pendingHousehold'

type Result =
  | { kind: 'created'; name: string; invited?: string; inviteFailed?: boolean }
  | { kind: 'already'; name: string }
  | { kind: 'failed'; message: string }

// Finishes a "Hela hushållet" sign-up the first time the new user is signed
// in: creates the family account and sends the optional invite.
export default function PendingHouseholdSetup() {
  const { user } = useAuth()
  const started = useRef(false)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!user || started.current) return
    const pending = readPendingHousehold(user)
    if (!pending) return
    started.current = true

    ;(async () => {
      try {
        const existing = await fetchMyHousehold()
        if (existing) {
          setResult({ kind: 'already', name: existing.name })
        } else {
          await createHousehold(pending.name)
          let inviteFailed = false
          if (pending.inviteEmail) {
            // An unsent email still leaves a shareable link on /familj.
            inviteFailed = !(await sendHouseholdInvite(pending.inviteEmail).then((r) => r.emailSent, () => false))
          }
          setResult({ kind: 'created', name: pending.name, invited: pending.inviteEmail, inviteFailed })
        }
        await clearPendingHousehold(user)
      } catch (err) {
        started.current = false
        setResult({ kind: 'failed', message: err instanceof Error ? err.message : 'Okänt fel' })
      }
    })()
  }, [user])

  if (!result) return null

  let text: React.ReactNode
  if (result.kind === 'created') {
    text = (
      <>
        Familjekontot <strong>{result.name}</strong> är skapat.
        {result.invited && !result.inviteFailed && <> Inbjudan har skickats till {result.invited}.</>}
        {result.invited && result.inviteFailed && <> Inbjudan kunde inte mejlas, kopiera länken på familjesidan.</>}
      </>
    )
  } else if (result.kind === 'already') {
    text = <>Du är redan med i familjekontot <strong>{result.name}</strong>.</>
  } else {
    text = <>Familjekontot kunde inte skapas ({result.message}). Försök igen på familjesidan.</>
  }

  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-[rgba(21,63,50,0.12)] bg-white p-4 shadow-[0_12px_40px_rgba(13,45,38,0.18)]">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#E3EBE2] text-[#153F32]">
        <Users size={17} />
      </span>
      <div className="min-w-0 flex-1 text-[14px] text-gray-700">
        <p>{text}</p>
        <Link href="/familj" onClick={() => setResult(null)} className="mt-1 inline-block font-semibold text-[#153F32] hover:underline">
          Gå till familjekontot
        </Link>
      </div>
      <button onClick={() => setResult(null)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Stäng">
        <X size={16} />
      </button>
    </div>
  )
}
