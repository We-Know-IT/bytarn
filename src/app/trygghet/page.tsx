import Link from 'next/link'
import { ArrowRight, Check, MailCheck, MessageSquare, Flag, Wallet, UserCheck, Lock } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

const FEATURES = [
  {
    icon: MailCheck,
    title: 'E-postverifierade profiler',
    desc: 'Alla konton bekräftas via e-post innan de är aktiva. Vill du logga in med BankID är det verifierad legitimation.',
  },
  {
    icon: MessageSquare,
    title: 'Transparent kommunikation',
    desc: 'All kommunikation sker via vår interna chatt. Dela aldrig personliga uppgifter utanför plattformen.',
  },
  {
    icon: Flag,
    title: 'Rapporteringsfunktion',
    desc: 'Om något känns fel kan du rapportera en annons direkt från dess sida. Vi går igenom rapporter manuellt.',
  },
  {
    icon: Wallet,
    title: 'Inga dolda avgifter',
    desc: 'Hyresvägen är gratis och öppen. Vi tjänar inga pengar på att dölja information för dig.',
  },
  {
    icon: UserCheck,
    title: 'Du bestämmer alltid',
    desc: 'Du väljer vem du svarar och när. Alla meddelanden stannar i appen — inga privata uppgifter delas automatiskt.',
  },
  {
    icon: Lock,
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
    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600">
      <Check size={12} strokeWidth={3} className="text-white" />
    </span>
  )
}

export default function Trygghet() {
  return (
    <div>
      {/* Hero */}
      <section>
        <div className="container-page py-14 sm:py-20">
          <PageHeader
            eyebrow="Trygghet"
            title="Din säkerhet"
            accent="är vår prioritet."
            lead="Bostadsbyte är ett stort steg. Hyresvägen är byggd från grunden för att du ska kunna göra det tryggt, transparent och på dina egna villkor."
          />
        </div>
      </section>

      {/* Features */}
      <section className="section bg-[#E3EBE2]">
        <div className="container-page">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 sm:p-7">
                <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#E3EBE2] text-emerald-600">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">{title}</h3>
                <p className="text-[14px] leading-[1.65] text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety tips */}
      <section className="section">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
            <div>
              <p className="eyebrow">Tips från oss</p>
              <h2 className="display-md">Tänk på detta när du byter.</h2>
            </div>
            <ul className="card-muted space-y-4 p-6 sm:p-8">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-3 text-[15px] leading-[1.55] text-gray-900">
                  <CheckIcon />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-[#0D2F26]">
        <div className="container-page text-center">
          <h2 className="display-md mb-8 text-white">Tryggt att byta med Hyresvägen.</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/registrera" className="btn btn-inverse btn-lg btn-arrow">
              Skapa konto <ArrowRight size={15} className="arrow-icon" />
            </Link>
            <Link href="/hur-det-fungerar" className="btn btn-outline-inverse btn-lg">
              Så fungerar det
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
