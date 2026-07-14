import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Spotlight wraps its CTA in next-intl's Link, which needs routing context;
// stub it so the block renders as a plain anchor under the test renderer.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import SpotlightBlock from '@/components/blocks/Spotlight';
import { getPayloadProductsByIds } from '@/lib/payload-products';

// Auto-fetch tests drive prices off a real product; stub the batched product loader so
// each test can return a product with (or without) an on-sale compare-at price.
vi.mock('@/lib/payload-products', () => ({
  getPayloadProductsByIds: vi.fn(async () => []),
}));

const mockedGetProducts = vi.mocked(getPayloadProductsByIds);

// Minimal product shaped like lib/shopify/types.Product — only the fields Spotlight reads.
function makeProduct(overrides: {
  amount: string;
  compareAtAmount?: string | null;
}) {
  const price = {
    amount: overrides.amount,
    currencyCode: 'VND',
    compareAtAmount: overrides.compareAtAmount ?? null,
  };
  return {
    id: 'p1',
    handle: 'deal-product',
    availableForSale: true,
    title: 'Deal product',
    description: 'A featured product.',
    descriptionHtml: '',
    options: [],
    priceRange: { maxVariantPrice: price, minVariantPrice: price },
    variants: [],
    featuredImage: { url: '/img.jpg', altText: 'Deal product', width: 1200, height: 1200 },
    images: [],
    seo: { title: '', description: '' },
    tags: [],
    categorySlugs: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('SpotlightBlock', () => {
  beforeEach(() => {
    mockedGetProducts.mockResolvedValue([]);
  });
  it('should render null when it has no deals', async () => {
    expect(await SpotlightBlock({})).toBeNull();
    expect(await SpotlightBlock({ deals: [] })).toBeNull();
  });

  it('should render null when its only deal has no heading or price override', async () => {
    expect(await SpotlightBlock({ deals: [{}] })).toBeNull();
  });

  it('should render heading, override prices and the discount badge for a single deal', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({
        deals: [
          { heading: 'Deal pick', priceNow: '₫899,000', priceWas: '₫1,290,000', discountLabel: '-30%' },
        ],
      }),
    );
    expect(html).toContain('Deal pick');
    expect(html).toContain('₫899,000');
    expect(html).toContain('₫1,290,000');
    expect(html).toContain('-30%');
  });

  it('should repeat the shared eyebrow above each deal', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({
        eyebrow: 'Deal of the week',
        deals: [{ heading: 'One' }, { heading: 'Two' }],
      }),
    );
    const eyebrowCount = html.split('Deal of the week').length - 1;
    expect(eyebrowCount).toBe(2);
  });

  it('should render the CTA as a link when an href override is set', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ heading: 'Deal', ctaLabel: 'Grab it', ctaHref: '/search' }] }),
    );
    expect(html).toContain('Grab it');
    expect(html).toContain('href="/search"');
  });

  it('should render a fixed dark banner by default and drop it for an explicit background', async () => {
    // The default banner uses fixed warm-900/white — NOT the theme-relative
    // bg-ink/text-surface tokens, which swap in dark mode and would flip the
    // banner to a light surface with theme-tracking (poorly-contrasting) text.
    const def = renderToStaticMarkup(await SpotlightBlock({ deals: [{ heading: 'Deal' }] }));
    expect(def).toContain('bg-warm-900');
    expect(def).toContain('text-white');
    expect(def).not.toContain('bg-ink');
    const light = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ heading: 'Deal' }], background: 'light' }),
    );
    expect(light).not.toContain('bg-warm-900');
  });

  it('should render no carousel controls for a single deal', async () => {
    const html = renderToStaticMarkup(await SpotlightBlock({ deals: [{ heading: 'Only one' }] }));
    expect(html).not.toContain('aria-label="Next deal"');
    expect(html).not.toContain('aria-label="Previous deal"');
    expect(html).not.toContain('aria-roledescription="carousel"');
  });

  it('should render arrows and one dot per deal when there are multiple deals', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({
        deals: [{ heading: 'One' }, { heading: 'Two' }, { heading: 'Three' }],
      }),
    );
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="Next deal"');
    expect(html).toContain('aria-label="Previous deal"');
    // One "Go to deal N" dot button per deal.
    const dotCount = (html.match(/aria-label="Go to deal \d+"/g) ?? []).length;
    expect(dotCount).toBe(3);
    // Each deal is announced as a slide of the total.
    expect(html).toContain('Deal 1 of 3');
    expect(html).toContain('Deal 3 of 3');
  });

  it('should drop deals with nothing to show but keep the valid ones', async () => {
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ heading: 'Keep me' }, {}, { heading: 'And me' }] }),
    );
    expect(html).toContain('Keep me');
    expect(html).toContain('And me');
    // Two valid slides remain, so two dots — the empty deal was dropped.
    const dotCount = (html.match(/aria-label="Go to deal \d+"/g) ?? []).length;
    expect(dotCount).toBe(2);
  });

  it('should render a per-deal countdown with SSR digits for a future target date', async () => {
    // Regression: the countdown must render its digits during SSR (not only after the
    // client effect), so the builder preview's static HTML injection shows the timer
    // instead of empty cells. A far-future date keeps the value stable across runs.
    const targetDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ heading: 'Deal', targetDate }] }),
    );
    expect(html).toContain('Days');
    expect(html).toContain('Hrs');
    // Every unit cell must carry a two-digit value (not an empty cell), proving the
    // remaining time was computed at render time rather than only after the client
    // effect. The exact day count is boundary-sensitive, so match any zero-padded pair.
    const digitCells = html.match(/tabular-nums[^>]*>\d\d<\/div>/g) ?? [];
    expect(digitCells).toHaveLength(4);
  });

  it('should show the per-deal expired text when the target date has already passed', async () => {
    const targetDate = new Date(Date.now() - 60 * 1000).toISOString();
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ heading: 'Deal', targetDate, expiredText: 'Deal over' }] }),
    );
    expect(html).toContain('Deal over');
  });

  it('should auto-fetch the compare-at price as the struck-through was for an on-sale product', async () => {
    // Product on sale: amount is the reduced price, compareAtAmount the original. The
    // "was" auto-fills from compare-at with no manual override.
    mockedGetProducts.mockResolvedValue([makeProduct({ amount: '899000', compareAtAmount: '1290000' })]);
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ product: 'p1' }] }),
    );
    expect(html).toContain('899.000'); // now = sale amount
    expect(html).toContain('1.290.000'); // was = compare-at, struck through
    expect(html).toContain('line-through');
  });

  it('should auto-fetch the list price as was when the editor types a manual now price', async () => {
    // Full-price product (no compare-at). The editor picks the product and types the
    // discounted "now" by hand; the "was" auto-fills from the product's plain amount.
    mockedGetProducts.mockResolvedValue([makeProduct({ amount: '1290000' })]);
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ product: 'p1', priceNow: '₫899,000' }] }),
    );
    expect(html).toContain('₫899,000'); // now = manual override, verbatim
    expect(html).toContain('1.290.000'); // was = auto-fetched list price
    expect(html).toContain('line-through');
  });

  it('should not strike through a duplicate was when a full-price product has no manual now', async () => {
    // No sale and no manual "now": there is no discount to show, so the "was" price is
    // suppressed rather than rendering a struck-through duplicate of the "now" price.
    mockedGetProducts.mockResolvedValue([makeProduct({ amount: '1290000' })]);
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ product: 'p1' }] }),
    );
    expect(html).toContain('1.290.000'); // now = list price
    expect(html).not.toContain('line-through'); // no struck-through was
  });

  it('should auto-compute the discount badge from a manual now vs the list price', async () => {
    // Full-price product (no compare-at) with a manual "now" of ₫903,000 against a
    // ₫1,290,000 list price → 30% off. The badge is derived from the now-vs-was gap,
    // not from the product being flagged on sale.
    mockedGetProducts.mockResolvedValue([makeProduct({ amount: '1290000' })]);
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ product: 'p1', priceNow: '₫903,000' }] }),
    );
    expect(html).toContain('-30%');
  });

  it('should auto-compute the discount badge for an on-sale product with no overrides', async () => {
    // On sale: amount 899,000 vs compare-at 1,290,000 → ~30% off, computed with no
    // manual price or label.
    mockedGetProducts.mockResolvedValue([makeProduct({ amount: '899000', compareAtAmount: '1290000' })]);
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ product: 'p1' }] }),
    );
    expect(html).toContain('-30%');
  });

  it('should prefer an explicit discountLabel override over the computed badge', async () => {
    mockedGetProducts.mockResolvedValue([makeProduct({ amount: '899000', compareAtAmount: '1290000' })]);
    const html = renderToStaticMarkup(
      await SpotlightBlock({ deals: [{ product: 'p1', discountLabel: 'HALF PRICE' }] }),
    );
    expect(html).toContain('HALF PRICE');
    expect(html).not.toContain('-30%');
  });
});
