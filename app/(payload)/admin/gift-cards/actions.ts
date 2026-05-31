// app/(payload)/admin/gift-cards/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import {
  createGiftCard,
  deleteGiftCard,
  toggleGiftCardEnabled,
  type GiftCardAdminResult,
} from '@/lib/gift-cards';

export type GiftCardActionResult = GiftCardAdminResult;

async function guardAdmin(): Promise<GiftCardActionResult | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return { ok: false, message: 'Bạn không có quyền quản lý thẻ quà tặng.' };
  }
}

export async function createGiftCardAction(input: {
  code: string;
  initialBalance: number;
  expiresAt: string | null;
  note: string | null;
}): Promise<GiftCardActionResult> {
  const denied = await guardAdmin();
  if (denied) return denied;

  const result = await createGiftCard({
    code: input.code,
    initialBalance: input.initialBalance,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    note: input.note,
    enabled: true,
  });

  if (result.ok) revalidatePath('/admin/gift-cards');
  return result;
}

export async function toggleGiftCardAction(giftCardId: string): Promise<GiftCardActionResult> {
  const denied = await guardAdmin();
  if (denied) return denied;

  const result = await toggleGiftCardEnabled(giftCardId);
  if (result.ok) revalidatePath('/admin/gift-cards');
  return result;
}

export async function deleteGiftCardAction(giftCardId: string): Promise<GiftCardActionResult> {
  const denied = await guardAdmin();
  if (denied) return denied;

  const result = await deleteGiftCard(giftCardId);
  if (result.ok) revalidatePath('/admin/gift-cards');
  return result;
}
