import Link from 'next/link'
import { ArrowRight, MapPin, Shield, Zap, Users, Home, Star } from 'lucide-react'
import { MOCK_LISTINGS } from '@/lib/mock-data'
import ListingCard from '@/components/ListingCard'

export default function HomePage() {
  const featured = MOCK_LISTINGS.filter((l) => l.status === 'aktiv').slice(0, 4)

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-emerald-50 to-white overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)", backgroundSize: "40px 40px" }} />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Zap size={14} />
            Stockholms plattform för bostadsbyte
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Byt bostad
            <span className="text-emerald-600"> smidigt</span>
            <br />
            och direkt
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Hitta någon med omvända behov och byt lägenhet direkt — utan mäklare, utan kö.
            Det är så enkelt det ska vara.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/annonser"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
            >
              Hitta ett byte
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/annonser/ny"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Lägg upp din annons
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: '1 200+', label: 'Aktiva annonser' },
              { value: '340', label: 'Genomförda byten' },
              { value: '4.8/5', label: 'Nöjda bytare', icon: <Star size={12} className="text-yellow-400 fill-yellow-400" /> },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                  {stat.icon}
                </div>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Så här fungerar det</h2>
            <p className="text-gray-500">Tre enkla steg till ditt nya hem</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: <Home size={24} />,
                step: '01',
                title: 'Lägg upp din bostad',
                desc: 'Skapa en annons med bilder och beskrivning på din nuvarande bostad. Det tar 5 minuter.',
              },
              {
                icon: <MapPin size={24} />,
                step: '02',
                title: 'Hitta en match',
                desc: 'Bläddra bland annonser på karta eller lista. Filtrera på stadsdel, rum och hyra.',
              },
              {
                icon: <Users size={24} />,
                step: '03',
                title: 'Kontakta och byt',
                desc: 'Skicka ett meddelande, träffas och besikta varandras hem. Klart — byt!',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xs font-bold text-emerald-300 tracking-widest">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Senaste annonserna</h2>
              <p className="text-gray-500 text-sm mt-1">Nya bytesmöjligheter i Stockholm</p>
            </div>
            <Link
              href="/annonser"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Se alla <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: <Shield size={24} />,
                title: 'Verifierade användare',
                desc: 'E-postverifiering och profilkontroll för tryggare byten.',
              },
              {
                icon: <Zap size={24} />,
                title: 'Snabb matchning',
                desc: 'Matchningsindikatorn visar direkt om ni har ömsesidigt intresse.',
              },
              {
                icon: <Users size={24} />,
                title: 'Direktkommunikation',
                desc: 'Chatta direkt med potentiella bytespartners — inga mellanhänder.',
              },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border border-gray-100">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-emerald-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Redo att byta?</h2>
          <p className="text-emerald-100 mb-8">
            Skapa ett konto gratis och lägg upp din annons på några minuter.
          </p>
          <Link
            href="/registrera"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
          >
            Kom igång gratis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">B</span>
                </div>
                <span className="text-white font-bold">Bytaren</span>
              </div>
              <p className="text-sm leading-relaxed">
                Stockholms enklaste sätt att byta bostad direkt.
              </p>
            </div>
            {[
              { title: 'Plattform', links: ['Hitta byte', 'Lägg upp annons', 'Hur det fungerar'] },
              { title: 'Konto', links: ['Logga in', 'Registrera dig', 'Mina sidor'] },
              { title: 'Info', links: ['Om Bytaren', 'Kontakt', 'Villkor & integritet'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-medium mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            © 2026 Bytaren · Byggd av We Know IT
          </div>
        </div>
      </footer>
    </div>
  )
}
