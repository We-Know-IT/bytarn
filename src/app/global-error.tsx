'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

// Replaces the root layout when it fails, so globals.css and fonts are not
// available: keep it self-contained with inline styles.
export default function GlobalError({
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
    <html lang="sv">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: '#FBFAF7',
          color: '#15211E',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <title>Något gick fel — Hyresvägen</title>
        <main role="alert" style={{ maxWidth: 460 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400, fontSize: 40, margin: 0 }}>
            Något gick fel
          </h1>
          <p style={{ color: '#5F655F', lineHeight: 1.6, marginTop: 16 }}>
            Hyresvägen kunde inte laddas just nu. Försök igen om en stund.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 12,
                border: 'none',
                background: '#153F32',
                color: '#fff',
                font: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Försök igen
            </button>
            {/* Plain <a>: a full reload is the point when the root layout failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: 44,
                padding: '0 20px',
                borderRadius: 12,
                border: '1px solid rgba(21,63,50,0.18)',
                background: '#fff',
                color: '#153F32',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Till startsidan
            </a>
          </div>
          {error.digest && (
            <p style={{ color: '#7A807A', fontSize: 13, marginTop: 32 }}>
              Felkod: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
