'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import {
  ADSENSE_ENABLED,
  COOKIE_POLICY_HREF,
  onOpenConsentSettings,
  setConsent,
  useConsent,
} from '@/lib/consent'

const dateFormat = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long' })

/**
 * Cookie consent banner. Shown automatically only when Google AdSense is
 * configured and no choice has been made; can always be reopened through
 * openConsentSettings() (footer "Cookieinställningar"). Non-modal: the page
 * stays usable, focus is only moved when the user opens it themselves.
 */
export default function CookieBanner() {
  const consent = useConsent()
  const [manualOpen, setManualOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(
    () =>
      onOpenConsentSettings(() => {
        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setManualOpen(true)
        // Already open: still move focus to it.
        dialogRef.current?.focus()
      }),
    [],
  )

  // consent === undefined while hydrating: render nothing so server and client match.
  const needsDecision = ADSENSE_ENABLED && consent === null
  const visible = consent !== undefined && (needsDecision || manualOpen)

  useEffect(() => {
    if (visible && manualOpen) dialogRef.current?.focus()
  }, [visible, manualOpen])

  const close = useCallback(() => {
    setManualOpen(false)
    const el = returnFocusRef.current
    returnFocusRef.current = null
    if (el?.isConnected) el.focus()
  }, [])

  const choose = (ads: boolean) => {
    const withdrew = consent?.ads === true && !ads
    setConsent({ ads })
    // Google's script can't be unloaded; reload so it stops running right away.
    if (withdrew && document.querySelector('script[src*="adsbygoogle"]')) {
      window.location.reload()
      return
    }
    close()
  }

  const canDismiss = !needsDecision

  if (!visible) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && canDismiss) {
          e.stopPropagation()
          close()
        }
      }}
      className="animate-fade-up fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-[560px] rounded-[20px] border border-[rgba(21,63,50,0.12)] bg-white p-5 shadow-[0_12px_40px_rgba(13,45,38,0.18)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="cookie-banner-title" className="text-[16px] font-semibold leading-snug text-gray-900">
          {ADSENSE_ENABLED ? 'Cookies på Hyresvägen' : 'Vi använder bara nödvändiga cookies'}
        </h2>
        {canDismiss && (
          <button
            type="button"
            onClick={close}
            className="-mr-2 -mt-2 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Stäng cookieinställningar"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      <div id="cookie-banner-desc" className="mt-2 space-y-2 text-[14px] leading-relaxed text-gray-600">
        {ADSENSE_ENABLED ? (
          <>
            <p>
              Nödvändiga cookies för inloggning används alltid, och vi sparar vissa val i din webbläsare (t.ex. utkast och
              sparade sökningar) för att sidan ska fungera.
            </p>
            <p>
              Med ditt samtycke visar vi även <strong className="font-semibold text-gray-800">annonser från Google</strong>,
              som använder cookies. Du kan ändra ditt val när som helst under ”Cookieinställningar” längst ned på sidan.
            </p>
          </>
        ) : (
          <p>
            Hyresvägen använder bara cookies som behövs för inloggning, och sparar vissa val i din webbläsare (t.ex. utkast
            och sparade sökningar). Inga cookies för annonser eller spårning används, så det finns inget att samtycka till.
          </p>
        )}
        {ADSENSE_ENABLED && consent && (
          <p className="text-[13px] text-gray-500">
            Ditt nuvarande val: {consent.ads ? 'Godkänn alla' : 'Endast nödvändiga'}
            {formatDate(consent.decidedAt)}.
          </p>
        )}
        <p>
          <Link
            href={COOKIE_POLICY_HREF}
            onClick={() => canDismiss && close()}
            className="font-medium text-emerald-600 underline decoration-[rgba(21,63,50,0.25)] underline-offset-[3px] hover:decoration-current"
          >
            Läs mer i integritetspolicyn
          </Link>
        </p>
      </div>

      {ADSENSE_ENABLED ? (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button type="button" className="btn btn-secondary" onClick={() => choose(false)}>
            Endast nödvändiga
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => choose(true)}>
            Godkänn alla
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <button type="button" className="btn btn-secondary" onClick={close}>
            Stäng
          </button>
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : ` (${dateFormat.format(d)})`
}
