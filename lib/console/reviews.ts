// lib/console/reviews.ts
//
// Reviews and contact-message adapter for the admin console. The reference
// implementation for a Prisma-backed area.
//
// The reviews queue shows what is awaiting moderation, so it reads
// `approved: false` only. Moderation itself is a write and stays in the
// existing Payload admin page for now.

import prisma from '@/lib/prisma';
import type { ContactMessage, Review } from '@/generated/prisma/client';
import type { MessageRow, ReviewRow } from '@/components/console/reviews/types';
import { formatOrderCode } from './format';

export type ReviewWithUser = Review & {
  user: { name: string | null; email: string } | null;
};

const ANONYMOUS_LABEL = 'Khách ẩn danh';

export function toReviewRow(doc: ReviewWithUser): ReviewRow {
  const author = doc.user?.name ?? doc.user?.email ?? ANONYMOUS_LABEL;
  return {
    id: doc.id,
    author,
    rating: Math.max(0, Math.min(5, Math.round(doc.rating))),
    body: doc.body,
  };
}

export function toMessageRow(doc: ContactMessage): MessageRow {
  return {
    id: doc.id,
    sender: doc.name,
    subject: doc.orderCode ? `Về đơn ${formatOrderCode(doc.orderCode)}` : doc.email,
    body: doc.message,
  };
}

export async function listPendingReviewRows(limit = 50): Promise<ReviewRow[]> {
  const docs = await prisma.review.findMany({
    where: { approved: false },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
  return docs.map(toReviewRow);
}

export async function listMessageRows(limit = 50): Promise<MessageRow[]> {
  const docs = await prisma.contactMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return docs.map(toMessageRow);
}
