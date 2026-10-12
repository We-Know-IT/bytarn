// Short, factual descriptions of each district, used in suggested listing
// texts so they say something about the area even when the nearby-places
// lookup (Overpass) is unavailable. Keep these to well-known facts.

export const DISTRICT_INFO: Record<string, { preposition: 'på' | 'i'; blurb: string }> = {
  Södermalm: {
    preposition: 'på',
    blurb: 'Södermalm är en av Stockholms mest levande stadsdelar, med kaféer, restauranger och butiker längs Götgatan och Hornsgatan, parker som Tantolunden och Vitabergsparken och nära till vattnet.',
  },
  Östermalm: {
    preposition: 'på',
    blurb: 'Östermalm är en lugn innerstadsdel med Östermalms saluhall, Humlegården och nära till Djurgårdens grönska.',
  },
  Kungsholmen: {
    preposition: 'på',
    blurb: 'Kungsholmen är omgivet av vatten, med strandpromenaden längs Norr Mälarstrand, Rålambshovsparken och ett lugnt innerstadsliv kring Fridhemsplan.',
  },
  Vasastan: {
    preposition: 'i',
    blurb: 'Vasastan är en populär innerstadsdel med sekelskifteshus, Vasaparken och Observatorielunden och gott om kaféer och restauranger kring Odengatan och S:t Eriksplan.',
  },
  Norrmalm: {
    preposition: 'på',
    blurb: 'Norrmalm är Stockholms city, med Centralstationen och Kungsträdgården och nära till shopping, kultur och kommunikationer.',
  },
  'Gamla Stan': {
    preposition: 'i',
    blurb: 'Gamla stan är Stockholms historiska kärna med medeltida gränder, Stortorget och Slottet, och vatten på alla sidor.',
  },
  Lidingö: {
    preposition: 'på',
    blurb: 'Lidingö är en ö nordost om innerstaden med mycket natur, bad och promenadstråk, och Lidingöbanan in mot Ropsten.',
  },
  Nacka: {
    preposition: 'i',
    blurb: 'Nacka ligger öster om Södermalm med naturreservat, sjöar och skärgårdskänsla, och Saltsjöbanan och bussar in mot Slussen.',
  },
  Sundbyberg: {
    preposition: 'i',
    blurb: 'Sundbyberg har en tät och levande stadskärna och både pendeltåg och tunnelbana in till city.',
  },
  Solna: {
    preposition: 'i',
    blurb: 'Solna gränsar till innerstaden i norr, med Hagaparken, Mall of Scandinavia och snabba förbindelser med pendeltåg och tunnelbana.',
  },
  Bromma: {
    preposition: 'i',
    blurb: 'Bromma är en grön och lugn stadsdel väster om innerstaden, nära Mälaren och med tunnelbanans gröna linje in till city.',
  },
  Hägersten: {
    preposition: 'i',
    blurb: 'Hägersten ligger sydväst om Södermalm med mycket grönska, närhet till Mälaren och tunnelbanans röda linje in till city.',
  },
  Skärholmen: {
    preposition: 'i',
    blurb: 'Skärholmen har ett stort centrum med butiker och service, natur i Sätraskogen och tunnelbanans röda linje in till city.',
  },
  Farsta: {
    preposition: 'i',
    blurb: 'Farsta har ett stort centrum, närhet till sjön Magelungen och naturområden, och både tunnelbanans gröna linje och pendeltåg.',
  },
  Enskede: {
    preposition: 'i',
    blurb: 'Enskede är känt för sin trädgårdsstad med lummiga kvarter, och har tunnelbanans gröna linje in till city.',
  },
  Djurgården: {
    preposition: 'på',
    blurb: 'Djurgården är en grön ö mitt i Stockholm med Skansen, museer och stora parkområden.',
  },
  Liljeholmen: {
    preposition: 'i',
    blurb: 'Liljeholmen ligger vid vattnet söder om Södermalm, med nya kvarter kring Liljeholmstorget, tunnelbanans röda linje och Tvärbanan.',
  },
}

/** "på Södermalm", "i Vasastan"; unknown districts get "i". */
export function inDistrict(district: string): string {
  return `${DISTRICT_INFO[district]?.preposition ?? 'i'} ${district}`
}
