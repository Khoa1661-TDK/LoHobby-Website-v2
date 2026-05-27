// lib/seo.ts — shared SEO helpers for Metadata API, JSON-LD, and sitemap
import { getSiteName } from '@/lib/brand';
import { normalizeProductImageUrl } from '@/lib/product-image-snapshot';
import { absoluteUrl, baseUrl } from '@/lib/utils';

type MediaDoc = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type SeoMeta = {
  title?: string | null;
  description?: string | null;
  image?: MediaDoc | string | number | null;
};

export function getAppUrl(): string {
  return baseUrl;
}

export function productCanonicalPath(slug: string): string {
  return `/product/${slug}`;
}

export function categoryCanonicalPath(slug: string): string {
  return `/search/${slug}`;
}

export function resolveSeoImage(
  meta: SeoMeta | null | undefined,
  fallback?: { url: string; alt?: string; width?: number; height?: number },
): { url: string; alt?: string; width?: number; height?: number } | undefined {
  const image = meta?.image;
  if (image && typeof image === 'object' && typeof image.url === 'string' && image.url.trim()) {
    return {
      url: normalizeProductImageUrl(image.url),
      alt: image.alt ?? undefined,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
    };
  }

  if (fallback?.url) {
    return fallback;
  }

  return undefined;
}

export function buildProductJsonLd(input: {
  title: string;
  description: string;
  slug: string;
  price: number;
  available: boolean;
  images: string[];
  sku: string;
}): Record<string, unknown> {
  const canonical = absoluteUrl(productCanonicalPath(input.slug));
  const siteName = getSiteName();

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': canonical,
    name: input.title,
    description: input.description,
    image: input.images,
    sku: input.sku,
    url: canonical,
    brand: { '@type': 'Brand', name: siteName },
    offers: {
      '@type': 'Offer',
      price: Math.max(0, Math.round(input.price)),
      priceCurrency: 'VND',
      availability: input.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: canonical,
    },
  };
}
