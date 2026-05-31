// lib/content-pages.ts — CMS content pages (Phase 3)
import config from '@payload-config';
import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import { isContentPagesEnabled } from '@/lib/feature-flags';

export type ContentBlock =
  | {
      blockType: 'hero';
      headline: string;
      subheadline?: string | null;
      ctaLabel?: string | null;
      ctaHref?: string | null;
      imageUrl?: string | null;
    }
  | { blockType: 'richText'; content: string }
  | {
      blockType: 'cta';
      title: string;
      body?: string | null;
      buttonLabel: string;
      buttonHref: string;
    };

export type ContentPageDoc = {
  title: string;
  slug: string;
  metaDescription: string | null;
  blocks: ContentBlock[];
};

type RawBlock = Record<string, unknown> & { blockType?: string };

function normalizeBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: ContentBlock[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const block = entry as RawBlock;
    const type = typeof block.blockType === 'string' ? block.blockType : '';
    if (type === 'hero' && typeof block.headline === 'string') {
      const image =
        typeof block.image === 'object' &&
        block.image !== null &&
        typeof (block.image as { url?: string }).url === 'string'
          ? (block.image as { url: string }).url
          : null;
      blocks.push({
        blockType: 'hero',
        headline: block.headline,
        subheadline: typeof block.subheadline === 'string' ? block.subheadline : null,
        ctaLabel: typeof block.ctaLabel === 'string' ? block.ctaLabel : null,
        ctaHref: typeof block.ctaHref === 'string' ? block.ctaHref : null,
        imageUrl: image,
      });
    } else if (type === 'richText' && typeof block.content === 'string') {
      blocks.push({ blockType: 'richText', content: block.content });
    } else if (
      type === 'cta' &&
      typeof block.title === 'string' &&
      typeof block.buttonLabel === 'string' &&
      typeof block.buttonHref === 'string'
    ) {
      blocks.push({
        blockType: 'cta',
        title: block.title,
        body: typeof block.body === 'string' ? block.body : null,
        buttonLabel: block.buttonLabel,
        buttonHref: block.buttonHref,
      });
    }
  }
  return blocks;
}

async function fetchContentPage(slug: string): Promise<ContentPageDoc | null> {
  if (!isContentPagesEnabled()) return null;
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'content-pages',
    where: {
      and: [{ slug: { equals: trimmed } }, { published: { equals: true } }],
    },
    limit: 1,
    depth: 1,
    pagination: false,
  });

  const doc = result.docs[0];
  if (!doc || typeof doc.title !== 'string') return null;

  const meta = doc.meta as { description?: string } | undefined;
  return {
    title: doc.title,
    slug: typeof doc.slug === 'string' ? doc.slug : trimmed,
    metaDescription:
      typeof meta?.description === 'string' && meta.description.trim().length > 0
        ? meta.description.trim()
        : null,
    blocks: normalizeBlocks(doc.layout),
  };
}

const getCachedContentPage = (slug: string) =>
  unstable_cache(() => fetchContentPage(slug), [`content-page-${slug}`], {
    revalidate: 60,
    tags: ['content-pages', `content-page-${slug}`],
  });

export async function getContentPageBySlug(slug: string): Promise<ContentPageDoc | null> {
  return getCachedContentPage(slug)();
}
