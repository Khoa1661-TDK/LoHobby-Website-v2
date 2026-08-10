import { describe, expect, it, vi } from 'vitest';
import { findProductsTool } from '@/lib/admin-assistant/tools/find-products';
import { getProductTool } from '@/lib/admin-assistant/tools/get-product';
import type { ToolContext } from '@/lib/admin-assistant/types';

const productDoc = {
  id: 5,
  title: 'Khung ảnh in 3D',
  slug: 'khung-anh-in-3d',
  price: 120000,
  stock: 4,
  available: true,
  onSale: false,
  salePercent: 0,
  category: { id: 2, title: 'Trang trí' },
  image: { id: 9, filename: 'frame.jpg' },
  gallery: [{ media: { id: 10, filename: 'frame-2.jpg' } }],
  variants: { docs: [{ id: 3, name: 'Đen', stock: 2, sku: 'F-BLK' }] },
};

function ctx(find: unknown, findByID?: unknown): ToolContext {
  return {
    payload: { find, findByID } as never,
    locale: 'vi',
  };
}

describe('findProductsTool', () => {
  it('should return commerce fields for products', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [productDoc] });
    const outcome = await findProductsTool.run({ query: 'khung' }, ctx(find));
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ id: 5, title: 'Khung ảnh in 3D', price: 120000, stock: 4 });
  });

  it('should return id and title only when searching categories', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 2, title: 'Trang trí' }] });
    const outcome = await findProductsTool.run({ query: '', collection: 'categories' }, ctx(find));
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toEqual({ id: 2, title: 'Trang trí' });
  });

  it('should reject an unknown collection', async () => {
    const outcome = await findProductsTool.run({ query: '', collection: 'orders' }, ctx(vi.fn()));
    expect(outcome.content).toContain('ERROR:');
  });
});

describe('getProductTool', () => {
  it('should include media ids and variants', async () => {
    const findByID = vi.fn().mockResolvedValue(productDoc);
    const outcome = await getProductTool.run({ id: 5 }, ctx(vi.fn(), findByID));
    const product = JSON.parse(outcome.content) as Record<string, unknown>;
    expect(product).toMatchObject({ id: 5, image: 9, categoryId: 2 });
    expect(product.gallery).toEqual([10]);
    expect(product.variants).toEqual([{ id: 3, name: 'Đen', sku: 'F-BLK', stock: 2 }]);
  });

  it('should request depth 1 so join fields hydrate', async () => {
    const findByID = vi.fn().mockResolvedValue(productDoc);
    await getProductTool.run({ id: 5 }, ctx(vi.fn(), findByID));
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ depth: 1 }));
  });

  it('should error on a missing or non-integer id', async () => {
    const outcome = await getProductTool.run({ id: 'abc' }, ctx(vi.fn(), vi.fn()));
    expect(outcome.content).toContain('ERROR:');
  });
});
