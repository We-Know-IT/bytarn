import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function OmOssPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
        Om oss
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Varför Bytaren finns</h1>

      <div className="space-y-5 text-[15px] leading-[1.75] text-gray-600">
        <p>
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
        <Link
          href="/hur-det-fungerar"
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Så fungerar det <ArrowRight size={15} />
        </Link>
        <Link
          href="/kontakt"
          className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Kontakta oss
        </Link>
      </div>
    </div>
  )
}
