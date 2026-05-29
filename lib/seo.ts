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

/**
 * Serialize an object for safe embedding in an inline `<script type="application/ld+json">`.
 * `JSON.stringify` does NOT escape `<`, so an admin-controlled string containing
 * `</script>` would otherwise let an attacker close the JSON-LD block and inject
 * arbitrary markup. Escape the unsafe characters before injection.
 *
 * See https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 */
export function jsonLdToScriptString(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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
    // 3D-printing specifics: surface the material and the made-to-order /
    // custom-manufacturing nature so the result can stand out in search.
    material: 'PLA / PETG',
    itemCondition: 'https://schema.org/NewCondition',
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Công nghệ sản xuất', value: 'In 3D (FDM)' },
      { '@type': 'PropertyValue', name: 'Sản xuất', value: 'In theo yêu cầu tại Việt Nam' },
    ],
    offers: {
      '@type': 'Offer',
      price: Math.max(0, Math.round(input.price)),
      priceCurrency: 'VND',
      // In-stock products are printed to order, so signal MadeToOrder rather
      // than a generic InStock to better reflect the fulfilment model.
      availability: input.available
        ? 'https://schema.org/MadeToOrder'
        : 'https://schema.org/OutOfStock',
      url: canonical,
      seller: { '@type': 'Organization', name: siteName },
    },
  };
}

type FaqEntry = { question: string; answer: string };

/** FAQPage schema for the landing page FAQ section (eligible for FAQ rich results). */
export function buildFaqJsonLd(entries: FaqEntry[]): Record<string, unknown> | null {
  const mainEntity = entries
    .filter((entry) => entry.question.trim() && entry.answer.trim())
    .map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    }));

  if (mainEntity.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}

type ItemListProduct = {
  title: string;
  slug: string;
  image?: string | null;
  price?: string | number | null;
  priceCurrency?: string | null;
  available?: boolean;
};

/**
 * ItemList schema with explicit `position` for a category/landing page product
 * grid. Preferred over `CollectionPage.hasPart` because positioned ItemLists are
 * eligible for list/carousel rich results.
 */
export function buildItemListJsonLd(
  products: ItemListProduct[],
  options: { name: string; description?: string },
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: options.name,
    ...(options.description ? { description: options.description } : {}),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => {
      const url = absoluteUrl(productCanonicalPath(product.slug));
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.title,
          url,
          ...(product.image ? { image: product.image } : {}),
          ...(product.price != null
            ? {
                offers: {
                  '@type': 'Offer',
                  price: Math.max(0, Math.round(Number(product.price))),
                  priceCurrency: product.priceCurrency || 'VND',
                  availability:
                    product.available === false
                      ? 'https://schema.org/OutOfStock'
                      : 'https://schema.org/MadeToOrder',
                  url,
                },
              }
            : {}),
        },
      };
    }),
  };
}

type BreadcrumbCrumb = { name: string; path: string };

/** BreadcrumbList schema for the landing page (Trang chủ -> Cửa hàng -> Category). */
export function buildBreadcrumbJsonLd(crumbs: BreadcrumbCrumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}
