import Link from 'next/link'
import { ArrowRight, ArrowLeftRight, BedDouble, Scale, ListChecks, ChevronDown } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

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
    icon: ArrowLeftRight,
    title: 'Ömsesidig önskan',
    desc: 'Du vill dit de bor — de vill dit du bor. Matchningen kräver att båda parter pekar på varandra. Inga halvdana byten.',
  },
  {
    icon: BedDouble,
    title: 'Rumspassning',
    desc: 'Ditt antal rum matchar mot vad motparten söker, och vice versa. En 3 rok möter en som faktiskt vill ha 3 rok.',
  },
  {
    icon: Scale,
    title: 'Hyresbalans',
    desc: 'Motorn väger hyrornas nivåer mot varandra. Byten med rimliga skillnader lyfts — extrema obalanser sållas bort.',
  },
  {
    icon: ListChecks,
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
    <div>
      {/* Hero */}
      <section>
        <div className="container-page py-14 sm:py-20">
          <PageHeader
            eyebrow="Så fungerar det"
            title="Byt bostad —"
            accent="i fyra steg."
            lead="Bytaren gör det enkelt att hitta rätt byte. Inget krångel, inga mellanhänder."
          />
        </div>
      </section>

      {/* Steps */}
      <section className="section bg-[#F5F0E8]">
        <div className="container-page">
          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((s) => (
              <li key={s.step} className="card relative p-6 sm:p-7">
                <span className="font-display text-[44px] italic leading-none text-[#C9B08C]">{s.step}</span>
                <h3 className="mb-2 mt-5 text-[17px] font-semibold text-gray-900">{s.title}</h3>
                <p className="text-[14px] leading-[1.65] text-gray-600">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Matching deep-dive */}
      <section className="section">
        <div className="container-page">
          <div className="mb-12 max-w-xl">
            <div className="mb-3 flex items-center gap-2">
              <p className="eyebrow mb-0">Matchningsmotorn</p>
              <span className="badge badge-green">Kommer snart</span>
            </div>
            <h2 className="display-md mb-4">Vad kommer avgöra om det är ett bra byte?</h2>
            <p className="text-[15.5px] leading-[1.7] text-gray-600">
              Idag söker och filtrerar du själv bland annonserna. Vi bygger en algoritm som istället
              ska väga fyra faktorer mot varandra och bara visa dig byten som faktiskt kan fungera — för båda.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {MATCH_CRITERIA.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-muted p-6">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-emerald-600 shadow-xs">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">{title}</h3>
                <p className="text-[14px] leading-[1.65] text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section border-t border-[rgba(21,63,50,0.06)]">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p className="eyebrow">Vanliga frågor</p>
              <h2 className="display-md">Har du frågor?</h2>
              <p className="mt-4 text-[15px] text-gray-600">
                Hittar du inte svaret? <Link href="/kontakt" className="font-medium text-emerald-600 underline decoration-[rgba(21,63,50,0.25)] underline-offset-[3px] hover:decoration-current">Kontakta oss</Link>.
              </p>
            </div>
            <div className="card divide-y divide-[rgba(21,63,50,0.08)] px-2 sm:px-4">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group px-3 py-1 sm:px-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-[16px] font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDown size={18} className="flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 text-[14.5px] leading-[1.65] text-gray-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#0D2F26]">
        <div className="container-page text-center">
          <h2 className="display-md mb-8 text-white">Redo att hitta ditt nästa hem?</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/annonser/ny" className="btn btn-inverse btn-lg btn-arrow">
              Skapa annons <ArrowRight size={15} className="arrow-icon" />
            </Link>
            <Link href="/annonser" className="btn btn-outline-inverse btn-lg">
              Utforska byten
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
