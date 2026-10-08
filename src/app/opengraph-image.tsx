import { ImageResponse } from 'next/og'

// Default share image for pages without their own (listing pages use the
// listing's first photo instead — see app/annonser/[id]/layout.tsx).
export const alt = 'Hyresvägen — bostadsbyte i Stockholm'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#F5F0E8',
          color: '#15211E',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: '#153F32',
              color: '#F5F0E8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Swap arrows drawn as SVG: a text glyph would make ImageResponse
                download a fallback font at render time. */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F5F0E8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h14l-4-4" />
              <path d="M20 16H6l4 4" />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase' }}>Hyresvägen</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: '#153F32' }}>Byt hyresrätt direkt.</div>
          <div style={{ fontSize: 34, color: '#6D716C' }}>Utan mäklare och utan kö — hitta ditt byte i Stockholm.</div>
        </div>
      </div>
    ),
    size
  )
}
