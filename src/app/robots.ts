import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in or personal pages: nothing useful for search engines.
      disallow: ['/api/', '/admin', '/mina-sidor', '/meddelanden', '/annonshanterare', '/familj', '/onboarding', '/nytt-losenord', '/auth/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
