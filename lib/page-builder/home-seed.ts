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
    ids.length > 0
      ? block('featuredProducts', { title: 'New drops', products: ids, background: 'light' })
      : null,
    block('testimonials', {
      title: 'Off the plate, into the wild',
      layout: 'grid',
      entries: [
        {
          quote: 'The layer lines on my fighter jet are so clean it looks injection-moulded. Shipped in two days.',
          author: 'Minh T.',
          role: 'Aircraft collector',
          rating: 5,
        },
        {
          quote: 'Sent them my own STL and the quote came back same day. Print quality was spot on.',
          author: 'Linh P.',
          role: 'Custom order',
          rating: 5,
        },
        {
          quote: 'Ordered a stack of keychains for a meetup — the filament colors are way punchier in person.',
          author: 'Đức N.',
          role: 'Repeat buyer',
          rating: 5,
        },
      ],
    }),
    block('steps', {
      heading: 'How we print',
      background: 'light',
      steps: [
        { title: 'Design', body: 'Pick a model or send us your own STL.' },
        { title: 'Slice', body: 'We dial in layer height, infill, and supports.' },
        { title: 'Print', body: 'Laid down layer by layer in your chosen filament.' },
        { title: 'Ship', body: 'Cleaned up, packed, and out the door.' },
      ],
    }),
    featuredCollection('Keychains off the plate', 'moc-khoa', idBySlug),
    block('quote', {
      quote: 'We do not keep a warehouse. Every order starts as raw filament and a clean build plate.',
      author: 'The bench',
      role: 'Print to order, every time',
      background: 'dark',
    }),
    block('stats', {
      heading: 'Made on the bench',
      background: 'light',
      items: [
        { value: '12k', label: 'layers laid down daily' },
        { value: '40+', label: 'filament colors in stock' },
        { value: '0.1mm', label: 'finest layer height' },
        { value: '48h', label: 'typical turnaround' },
      ],
    }),
    block('callToAction', {
      heading: 'Got a model in mind?',
      subheading: 'Send us an STL or STEP file and we will quote it — no minimums, no setup fees.',
      primaryLabel: 'Send your STL',
      primaryUrl: '/contact',
      secondaryLabel: 'Browse the shop',
      secondaryUrl: '/search',
      align: 'center',
    }),
    block('faq', {
      title: 'Good to know',
      background: 'light',
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
