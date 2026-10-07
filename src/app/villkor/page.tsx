import LegalPage from '@/components/ui/LegalPage'

const SECTIONS = [
  {
    title: '1. Vad Hyresvägen är',
    body: 'Hyresvägen är en förmedlingsplattform där användare kan annonsera sin bostad och komma i kontakt med andra som vill byta. Hyresvägen är inte part i något bostadsbyte — avtal om byte, besiktning och tillstånd (t.ex. hyresvärdens godkännande) är alltid en sak mellan de användare som byter med varandra.',
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
    body: 'Hyresvägen tillhandahålls i befintligt skick. Vi gör vårt bästa för att plattformen ska fungera och vara trygg att använda, men kan inte garantera att ett byte blir av eller att en motpart är den de utger sig för att vara — se vår trygghetssida för konkreta råd.',
  },
  {
    title: '5. Ändringar',
    body: 'Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas på plattformen innan de börjar gälla.',
  },
]

export default function VillkorPage() {
  return (
    <LegalPage
      eyebrow="Villkor"
      title="Användarvillkor"
      sections={SECTIONS}
      contactLabel="Frågor om villkoren?"
    />
  )
}
