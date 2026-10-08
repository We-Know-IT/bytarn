import type { MetadataRoute } from 'next'
import { SITE_URL, createPublicClient } from '@/lib/site'

// Rebuilt at most once an hour.
export const revalidate = 3600

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/annonser', priority: 0.9, changeFrequency: 'daily' },
  { path: '/hur-det-fungerar', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/trygghet', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/om-oss', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/kontakt', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/villkor', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/integritetspolicy', priority: 0.2, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))

  const supabase = createPublicClient()
  if (!supabase) return entries
  const { data, error } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'aktiv')
    .gt('expires_at', new Date().toISOString())
    .order('updated_at', { ascending: false })
    .limit(5000)
  if (error) {
    console.error('Sitemap: kunde inte hämta annonser', error.message)
    return entries
  }
  for (const l of data ?? []) {
    entries.push({ url: `${SITE_URL}/annonser/${l.id}`, lastModified: l.updated_at, changeFrequency: 'weekly', priority: 0.7 })
  }
  return entries
}
