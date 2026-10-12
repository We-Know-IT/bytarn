import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FileText, MessageSquare } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Så ansöker du om lägenhetsbyte',
  description:
    'Vad som krävs för att byta hyresrätt, hur ansökan till hyresvärden går till, vilka underlag som brukar efterfrågas och vad du gör om hyresvärden säger nej.',
}

const STEPS = [
  {
    title: 'Bestäm er och titta på varandras lägenheter',
    body: 'Besök lägenheterna innan ni ansöker. Kom överens om ett önskat bytesdatum. Det brukar bli den första i en månad, efter att båda hyresvärdarna har sagt ja.',
  },
  {
    title: 'Fråga din hyresvärd hur de vill ha ansökan',
    body: 'Var och en ansöker hos sin egen hyresvärd. Många större hyresvärdar har en egen blankett eller e-tjänst, ofta under "Mina sidor" på deras webbplats. Fråga också vilka underlag de vill ha.',
  },
  {
    title: 'Fyll i och skicka in',
    body: 'Fyll i hyresvärdens blankett eller använd vår ifyllda bytesansökan som underlag. Den skapar du i chatten med den du ska byta med. Bifoga det som efterfrågas och skriv tydligt varför du vill byta.',
  },
  {
    title: 'Hyresvärden prövar ansökan',
    body: 'Hyresvärden brukar kontrollera den nya hyresgästens inkomst, ta en kreditupplysning och kontakta nuvarande hyresvärd. Räkna med att det tar några veckor, ibland ett par månader.',
  },
  {
    title: 'Skriv nya kontrakt och flytta',
    body: 'När båda hyresvärdarna har godkänt bytet skriver ni nya hyreskontrakt. Flytta inte förrän ni har ett skriftligt godkännande.',
  },
]

const DOCUMENTS = [
  'Hyresvärdens ansökningsblankett, om de har en',
  'Anställningsbevis och lönespecifikationer, eller intyg om studier, pension eller annan inkomst',
  'Personbevis från Skatteverket som visar vilka som bor i hushållet',
  'Kopia av ditt nuvarande hyreskontrakt',
  'Kontaktuppgifter till din nuvarande hyresvärd (för referens)',
  'En kort motivering till varför du vill byta',
]

const REASONS = [
  'Familjen har blivit större eller mindre, t.ex. barn, separation eller att ni flyttar ihop',
  'Nytt jobb eller nya studier långt från där du bor',
  'Du behöver en billigare bostad',
  'Hälsa eller tillgänglighet, t.ex. att du behöver hiss eller en lägenhet utan trappor',
]

export default function AnsokanOmBytePage() {
  return (
    <div>
      <section>
        <div className="container-page py-14 sm:py-20">
          <PageHeader
            eyebrow="Guide"
            title="Så ansöker du om lägenhetsbyte"
            lead="Ett byte av hyresrätt måste godkännas av båda hyresvärdarna. Här är vad som krävs, hur det går till och vad du gör om svaret blir nej."
          />
        </div>
      </section>

      <section className="section bg-[#F5F0E8] pt-12">
        <div className="container-page">
          <h2 className="mb-8 text-[24px] font-semibold tracking-[-0.015em] text-gray-900">Steg för steg</h2>
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card p-6">
                <span className="text-[14px] font-semibold tabular-nums text-[#6F8A6A]">0{i + 1}</span>
                <h3 className="mb-2 mt-3 text-[16.5px] font-semibold text-gray-900">{step.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-gray-600">{step.body}</p>
              </li>
            ))}
            <li className="card flex flex-col justify-between gap-4 border-dashed bg-transparent p-6 shadow-none">
              <div>
                <FileText size={22} className="text-[#153F32]" />
                <h3 className="mb-2 mt-3 text-[16.5px] font-semibold text-gray-900">Ifylld bytesansökan</h3>
                <p className="text-[14.5px] leading-relaxed text-gray-600">
                  Öppna chatten med den du ska byta med och välj <strong>Skapa bytesansökan</strong> under
                  &quot;Mer&quot;. Båda lägenheterna fylls i automatiskt och du kan skriva ut eller spara som PDF.
                </p>
              </div>
              <Link href="/meddelanden" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#153F32] hover:underline">
                <MessageSquare size={15} /> Till meddelanden
              </Link>
            </li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="prose-page">
            <h2>Vad lagen säger</h2>
            <p>
              Enligt <strong>12 kap. 35 § jordabalken</strong> får du byta din hyreslägenhet mot en annan bostad om du
              har <strong>beaktansvärda skäl</strong> för bytet och det kan ske <strong>utan påtaglig olägenhet för
              hyresvärden</strong>. Säger hyresvärden ja behövs inget mer. Säger hyresvärden nej kan hyresnämnden ge
              tillstånd i stället.
            </p>
            <p>Exempel på skäl som brukar räknas som beaktansvärda:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              {REASONS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p>
              &quot;Påtaglig olägenhet&quot; kan till exempel vara att den nya hyresgästen inte bedöms kunna betala hyran.
              Bytet måste också vara på riktigt: den som byter till sig lägenheten ska flytta in och bo där.
            </p>
            <p>
              <strong>Det är olagligt att ta eller ge betalt för ett hyreskontrakt.</strong> Ber någon om pengar för att
              byta, avbryt och anmäl annonsen.
            </p>
          </div>

          <div className="space-y-10">
            <div className="prose-page">
              <h2>Underlag som brukar efterfrågas</h2>
              <ul className="list-disc space-y-1.5 pl-5">
                {DOCUMENTS.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p>Hyresvärdar har olika krav, så fråga din hyresvärd vad just de vill ha.</p>
            </div>

            <div className="prose-page">
              <h2>Om hyresvärden säger nej</h2>
              <p>
                Du kan ansöka om tillstånd till bytet hos <strong>hyresnämnden</strong>. Det kostar ingenting.
                Hyresnämnden prövar om du har beaktansvärda skäl och om bytet kan ske utan påtaglig olägenhet för
                hyresvärden. Är du medlem i Hyresgästföreningen kan de hjälpa dig med ansökan.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[rgba(21,63,50,0.07)] bg-[#E3EBE2]">
        <div className="container-page flex flex-col items-start justify-between gap-5 py-10 sm:flex-row sm:items-center">
          <p className="max-w-xl text-[14px] text-gray-600">
            Det här är allmän information, inte juridisk rådgivning. Vid frågor om just ditt byte, kontakta din
            hyresvärd, hyresnämnden eller Hyresgästföreningen.
          </p>
          <Link href="/annonser" className="btn btn-primary">
            Hitta någon att byta med <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
