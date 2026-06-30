// lib/page-builder.ts — page builder data layer (fetch + cache invalidation)
//
// Client-safe appearance helpers live in ./page-builder-appearance (no server
// imports) and are re-exported here for server consumers. `'use client'` blocks
// must import them from ./page-builder-appearance directly — importing from this
// module would pull the server-only APIs below into the client bundle.
export {
  type BlockAppearance,
  blockAppearanceClasses,
} from './page-builder-appearance';

import config from '@payload-config';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { type Locale } from '@/i18n/routing';

const PAGES_TAG = 'pages';

export function revalidatePageCache(slug: string): void {
  try {
    revalidateTag(PAGES_TAG);
    revalidateTag(`page-${slug}`);
  } catch (error) {
    console.warn(
      '[pages] revalidate skipped:',
      error instanceof Error ? error.message : error,
    );
  }
}

export type PageBlock =
  | { blockType: 'hero' } & Record<string, unknown>
  | { blockType: 'featuredCollection' } & Record<string, unknown>
  | { blockType: 'featuredProducts' } & Record<string, unknown>
  | { blockType: 'richText' } & Record<string, unknown>
  | { blockType: 'imageWithText' } & Record<string, unknown>
  | { blockType: 'gallery' } & Record<string, unknown>
  | { blockType: 'testimonials' } & Record<string, unknown>
  | { blockType: 'logoCloud' } & Record<string, unknown>
  | { blockType: 'newsletter' } & Record<string, unknown>
  | { blockType: 'faq' } & Record<string, unknown>
  | { blockType: 'promoBanner' } & Record<string, unknown>
  | { blockType: 'videoEmbed' } & Record<string, unknown>
  | { blockType: 'divider' } & Record<string, unknown>
  | { blockType: 'recommendations' } & Record<string, unknown>
  | { blockType: 'recentlyViewed' } & Record<string, unknown>
  | { blockType: 'button' } & Record<string, unknown>
  | { blockType: 'text' } & Record<string, unknown>
  | { blockType: 'socialBar' } & Record<string, unknown>
  | { blockType: 'spacer' } & Record<string, unknown>
  | { blockType: 'columns' } & Record<string, unknown>
  | { blockType: 'callToAction' } & Record<string, unknown>
  | { blockType: 'stats' } & Record<string, unknown>
  | { blockType: 'quote' } & Record<string, unknown>
  | { blockType: 'cardGrid' } & Record<string, unknown>
  | { blockType: 'banner' } & Record<string, unknown>
  | { blockType: 'steps' } & Record<string, unknown>
  | ({ blockType: 'pricingTable' } & Record<string, unknown>)
  | ({ blockType: 'countdown' } & Record<string, unknown>)
  | ({ blockType: 'tabs' } & Record<string, unknown>)
  | ({ blockType: 'featureGrid' } & Record<string, unknown>)
  | ({ blockType: 'productShowcase' } & Record<string, unknown>)
  | ({ blockType: 'reels' } & Record<string, unknown>);

export type PageDoc = {
  id: string | number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  layout: PageBlock[];
  meta?: { title?: string; description?: string; image?: unknown };
  updatedAt?: string;
};

type RawPageDoc = {
  id: string | number;
  title?: unknown;
  slug?: unknown;
  status?: unknown;
  layout?: unknown;
  meta?: unknown;
  updatedAt?: unknown;
};

/** Map a raw Payload page doc to the storefront PageDoc shape, or null if invalid. */
function toPageDoc(doc: RawPageDoc | undefined, fallbackSlug: string): PageDoc | null {
  if (!doc || typeof doc.title !== 'string') return null;
  return {
    id: doc.id,
    title: doc.title,
    slug: typeof doc.slug === 'string' ? doc.slug : fallbackSlug,
    status: doc.status as 'draft' | 'published',
    layout: Array.isArray(doc.layout) ? (doc.layout as PageBlock[]) : [],
    meta: doc.meta as PageDoc['meta'],
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : undefined,
  };
}

async function fetchPageBySlug(slug: string, locale: Locale): Promise<PageDoc | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'pages',
    locale,
    where: {
      and: [{ slug: { equals: trimmed } }, { status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
    pagination: false,
  });

  return toPageDoc(result.docs[0] as RawPageDoc | undefined, trimmed);
}

/** Draft-mode fetch: uncached and status-agnostic so unpublished edits render in live preview. */
export async function fetchPageBySlugDraft(slug: string, locale: Locale): Promise<PageDoc | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'pages',
    locale,
    where: { slug: { equals: trimmed } },
    limit: 1,
    depth: 2,
    pagination: false,
  });

  return toPageDoc(result.docs[0] as RawPageDoc | undefined, trimmed);
}

// Cache key and the per-slug tag both include the locale; the shared `page-${slug}`
// tag is also attached so revalidatePageCache(slug) clears every locale at once.
const getCachedPage = (slug: string, locale: Locale) =>
  unstable_cache(() => fetchPageBySlug(slug, locale), [`page-${slug}-${locale}`], {
    revalidate: 60,
    tags: [PAGES_TAG, `page-${slug}`, `page-${slug}-${locale}`],
  });

export async function getPageBySlug(slug: string, locale: Locale): Promise<PageDoc | null> {
  return getCachedPage(slug, locale)();
}

export async function getHomePage(locale: Locale): Promise<PageDoc | null> {
  const page = await getPageBySlug('home', locale);
  if (page) return page;

  // No published "home" page was found. Distinguish a genuine absence (normal —
  // the storefront renders its built-in default homepage) from a home page that
  // exists but is unpublished. The latter is a silent footgun: re-saving in the
  // admin or a migration can reset `status` to its "draft" default, which makes
  // the page-builder home disappear with no error. Only that case is worth a log.
  try {
    const existing = await fetchPageBySlugDraft('home', locale);
    if (existing && existing.status !== 'published') {
      console.warn(
        `[pages] home page exists (id=${existing.id}, locale=${locale}) but status is ` +
          `"${existing.status}" — storefront is falling back to the default homepage. ` +
          `Publish it in the admin to render the page-builder layout.`,
      );
    }
  } catch (error) {
    console.warn(
      '[pages] home page status check skipped:',
      error instanceof Error ? error.message : error,
    );
  }
  return null;
}