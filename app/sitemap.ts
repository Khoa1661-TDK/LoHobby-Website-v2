// app/sitemap.ts
import type { MetadataRoute } from 'next';
import config from '@payload-config';
import { getPayload } from 'payload';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import { getAllInfoSlugs } from '@/lib/info-pages';
import { categoryCanonicalPath, productCanonicalPath } from '@/lib/seo';
import { absoluteUrl } from '@/lib/utils';

type SitemapEntry = MetadataRoute.Sitemap[number];

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config });
  const now = new Date();

  const staticEntries: SitemapEntry[] = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: absoluteUrl('/search'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/faq'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const infoEntries: SitemapEntry[] = getAllInfoSlugs().map((slug) => ({
    url: absoluteUrl(`/info/${slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const [productResult, categoryResult] = await Promise.all([
    payload.find({
      collection: 'products',
      where: {
        available: { equals: true },
        tags: { not_in: [HIDDEN_PRODUCT_TAG] },
      },
      depth: 0,
      limit: 1000,
      pagination: false,
    }),
    payload.find({
      collection: 'categories',
      depth: 0,
      limit: 200,
      pagination: false,
    }),
  ]);

  const productEntries: SitemapEntry[] = productResult.docs
    .filter((doc) => typeof doc.slug === 'string' && doc.slug.trim().length > 0)
    .map((doc) => ({
      url: absoluteUrl(productCanonicalPath(doc.slug as string)),
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

  const categoryEntries: SitemapEntry[] = categoryResult.docs
    .filter((doc) => typeof doc.slug === 'string' && doc.slug.trim().length > 0)
    .map((doc) => ({
      url: absoluteUrl(categoryCanonicalPath(doc.slug as string)),
      lastModified: doc.updatedAt ? new Date(doc.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...infoEntries, ...categoryEntries, ...productEntries];
}
