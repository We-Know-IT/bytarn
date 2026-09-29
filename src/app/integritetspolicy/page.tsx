import LegalPage from '@/components/ui/LegalPage'

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
    <LegalPage
      eyebrow="Integritetspolicy"
      title="Hur vi hanterar dina uppgifter"
      sections={SECTIONS}
      contactLabel="Frågor om integritetspolicyn?"
    />
  )
}
