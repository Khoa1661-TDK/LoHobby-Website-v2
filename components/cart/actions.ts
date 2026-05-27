// components/cart/actions.ts
'use server';

import {
  addToCart,
  updateLine,
  removeLine,
  clearCart,
} from '@/lib/cart';

export async function addItemAction(productId: string): Promise<{ error?: string }> {
  if (!productId) return { error: 'Thiếu mã sản phẩm' };
  try {
    await addToCart(productId, 1);
    return {};
  } catch {
    return { error: 'Không thể thêm vào giỏ hàng' };
  }
}

export async function updateItemAction(
  productId: string,
  quantity: number,
): Promise<{ error?: string }> {
  try {
    await updateLine(productId, Math.max(0, Math.floor(quantity)));
    return {};
  } catch {
    return { error: 'Không thể cập nhật sản phẩm' };
  }
}

export async function removeItemAction(productId: string): Promise<{ error?: string }> {
  try {
    await removeLine(productId);
    return {};
  } catch {
    return { error: 'Không thể xóa sản phẩm' };
  }
}

export async function clearCartAction(): Promise<{ error?: string }> {
  try {
    await clearCart();
    return {};
  } catch {
    return { error: 'Không thể xóa giỏ hàng' };
  }
}
