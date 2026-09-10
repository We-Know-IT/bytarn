import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    title: 'Skapa din annons',
    desc: 'Berätta om din nuvarande bostad och vad du söker. Det tar ungefär fem minuter och är helt kostnadsfritt.',
  },
  {
    step: '02',
    title: 'Sök och filtrera',
    desc: 'Filtrera på stadsdel, antal rum och hyra, eller utforska annonser direkt på kartan. En smartare matchning som analyserar ömsesidig önskan och hyresbalans åt dig är på väg.',
  },
  {
    step: '03',
    title: 'Ta kontakt',
    desc: 'Hör av dig direkt via vår interna chatt. Du väljer alltid vem du kontaktar — vi stressar dig inte.',
  },
  {
    step: '04',
    title: 'Byt bostad',
    desc: 'Ni bestämmer villkor och datum er emellan. Bytaren är plattformen — ni är de som gör affären.',
  },
]

const MATCH_CRITERIA = [
  {
    icon: '⇄',
    title: 'Ömsesidig önskan',
    desc: 'Du vill dit de bor — de vill dit du bor. Matchningen kräver att båda parter pekar på varandra. Inga halvdana byten.',
  },
  {
    icon: '◫',
    title: 'Rumspassning',
    desc: 'Ditt antal rum matchar mot vad motparten söker, och vice versa. En 3 rok möter en som faktiskt vill ha 3 rok.',
  },
  {
    icon: '≈',
    title: 'Hyresbalans',
    desc: 'Motorn väger hyrornas nivåer mot varandra. Byten med rimliga skillnader lyfts — extrema obalanser sållas bort.',
  },
  {
    icon: '✦',
    title: 'Extrakrav matchas',
    desc: 'Balkong, hiss, husdjur tillåtet. Dina måsten vägs mot motpartens bostad — så du aldrig behöver kompromissa i onödan.',
  },
]

const FAQS = [
  {
    q: 'Kostar det något att använda Bytaren?',
    a: 'Nej, det är helt gratis att söka, annonsera och kontakta andra användare.',
  },
  {
    q: 'Behöver jag en mäklare?',
    a: 'Nej. Bytaren är byggt för att ni ska kunna byta direkt med varandra, utan mellanhänder.',
  },
  {
    q: 'Hur säkert är det?',
    a: 'Alla användare verifieras. Du kan läsa mer om våra säkerhetsfunktioner på vår trygghetssida.',
  },
  {
    q: 'Fungerar det utanför Stockholm?',
    a: 'Just nu fokuserar vi på Stockholm, men vi expanderar snart till fler städer.',
  },
]

export default function HurDetFungerar() {
  return (
    <div style={{ backgroundColor: '#FBFAF7' }}>

      {/* Hero */}
      <section style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#FBFAF7' }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
              Så fungerar det
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
              Byt bostad —<br />
              <span style={{ color: '#153F32' }}>i fyra steg.</span>
            </h1>
            <p className="text-[17px] leading-[1.65]" style={{ color: '#6D716C', maxWidth: 500 }}>
              Bytaren gör det enkelt att hitta rätt byte. Inget krångel, inga mellanhänder.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section style={{ backgroundColor: '#F5F0E8', paddingTop: 80, paddingBottom: 96 }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-6 left-[calc(100%+8px)] right-[-8px] h-px"
                    style={{ backgroundColor: 'rgba(21,63,50,0.12)' }}
                  />
                )}
                <div
                  className="text-[12px] font-bold mb-5"
                  style={{ color: '#A8B9A4', letterSpacing: '0.06em' }}
                >
                  {s.step}
                </div>
                <div
                  className="w-px h-10 mb-5"
                  style={{ backgroundColor: '#153F32' }}
                />
                <h3 className="text-[18px] font-semibold mb-3" style={{ color: '#15211E' }}>
                  {s.title}
                </h3>
                <p className="text-[14px] leading-[1.65]" style={{ color: '#6D716C' }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matching deep-dive */}
      <section style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#FBFAF7' }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="max-w-xl mb-12">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#A8B9A4' }}>
                Matchningsmotorn
              </p>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(21,63,50,0.08)', color: '#153F32' }}
              >
                Kommer snart
              </span>
            </div>
            <h2
              className="font-display mb-4"
              style={{
                fontSize: 'clamp(28px, 3vw, 42px)',
                fontStyle: 'italic',
                lineHeight: 1.05,
                color: '#15211E',
              }}
            >
              Vad kommer avgöra om det är ett bra byte?
            </h2>
            <p className="text-[15px] leading-[1.65]" style={{ color: '#6D716C' }}>
              Idag söker och filtrerar du själv bland annonserna. Vi bygger en algoritm som istället
              ska väga fyra faktorer mot varandra och bara visa dig byten som faktiskt kan fungera — för båda.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {MATCH_CRITERIA.map((c) => (
              <div
                key={c.title}
                className="p-6 rounded-2xl"
                style={{ backgroundColor: 'rgba(21,63,50,0.04)', border: '1px solid rgba(21,63,50,0.08)' }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-base font-semibold mb-5"
                  style={{ backgroundColor: 'rgba(21,63,50,0.09)', color: '#153F32' }}
                >
                  {c.icon}
                </div>
                <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#15211E' }}>{c.title}</h3>
                <p className="text-[14px] leading-[1.65]" style={{ color: '#6D716C' }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ paddingTop: 80, paddingBottom: 80, backgroundColor: '#FBFAF7' }}>
        <div className="max-w-[1360px] mx-auto px-6 sm:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
              Vanliga frågor
            </p>
            <h2
              className="font-display mb-10"
              style={{
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontStyle: 'italic',
                lineHeight: 1.1,
                color: '#15211E',
              }}
            >
              Har du frågor?
            </h2>
            <div className="space-y-0 divide-y" style={{ borderColor: 'rgba(21,63,50,0.10)' }}>
              {FAQS.map((faq) => (
                <div key={faq.q} className="py-6">
                  <p className="text-[16px] font-semibold mb-2" style={{ color: '#15211E' }}>
                    {faq.q}
                  </p>
                  <p className="text-[14px] leading-[1.65]" style={{ color: '#6D716C' }}>
                    {faq.a}
                  </p>
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
            Redo att hitta ditt nästa hem?
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/annonser/ny"
              className="flex items-center gap-2 px-7 py-3.5 rounded-[14px] text-[15px] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-xl"
              style={{ backgroundColor: 'white', color: '#153F32' }}
            >
              Skapa annons <ArrowRight size={15} />
            </Link>
            <Link
              href="/annonser"
              className="flex items-center gap-2 px-7 py-3.5 rounded-[14px] text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px]"
              style={{ border: '1.5px solid rgba(255,255,255,0.18)' }}
            >
              Utforska byten
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
