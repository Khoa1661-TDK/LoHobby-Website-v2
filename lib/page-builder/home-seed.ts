// lib/page-builder/home-seed.ts — designed home layout, authored as page-builder blocks.
// This seed IS the home page: the storefront renders the CMS `home` page's `layout`
// via RenderBlocks when it exists, falling back to the hardcoded homepage otherwise.
//
// Layout follows the "Lô Hobby" editorial monochrome mockup: a stat-backed hero,
// a category card grid, a filterable product showcase, a reels strip, a trust
// feature list, and the newsletter. Media-dependent fields (hero collage, reel
// posters) are intentionally left for the store owner to fill in the admin — the
// blocks degrade gracefully until then.
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

export function buildHomeSeedLayout(opts: HomeSeedOptions = {}): PageBlock[] {
  const ids = opts.featuredProductIds ?? [];

  const blocks: (PageBlock | null)[] = [
    block('hero', {
      eyebrow: 'Lô Hobby',
      headline: 'Collectibles, models & keychains — curated.',
      subheadline:
        'A small shop with a sharp eye. Models, figures, and everyday carry, chosen one piece at a time.',
      ctaLabel: 'Shop the collection',
      ctaHref: '/search',
      secondaryCtaLabel: 'Our story',
      secondaryCtaHref: '/about',
      textAlign: 'left',
      imagePosition: 'none',
      stats: [
        { value: '500+', label: 'pieces in the catalog' },
        { value: '48h', label: 'typical dispatch' },
        { value: '4.9★', label: 'average review' },
      ],
      collage: [],
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
    block('productShowcase', {
      eyebrow: 'Picks',
      heading: 'Featured this week',
      subheading: 'Filter by category or sort by price — no page reload.',
      products: ids,
      showTabs: true,
      showSort: true,
    }),
    block('reels', {
      eyebrow: 'On the feed',
      heading: 'Lô Hobby in motion',
      followLabel: 'Follow us',
      followHref: 'https://www.tiktok.com',
      tiles: [
        { tag: 'Unbox', caption: 'New model kit, start to finish', views: '12.4k views', embedUrl: '' },
        { tag: 'Build', caption: 'Panel-lining a 1/144 fighter', views: '8.1k views', embedUrl: '' },
        { tag: 'Shelf', caption: 'This month’s display refresh', views: '5.7k views', embedUrl: '' },
        { tag: 'Haul', caption: 'Keychain restock just landed', views: '9.3k views', embedUrl: '' },
        { tag: 'Studio', caption: 'How we pack your order', views: '3.2k views', embedUrl: '' },
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
