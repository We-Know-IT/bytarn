import type { Metadata } from 'next'
import { SITE_URL, createPublicClient } from '@/lib/site'
import { formatRent } from '@/lib/utils'

// The listing page itself is a client component; this server layout only
// adds a proper title, description and preview image so shared links
// (Messenger, SMS, Slack, Google) show the actual listing.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const fallback: Metadata = { title: 'Annons — Hyresvägen' }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fallback

  const supabase = createPublicClient()
  if (!supabase) return fallback
  const { data } = await supabase
    .from('listings')
    .select('title, description, rooms, area, rent, district, images, status')
    .eq('id', id)
    .maybeSingle()
  if (!data) return { ...fallback, robots: { index: false } }

  const title = `${data.title} — Hyresvägen`
  const facts = `${data.rooms} rok · ${data.area} m² · ${formatRent(data.rent)} · ${data.district}`
  const description = [facts, (data.description ?? '').replace(/\s+/g, ' ').trim()].filter(Boolean).join('. ').slice(0, 200)
  const image = (data.images as string[] | null)?.[0]
  const url = `${SITE_URL}/annonser/${id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: data.status === 'aktiv' ? undefined : { index: false },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'Hyresvägen',
      locale: 'sv_SE',
      images: image ? [{ url: image, alt: data.title }] : undefined,
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children
}
