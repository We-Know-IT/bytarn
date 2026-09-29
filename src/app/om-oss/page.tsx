import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

export default function OmOssPage() {
  return (
    <div>
      <section className="border-b border-[rgba(21,63,50,0.06)]">
        <div className="container-page py-14 sm:py-20">
          <PageHeader eyebrow="Om oss" title="Varför Bytaren finns" />
        </div>
      </section>

      <section className="container-page py-12 sm:py-16">
        <div className="max-w-[680px]">
          <div className="prose-page text-[16px]">
            <p className="text-[18px] leading-[1.7] text-gray-800">
              Att byta hyresrätt direkt med någon annan är i teorin ett enkelt sätt att hitta ett nytt hem —
              men i praktiken har det saknat en bra plats att göra det på. Bytaren är byggt för att lösa det:
              en plats där du kan lägga upp din bostad, hitta andra som vill byta, och höra av dig direkt —
              utan mäklare och utan kö.
            </p>
            <p>
              Plattformen är gratis att använda. Vi tjänar inga pengar på att dölja information eller
              sälja din data — Bytaren är en förmedlingsplats, inte en part i själva bytet. Det är alltid
              ni två som kommer överens om villkor och genomför bytet.
            </p>
            <p>
              Vi byggs och utvecklas fortlöpande utifrån vad som faktiskt är användbart för de som byter
              bostad i Stockholm idag — inte bara vad som låter bra i en pitch.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/hur-det-fungerar" className="btn btn-primary btn-arrow">
              Så fungerar det <ArrowRight size={15} className="arrow-icon" />
            </Link>
            <Link href="/kontakt" className="btn btn-secondary">
              Kontakta oss
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
