// lib/cart.ts
import { cookies } from 'next/headers';
import {
  computeSalePrice,
  getPayloadProductById,
  loadPayloadProductDocsByIds,
  normalizeVariantDocs,
} from '@/lib/payload-products';
import { assertCartLineStock } from '@/lib/inventory';
import { isPersistedCartEnabled } from '@/lib/feature-flags';
import {
  loadPersistedCartItems,
  savePersistedCartItems,
} from '@/lib/persisted-cart';
import type { Image } from '@/lib/shopify/types';

const COOKIE = 'cart';
const MAX_AGE = 60 * 60 * 24 * 30;
/** Per-line cap so a malicious cookie can't push absurd numbers through. */
export const MAX_LINE_QUANTITY = 999;
/** Hard cap on distinct SKUs in the cart to keep cookie size bounded. */
export const MAX_CART_LINES = 100;

export type Money = { amount: string; currencyCode: string };

export type CartLine = {
  id: string;
  merchandiseId: string;
  /** Variant SKU when the product has Payload variants; otherwise same as product id. */
  variantSku: string | null;
  variantName: string | null;
  handle: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  product: {
    id: string;
    handle: string;
    title: string;
    featuredImage: Image;
  };
};

export type Cart = {
  id: string;
  totalQuantity: number;
  lines: CartLine[];
  /** Stored lines skipped during hydrate because the product/variant is gone or unavailable. */
  droppedLineCount?: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
};

export type StoredCartItem = {
  productId: string;
  variantSku?: string | null;
  quantity: number;
};

type Stored = { id: string; items: StoredCartItem[] };

function lineKey(productId: string, variantSku: string | null): string {
  return variantSku ? `${productId}:${variantSku}` : productId;
}

function newId(): string {
  return `cart_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const floored = Math.floor(value);
  if (floored <= 0) return 0;
  return Math.min(floored, MAX_LINE_QUANTITY);
}

function normalizeVariantSku(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeStored(value: unknown): Stored | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (!Array.isArray(record.items)) return null;

  const items: StoredCartItem[] = [];
  for (const entry of record.items) {
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.productId !== 'string' || raw.productId.length === 0) continue;
    if (typeof raw.quantity !== 'number') continue;
    const quantity = clampQuantity(raw.quantity);
    if (quantity <= 0) continue;
    items.push({
      productId: raw.productId,
      variantSku: normalizeVariantSku(raw.variantSku),
      quantity,
    });
    if (items.length >= MAX_CART_LINES) break;
  }
  return { id: record.id, items };
}

async function readCookieStored(): Promise<Stored> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return { id: newId(), items: [] };
  try {
    const sanitized = sanitizeStored(JSON.parse(raw));
    if (sanitized) return sanitized;
  } catch {
    /* fall through */
  }
  return { id: newId(), items: [] };
}

async function read(userId?: string | null): Promise<Stored> {
  const cookieStored = await readCookieStored();
  if (!userId || !isPersistedCartEnabled()) {
    return cookieStored;
  }

  const persisted = await loadPersistedCartItems(userId);
  // Persisted rows are the source of truth for logged-in users. Cookie is only used
  // before the first DB save (e.g. immediately after login, before merge-on-login runs).
  // Do not call write() here — Server Components may only read cookies, not set them.
  if (persisted.length > 0) {
    return { id: cookieStored.id, items: persisted };
  }

  return cookieStored;
}

async function write(c: Stored, userId?: string | null): Promise<void> {
  const jar = await cookies();
  if (userId && isPersistedCartEnabled()) {
    // Persisted rows are the source of truth for logged-in users (see read()).
    // Do NOT mirror them into the guest `cart` cookie: the cookie is the guest
    // vehicle that merge-on-login folds into the persisted cart, so leaving the
    // merged items there would let the next merge re-add them and multiply the
    // quantities on every page load.
    await savePersistedCartItems(userId, c.items);
    jar.delete(COOKIE);
    return;
  }
  jar.set(COOKIE, JSON.stringify(c), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

async function hydrate(stored: Stored): Promise<Cart> {
  const productIds = [...new Set(stored.items.map((i) => i.productId))];
  const docs = productIds.length > 0 ? await loadPayloadProductDocsByIds(productIds) : [];
  const docMap = new Map(docs.map((d) => [String(d.id), d]));

  const lines: CartLine[] = [];
  let subtotal = 0;
  let totalQty = 0;
  let dropped = 0;
  const currency = 'VND';

  for (const it of stored.items) {
    const doc = docMap.get(it.productId);
    if (!doc) {
      dropped += 1;
      continue;
    }

    const variants = normalizeVariantDocs(doc.variants);
    const variantSku = normalizeVariantSku(it.variantSku);
    let unit = Math.max(0, Math.round(doc.price));
    let variantName: string | null = null;

    if (variants.length > 0) {
      const match = variantSku ? variants.find((v) => v.sku.trim() === variantSku) : null;
      if (!match) {
        dropped += 1;
        continue;
      }
      variantName = match.name.trim();
      const base = Math.max(0, Math.round(doc.price));
      const overridden =
        typeof match.priceOverride === 'number' && Number.isFinite(match.priceOverride)
          ? Math.max(0, Math.round(match.priceOverride))
          : null;
      unit = computeSalePrice(overridden ?? base, doc).price;
    } else {
      unit = computeSalePrice(doc.price, doc).price;
    }

    const p = await getPayloadProductById(it.productId);
    if (!p || !p.availableForSale) {
      dropped += 1;
      continue;
    }

    const lineTotal = unit * it.quantity;
    subtotal += lineTotal;
    totalQty += it.quantity;
    lines.push({
      id: `${stored.id}:${lineKey(it.productId, variantSku)}`,
      merchandiseId: it.productId,
      variantSku,
      variantName,
      handle: p.handle,
      quantity: it.quantity,
      unitPrice: { amount: unit.toString(), currencyCode: currency },
      lineTotal: { amount: lineTotal.toString(), currencyCode: currency },
      product: {
        id: p.id,
        handle: p.handle,
        title: p.title,
        featuredImage: p.featuredImage,
      },
    });
  }

  return {
    id: stored.id,
    totalQuantity: totalQty,
    lines,
    droppedLineCount: dropped,
    cost: {
      subtotalAmount: { amount: subtotal.toString(), currencyCode: currency },
      totalAmount: { amount: subtotal.toString(), currencyCode: currency },
    },
  };
}

export async function getCart(userId?: string | null): Promise<Cart> {
  return hydrate(await read(userId));
}

/**
 * Add a product (and optional variant SKU) to the cart.
 */
export async function addToCart(
  productId: string,
  quantity = 1,
  variantSku?: string | null,
  userId?: string | null,
): Promise<Cart> {
  const trimmed = productId.trim();
  if (!trimmed) {
    throw new Error('INVALID_PRODUCT');
  }
  const safeQty = clampQuantity(quantity);
  if (safeQty <= 0) {
    throw new Error('INVALID_QUANTITY');
  }

  const sku = normalizeVariantSku(variantSku);
  const product = await getPayloadProductById(trimmed);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }
  if (!product.availableForSale) {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

  const docs = await loadPayloadProductDocsByIds([trimmed]);
  const doc = docs[0];
  const variants = doc ? normalizeVariantDocs(doc.variants) : [];
  if (variants.length > 0 && !sku) {
    throw new Error('VARIANT_REQUIRED');
  }
  if (variants.length === 0 && sku) {
    throw new Error('INVALID_VARIANT');
  }

  const stored = await read(userId);
  const key = lineKey(trimmed, sku);
  if (
    stored.items.length >= MAX_CART_LINES &&
    !stored.items.some((i) => lineKey(i.productId, normalizeVariantSku(i.variantSku)) === key)
  ) {
    throw new Error('CART_FULL');
  }

  const existing = stored.items.find(
    (i) => lineKey(i.productId, normalizeVariantSku(i.variantSku)) === key,
  );
  const nextQty = clampQuantity((existing?.quantity ?? 0) + safeQty);
  await assertCartLineStock(trimmed, sku, nextQty);

  if (existing) {
    existing.quantity = nextQty;
  } else {
    stored.items.push({ productId: trimmed, variantSku: sku, quantity: safeQty });
  }

  await write(stored, userId);
  return hydrate(stored);
}

export async function updateLine(
  productId: string,
  quantity: number,
  variantSku?: string | null,
  userId?: string | null,
): Promise<Cart> {
  const trimmed = productId.trim();
  if (!trimmed) throw new Error('INVALID_PRODUCT');

  const sku = normalizeVariantSku(variantSku);
  const safeQty = clampQuantity(quantity);
  const stored = await read(userId);
  const key = lineKey(trimmed, sku);
  const idx = stored.items.findIndex(
    (i) => lineKey(i.productId, normalizeVariantSku(i.variantSku)) === key,
  );

  if (safeQty <= 0) {
    if (idx >= 0) stored.items.splice(idx, 1);
  } else if (idx >= 0) {
    await assertCartLineStock(trimmed, sku, safeQty);
    stored.items[idx]!.quantity = safeQty;
  } else {
    if (stored.items.length >= MAX_CART_LINES) throw new Error('CART_FULL');
    const product = await getPayloadProductById(trimmed);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (!product.availableForSale) throw new Error('PRODUCT_UNAVAILABLE');
    await assertCartLineStock(trimmed, sku, safeQty);
    stored.items.push({ productId: trimmed, variantSku: sku, quantity: safeQty });
  }
  await write(stored, userId);
  return hydrate(stored);
}

export async function removeLine(
  productId: string,
  variantSku?: string | null,
  userId?: string | null,
): Promise<Cart> {
  const trimmed = productId.trim();
  const sku = normalizeVariantSku(variantSku);
  const key = lineKey(trimmed, sku);
  const stored = await read(userId);
  stored.items = stored.items.filter(
    (i) => lineKey(i.productId, normalizeVariantSku(i.variantSku)) !== key,
  );
  await write(stored, userId);
  return hydrate(stored);
}

export async function clearCart(userId?: string | null): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
  if (userId && isPersistedCartEnabled()) {
    await savePersistedCartItems(userId, []);
  }
}

export async function getRawCartItems(userId?: string | null): Promise<StoredCartItem[]> {
  return (await read(userId)).items;
}

/** Mirror cart lines to the httpOnly cookie (Server Actions / Route Handlers only). */
export async function syncCartCookie(
  items: StoredCartItem[],
  userId?: string | null,
): Promise<void> {
  const cookieStored = await readCookieStored();
  await write({ id: cookieStored.id, items }, userId);
}
