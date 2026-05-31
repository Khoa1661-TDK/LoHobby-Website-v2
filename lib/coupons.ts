// lib/coupons.ts — Prisma-backed discount codes for checkout
import type { Coupon, CouponDiscountType } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export type CouponValidationResult =
  | {
      ok: true;
      coupon: Coupon;
      discountAmount: number;
      normalizedCode: string;
    }
  | { ok: false; message: string };

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Validate a coupon against the cart subtotal (VND, before shipping).
 * Does not increment usedCount — call `recordCouponRedemption` after order create.
 */
export async function validateCoupon(
  rawCode: string,
  subtotalVnd: number,
): Promise<CouponValidationResult> {
  const normalizedCode = normalizeCode(rawCode);
  if (normalizedCode.length === 0) {
    return { ok: false, message: 'Vui lòng nhập mã giảm giá.' };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon || !coupon.enabled) {
    return { ok: false, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' };
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, message: 'Mã giảm giá đã hết hạn.' };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, message: 'Mã giảm giá đã được sử dụng hết lượt.' };
  }

  if (subtotalVnd < coupon.minOrderAmount) {
    return {
      ok: false,
      message: `Đơn tối thiểu ${coupon.minOrderAmount.toLocaleString('vi-VN')}₫ để dùng mã này.`,
    };
  }

  const discountAmount = computeDiscountAmount(coupon, subtotalVnd);
  if (discountAmount <= 0) {
    return { ok: false, message: 'Mã giảm giá không áp dụng cho đơn này.' };
  }

  return { ok: true, coupon, discountAmount, normalizedCode };
}

function computeDiscountAmount(coupon: Coupon, subtotalVnd: number): number {
  if (coupon.discountType === 'PERCENT') {
    const percent = Math.min(100, Math.max(0, Math.round(coupon.discountValue)));
    return Math.min(subtotalVnd, Math.round((subtotalVnd * percent) / 100));
  }
  return Math.min(subtotalVnd, Math.max(0, Math.round(coupon.discountValue)));
}

/** Increment redemption counter after a successful order is persisted. */
export async function recordCouponRedemption(couponId: string): Promise<void> {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } },
  });
}

export function formatCouponLabel(type: CouponDiscountType, value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  return `${value.toLocaleString('vi-VN')}₫`;
}

export type CreateCouponInput = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  enabled?: boolean;
};

export type UpdateCouponInput = Partial<Omit<CreateCouponInput, 'code'>>;

export type CouponAdminResult = { ok: true; id: string } | { ok: false; message: string };

/** List coupons for admin UI (newest first). */
export async function listCouponsForAdmin(limit = 100): Promise<Coupon[]> {
  return prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** Create a coupon from the admin panel. */
export async function createCoupon(input: CreateCouponInput): Promise<CouponAdminResult> {
  const code = normalizeCode(input.code);
  if (code.length < 2) {
    return { ok: false, message: 'Mã coupon phải có ít nhất 2 ký tự.' };
  }
  if (!Number.isInteger(input.discountValue) || input.discountValue <= 0) {
    return { ok: false, message: 'Giá trị giảm phải là số nguyên dương.' };
  }
  if (input.discountType === 'PERCENT' && input.discountValue > 100) {
    return { ok: false, message: 'Giảm theo % không được vượt quá 100.' };
  }

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    return { ok: false, message: 'Mã coupon đã tồn tại.' };
  }

  const coupon = await prisma.coupon.create({
    data: {
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount ?? 0,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ?? null,
      enabled: input.enabled ?? true,
    },
  });

  return { ok: true, id: coupon.id };
}

/** Update coupon fields (not code). */
export async function updateCoupon(
  couponId: string,
  input: UpdateCouponInput,
): Promise<CouponAdminResult> {
  if (!couponId) return { ok: false, message: 'Thiếu mã coupon.' };

  const existing = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!existing) return { ok: false, message: 'Không tìm thấy coupon.' };

  if (input.discountValue !== undefined) {
    if (!Number.isInteger(input.discountValue) || input.discountValue <= 0) {
      return { ok: false, message: 'Giá trị giảm phải là số nguyên dương.' };
    }
    const type = input.discountType ?? existing.discountType;
    if (type === 'PERCENT' && input.discountValue > 100) {
      return { ok: false, message: 'Giảm theo % không được vượt quá 100.' };
    }
  }

  const data: {
    discountType?: CouponDiscountType;
    discountValue?: number;
    minOrderAmount?: number;
    maxUses?: number | null;
    expiresAt?: Date | null;
    enabled?: boolean;
  } = {};

  if (input.discountType !== undefined) data.discountType = input.discountType;
  if (input.discountValue !== undefined) data.discountValue = input.discountValue;
  if (input.minOrderAmount !== undefined) data.minOrderAmount = input.minOrderAmount;
  if (input.maxUses !== undefined) data.maxUses = input.maxUses;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
  if (input.enabled !== undefined) data.enabled = input.enabled;

  await prisma.coupon.update({
    where: { id: couponId },
    data,
  });

  return { ok: true, id: couponId };
}

/** Toggle coupon enabled flag. */
export async function toggleCouponEnabled(couponId: string): Promise<CouponAdminResult> {
  if (!couponId) return { ok: false, message: 'Thiếu mã coupon.' };

  const existing = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { enabled: true },
  });
  if (!existing) return { ok: false, message: 'Không tìm thấy coupon.' };

  await prisma.coupon.update({
    where: { id: couponId },
    data: { enabled: !existing.enabled },
  });

  return { ok: true, id: couponId };
}

/** Delete a coupon (only when unused). */
export async function deleteCoupon(couponId: string): Promise<CouponAdminResult> {
  if (!couponId) return { ok: false, message: 'Thiếu mã coupon.' };

  const existing = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { usedCount: true },
  });
  if (!existing) return { ok: false, message: 'Không tìm thấy coupon.' };
  if (existing.usedCount > 0) {
    return { ok: false, message: 'Không thể xóa coupon đã được sử dụng — hãy tắt thay vì xóa.' };
  }

  await prisma.coupon.delete({ where: { id: couponId } });
  return { ok: true, id: couponId };
}
