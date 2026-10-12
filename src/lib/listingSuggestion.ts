import type { SwapPreferences } from '@/types'
import { DISTRICT_INFO, inDistrict } from '@/lib/districts'
import { describeNeighborhood, titlePhrase, type Neighborhood } from '@/lib/neighborhood'

// "Föreslå" in the listing form: a title and description built only from
// what the user filled in, their swap preferences, a short description of
// the district and — when available — real nearby places from
// OpenStreetMap. Nothing is invented.

export interface SuggestionInput {
  rooms: string
  area: string
  rent: string
  floor: string
  district: string
  address: string
  elevator: boolean
  balcony: boolean
  strollerFriendly: boolean
  wheelchairAccessible: boolean
}

const sek = (n: number) => new Intl.NumberFormat('sv-SE').format(n)

/** "Hornsgatan 45, 118 49 Stockholm" → "Hornsgatan 45". */
export function streetAddress(address: string): string {
  return address.split(',')[0].trim()
}

/** 3 → "3:a", 2.5 → "2,5:a". */
export function roomsLabel(rooms: string | number): string {
  const n = Number(rooms)
  if (!Number.isFinite(n) || n <= 0) return 'Lägenhet'
  return `${String(n).replace('.', ',')}:a`
}

function joinOr(items: string[], word: 'och' | 'eller'): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`
}

export function suggestTitle(f: SuggestionInput, area: Neighborhood | null): string {
  const base = `${roomsLabel(f.rooms)}${f.balcony ? ' med balkong' : ''} ${f.district ? inDistrict(f.district) : 'i Stockholm'}`
  const place = area && titlePhrase(area)
  const title = place ? `${base} ${place}` : f.area ? `${base}, ${f.area} m²` : base
  return title.slice(0, 80)
}

function homeParagraph(f: SuggestionInput): string {
  const where = [f.address && `på ${streetAddress(f.address)}`, f.district && inDistrict(f.district)].filter(Boolean).join(' ')
  const size = f.area ? ` på ${f.area} m²` : ''
  const rooms = Number(f.rooms) > 0 ? `${String(Number(f.rooms)).replace('.', ',')}-rumslägenhet` : 'Lägenhet'
  const sentences = [`${rooms}${size}${where ? ` ${where}` : ''}.`]

  if (f.floor) sentences.push(`Lägenheten ligger på våning ${f.floor}${f.elevator ? ' och det finns hiss' : ''}.`)
  else if (f.elevator) sentences.push('Det finns hiss.')
  if (f.balcony) sentences.push('Balkong finns.')
  const adapted = [f.strollerFriendly && 'barnvagnsanpassad', f.wheelchairAccessible && 'rullstolsanpassad'].filter(Boolean) as string[]
  if (adapted.length > 0) sentences.push(`Bostaden är ${joinOr(adapted, 'och')}.`)
  if (Number(f.rent) > 0) sentences.push(`Hyran är ${sek(Number(f.rent))} kr/mån.`)
  return sentences.join(' ')
}

function areaParagraph(district: string, area: Neighborhood | null): string | null {
  const parts = [DISTRICT_INFO[district]?.blurb, ...(area ? describeNeighborhood(area) : [])].filter(Boolean)
  return parts.length > 0 ? `Om området: ${parts.join(' ')}` : null
}

function wishParagraph(prefs: SwapPreferences | null): string {
  if (!prefs) return 'Jag söker byte inom Stockholm. Hör av dig om du tror att vi kan passa varandra.'
  const what =
    prefs.rooms.length > 0
      ? `en ${joinOr([...prefs.rooms].sort((a, b) => a - b).map((r) => (r >= 5 ? '5:a eller större' : roomsLabel(r))), 'eller')}`
      : 'en lägenhet'
  const where = prefs.districts.length > 0 ? ` ${joinOr(prefs.districts.map(inDistrict), 'eller')}` : ' i Stockholm'
  const extras: string[] = []
  if (prefs.minArea) extras.push(`minst ${prefs.minArea} m²`)
  if (prefs.maxRent) extras.push(`en hyra på högst ${sek(prefs.maxRent)} kr/mån`)
  const needs = [
    prefs.needsElevator && 'hiss',
    prefs.needsBalcony && 'balkong',
    prefs.needsWheelchair && 'rullstolsanpassning',
    prefs.needsStroller && 'plats för barnvagn',
    prefs.needsPets && 'att husdjur är tillåtna',
  ].filter(Boolean) as string[]
  const withExtras = extras.length > 0 ? ` med ${joinOr(extras, 'och')}` : ''
  const withNeeds = needs.length > 0 ? `. Det behöver finnas ${joinOr(needs, 'och')}` : ''
  return `Jag söker ${what}${where}${withExtras}${withNeeds}. Hör av dig om du tror att vi kan passa varandra.`
}

export function suggestDescription(f: SuggestionInput, area: Neighborhood | null, prefs: SwapPreferences | null): string {
  return [homeParagraph(f), areaParagraph(f.district, area), wishParagraph(prefs)].filter(Boolean).join('\n\n')
}
