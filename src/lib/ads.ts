import { createClient, supabaseConfigured } from '@/lib/supabase/client'

export type AdPlacement = 'listing_grid' | 'listing_detail' | 'home'

export const AD_PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: 'listing_grid', label: 'Annonslistan (mellan annonserna)' },
  { value: 'listing_detail', label: 'Annonssidan (sidokolumn)' },
  { value: 'home', label: 'Startsidan' },
]

export interface Ad {
  id: string
  advertiser: string
  headline: string
  body: string | null
  imageUrl: string | null
  linkUrl: string
  placement: AdPlacement
  active: boolean
  startsAt: string | null
  endsAt: string | null
  clicks: number
}

type AdRow = {
  id: string
  advertiser: string
  headline: string
  body: string | null
  image_url: string | null
  link_url: string
  placement: AdPlacement
  active: boolean
  starts_at: string | null
  ends_at: string | null
  clicks: number
}

function rowToAd(r: AdRow): Ad {
  return {
    id: r.id,
    advertiser: r.advertiser,
    headline: r.headline,
    body: r.body,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    placement: r.placement,
    active: r.active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    clicks: r.clicks,
  }
}

export function isLive(ad: Pick<Ad, 'active' | 'startsAt' | 'endsAt'>, now = Date.now()): boolean {
  return (
    ad.active &&
    (!ad.startsAt || new Date(ad.startsAt).getTime() <= now) &&
    (!ad.endsAt || new Date(ad.endsAt).getTime() > now)
  )
}

// One request per placement per page load, shared by every slot on the page
// (the listing grid can render several).
const livePromises = new Map<AdPlacement, Promise<Ad[]>>()

export function fetchLiveAds(placement: AdPlacement): Promise<Ad[]> {
  if (!supabaseConfigured) return Promise.resolve([])
  let p = livePromises.get(placement)
  if (!p) {
    p = Promise.resolve(
      createClient().from('ads').select('*').eq('placement', placement).eq('active', true)
    ).then(({ data, error }) => {
      // Missing table (migration not run yet) or any other error: no ads.
      if (error) return []
      return (data as AdRow[]).map(rowToAd).filter((ad) => isLive(ad))
    })
    livePromises.set(placement, p)
  }
  return p
}

export function recordAdClick(id: string): void {
  if (!supabaseConfigured) return
  void createClient().rpc('record_ad_click', { p_ad_id: id })
}

// ── Admin ──────────────────────────────────────────────────────────────────

export interface AdInput {
  advertiser: string
  headline: string
  body: string
  imageUrl: string
  linkUrl: string
  placement: AdPlacement
  active: boolean
  startsAt: string
  endsAt: string
}

function toRow(input: AdInput) {
  return {
    advertiser: input.advertiser.trim(),
    headline: input.headline.trim(),
    body: input.body.trim() || null,
    image_url: input.imageUrl.trim() || null,
    link_url: input.linkUrl.trim(),
    placement: input.placement,
    active: input.active,
    starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : null,
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
  }
}

export async function fetchAllAds(): Promise<Ad[]> {
  const { data, error } = await createClient().from('ads').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as AdRow[]).map(rowToAd)
}

export async function saveAd(input: AdInput, id?: string): Promise<void> {
  const supabase = createClient()
  const { error } = id
    ? await supabase.from('ads').update(toRow(input)).eq('id', id)
    : await supabase.from('ads').insert(toRow(input))
  if (error) throw error
}

export async function setAdActive(id: string, active: boolean): Promise<void> {
  const { error } = await createClient().from('ads').update({ active }).eq('id', id)
  if (error) throw error
}

export async function deleteAd(id: string): Promise<void> {
  const { error } = await createClient().from('ads').delete().eq('id', id)
  if (error) throw error
}
