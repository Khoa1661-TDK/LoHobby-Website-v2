// app/profile/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { addToCart } from '@/lib/cart';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { cancelOrder } from '@/lib/order-fulfillment';

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_NAME = 120;
const MAX_URL = 2048;
const MAX_PHONE = 32;
const MAX_TITLE = 60;
const MAX_TEXT = 200;

type CancelReason = 'changed_mind' | 'ordered_by_mistake' | 'found_better_price' | 'delivery_too_slow' | 'other';

const CANCEL_REASONS = new Set<CancelReason>([
  'changed_mind',
  'ordered_by_mistake',
  'found_better_price',
  'delivery_too_slow',
  'other',
]);

function isCancelReason(value: string): value is CancelReason {
  return CANCEL_REASONS.has(value as CancelReason);
}

function trimString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function optionalString(value: unknown, max: number): string | null {
  const trimmed = trimString(value, max);
  return trimmed.length > 0 ? trimmed : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }

  const name = trimString(formData.get('name'), MAX_NAME);
  if (name.length === 0) {
    return { ok: false, error: 'Vui lòng nhập tên hiển thị.' };
  }

  const rawImage = trimString(formData.get('image'), MAX_URL);
  let image: string | null = null;
  if (rawImage.length > 0) {
    if (!isHttpUrl(rawImage)) {
      return { ok: false, error: 'URL ảnh đại diện phải bắt đầu bằng http:// hoặc https://' };
    }
    image = rawImage;
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, image },
    });
  } catch (error) {
    logger.error({ err: error }, '[profile.updateProfileAction] failed');
    return { ok: false, error: 'Không thể cập nhật hồ sơ.' };
  }

  revalidatePath('/profile');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function createAddressAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }

  const title = trimString(formData.get('title'), MAX_TITLE);
  const fullName = trimString(formData.get('fullName'), MAX_NAME);
  const phone = trimString(formData.get('phone'), MAX_PHONE);
  const addressLine = trimString(formData.get('addressLine'), MAX_TEXT);
  const city = trimString(formData.get('city'), MAX_TEXT);
  const ward = optionalString(formData.get('ward'), MAX_TEXT);
  const district = optionalString(formData.get('district'), MAX_TEXT);
  const country = trimString(formData.get('country'), MAX_TEXT) || 'Vietnam';
  const isDefault = formData.get('isDefault') === 'on' || formData.get('isDefault') === 'true';

  if (!title) return { ok: false, error: 'Vui lòng nhập nhãn địa chỉ.' };
  if (!fullName) return { ok: false, error: 'Vui lòng nhập tên người nhận.' };
  if (!phone) return { ok: false, error: 'Vui lòng nhập số điện thoại.' };
  if (!addressLine) return { ok: false, error: 'Vui lòng nhập địa chỉ.' };
  if (!city) return { ok: false, error: 'Vui lòng nhập tỉnh / thành phố.' };

  try {
    await prisma.$transaction(async (tx) => {
      const existingCount = await tx.userAddress.count({
        where: { userId: session.user.id },
      });
      const makeDefault = isDefault || existingCount === 0;

      if (makeDefault) {
        await tx.userAddress.updateMany({
          where: { userId: session.user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      await tx.userAddress.create({
        data: {
          userId: session.user.id,
          title,
          fullName,
          phone,
          addressLine,
          ward,
          district,
          city,
          country,
          isDefault: makeDefault,
        },
      });
    });
  } catch (error) {
    logger.error({ err: error }, '[profile.createAddressAction] failed');
    return { ok: false, error: 'Không thể lưu địa chỉ.' };
  }

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { ok: true };
}

export async function deleteAddressAction(addressId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }

  if (typeof addressId !== 'string' || addressId.length === 0) {
    return { ok: false, error: 'Địa chỉ không hợp lệ.' };
  }

  try {
    const result = await prisma.userAddress.deleteMany({
      where: { id: addressId, userId: session.user.id },
    });
    if (result.count === 0) {
      return { ok: false, error: 'Không tìm thấy địa chỉ.' };
    }
  } catch (error) {
    logger.error({ err: error }, '[profile.deleteAddressAction] failed');
    return { ok: false, error: 'Không thể xóa địa chỉ.' };
  }

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { ok: true };
}

export async function reorderAction(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }
  if (typeof orderId !== 'string' || orderId.length === 0) {
    return { ok: false, error: 'Đơn hàng không hợp lệ.' };
  }

  const config = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config: config.default });
  let doc;
  try {
    doc = await payload.findByID({ collection: 'orders', id: orderId, depth: 0 });
  } catch {
    return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  }

  const meta = doc.metadata as { prismaUserId?: string } | null | undefined;
  const ownsOrder =
    meta?.prismaUserId === session.user.id ||
    (typeof doc.buyerEmail === 'string' &&
      doc.buyerEmail.toLowerCase() === session.user.email?.toLowerCase());
  if (!ownsOrder) {
    return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  }

  const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
  let added = 0;
  for (const raw of lineItems) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId : '';
    const variantSku = typeof item.variantSku === 'string' ? item.variantSku : null;
    const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
    if (!productId) continue;
    try {
      await addToCart(productId, quantity, variantSku, session.user.id);
      added += 1;
    } catch {
      // Skip products that are no longer purchasable; keep adding the rest.
    }
  }

  if (added === 0) {
    return { ok: false, error: 'Các sản phẩm trong đơn này hiện không còn bán.' };
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function setDefaultAddressAction(addressId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }

  if (typeof addressId !== 'string' || addressId.length === 0) {
    return { ok: false, error: 'Địa chỉ không hợp lệ.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.userAddress.findFirst({
        where: { id: addressId, userId: session.user.id },
        select: { id: true },
      });
      if (!target) {
        throw new Error('Không tìm thấy địa chỉ.');
      }
      await tx.userAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
      await tx.userAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  } catch (error) {
    logger.error({ err: error }, '[profile.setDefaultAddressAction] failed');
    const message = error instanceof Error ? error.message : 'Không thể cập nhật địa chỉ mặc định.';
    return { ok: false, error: message };
  }

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { ok: true };
}

export async function cancelOrderAction(
  orderId: string,
  reason: string,
  note?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập.' };
  }
  if (typeof orderId !== 'string' || orderId.length === 0) {
    return { ok: false, error: 'Đơn hàng không hợp lệ.' };
  }
  if (!isCancelReason(reason)) {
    return { ok: false, error: 'Vui lòng chọn lý do hủy hợp lệ.' };
  }

  const config = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config: config.default });

  let doc;
  try {
    doc = await payload.findByID({ collection: 'orders', id: orderId, depth: 0 });
  } catch {
    return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  }

  const meta = doc.metadata as { prismaUserId?: string } | null | undefined;
  const ownsOrder =
    meta?.prismaUserId === session.user.id ||
    (typeof doc.buyerEmail === 'string' &&
      doc.buyerEmail.toLowerCase() === session.user.email?.toLowerCase());
  if (!ownsOrder) {
    return { ok: false, error: 'Không tìm thấy đơn hàng.' };
  }

  if (doc.orderStatus !== 'pending' && doc.orderStatus !== 'processing') {
    return { ok: false, error: 'Đơn hàng này không thể hủy (đã giao cho đơn vị vận chuyển hoặc đã hoàn tất).' };
  }

  try {
    await payload.update({
      collection: 'orders',
      id: doc.id,
      data: {
        cancellationReason: reason,
        cancellationNote: typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 500) : null,
      },
    });
  } catch (error) {
    logger.error({ err: error, orderId: doc.id }, '[profile.cancelOrderAction] reason save failed');
    return { ok: false, error: 'Không thể hủy đơn hàng.' };
  }

  const result = await cancelOrder(doc.id);
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  revalidatePath('/profile');
  revalidatePath('/', 'layout');
  return { ok: true };
}
