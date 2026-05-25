// components/cart/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  addToCart,
  updateLine,
  removeLine,
  getRawCartItems,
  clearCart,
} from '@/lib/cart';

export async function addItemAction(productId: string): Promise<{ error?: string }> {
  if (!productId) return { error: 'Missing product id' };
  try {
    await addToCart(productId, 1);
    revalidatePath('/', 'layout');
    return {};
  } catch {
    return { error: 'Could not add to cart' };
  }
}

export async function updateItemAction(
  productId: string,
  quantity: number,
): Promise<{ error?: string }> {
  try {
    await updateLine(productId, Math.max(0, Math.floor(quantity)));
    revalidatePath('/', 'layout');
    return {};
  } catch {
    return { error: 'Could not update item' };
  }
}

export async function removeItemAction(productId: string): Promise<{ error?: string }> {
  try {
    await removeLine(productId);
    revalidatePath('/', 'layout');
    return {};
  } catch {
    return { error: 'Could not remove item' };
  }
}

export async function checkoutAction(): Promise<void> {
  const items = await getRawCartItems();
  if (items.length === 0) redirect('/');

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  const res = await fetch(`${origin}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    redirect('/checkout/error');
  }

  const data = (await res.json()) as { checkoutUrl: string };
  await clearCart();
  redirect(data.checkoutUrl);
}
