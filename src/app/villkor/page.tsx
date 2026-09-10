const SECTIONS = [
  {
    title: '1. Vad Bytaren är',
    body: 'Bytaren är en förmedlingsplattform där användare kan annonsera sin bostad och komma i kontakt med andra som vill byta. Bytaren är inte part i något bostadsbyte — avtal om byte, besiktning och tillstånd (t.ex. hyresvärdens godkännande) är alltid en sak mellan de användare som byter med varandra.',
  },
  {
    title: '2. Ditt konto',
    body: 'Du ansvarar för att uppgifterna i din annons och profil är korrekta, och för att hålla ditt lösenord hemligt. Du måste ha rätt att annonsera bostaden — t.ex. genom att vara hyresgäst med rätt att byta, eller ha hyresvärdens godkännande.',
  },
  {
    title: '3. Regler för annonser och kontakt',
    body: 'Annonser ska vara sanningsenliga. Det är inte tillåtet att sälja eller ta betalt för ett byte utöver vad hyresavtal och lag tillåter, att uppträda som någon annan, eller att använda plattformen för annat än att hitta ett bostadsbyte. Vi kan ta bort annonser eller stänga av konton som bryter mot detta.',
  },
  {
    title: '4. Ansvar',
    body: 'Bytaren tillhandahålls i befintligt skick. Vi gör vårt bästa för att plattformen ska fungera och vara trygg att använda, men kan inte garantera att ett byte blir av eller att en motpart är den de utger sig för att vara — se vår trygghetssida för konkreta råd.',
  },
  {
    title: '5. Ändringar',
    body: 'Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas på plattformen innan de börjar gälla.',
  },
]

export default function VillkorPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
        Villkor
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Användarvillkor</h1>

      <div className="mb-8 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        Utkast under juridisk granskning — inte slutgranskat av jurist. Senast uppdaterad{' '}
        {new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}.
      </div>

      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h2>
            <p className="text-[15px] leading-[1.75] text-gray-600">{s.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-gray-400">
        Frågor om villkoren? <a href="/kontakt" className="text-emerald-600 hover:underline">Kontakta oss</a>.
      </p>
    </div>
  )
}
