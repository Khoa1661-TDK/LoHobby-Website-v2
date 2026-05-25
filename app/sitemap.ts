// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getCollections, getProducts } from '@/lib/shopify';
import { baseUrl } from '@/lib/utils';

type SitemapEntry = MetadataRoute.Sitemap[number];

export const dynamic = 'force-dynamic';
export const revalidate = 60;

function url(path: string): string {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: SitemapEntry[] = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: url('/search'), lastModified: now, changeFrequency: 'daily', priority: 0.7 },
  ];

  const [products, collections] = await Promise.all([
    getProducts({ sortKey: 'CREATED_AT', reverse: true }).catch(() => []),
    getCollections().catch(() => []),
  ]);

  const productEntries: SitemapEntry[] = products.map((product) => ({
    url: url(`/product/${product.handle}`),
    lastModified: product.updatedAt ? new Date(product.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const collectionEntries: SitemapEntry[] = collections
    .filter((collection) => collection.handle !== '')
    .map((collection) => ({
      url: url(`/search/${collection.handle}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  return [...staticEntries, ...collectionEntries, ...productEntries];
}
