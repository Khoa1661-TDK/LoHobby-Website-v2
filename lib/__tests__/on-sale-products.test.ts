import { beforeEach, describe, expect, it, vi } from 'vitest';

// getPayloadOnSaleProducts is the auto-mode source for the Spotlight block. Its
// behaviour lives almost entirely in the query it builds, so the Payload client is
// stubbed and the recorded find() arguments are the assertion.
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'vi') }));

const find = vi.fn();
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }));

import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import { getPayloadOnSaleProducts } from '@/lib/payload-products';

/** Minimal Payload product doc — only the fields the commerce mapper reads. */
function doc(overrides: {
  id: number;
  title: string;
  salePercent: number;
  tags?: string[];
}) {
  return {
    id: overrides.id,
    title: overrides.title,
    slug: `p-${overrides.id}`,
    description: '',
    price: 1000000,
    onSale: true,
    salePercent: overrides.salePercent,
    available: true,
    tags: overrides.tags ?? [],
    images: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('getPayloadOnSaleProducts', () => {
  beforeEach(() => {
    find.mockReset();
    find.mockResolvedValue({ docs: [] });
  });

  it('should query only products with a real discount', async () => {
    await getPayloadOnSaleProducts(6);

    const args = find.mock.calls[0]![0];
    // `salePercent > 0` is not redundant with `onSale`: computeSalePrice treats a zero
    // or missing percent as not discounted, so such a product would render with no
    // struck-through price and no badge. It also keeps NULLs out of the sort, which
    // Postgres would otherwise order first on DESC.
    expect(args.where).toEqual({
      and: [{ onSale: { equals: true } }, { salePercent: { greater_than: 0 } }],
    });
  });

  it('should order deepest discount first, breaking ties by most recently touched', async () => {
    await getPayloadOnSaleProducts(6);
    expect(find.mock.calls[0]![0].sort).toEqual(['-salePercent', '-updatedAt']);
  });

  it('should over-fetch so hidden products cannot leave the carousel short', async () => {
    // Hidden products are filtered after mapping, so querying exactly `limit` could
    // return fewer than the caller asked for.
    await getPayloadOnSaleProducts(6);
    expect(find.mock.calls[0]![0].limit).toBeGreaterThan(6);
  });

  it('should drop hidden products and still return a full set', async () => {
    find.mockResolvedValue({
      docs: [
        doc({ id: 1, title: 'Visible one', salePercent: 40 }),
        doc({ id: 2, title: 'Hidden', salePercent: 30, tags: [HIDDEN_PRODUCT_TAG] }),
        doc({ id: 3, title: 'Visible two', salePercent: 20 }),
      ],
    });

    const products = await getPayloadOnSaleProducts(2);
    expect(products.map((p) => p.title)).toEqual(['Visible one', 'Visible two']);
  });

  it('should cap the result at the requested limit', async () => {
    find.mockResolvedValue({
      docs: [1, 2, 3, 4, 5, 6, 7, 8].map((id) =>
        doc({ id, title: `Product ${id}`, salePercent: 50 - id }),
      ),
    });

    const products = await getPayloadOnSaleProducts(6);
    expect(products).toHaveLength(6);
    expect(products.map((p) => p.title)).toEqual([
      'Product 1',
      'Product 2',
      'Product 3',
      'Product 4',
      'Product 5',
      'Product 6',
    ]);
  });

  it('should return an empty list when nothing is on sale', async () => {
    find.mockResolvedValue({ docs: [] });
    expect(await getPayloadOnSaleProducts(6)).toEqual([]);
  });
});
