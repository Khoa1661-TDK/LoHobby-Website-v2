// lib/page-builder/home-seed.ts — designed home layout, authored as page-builder blocks.
// This seed IS the home page: the storefront renders the CMS `home` page's `layout`
// via RenderBlocks when it exists, falling back to the hardcoded homepage otherwise.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import type { PageBlock } from '@/lib/page-builder';

export type HomeSeedOptions = {
  // Relationship IDs for the `products` collection. Payload's default ID type here is
  // numeric, so these are usually numbers; strings are accepted for test fixtures.
  featuredProductIds?: Array<string | number>;
};

function block(slug: string, overrides: Record<string, unknown> = {}): PageBlock | null {
  const base = createDefaultBlock(slug);
  return base ? ({ ...base, ...overrides } as unknown as PageBlock) : null;
}

export function buildHomeSeedLayout(opts: HomeSeedOptions = {}): PageBlock[] {
  const ids = opts.featuredProductIds ?? [];

  const blocks: (PageBlock | null)[] = [
    block('hero', {
      headline: 'Printed to order.',
      subheadline: 'Keychains, aircraft models, and brainrot figures — straight off the plate.',
    }),
    block('featuredCollection', { title: 'Off the plate' }),
    ids.length > 0 ? block('featuredProducts', { title: 'New drops', products: ids }) : null,
    block('imageWithText', { headline: 'How we print' }),
    block('gallery'),
    block('recommendations'),
    block('newsletter'),
  ];

  return blocks.filter((b): b is PageBlock => b !== null);
}
