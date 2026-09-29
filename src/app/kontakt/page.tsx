import Link from 'next/link'
import { Mail, ArrowUpRight, Shield, BookOpen } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

const CONTACT_EMAIL = 'hej@bytaren.se'

export default function KontaktPage() {
  return (
    <div className="container-page py-14 sm:py-20">
      <PageHeader
        eyebrow="Kontakt"
        title="Hör av dig"
        lead="Frågor om ditt konto, en annons, eller något som känns fel? Mejla oss så återkommer vi så snart vi kan."
      />

      <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="card card-hover group flex items-start gap-4 p-5 sm:col-span-2 sm:p-6"
        >
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#E3EBE2] text-emerald-600">
            <Mail size={20} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-gray-900 group-hover:text-emerald-600">{CONTACT_EMAIL}</span>
            <span className="mt-0.5 block text-[13.5px] text-gray-500">Vi svarar vanligtvis inom ett par arbetsdagar</span>
          </span>
          <ArrowUpRight size={18} className="mt-1 text-gray-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>

        <Link href="/trygghet" className="card-muted card-hover group flex items-center gap-3 p-5">
          <Shield size={18} strokeWidth={1.75} className="text-emerald-600" />
          <span className="text-[14.5px] font-medium text-gray-900">Råd för ett tryggt byte</span>
        </Link>
        <Link href="/hur-det-fungerar" className="card-muted card-hover group flex items-center gap-3 p-5">
          <BookOpen size={18} strokeWidth={1.75} className="text-emerald-600" />
          <span className="text-[14.5px] font-medium text-gray-900">Vanliga frågor</span>
        </Link>
      </div>
    </div>
  )
}
