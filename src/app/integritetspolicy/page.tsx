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
    body: 'Du kan när som helst ladda ner dina uppgifter och radera ditt konto själv under Mina sidor → Konto. Att radera kontot tar permanent bort din profil, dina annonser med bilder och video, dina önskemål, favoriter, intresseanmälningar och meddelanden du skickat. Vill du rätta något du inte kan ändra själv, eller har frågor om behandlingen, kontakta oss.',
  },
  {
    // Linked from the cookie banner and footer as /integritetspolicy#cookies.
    id: 'cookies',
    title: '5. Cookies och lagring i webbläsaren',
    body: 'Nödvändiga: vår inloggningstjänst (Supabase) sätter cookies som håller dig inloggad. De behövs för att tjänsten ska fungera och kräver inte samtycke. Funktionella: i webbläsarens lagring (localStorage/sessionStorage) sparar vi utkast till annonser och preferenser, sparade sökningar, ditt cookieval och vilka annonser du har visat under besöket (så att en visning bara räknas en gång). Uppgifterna stannar på din enhet och används inte för spårning. Annonser från Google: endast om du har valt ”Godkänn alla” laddar vi Google AdSense (Google Ireland Ltd.), som använder cookies och liknande tekniker för att visa och mäta annonser. Väljer du ”Endast nödvändiga” laddas inget från Google AdSense. Våra egna sponsrade annonser använder inga cookies.',
  },
  {
    title: '6. Ändra ditt cookieval',
    body: 'Du kan när som helst ändra eller återkalla ditt samtycke via ”Cookieinställningar” längst ned på sidan. Ändringen gäller direkt. Cookies som Google redan har satt kan du ta bort i din webbläsares inställningar.',
  },
  {
    title: '7. Kontakt',
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
