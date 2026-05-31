// app/(payload)/admin/coupons/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import type { CouponDiscountType } from '@/generated/prisma/client';
import { requireAdmin } from '@/lib/admin';
import {
  createCoupon,
  deleteCoupon,
  toggleCouponEnabled,
  type CouponAdminResult,
} from '@/lib/coupons';

export type CouponActionResult = CouponAdminResult;

async function guardAdmin(): Promise<CouponActionResult | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { ok: false, message: 'Bạn không có quyền quản lý mã giảm giá.' };
  }
}

export async function createCouponAction(input: {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  expiresAt: string | null;
}): Promise<CouponActionResult> {
  const denied = await guardAdmin();
  if (denied) return denied;

  const result = await createCoupon({
    code: input.code,
    discountType: input.discountType,
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount,
    maxUses: input.maxUses,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    enabled: true,
  });

  if (result.ok) revalidatePath('/admin/coupons');
  return result;
}

export async function toggleCouponAction(couponId: string): Promise<CouponActionResult> {
  const denied = await guardAdmin();
  if (denied) return denied;

  const result = await toggleCouponEnabled(couponId);
  if (result.ok) revalidatePath('/admin/coupons');
  return result;
}

export async function deleteCouponAction(couponId: string): Promise<CouponActionResult> {
  const denied = await guardAdmin();
  if (denied) return denied;

  const result = await deleteCoupon(couponId);
  if (result.ok) revalidatePath('/admin/coupons');
  return result;
}
