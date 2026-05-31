// lib/persisted-cart.ts — server-side cart rows for logged-in users (Phase 2)
import type { StoredCartItem } from '@/lib/cart';
import { isPersistedCartEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';

function parseItems(value: unknown): StoredCartItem[] {
  if (!Array.isArray(value)) return [];
  const items: StoredCartItem[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.productId !== 'string' || raw.productId.length === 0) continue;
    if (typeof raw.quantity !== 'number' || !Number.isFinite(raw.quantity)) continue;
    const qty = Math.floor(raw.quantity);
    if (qty <= 0) continue;
    const variantSku =
      typeof raw.variantSku === 'string' && raw.variantSku.trim().length > 0
        ? raw.variantSku.trim()
        : null;
    items.push({ productId: raw.productId, variantSku, quantity: qty });
  }
  return items;
}

function lineKey(productId: string, variantSku: string | null): string {
  return variantSku ? `${productId}:${variantSku}` : productId;
}

export function mergeCartLines(
  primary: StoredCartItem[],
  secondary: StoredCartItem[],
): StoredCartItem[] {
  const map = new Map<string, StoredCartItem>();
  for (const item of [...primary, ...secondary]) {
    const sku =
      typeof item.variantSku === 'string' && item.variantSku.length > 0
        ? item.variantSku
        : null;
    const key = lineKey(item.productId, sku);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(key, { productId: item.productId, variantSku: sku, quantity: item.quantity });
    }
  }
  return [...map.values()];
}

export async function loadPersistedCartItems(userId: string): Promise<StoredCartItem[]> {
  if (!isPersistedCartEnabled()) return [];
  const row = await prisma.persistedCart.findUnique({ where: { userId } });
  if (!row) return [];
  return parseItems(row.items);
}

export async function savePersistedCartItems(
  userId: string,
  items: StoredCartItem[],
): Promise<void> {
  if (!isPersistedCartEnabled()) return;
  await prisma.persistedCart.upsert({
    where: { userId },
    create: { userId, items },
    update: { items },
  });
}

/** Merge guest cookie cart into the user's persisted cart after login. */
export async function mergeGuestCartIntoPersisted(
  userId: string,
  guestItems: StoredCartItem[],
): Promise<StoredCartItem[]> {
  if (!isPersistedCartEnabled() || guestItems.length === 0) {
    return loadPersistedCartItems(userId);
  }
  const persisted = await loadPersistedCartItems(userId);
  const merged = mergeCartLines(persisted, guestItems);
  await savePersistedCartItems(userId, merged);
  return merged;
}
