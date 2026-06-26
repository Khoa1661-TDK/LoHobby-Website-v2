// lib/__tests__/cart-merge.test.ts — regression: merge-on-login must not multiply quantities
import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory cookie jar and persisted-cart store shared across the mocked modules.
const stores = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  persisted: new Map<string, unknown>(),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      stores.cookieJar.has(name) ? { value: stores.cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      stores.cookieJar.set(name, value);
    },
    delete: (name: string) => {
      stores.cookieJar.delete(name);
    },
  }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    persistedCart: {
      findUnique: async ({ where: { userId } }: { where: { userId: string } }) => {
        const items = stores.persisted.get(userId);
        return items ? { userId, items } : null;
      },
      upsert: async ({
        where: { userId },
        create,
        update,
      }: {
        where: { userId: string };
        create: { items: unknown };
        update: { items: unknown };
      }) => {
        const items = stores.persisted.has(userId) ? update.items : create.items;
        stores.persisted.set(userId, items);
        return { userId, items };
      },
    },
  },
}));

vi.mock('@/lib/payload-products', () => ({
  getPayloadProductById: async (id: string) => ({
    id,
    handle: `p-${id}`,
    title: `Product ${id}`,
    availableForSale: true,
    featuredImage: { url: '/x.png', altText: '' },
  }),
  loadPayloadProductDocsByIds: async (ids: string[]) =>
    ids.map((id) => ({ id, price: 1000, variants: [] })),
  normalizeVariantDocs: () => [],
  computeSalePrice: (price: number) => ({ price }),
}));

vi.mock('@/lib/inventory', () => ({
  assertCartLineStock: async () => {},
}));

import { addToCart, getRawCartItems, syncCartCookie } from '@/lib/cart';
import {
  loadPersistedCartItems,
  mergeGuestCartIntoPersisted,
} from '@/lib/persisted-cart';

/** Replays the body of mergeCartOnLoginAction (components/cart/actions.ts). */
async function runMergeOnLogin(userId: string): Promise<void> {
  const guestItems = await getRawCartItems(null);
  const merged = await mergeGuestCartIntoPersisted(userId, guestItems);
  await syncCartCookie(merged, userId);
}

describe('merge-on-login', () => {
  beforeEach(() => {
    stores.cookieJar.clear();
    stores.persisted.clear();
  });

  it('should keep the same quantity when merge runs again on a later page load', async () => {
    const userId = '1';

    // Guest adds 2 of a product before logging in.
    await addToCart('5', 2, null, null);

    // Login fires the merge once (folds guest cookie into the persisted cart).
    await runMergeOnLogin(userId);
    expect(await loadPersistedCartItems(userId)).toEqual([
      { productId: '5', variantSku: null, quantity: 2 },
    ]);

    // A later full page load re-mounts MergeCartOnLogin and fires the merge again.
    await runMergeOnLogin(userId);

    // The quantity must NOT double — it should still be 2.
    expect(await loadPersistedCartItems(userId)).toEqual([
      { productId: '5', variantSku: null, quantity: 2 },
    ]);
  });
});
