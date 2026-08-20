// lib/__tests__/console-products.test.ts
import { describe, it, expect } from 'vitest';
import type { Product } from '@/src/payload/payload-types';
import { toProductEditorFacts, toProductRow } from '@/lib/console/products';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 12,
    title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
    category: [{ id: 3, title: 'Móc khóa' }],
    price: 129000,
    available: true,
    stock: 21,
    updatedAt: '2026-08-20T02:14:00Z',
    createdAt: '2026-08-01T02:14:00Z',
    ...overrides,
  } as Product;
}

describe('toProductRow', () => {
  it('should map a plain listed product to its console row', () => {
    expect(toProductRow(makeProduct())).toEqual({
      id: '12',
      name: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      category: 'Móc khóa',
      price: 129000,
      stock: 21,
      promo: null,
      autoDiscountNote: null,
      status: 'listed',
      selected: false,
    });
  });

  it('should render an em dash category when the category array is empty', () => {
    expect(toProductRow(makeProduct({ category: [] })).category).toBe('—');
  });

  it('should render an em dash category when the relationship is an unresolved id', () => {
    expect(toProductRow(makeProduct({ category: [3] as never })).category).toBe('—');
  });

  it('should sum variant stock when the product has no own stock value', () => {
    const doc = makeProduct({
      stock: null,
      variants: { docs: [{ id: 1, stock: 4 }, { id: 2, stock: 6 }] } as never,
    });
    expect(toProductRow(doc).stock).toBe(10);
  });

  it('should report zero stock when variants came back as bare ids', () => {
    const doc = makeProduct({ stock: null, variants: { docs: [1, 2] } as never });
    expect(toProductRow(doc).stock).toBe(0);
  });

  it('should label an auto-managed sale with the auto prefix and the managed note', () => {
    const doc = makeProduct({ onSale: true, salePercent: 15, autoSaleManaged: true });
    const row = toProductRow(doc);
    expect(row.promo).toBe('Tự động -15%');
    expect(row.autoDiscountNote).toBe('Quản lý bởi hệ thống tự động giảm giá');
  });

  it('should label a hand-set sale without the auto prefix or the note', () => {
    const doc = makeProduct({ onSale: true, salePercent: 20, autoSaleManaged: false });
    const row = toProductRow(doc);
    expect(row.promo).toBe('-20%');
    expect(row.autoDiscountNote).toBeNull();
  });

  it('should mark an unavailable product as a draft', () => {
    expect(toProductRow(makeProduct({ available: false })).status).toBe('draft');
  });
});

describe('toProductEditorFacts', () => {
  it('should render the auto-sale debug chips for a managed product', () => {
    const facts = toProductEditorFacts(
      makeProduct({ autoSaleManaged: true, autoSaleReleasedAt: null }),
    );
    expect(facts).toEqual({
      title: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
      autoSaleManaged: 'autoSaleManaged: true',
      autoSaleReleasedAt: 'autoSaleReleasedAt: —',
    });
  });

  it('should render the release date when the product was released from auto management', () => {
    const facts = toProductEditorFacts(
      makeProduct({ autoSaleManaged: false, autoSaleReleasedAt: '2026-08-20T02:14:00Z' }),
    );
    expect(facts.autoSaleManaged).toBe('autoSaleManaged: false');
    expect(facts.autoSaleReleasedAt).toBe('autoSaleReleasedAt: 20/08');
  });
});
