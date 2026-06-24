// lib/page-builder/home-seed.ts — designed home layout, authored as page-builder blocks.
// This seed IS the home page: the storefront renders the CMS `home` page's `layout`
// via RenderBlocks when it exists, falling back to the hardcoded homepage otherwise.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import { plainTextToLexical } from '@/lib/content-pages-migration';
import type { PageBlock } from '@/lib/page-builder';

export type HomeSeedOptions = {
  // Relationship IDs for the `products` collection. Payload's default ID type here is
  // numeric, so these are usually numbers; strings are accepted for test fixtures.
  featuredProductIds?: Array<string | number>;
  // Map of category slug -> category id, used to bind FeaturedCollection blocks to a real
  // category so they render products instead of the "configure this block" placeholder.
  categoryIdBySlug?: Record<string, string | number>;
};

function block(slug: string, overrides: Record<string, unknown> = {}): PageBlock | null {
  const base = createDefaultBlock(slug);
  return base ? ({ ...base, ...overrides } as unknown as PageBlock) : null;
}

// A FeaturedCollection bound to a category when its id is known. Without an id it still
// renders (as the unconfigured placeholder), which keeps the builder usable in tests.
function featuredCollection(
  title: string,
  slug: string,
  idBySlug: Record<string, string | number>,
): PageBlock | null {
  const overrides: Record<string, unknown> = { title };
  const id = idBySlug[slug];
  if (id !== undefined) overrides.collection = id;
  return block('featuredCollection', overrides);
}

// A small FAQ item with a plain-text answer mapped into the minimal Lexical state the
// richText field requires.
function faqItem(question: string, answer: string): Record<string, unknown> {
  return { question, answer: plainTextToLexical(answer) };
}

export function buildHomeSeedLayout(opts: HomeSeedOptions = {}): PageBlock[] {
  const ids = opts.featuredProductIds ?? [];
  const idBySlug = opts.categoryIdBySlug ?? {};

  const blocks: (PageBlock | null)[] = [
    block('hero', {
      headline: 'Printed to order.',
      subheadline: 'Keychains, aircraft models, and brainrot figures — straight off the plate.',
      ctaLabel: 'Shop all',
      ctaHref: '/search',
    }),
    block('promoBanner', {
      text: 'Fresh markdowns on the build plate — limited runs, while filament lasts.',
      ctaLabel: 'See deals',
      ctaHref: '/pages/sale',
    }),
    featuredCollection('Aircraft & models', 'mo-hinh', idBySlug),
    ids.length > 0 ? block('featuredProducts', { title: 'New drops', products: ids }) : null,
    featuredCollection('Keychains off the plate', 'moc-khoa', idBySlug),
    block('steps', {
      heading: 'How we print',
      steps: [
        { title: 'Design', body: 'Pick a model or send us your own STL.' },
        { title: 'Slice', body: 'We dial in layer height, infill, and supports.' },
        { title: 'Print', body: 'Laid down layer by layer in your chosen filament.' },
        { title: 'Ship', body: 'Cleaned up, packed, and out the door.' },
      ],
    }),
    block('stats', {
      heading: 'Made on the bench',
      items: [
        { value: '12k', label: 'layers laid down daily' },
        { value: '40+', label: 'filament colors in stock' },
        { value: '0.1mm', label: 'finest layer height' },
        { value: '48h', label: 'typical turnaround' },
      ],
    }),
    block('faq', {
      title: 'Good to know',
      items: [
        faqItem(
          'What are prints made of?',
          'Mostly PLA and PETG. Tougher pieces can be printed in ABS or resin on request.',
        ),
        faqItem(
          'How long until it ships?',
          'In-stock items ship within 48 hours. Custom prints depend on size and queue.',
        ),
        faqItem(
          'Can I send my own model?',
          'Yes — send an STL or STEP file and we will quote it for you.',
        ),
      ],
    }),
    block('newsletter'),
  ];

  return blocks.filter((b): b is PageBlock => b !== null);
}
