// lib/cart.ts
import { cookies } from 'next/headers';
import { getPayloadProductById } from '@/lib/payload-products';
import type { Image } from '@/lib/shopify/types';

const COOKIE = 'cart';
const MAX_AGE = 60 * 60 * 24 * 30;

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

type Stored = { id: string; items: { productId: string; quantity: number }[] };

function newId(): string {
  return `cart_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

async function read(): Promise<Stored> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return { id: newId(), items: [] };
  try {
    const parsed = JSON.parse(raw) as Stored;
    if (typeof parsed.id === 'string' && Array.isArray(parsed.items)) return parsed;
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

export async function addToCart(productId: string, quantity = 1): Promise<Cart> {
  const stored = await read();
  const existing = stored.items.find((i) => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else stored.items.push({ productId, quantity });
  await write(stored);
  return hydrate(stored);
}

export async function updateLine(productId: string, quantity: number): Promise<Cart> {
  const stored = await read();
  const idx = stored.items.findIndex((i) => i.productId === productId);
  if (quantity <= 0) {
    if (idx >= 0) stored.items.splice(idx, 1);
  } else if (idx >= 0) {
    stored.items[idx]!.quantity = quantity;
  } else {
    stored.items.push({ productId, quantity });
  }
  await write(stored);
  return hydrate(stored);
}

export async function removeLine(productId: string): Promise<Cart> {
  const stored = await read();
  stored.items = stored.items.filter((i) => i.productId !== productId);
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
