// app/robots.ts
import type { MetadataRoute } from 'next';
import { baseUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/product/', '/search'],
        disallow: ['/admin', '/admin/', '/checkout', '/checkout/', '/api', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
