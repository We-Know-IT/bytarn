import { Mail } from 'lucide-react'

const CONTACT_EMAIL = 'hej@bytaren.se'

export default function KontaktPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
        Kontakt
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Hör av dig</h1>

      <p className="text-[15px] leading-[1.75] text-gray-600 mb-8 max-w-xl">
        Frågor om ditt konto, en annons, eller något som känns fel? Mejla oss så återkommer vi så
        snart vi kan.
      </p>

      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="inline-flex items-center gap-3 px-5 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Mail size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{CONTACT_EMAIL}</p>
          <p className="text-xs text-gray-400">Vi svarar vanligtvis inom ett par arbetsdagar</p>
        </div>
      </a>
    </div>
  )
}
