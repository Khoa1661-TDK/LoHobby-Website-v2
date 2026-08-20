// lib/console/marketing.ts
//
// Marketing adapter for the admin console: coupons and gift cards, both
// Prisma-backed. The pure mappers shape the rows the panels render; the thin
// readers fetch and map. Campaigns and auto-sale arrive in a later task.

import prisma from '@/lib/prisma';
import type { Coupon, GiftCard } from '@/generated/prisma/client';
import type { CouponRow } from '@/components/console/marketing/CouponsPanel';
import type { GiftCardRow } from '@/components/console/marketing/GiftCardsPanel';
import { formatDayMonth, formatVndSymbol } from './format';

export function toCouponRow(doc: Coupon): CouponRow {
  const value =
    doc.discountType === 'PERCENT' ? `${doc.discountValue}%` : formatVndSymbol(doc.discountValue);
  const validity = !doc.enabled
    ? 'đã tắt'
    : doc.expiresAt
      ? `đến ${formatDayMonth(doc.expiresAt)}`
      : 'không giới hạn';
  const used = doc.maxUses === null ? String(doc.usedCount) : `${doc.usedCount}/${doc.maxUses}`;
  return {
    id: doc.id,
    code: doc.code,
    value,
    validity,
    used,
  };
}

export function toGiftCardRow(doc: GiftCard): GiftCardRow {
  const exhausted = doc.balance <= 0;
  return {
    id: doc.id,
    code: doc.code,
    value: formatVndSymbol(doc.initialBalance),
    note: exhausted ? 'đã dùng hết' : `còn ${formatVndSymbol(doc.balance)}`,
    exhausted,
  };
}

export async function listCouponRows(limit = 100): Promise<CouponRow[]> {
  const docs = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return docs.map(toCouponRow);
}

export async function listGiftCardRows(limit = 100): Promise<GiftCardRow[]> {
  const docs = await prisma.giftCard.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return docs.map(toGiftCardRow);
}
