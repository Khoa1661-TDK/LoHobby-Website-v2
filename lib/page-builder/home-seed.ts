// lib/page-builder/home-seed.ts — designed home layout, authored as page-builder blocks.
// This seed IS the home page: the storefront renders the CMS `home` page's `layout`
// via RenderBlocks when it exists, falling back to the hardcoded homepage otherwise.
//
// Layout follows the "Lô Hobby" redesign-3 mockup: a stat-backed hero, a scrolling
// marquee strip, a category card grid, a deal spotlight with a live countdown, a
// filterable product showcase, customer reviews, a trust feature list, and the
// newsletter. The hero collage is left for the store owner to fill in the admin; the
// spotlight embeds the first featured product (image/price derived from it). Blocks
// degrade gracefully until their data is filled in.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
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

/** ISO timestamp `days` days from `now`, for the Spotlight deal countdown. Parameterized
 *  on `now` so the seed stays deterministic in tests. */
function daysFromNow(days: number, now: number = Date.now()): string {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

export function buildHomeSeedLayout(opts: HomeSeedOptions = {}): PageBlock[] {
  const ids = opts.featuredProductIds ?? [];

  const blocks: (PageBlock | null)[] = [
    block('hero', {
      eyebrow: 'Lô Hobby',
      headline: 'Collectibles, models & keychains — curated.',
      headlineHighlight: 'keychains',
      subheadline:
        'A small shop with a sharp eye. Models, figures, and everyday carry, chosen one piece at a time.',
      ctaLabel: 'Shop the collection',
      ctaHref: '/search',
      secondaryCtaLabel: 'Our story',
      secondaryCtaHref: '/about',
      textAlign: 'left',
      imagePosition: 'right',
      stats: [
        { value: '500+', label: 'pieces in the catalog' },
        { value: '48h', label: 'typical dispatch' },
        { value: '4.9★', label: 'average review' },
      ],
      // Right-hand 2×2 grid. Labels render over brand-accent gradients until the
      // store owner uploads images for each tile in the admin.
      collage: [
        { alt: 'Aircraft kits' },
        { alt: 'Figures' },
        { alt: 'Keychains' },
        { alt: '3D printed' },
      ],
      mediaBadge: 'New stock daily',
    }),
    // Scrolling trust/marketing strip under the hero (mockup's blue marquee).
    block('marquee', {
      speed: 'normal',
      direction: 'left',
      paddingY: 'none',
      items: [
        { text: 'Free shipping over ₫500K' },
        { text: 'Authentic, hand-picked stock' },
        { text: 'Ships within 48 hours' },
        { text: 'PayOS & cash on delivery' },
        { text: 'Real humans, real support' },
      ],
    }),
    block('featureGrid', {
      heading: 'Shop by category',
      subheading: 'Four corners of the shop — pick a lane.',
      variant: 'cards',
      columns: '4',
      items: [
        { title: 'Models', caption: 'Aircraft & kits', href: '/search/mo-hinh' },
        { title: 'Figures', caption: 'Display pieces', href: '/search/figure' },
        { title: 'Keychains', caption: 'Everyday carry', href: '/search/moc-khoa' },
        { title: 'New in', caption: 'Fresh arrivals', href: '/search' },
      ],
    }),
    // Deal-of-the-week spotlight with a live countdown (mockup's dark split banner).
    // Embeds the first featured product: its image, price, and sale discount drive the
    // banner. Heading/description/prices fall back to product data when left blank.
    block('spotlight', {
      product: ids[0] ?? null,
      eyebrow: 'Deal of the week',
      ctaLabel: 'Grab the deal',
      targetDate: daysFromNow(7),
      expiredText: 'This deal has ended — check back for the next one.',
    }),
    block('productShowcase', {
      eyebrow: 'Picks',
      heading: 'Featured this week',
      subheading: 'Filter by category or sort by price — no page reload.',
      products: ids,
      showTabs: true,
      showSort: true,
    }),
    // Customer reviews (mockup's star-rated review cards).
    block('testimonials', {
      title: 'What collectors say',
      layout: 'grid',
      entries: [
        {
          quote: 'Packaging was spotless and the model arrived faster than I expected. Repeat buyer now.',
          author: 'Minh T.',
          role: 'Model builder',
          rating: 5,
        },
        {
          quote: 'Real curation — every piece feels chosen, not dumped from a catalog. Love the shelf finds.',
          author: 'Lan P.',
          role: 'Figure collector',
          rating: 5,
        },
        {
          quote: 'Asked a question before ordering and got a straight, helpful answer from an actual person.',
          author: 'Duc N.',
          role: 'Keychain regular',
          rating: 4,
        },
      ],
    }),
    block('featureGrid', {
      heading: 'Why shop with us',
      variant: 'list',
      columns: '4',
      background: 'light',
      items: [
        { icon: 'truck', title: 'Fast dispatch', text: 'In-stock orders ship within 48 hours.' },
        { icon: 'shield', title: 'Secure checkout', text: 'PayOS and cash on delivery, both protected.' },
        { icon: 'sparkles', title: 'Hand-picked', text: 'Every piece is chosen, not drop-shipped at random.' },
        { icon: 'heart', title: 'Real support', text: 'Talk to the people who actually run the shop.' },
      ],
    }),
    block('newsletter'),
  ];

  return blocks.filter((b): b is PageBlock => b !== null);
}
