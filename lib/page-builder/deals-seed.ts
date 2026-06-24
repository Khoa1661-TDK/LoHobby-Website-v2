// lib/page-builder/deals-seed.ts — designed promotions/sale page, authored as blocks.
// Rendered at /pages/sale. The discounted-items grid binds to the auto-managed
// "On Sale" category (slug `on-sale`), so it shows whatever products are flagged
// `onSale` — no hardcoded product list. Promo banners are intentionally placeholder copy.
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import type { PageBlock } from '@/lib/page-builder';

export type DealsSeedOptions = {
  // `categories` collection id of the on-sale category. Payload's default ID type here
  // is numeric; strings are accepted for test fixtures. When absent, the FeaturedCollection
  // is left unbound (still renders, just without a curated source).
  onSaleCategoryId?: string | number | null;
};

function block(slug: string, overrides: Record<string, unknown> = {}): PageBlock | null {
  const base = createDefaultBlock(slug);
  return base ? ({ ...base, ...overrides } as unknown as PageBlock) : null;
}

// Placeholder countdown ~7 days out so the promo banner shows a live timer in the demo.
function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function buildDealsSeedLayout(opts: DealsSeedOptions = {}): PageBlock[] {
  const onSaleId = opts.onSaleCategoryId ?? null;

  const featuredCollectionOverrides: Record<string, unknown> = {
    title: 'On sale now',
    limit: 12,
  };
  if (onSaleId !== null) featuredCollectionOverrides.collection = onSaleId;

  const blocks: (PageBlock | null)[] = [
    block('hero', {
      headline: 'Deals off the plate.',
      subheadline: 'Limited print runs, overstock colors, and weekly markdowns.',
      ctaLabel: 'Shop the sale',
      ctaHref: '/search/on-sale',
      textAlign: 'center',
    }),
    block('promoBanner', {
      text: 'Flash sale — up to 40% off select keychains and models.',
      ctaLabel: 'Grab a deal',
      ctaHref: '/search/on-sale',
      countdown: inDays(7),
    }),
    block('banner', {
      text: 'Free shipping on orders over ₫500,000.',
      linkLabel: 'Shop all',
      url: '/search',
    }),
    block('featuredCollection', featuredCollectionOverrides),
    block('stats', {
      heading: 'This week on the bench',
      items: [
        { value: '40%', label: 'off select prints' },
        { value: '20+', label: 'items on sale' },
        { value: '7 days', label: 'until the drop ends' },
      ],
    }),
    block('callToAction', {
      heading: "Don't miss a drop.",
      subheading: 'New markdowns land every week — be first to the plate.',
      primaryLabel: 'Browse the shop',
      primaryUrl: '/search',
      secondaryLabel: 'See all deals',
      secondaryUrl: '/search/on-sale',
    }),
  ];

  return blocks.filter((b): b is PageBlock => b !== null);
}
