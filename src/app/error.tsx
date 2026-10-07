'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container-page py-20 sm:py-28">
      <title>Något gick fel — Hyresvägen</title>
      <div role="alert" className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Tekniskt fel</p>
        <h1 className="display-lg">Något gick fel</h1>
        <p className="lead mx-auto mt-5 max-w-[460px]">
          Sidan kunde inte visas just nu. Det är oftast tillfälligt — försök igen om en stund.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => retry()} className="btn btn-primary">
            Försök igen
          </button>
          <Link href="/" className="btn btn-secondary">
            Till startsidan
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 text-[13px] text-gray-500">
            Kontaktar du oss om felet, ange felkoden{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12.5px] text-gray-700">{error.digest}</code>.
          </p>
        )}
      </div>
    </div>
  )
}
