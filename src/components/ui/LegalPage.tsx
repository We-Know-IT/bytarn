import Link from 'next/link'
import { Info } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'

/** Shared layout for policy/terms pages: header, draft notice, numbered sections with a jump list. */
export default function LegalPage({
  eyebrow,
  title,
  sections,
  contactLabel,
}: {
  eyebrow: string
  title: string
  sections: { title: string; body: string }[]
  contactLabel: string
}) {
  return (
    <div className="container-page py-12 sm:py-16 lg:py-20">
      <PageHeader eyebrow={eyebrow} title={title} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Innehåll" className="hidden lg:block">
          <div className="sticky top-[calc(var(--nav-h)+32px)]">
            <p className="eyebrow">Innehåll</p>
            <ol className="space-y-2 border-l border-[rgba(21,63,50,0.10)]">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <a
                    href={`#avsnitt-${i + 1}`}
                    className="-ml-px block border-l-2 border-transparent py-0.5 pl-4 text-[13.5px] text-gray-600 transition-colors hover:border-emerald-600 hover:text-emerald-600"
                  >
                    {s.title.replace(/^\d+\.\s*/, '')}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="max-w-[680px]">
          <div className="mb-10 flex gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-[14px] leading-relaxed text-amber-900">
            <Info size={17} className="mt-0.5 flex-shrink-0 text-amber-700" />
            <p>Utkast under juridisk granskning — inte slutgranskat av jurist.</p>
          </div>

          <div className="card p-6 sm:p-10">
            <div className="prose-page">
              {sections.map((s, i) => (
                <section key={s.title} id={`avsnitt-${i + 1}`} className="first:[&>h2]:mt-0">
                  <h2>{s.title}</h2>
                  <p>{s.body}</p>
                </section>
              ))}
            </div>
          </div>

          <p className="mt-8 text-[14px] text-gray-500">
            {contactLabel}{' '}
            <Link href="/kontakt" className="font-medium text-emerald-600 underline decoration-[rgba(21,63,50,0.25)] underline-offset-[3px] hover:decoration-current">
              Kontakta oss
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
