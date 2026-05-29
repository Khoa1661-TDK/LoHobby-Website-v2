// lib/cart.ts
import { cookies } from 'next/headers';
import { getPayloadProductById } from '@/lib/payload-products';
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
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
};

type StoredItem = { productId: string; quantity: number };
type Stored = { id: string; items: StoredItem[] };

function newId(): string {
  return `cart_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const floored = Math.floor(value);
  if (floored <= 0) return 0;
  return Math.min(floored, MAX_LINE_QUANTITY);
}

function sanitizeStored(value: unknown): Stored | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (!Array.isArray(record.items)) return null;

  const items: StoredItem[] = [];
  for (const entry of record.items) {
    if (typeof entry !== 'object' || entry === null) continue;
    const raw = entry as Record<string, unknown>;
    if (typeof raw.productId !== 'string' || raw.productId.length === 0) continue;
    if (typeof raw.quantity !== 'number') continue;
    const quantity = clampQuantity(raw.quantity);
    if (quantity <= 0) continue;
    items.push({ productId: raw.productId, quantity });
    if (items.length >= MAX_CART_LINES) break;
  }
  return { id: record.id, items };
}

async function read(): Promise<Stored> {
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

async function write(c: Stored): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(c), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

async function hydrate(stored: Stored): Promise<Cart> {
  const lines: CartLine[] = [];
  let subtotal = 0;
  let totalQty = 0;
  const currency = 'VND';

  for (const it of stored.items) {
    const p = await getPayloadProductById(it.productId);
    if (!p) continue;
    const unit = Number(p.priceRange.minVariantPrice.amount);
    if (!Number.isFinite(unit) || unit < 0) continue;
    const lineTotal = unit * it.quantity;
    subtotal += lineTotal;
    totalQty += it.quantity;
    lines.push({
      id: `${stored.id}:${it.productId}`,
      merchandiseId: it.productId,
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
    cost: {
      subtotalAmount: { amount: subtotal.toString(), currencyCode: currency },
      totalAmount: { amount: subtotal.toString(), currencyCode: currency },
    },
  };
}

export async function getCart(): Promise<Cart> {
  return hydrate(await read());
}

/**
 * Add a product to the cart. The product must exist and be purchasable
 * (visible AND `available !== false`) — otherwise this throws so callers can
 * surface a clear "out of stock" error to the user.
 */
export async function addToCart(productId: string, quantity = 1): Promise<Cart> {
  const trimmed = productId.trim();
  if (!trimmed) {
    throw new Error('INVALID_PRODUCT');
  }
  const safeQty = clampQuantity(quantity);
  if (safeQty <= 0) {
    throw new Error('INVALID_QUANTITY');
  }

  const product = await getPayloadProductById(trimmed);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }
  if (!product.availableForSale) {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

  const stored = await read();
  if (
    stored.items.length >= MAX_CART_LINES &&
    !stored.items.some((i) => i.productId === trimmed)
  ) {
    throw new Error('CART_FULL');
  }

  const existing = stored.items.find((i) => i.productId === trimmed);
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + safeQty);
  } else {
    stored.items.push({ productId: trimmed, quantity: safeQty });
  }

  await write(stored);
  return hydrate(stored);
}

export async function updateLine(productId: string, quantity: number): Promise<Cart> {
  const trimmed = productId.trim();
  if (!trimmed) throw new Error('INVALID_PRODUCT');

  const safeQty = clampQuantity(quantity);
  const stored = await read();
  const idx = stored.items.findIndex((i) => i.productId === trimmed);

  if (safeQty <= 0) {
    if (idx >= 0) stored.items.splice(idx, 1);
  } else if (idx >= 0) {
    stored.items[idx]!.quantity = safeQty;
  } else {
    if (stored.items.length >= MAX_CART_LINES) throw new Error('CART_FULL');
    // Validate that the product still exists / is purchasable before adding
    // a brand-new line via the update path.
    const product = await getPayloadProductById(trimmed);
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (!product.availableForSale) throw new Error('PRODUCT_UNAVAILABLE');
    stored.items.push({ productId: trimmed, quantity: safeQty });
  }
  await write(stored);
  return hydrate(stored);
}

export async function removeLine(productId: string): Promise<Cart> {
  const trimmed = productId.trim();
  const stored = await read();
  stored.items = stored.items.filter((i) => i.productId !== trimmed);
  await write(stored);
  return hydrate(stored);
}

export async function clearCart(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getRawCartItems(): Promise<{ productId: string; quantity: number }[]> {
  return (await read()).items;
}
