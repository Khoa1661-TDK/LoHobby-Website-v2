/// <reference types="vitest" />
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Stub ProductCard so the test does not need intl/wishlist providers.
vi.mock('@/components/product/product-card', () => ({
  default: ({ product }: { product: { id: string; title: string } }) => <div>card:{product.title}</div>,
}));

vi.mock('@/lib/payload-products', () => ({
  getPayloadProductsByIds: vi.fn(async (ids: string[]) =>
    ids.map((id) => ({ id, title: `Product ${id}` })),
  ),
}));

import RecommendationsBlock from '@/components/blocks/Recommendations';

describe('RecommendationsBlock pinned override', () => {
  it('should render a ProductCard grid when products are pinned', async () => {
    const ui = await RecommendationsBlock({ title: 'Picks', products: ['1', '2'] });
    const html = renderToStaticMarkup(ui);
    expect(html).toContain('card:Product 1');
    expect(html).toContain('card:Product 2');
  });

  it('should fall back to the auto placeholder when no products are pinned', async () => {
    const ui = await RecommendationsBlock({ title: 'Picks', products: [] });
    const html = renderToStaticMarkup(ui);
    expect(html).not.toContain('card:');
  });
});
