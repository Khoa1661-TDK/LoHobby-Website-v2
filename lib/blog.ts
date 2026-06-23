// lib/blog.ts — blog data-fetching utilities + cache invalidation (Content)
import config from '@payload-config';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getPayload, type Where } from 'payload';
import { logger } from '@/lib/logger';

export type BlogPostSummary = {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  category: { slug: string; name: string } | null;
  tags: string[];
};

export type BlogPost = BlogPostSummary & {
  body: SerializedEditorState | null;
  author: string | null;
};

export type BlogCategorySummary = {
  id: string | number;
  name: string;
  slug: string;
  description: string | null;
};

/** Cache tags shared by every blog read; flush them after a Payload write. */
export const BLOG_CACHE_TAGS = ['blog', 'posts', 'blog-categories'] as const;

/**
 * Invalidate every cached blog read. Wired into the Posts & BlogCategories
 * `afterChange` / `afterDelete` hooks so the storefront updates within one
 * request instead of after the TTL.
 */
export function revalidateBlogCache(): void {
  try {
    for (const tag of BLOG_CACHE_TAGS) {
      revalidateTag(tag);
    }
  } catch (error) {
    // Safe outside a Next.js request (seed scripts) and during Payload admin
    // saves where the static-generation store may be unavailable.
    logger.warn(
      { err: error instanceof Error ? error.message : error },
      '[blog] revalidate skipped',
    );
  }
}

/** Only surface posts that are published AND whose publishedAt has elapsed. */
function publishedWhere(now = new Date()): Where {
  return {
    and: [
      { status: { equals: 'published' } },
      { publishedAt: { less_than_equal: now.toISOString() } },
    ],
  };
}

function imageUrlOf(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const url = (value as { url?: unknown }).url;
  return typeof url === 'string' ? url : null;
}

function categoryOf(value: unknown): BlogPostSummary['category'] {
  if (typeof value !== 'object' || value === null) return null;
  const cat = value as { slug?: unknown; name?: unknown };
  if (typeof cat.slug !== 'string' || typeof cat.name !== 'string') return null;
  return { slug: cat.slug, name: cat.name };
}

function tagsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) =>
      typeof entry === 'object' && entry !== null
        ? (entry as { tag?: unknown }).tag
        : entry,
    )
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
}

function toSummary(doc: Record<string, unknown>): BlogPostSummary {
  return {
    id: doc.id as string | number,
    title: typeof doc.title === 'string' ? doc.title : '',
    slug: typeof doc.slug === 'string' ? doc.slug : '',
    excerpt: typeof doc.excerpt === 'string' ? doc.excerpt : null,
    coverImageUrl: imageUrlOf(doc.coverImage),
    publishedAt: typeof doc.publishedAt === 'string' ? doc.publishedAt : null,
    category: categoryOf(doc.category),
    tags: tagsOf(doc.tags),
  };
}

async function fetchPublishedPosts(limit: number): Promise<BlogPostSummary[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'posts',
    where: publishedWhere(),
    sort: '-publishedAt',
    limit,
    depth: 1,
    pagination: false,
  });
  return result.docs.map((doc) => toSummary(doc as unknown as Record<string, unknown>));
}

async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'posts',
    where: {
      and: [{ slug: { equals: trimmed } }, publishedWhere()],
    },
    limit: 1,
    depth: 1,
    pagination: false,
  });

  const doc = result.docs[0] as Record<string, unknown> | undefined;
  if (!doc || typeof doc.title !== 'string') return null;

  const author =
    typeof doc.author === 'object' && doc.author !== null
      ? ((doc.author as { name?: unknown; email?: unknown }).name as string) ??
        ((doc.author as { email?: unknown }).email as string) ??
        null
      : null;

  return {
    ...toSummary(doc),
    body: (doc.body as SerializedEditorState | null) ?? null,
    author: typeof author === 'string' ? author : null,
  };
}

async function fetchBlogCategories(): Promise<BlogCategorySummary[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'blog-categories',
    sort: 'name',
    limit: 200,
    depth: 0,
    pagination: false,
  });
  return result.docs.map((raw) => {
    const doc = raw as unknown as Record<string, unknown>;
    return {
      id: doc.id as string | number,
      name: typeof doc.name === 'string' ? doc.name : '',
      slug: typeof doc.slug === 'string' ? doc.slug : '',
      description: typeof doc.description === 'string' ? doc.description : null,
    };
  });
}

const getCachedPublishedPosts = (limit: number) =>
  unstable_cache(() => fetchPublishedPosts(limit), [`blog-posts-${limit}`], {
    revalidate: 60,
    tags: ['blog', 'posts'],
  });

const getCachedPostBySlug = (slug: string) =>
  unstable_cache(() => fetchPostBySlug(slug), [`blog-post-${slug}`], {
    revalidate: 60,
    tags: ['blog', 'posts', `blog-post-${slug}`],
  });

const getCachedBlogCategories = () =>
  unstable_cache(() => fetchBlogCategories(), ['blog-categories'], {
    revalidate: 60,
    tags: ['blog', 'blog-categories'],
  });

export async function getPublishedPosts(limit = 50): Promise<BlogPostSummary[]> {
  return getCachedPublishedPosts(limit)();
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  return getCachedPostBySlug(slug)();
}

export async function getBlogCategories(): Promise<BlogCategorySummary[]> {
  return getCachedBlogCategories()();
}
