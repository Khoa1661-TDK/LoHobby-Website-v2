// lib/page-builder.ts — page builder data layer (fetch + cache invalidation)

export type BlockAppearance = {
  background?: 'theme' | 'light' | 'dark' | 'custom' | null;
  backgroundCustom?: string | null;
  backgroundCustomDark?: string | null;
  containerWidth?: 'narrow' | 'normal' | 'wide' | 'full' | null;
  paddingY?: 'compact' | 'base' | 'spacious' | 'none' | null;
};

/** Map Payload appearance fields to Tailwind classes. */
export function blockAppearanceClasses(appearance: BlockAppearance): {
  section: string;
  container: string;
  style: Record<string, string>;
} {
  const bgClass = (() => {
    if (appearance.background === 'light') return 'bg-surface-raised text-ink';
    if (appearance.background === 'dark') return 'bg-ink text-surface';
    if (appearance.background === 'custom') return 'blk-custom-bg';
    return ''; // 'theme' inherits from the page surface
  })();

  const widthClass = (() => {
    switch (appearance.containerWidth) {
      case 'narrow':
        return 'mx-auto max-w-3xl';
      case 'wide':
        return 'mx-auto max-w-screen-2xl';
      case 'full':
        return '';
      default:
        return 'mx-auto max-w-screen-xl';
    }
  })();

  const pyClass = (() => {
    switch (appearance.paddingY) {
      case 'compact':
        return 'py-8';
      case 'spacious':
        return 'py-24';
      case 'none':
        return '';
      default:
        return 'py-16';
    }
  })();

  const customStyle: Record<string, string> = {};
  if (appearance.background === 'custom' && appearance.backgroundCustom) {
    const light = appearance.backgroundCustom;
    customStyle['--blk-bg'] = light;
    customStyle['--blk-bg-dark'] = appearance.backgroundCustomDark || light;
  }

  return {
    section: [bgClass, pyClass].filter(Boolean).join(' '),
    container: `${widthClass} px-4`,
    style: customStyle,
  };
}
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
  | { blockType: 'socialBar' } & Record<string, unknown>;

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
  return getPageBySlug('home', locale);
}