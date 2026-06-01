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

type ActionError = { error: string };
type ActionOk = Record<string, never>;
type ActionResult = ActionOk | ActionError;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PRODUCT: 'Thiếu mã sản phẩm.',
  INVALID_QUANTITY: 'Số lượng không hợp lệ.',
  PRODUCT_NOT_FOUND: 'Sản phẩm không tồn tại hoặc đã bị xóa.',
  PRODUCT_UNAVAILABLE: 'Sản phẩm hiện đang hết hàng.',
  CART_FULL: 'Giỏ hàng đã đạt số lượng tối đa.',
  VARIANT_REQUIRED: 'Vui lòng chọn biến thể trước khi thêm vào giỏ.',
  INVALID_VARIANT: 'Biến thể không hợp lệ.',
  INSUFFICIENT_STOCK: 'Số lượng vượt quá tồn kho.',
};

function toUserError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const mapped = ERROR_MESSAGES[error.message];
    if (mapped) return mapped;
    if (error.message.length > 0) return error.message;
  }
  return fallback;
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
    return { error: 'Không thể đồng bộ giỏ hàng.' };
  }
}

export async function addItemAction(
  productId: string,
  variantSku?: string | null,
): Promise<ActionResult> {
  if (!productId) return { error: ERROR_MESSAGES.INVALID_PRODUCT! };
  try {
    await addToCart(productId, 1, variantSku, await cartUserId());
    return {};
  } catch (error) {
    return { error: toUserError(error, 'Không thể thêm vào giỏ hàng') };
  }
}

export async function updateItemAction(
  productId: string,
  quantity: number,
  variantSku?: string | null,
): Promise<ActionResult> {
  if (!productId) return { error: ERROR_MESSAGES.INVALID_PRODUCT! };
  try {
    await updateLine(productId, quantity, variantSku, await cartUserId());
    return {};
  } catch (error) {
    return { error: toUserError(error, 'Không thể cập nhật sản phẩm') };
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
    return { error: toUserError(error, 'Không thể xóa sản phẩm') };
  }
}

export async function clearCartAction(): Promise<ActionResult> {
  try {
    await clearCart(await cartUserId());
    return {};
  } catch {
    return { error: 'Không thể xóa giỏ hàng' };
  }
}
