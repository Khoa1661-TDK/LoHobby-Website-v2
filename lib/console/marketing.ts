// lib/console/marketing.ts
//
// Marketing adapter for the admin console: coupons and gift cards (Prisma),
// email campaigns (Prisma) and auto-sale (Payload). The pure mappers shape the
// rows the panels render; the thin readers fetch and map.

import config from '@payload-config';
import { getPayload } from 'payload';
import prisma from '@/lib/prisma';
import type { Coupon, EmailCampaign, GiftCard } from '@/generated/prisma/client';
import type { CampaignStatus as CampaignStatusEnum } from '@/generated/prisma/enums';
import type { Product } from '@/src/payload/payload-types';
import type { CouponRow } from '@/components/console/marketing/CouponsPanel';
import type { GiftCardRow } from '@/components/console/marketing/GiftCardsPanel';
import type { CampaignRow } from '@/components/console/marketing/CampaignsPanel';
import type { AutoSaleProductRow } from '@/components/console/marketing/AutoSalePanel';
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

// Prisma's CampaignStatus has four members (DRAFT, SCHEDULED, SENT, CANCELLED)
// while the console's has three. An explicit lookup maps each known value and
// lets anything unrecognised fall through to 'draft' rather than lowercasing.
const CAMPAIGN_STATUS_MAP: Record<CampaignStatusEnum, CampaignRow['status']> = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  CANCELLED: 'cancelled',
};

export function toCampaignRow(doc: EmailCampaign): CampaignRow {
  return {
    id: doc.id,
    subject: doc.subject.trim() !== '' ? doc.subject : doc.name,
    status: CAMPAIGN_STATUS_MAP[doc.status] ?? 'draft',
  };
}

export async function listCampaignRows(limit = 50): Promise<CampaignRow[]> {
  const docs = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return docs.map(toCampaignRow);
}

export type AutoSaleFacts = {
  enabled: boolean;
  managedCount: number;
  rows: AutoSaleProductRow[];
};

export function toAutoSaleProductRow(doc: Product): AutoSaleProductRow {
  return {
    id: String(doc.id),
    title: doc.title,
    price: formatVndSymbol(doc.price),
    discount: `−${doc.salePercent ?? 0}%`,
  };
}

export async function getAutoSaleFacts(): Promise<AutoSaleFacts> {
  const payload = await getPayload({ config });
  const [global, found] = await Promise.all([
    payload.findGlobal({ slug: 'auto-sale-settings' }),
    payload.find({
      collection: 'products',
      where: { autoSaleManaged: { equals: true } },
      depth: 0,
      limit: 50,
      pagination: false,
    }),
  ]);
  const rows = found.docs.map(toAutoSaleProductRow);
  return {
    enabled: global.enabled === true,
    managedCount: rows.length,
    rows,
  };
}
