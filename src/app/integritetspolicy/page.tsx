const SECTIONS = [
  {
    title: '1. Vilka uppgifter vi samlar in',
    body: 'Kontouppgifter (namn, e-post), uppgifter du lägger in i en annons (adress, bild, beskrivning av din bostad), och meddelanden du skickar via plattformens chatt. Om du loggar in med BankID hanteras din identitetsverifiering av vår BankID-leverantör, inte av oss direkt.',
  },
  {
    title: '2. Vad vi använder uppgifterna till',
    body: 'För att visa din annons för andra användare, koppla ihop dig med potentiella bytespartners, och driva kontofunktioner som inloggning och meddelanden. Vi säljer aldrig dina uppgifter till tredje part.',
  },
  {
    title: '3. Var uppgifterna lagras',
    body: 'Data lagras hos vår databasleverantör (Supabase) med kryptering i vila och under överföring. Bilder du laddar upp i en annons är synliga för alla som ser annonsen.',
  },
  {
    title: '4. Dina rättigheter',
    body: 'Du kan när som helst begära ut, rätta eller radera dina uppgifter genom att kontakta oss. Att radera ditt konto tar bort din profil och dina annonser.',
  },
  {
    title: '5. Kontakt',
    body: 'Frågor om hur vi hanterar dina uppgifter? Mejla oss — se kontaktsidan.',
  },
]

export default function IntegritetspolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#A8B9A4' }}>
        Integritetspolicy
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Hur vi hanterar dina uppgifter</h1>

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
        Frågor om integritetspolicyn? <a href="/kontakt" className="text-emerald-600 hover:underline">Kontakta oss</a>.
      </p>
    </div>
  )
}
