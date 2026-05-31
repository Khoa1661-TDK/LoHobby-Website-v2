// lib/gift-cards.ts — Prisma-backed digital gift card validation and redemption
import 'server-only';

import type { GiftCard } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

export type GiftCardValidationResult =
  | {
      ok: true;
      giftCard: GiftCard;
      appliedAmount: number;
      normalizedCode: string;
    }
  | { ok: false; message: string };

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Validate a gift card against the order total after coupon discount.
 * Does not mutate balance — call `recordGiftCardRedemption` after order create.
 */
export async function validateGiftCard(
  rawCode: string,
  orderTotalBeforeGiftCardVnd: number,
): Promise<GiftCardValidationResult> {
  const normalizedCode = normalizeCode(rawCode);
  if (normalizedCode.length < 4) {
    return { ok: false, message: 'Mã thẻ quà tặng không hợp lệ.' };
  }

  const giftCard = await prisma.giftCard.findUnique({
    where: { code: normalizedCode },
  });

  if (!giftCard || !giftCard.enabled) {
    return { ok: false, message: 'Thẻ quà tặng không hợp lệ hoặc đã bị vô hiệu hóa.' };
  }

  if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
    return { ok: false, message: 'Thẻ quà tặng đã hết hạn.' };
  }

  if (giftCard.balance <= 0) {
    return { ok: false, message: 'Thẻ quà tặng đã hết số dư.' };
  }

  const payable = Math.max(0, Math.round(orderTotalBeforeGiftCardVnd));
  if (payable <= 0) {
    return { ok: false, message: 'Thẻ quà tặng không áp dụng cho đơn này.' };
  }

  const appliedAmount = Math.min(giftCard.balance, payable);
  if (appliedAmount <= 0) {
    return { ok: false, message: 'Thẻ quà tặng không áp dụng cho đơn này.' };
  }

  return { ok: true, giftCard, appliedAmount, normalizedCode };
}

/** Deduct gift card balance after a successful order is persisted. */
export async function recordGiftCardRedemption(
  giftCardId: string,
  appliedAmount: number,
): Promise<void> {
  const amount = Math.max(0, Math.round(appliedAmount));
  if (amount <= 0) return;

  await prisma.giftCard.update({
    where: { id: giftCardId },
    data: {
      balance: { decrement: amount },
      usedAmount: { increment: amount },
    },
  });
}

export type CreateGiftCardInput = {
  code: string;
  initialBalance: number;
  expiresAt?: Date | null;
  enabled?: boolean;
  note?: string | null;
};

export type GiftCardAdminResult = { ok: true; id: string } | { ok: false; message: string };

/** List gift cards for admin UI (newest first). */
export async function listGiftCardsForAdmin(limit = 100): Promise<GiftCard[]> {
  return prisma.giftCard.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** Issue a new digital gift card from the admin panel. */
export async function createGiftCard(input: CreateGiftCardInput): Promise<GiftCardAdminResult> {
  const code = normalizeCode(input.code);
  if (code.length < 4) {
    return { ok: false, message: 'Mã thẻ phải có ít nhất 4 ký tự.' };
  }
  if (!Number.isInteger(input.initialBalance) || input.initialBalance <= 0) {
    return { ok: false, message: 'Số dư ban đầu phải là số nguyên dương (VND).' };
  }

  const existing = await prisma.giftCard.findUnique({ where: { code } });
  if (existing) {
    return { ok: false, message: 'Mã thẻ quà tặng đã tồn tại.' };
  }

  const giftCard = await prisma.giftCard.create({
    data: {
      code,
      initialBalance: input.initialBalance,
      balance: input.initialBalance,
      expiresAt: input.expiresAt ?? null,
      enabled: input.enabled ?? true,
      note: input.note?.trim() || null,
    },
  });

  return { ok: true, id: giftCard.id };
}

/** Toggle gift card enabled flag. */
export async function toggleGiftCardEnabled(giftCardId: string): Promise<GiftCardAdminResult> {
  if (!giftCardId) return { ok: false, message: 'Thiếu mã thẻ.' };

  const existing = await prisma.giftCard.findUnique({
    where: { id: giftCardId },
    select: { enabled: true },
  });
  if (!existing) return { ok: false, message: 'Không tìm thấy thẻ quà tặng.' };

  await prisma.giftCard.update({
    where: { id: giftCardId },
    data: { enabled: !existing.enabled },
  });

  return { ok: true, id: giftCardId };
}

/** Delete an unused gift card (never redeemed). */
export async function deleteGiftCard(giftCardId: string): Promise<GiftCardAdminResult> {
  if (!giftCardId) return { ok: false, message: 'Thiếu mã thẻ.' };

  const existing = await prisma.giftCard.findUnique({
    where: { id: giftCardId },
    select: { usedAmount: true, initialBalance: true, balance: true },
  });
  if (!existing) return { ok: false, message: 'Không tìm thấy thẻ quà tặng.' };
  if (existing.usedAmount > 0 || existing.balance !== existing.initialBalance) {
    return {
      ok: false,
      message: 'Không thể xóa thẻ đã được sử dụng — hãy vô hiệu hóa thay vì xóa.',
    };
  }

  await prisma.giftCard.delete({ where: { id: giftCardId } });
  return { ok: true, id: giftCardId };
}
