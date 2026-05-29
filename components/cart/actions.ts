// components/cart/actions.ts
'use server';

import {
  addToCart,
  clearCart,
  removeLine,
  updateLine,
} from '@/lib/cart';

type ActionError = { error: string };
type ActionOk = Record<string, never>;
type ActionResult = ActionOk | ActionError;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PRODUCT: 'Thiếu mã sản phẩm.',
  INVALID_QUANTITY: 'Số lượng không hợp lệ.',
  PRODUCT_NOT_FOUND: 'Sản phẩm không tồn tại hoặc đã bị xóa.',
  PRODUCT_UNAVAILABLE: 'Sản phẩm hiện đang hết hàng.',
  CART_FULL: 'Giỏ hàng đã đạt số lượng tối đa.',
};

function toUserError(error: unknown, fallback: string): string {
  if (error instanceof Error && ERROR_MESSAGES[error.message]) {
    return ERROR_MESSAGES[error.message]!;
  }
  return fallback;
}

export async function addItemAction(productId: string): Promise<ActionResult> {
  if (!productId) return { error: ERROR_MESSAGES.INVALID_PRODUCT! };
  try {
    await addToCart(productId, 1);
    return {};
  } catch (error) {
    return { error: toUserError(error, 'Không thể thêm vào giỏ hàng') };
  }
}

export async function updateItemAction(
  productId: string,
  quantity: number,
): Promise<ActionResult> {
  if (!productId) return { error: ERROR_MESSAGES.INVALID_PRODUCT! };
  try {
    await updateLine(productId, quantity);
    return {};
  } catch (error) {
    return { error: toUserError(error, 'Không thể cập nhật sản phẩm') };
  }
}

export async function removeItemAction(productId: string): Promise<ActionResult> {
  try {
    await removeLine(productId);
    return {};
  } catch (error) {
    return { error: toUserError(error, 'Không thể xóa sản phẩm') };
  }
}

export async function clearCartAction(): Promise<ActionResult> {
  try {
    await clearCart();
    return {};
  } catch {
    return { error: 'Không thể xóa giỏ hàng' };
  }
}
