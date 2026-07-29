// lib/__tests__/auto-sale-select.test.ts
import { describe, it, expect } from 'vitest';
import { selectAutoSale, hasStock, type AutoSaleCandidate } from '@/lib/auto-sale/select';
import type { ProductViewers } from '@/lib/analytics/product-metrics';

/** Fixed instant so cooldown-window tests never become time-dependent. */
const NOW = Date.parse('2026-07-26T00:00:00Z');

/** A product that passes every rail, so each test can vary one thing. */
function candidate(overrides: Partial<AutoSaleCandidate> = {}): AutoSaleCandidate {
  return {
    productId: 'p1',
    title: 'Product 1',
    available: true,
    stock: 10,
    variantStocks: [],
    onSale: false,
    salePercent: null,
    autoSaleManaged: false,
    releasedAt: null,
    ...overrides,
  };
}

/** Ranked entry with enough viewers to clear the floor. */
function ranked(productId: string, viewers = 50): ProductViewers {
  return { productId, viewers, rawViews: viewers };
}

describe('hasStock', () => {
  it('should treat null stock as unlimited', () => {
    expect(hasStock(candidate({ stock: null }))).toBe(true);
  });

  it('should be false when plain stock is zero', () => {
    expect(hasStock(candidate({ stock: 0 }))).toBe(false);
  });

  it('should use variant stock when variants exist, ignoring the product-level field', () => {
    expect(hasStock(candidate({ stock: 0, variantStocks: [0, 3] }))).toBe(true);
    expect(hasStock(candidate({ stock: 99, variantStocks: [0, 0] }))).toBe(false);
  });
});

describe('selectAutoSale', () => {
  it('should enable the top products at the auto rate', () => {
    const plan = selectAutoSale(
      [ranked('p1', 90), ranked('p2', 80)],
      [candidate({ productId: 'p1' }), candidate({ productId: 'p2', title: 'Product 2' })],
      [],
      NOW,
    );
    expect(plan.toEnable).toEqual([
      { productId: 'p1', title: 'Product 1', salePercent: 10 },
      { productId: 'p2', title: 'Product 2', salePercent: 10 },
    ]);
  });

  it('should cap the sale set at AUTO_SALE_COUNT', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const plan = selectAutoSale(
      ids.map((id, i) => ranked(id, 100 - i)),
      ids.map((id) => candidate({ productId: id })),
      [],
      NOW,
    );
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('should skip products below the unique-viewer floor', () => {
    const plan = selectAutoSale([ranked('p1', 4)], [candidate({ productId: 'p1' })], [], NOW);
    expect(plan.toEnable).toEqual([]);
  });

  it('should skip unavailable products', () => {
    const plan = selectAutoSale([ranked('p1')], [candidate({ available: false })], [], NOW);
    expect(plan.toEnable).toEqual([]);
  });

  it('should skip out-of-stock products', () => {
    const plan = selectAutoSale([ranked('p1')], [candidate({ stock: 0 })], [], NOW);
    expect(plan.toEnable).toEqual([]);
  });

  it('should skip excluded products', () => {
    const plan = selectAutoSale([ranked('p1')], [candidate()], ['p1'], NOW);
    expect(plan.toEnable).toEqual([]);
  });

  it('should never enable or disable a manually-set sale', () => {
    const manual = candidate({ onSale: true, salePercent: 25, autoSaleManaged: false });
    const plan = selectAutoSale([ranked('p1')], [manual], [], NOW);
    expect(plan.toEnable).toEqual([]);
    expect(plan.toDisable).toEqual([]);
  });

  it('should not touch a manual sale set below the auto rate', () => {
    const manual = candidate({ onSale: true, salePercent: 5, autoSaleManaged: false });
    const plan = selectAutoSale([ranked('p1')], [manual], [], NOW);
    expect(plan.toEnable).toEqual([]);
    expect(plan.toDisable).toEqual([]);
  });

  it('should skip products already discounted deeper than the auto rate', () => {
    const plan = selectAutoSale(
      [ranked('p1')],
      [candidate({ onSale: true, salePercent: 30, autoSaleManaged: true })],
      [],
      NOW,
    );
    expect(plan.toEnable).toEqual([]);
  });

  it('should treat a product already in the target state as a no-op', () => {
    const settled = candidate({ onSale: true, salePercent: 10, autoSaleManaged: true });
    const plan = selectAutoSale([ranked('p1')], [settled], [], NOW);
    expect(plan.toEnable).toEqual([]);
    expect(plan.toDisable).toEqual([]);
  });

  it('should count already-settled products against the cap', () => {
    const settled = candidate({
      productId: 'settled',
      onSale: true,
      salePercent: 10,
      autoSaleManaged: true,
    });
    const fresh = ['a', 'b', 'c', 'd', 'e'].map((id) => candidate({ productId: id }));
    const plan = selectAutoSale(
      [ranked('settled', 100), ...['a', 'b', 'c', 'd', 'e'].map((id, i) => ranked(id, 90 - i))],
      [settled, ...fresh],
      [],
      NOW,
    );
    expect(plan.toEnable).toHaveLength(4);
    expect(plan.toDisable).toEqual([]);
  });

  it('should disable auto-managed products that fell off the list', () => {
    const stale = candidate({
      productId: 'old',
      title: 'Old',
      onSale: true,
      salePercent: 10,
      autoSaleManaged: true,
    });
    const plan = selectAutoSale(
      [ranked('p1')],
      [candidate({ productId: 'p1' }), stale],
      [],
      NOW,
    );
    expect(plan.toDisable).toEqual([{ productId: 'old', title: 'Old' }]);
  });

  it('should reach further down the ranking when higher candidates are knocked out', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const plan = selectAutoSale(
      ids.map((id, i) => ranked(id, 100 - i)),
      ids.map((id) => candidate({ productId: id, stock: id === 'b' ? 0 : 10 })),
      [],
      NOW,
    );
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['a', 'c', 'd', 'e', 'f']);
  });

  it('should under-fill when too few products are eligible at all', () => {
    const plan = selectAutoSale(
      [ranked('a', 90), ranked('b', 80), ranked('c', 70)],
      [
        candidate({ productId: 'a' }),
        candidate({ productId: 'b', stock: 0 }),
        candidate({ productId: 'c' }),
      ],
      ['c'],
      NOW,
    );
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['a']);
  });

  it('should ignore ranked products that no longer exist in the catalogue', () => {
    const plan = selectAutoSale([ranked('ghost')], [candidate({ productId: 'p1' })], [], NOW);
    expect(plan.toEnable).toEqual([]);
  });

  it('should count knocked-out candidates as skipped', () => {
    const plan = selectAutoSale(
      [ranked('a'), ranked('b')],
      [candidate({ productId: 'a', stock: 0 }), candidate({ productId: 'b' })],
      [],
      NOW,
    );
    expect(plan.skippedCount).toBe(1);
  });

  it('should produce an empty plan when nothing was viewed', () => {
    expect(selectAutoSale([], [candidate()], [], NOW)).toEqual({
      toEnable: [],
      toDisable: [],
      skippedCount: 0,
    });
  });

  it('should skip a product released by an admin within the cooldown', () => {
    const released = candidate({
      releasedAt: new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const plan = selectAutoSale([ranked('p1')], [released], [], NOW);
    expect(plan.toEnable).toEqual([]);
  });

  it('should allow a product again once the cooldown has expired', () => {
    const released = candidate({
      releasedAt: new Date(NOW - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const plan = selectAutoSale([ranked('p1')], [released], [], NOW);
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['p1']);
  });

  it('should ignore an unparseable releasedAt rather than skipping forever', () => {
    const released = candidate({ releasedAt: 'not-a-date' });
    const plan = selectAutoSale([ranked('p1')], [released], [], NOW);
    expect(plan.toEnable.map((e) => e.productId)).toEqual(['p1']);
  });
});
