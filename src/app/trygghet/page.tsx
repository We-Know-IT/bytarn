import Link from 'next/link'
import { Shield, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    title: 'Verifierade profiler',
    desc: 'Alla användare verifieras med e-post och telefonnummer. Du vet alltid vem du pratar med.',
  },
  {
    title: 'Transparent kommunikation',
    desc: 'All kommunikation sker via vår interna chatt. Dela aldrig personliga uppgifter utanför plattformen.',
  },
  {
    title: 'Rapporteringsfunktion',
    desc: 'Om något känns fel kan du rapportera en användare med ett knapptryck. Vi agerar snabbt.',
  },
  {
    title: 'Inga dolda avgifter',
    desc: 'Bytaren är gratis och öppen. Vi tjänar inga pengar på att dölja information för dig.',
  },
  {
    title: 'Du bestämmer alltid',
    desc: 'Du väljer vem du kontaktar och när. Ingen annan kan initiera kontakt utan din åtgärd.',
  },
  {
    title: 'Säker plattform',
    desc: 'All data krypteras och lagras säkert. Vi säljer aldrig din information till tredje part.',
  },
]

const TIPS = [
  'Träffas alltid på ett offentligt ställe vid visning.',
  'Dela aldrig personnummer eller bankuppgifter via chatten.',
  'Kontrollera att adressen stämmer via Lantmäteriets register.',
  'Anlita gärna en jurist för att granska byteskontraktet.',
  'Om en affär känns för bra för att vara sann — var försiktig.',
]

function CheckIcon() {
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#153F32' }}>
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

export default function Trygghet() {
  return (
    <div style={{ backgroundColor: '#FBFAF7' }}>

      {/* Hero */}
      <section style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
              Trygghet
            </p>
            <h1
              className="font-display mb-6"
              style={{
                fontSize: 'clamp(40px, 5vw, 72px)',
                fontStyle: 'italic',
                lineHeight: 1.0,
                letterSpacing: '-0.025em',
                color: '#15211E',
              }}
            >
              Din säkerhet<br />
              <span style={{ color: '#153F32' }}>är vår prioritet.</span>
            </h1>
            <p className="text-[17px] leading-[1.65]" style={{ color: '#6D716C', maxWidth: 520 }}>
              Bostadsbyte är ett stort steg. Bytaren är byggt från grunden för att du ska kunna
              göra det tryggt, transparent och på dina egna villkor.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ backgroundColor: '#E3EBE2', paddingTop: 80, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-7 rounded-[20px]"
                style={{ backgroundColor: 'white', boxShadow: '0 2px 8px rgba(15,30,24,0.04), 0 16px 40px rgba(15,30,24,0.06)' }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: 'rgba(21,63,50,0.08)' }}
                >
                  <Shield size={18} style={{ color: '#153F32' }} />
                </div>
                <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#15211E' }}>
                  {f.title}
                </h3>
                <p className="text-[14px] leading-[1.65]" style={{ color: '#6D716C' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety tips */}
      <section style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
              Tips från oss
            </p>
            <h2
              className="font-display mb-8"
              style={{
                fontSize: 'clamp(28px, 3vw, 42px)',
                fontStyle: 'italic',
                lineHeight: 1.1,
                color: '#15211E',
              }}
            >
              Tänk på detta när du byter.
            </h2>
            <div className="space-y-4">
              {TIPS.map((tip) => (
                <div key={tip} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-[15px] leading-[1.5]" style={{ color: '#15211E' }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: '#0D2F26', paddingTop: 72, paddingBottom: 72 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10 text-center">
          <h2
            className="font-display mb-5"
            style={{
              fontSize: 'clamp(28px, 3.5vw, 48px)',
              fontStyle: 'italic',
              color: 'white',
              lineHeight: 1.05,
            }}
          >
            Tryggt att byta med Bytaren.
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/registrera"
              className="flex items-center gap-2 px-7 py-3.5 rounded-[14px] text-[15px] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-xl"
              style={{ backgroundColor: 'white', color: '#153F32' }}
            >
              Skapa konto <ArrowRight size={15} />
            </Link>
            <Link
              href="/hur-det-fungerar"
              className="flex items-center gap-2 px-7 py-3.5 rounded-[14px] text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px]"
              style={{ border: '1.5px solid rgba(255,255,255,0.18)' }}
            >
              Så fungerar det
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
