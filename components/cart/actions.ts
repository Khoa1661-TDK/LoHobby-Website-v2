// components/cart/actions.ts
'use server';

import { auth } from '@/auth';
import {
  addToCart,
  clearCart,
  getRawCartItems,
  removeLine,
  syncCartCookie,
  updateLine,
} from '@/lib/cart';
import { mergeGuestCartIntoPersisted } from '@/lib/persisted-cart';
import { syncStoreCustomerForUser } from '@/lib/store-customer-sync';
import { getTranslations } from 'next-intl/server';

type ActionError = { error: string };
type ActionOk = Record<string, never>;
type ActionResult = ActionOk | ActionError;

/** Keys thrown by lib/cart that carry a specific message key prefix. */
const ERROR_KEY_PREFIX = 'errors.' as const;

const KNOWN_ERROR_KEYS = new Set([
  'INVALID_PRODUCT',
  'INVALID_QUANTITY',
  'PRODUCT_NOT_FOUND',
  'PRODUCT_UNAVAILABLE',
  'CART_FULL',
  'VARIANT_REQUIRED',
  'INVALID_VARIANT',
  'INSUFFICIENT_STOCK',
]);

async function toUserError(
  t: Awaited<ReturnType<typeof getTranslations>>,
  error: unknown,
  fallbackKey: string,
): Promise<string> {
  if (error instanceof Error) {
    if (KNOWN_ERROR_KEYS.has(error.message)) {
      const translated = t(`${ERROR_KEY_PREFIX}${error.message}`);
      if (translated && !translated.startsWith('errors.')) return translated;
    }
    if (error.message.length > 0) return error.message;
  }
  return t(fallbackKey);
}

async function cartUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Merge cookie cart into persisted cart after login (Phase 2). */
export async function mergeCartOnLoginAction(): Promise<ActionResult> {
  const userId = await cartUserId();
  if (!userId) return {};
  try {
    const guestItems = await getRawCartItems(null);
    const merged = await mergeGuestCartIntoPersisted(userId, guestItems);
    await syncCartCookie(merged, userId);
    await syncStoreCustomerForUser(userId);
    return {};
  } catch {
    const t = await getTranslations('cart');
    return { error: t('errors.mergeFailed') };
  }
}

export async function addItemAction(
  productId: string,
  variantSku?: string | null,
  quantity = 1,
): Promise<ActionResult> {
  const t = await getTranslations('cart');
  if (!productId) return { error: t('errors.invalidProduct') };
  try {
    await addToCart(productId, quantity, variantSku, await cartUserId());
    return {};
  } catch (error) {
    return { error: await toUserError(t, error, 'errors.addFailed') };
  }
}

export async function updateItemAction(
  productId: string,
  quantity: number,
  variantSku?: string | null,
): Promise<ActionResult> {
  const t = await getTranslations('cart');
  if (!productId) return { error: t('errors.invalidProduct') };
  try {
    await updateLine(productId, quantity, variantSku, await cartUserId());
    return {};
  } catch (error) {
    return { error: await toUserError(t, error, 'errors.updateFailed') };
  }
}

export async function removeItemAction(
  productId: string,
  variantSku?: string | null,
): Promise<ActionResult> {
  try {
    await removeLine(productId, variantSku, await cartUserId());
    return {};
  } catch (error) {
    const t = await getTranslations('cart');
    return { error: await toUserError(t, error, 'errors.removeFailed') };
  }
}

export async function clearCartAction(): Promise<ActionResult> {
  try {
    await clearCart(await cartUserId());
    return {};
  } catch {
    const t = await getTranslations('cart');
    return { error: t('errors.clearFailed') };
  }
}
