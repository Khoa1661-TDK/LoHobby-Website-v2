'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type WishlistToggleResult =
  | { ok: true; saved: boolean }
  | { ok: false; code: string };

export async function toggleWishlistAction(
  productId: string,
  productHandle: string,
): Promise<WishlistToggleResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, code: 'needAuth' };
  }
  const id = productId?.trim();
  if (!id) {
    return { ok: false, code: 'invalidProduct' };
  }

  const userId = session.user.id;
  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId: id } },
    select: { id: true },
  });

  try {
    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      revalidatePath('/profile');
      return { ok: true, saved: false };
    }
    await prisma.wishlistItem.create({
      data: { userId, productId: id, productHandle: productHandle?.trim() ?? '' },
    });
    revalidatePath('/profile');
    return { ok: true, saved: true };
  } catch (error) {
    logger.error({ err: error }, '[wishlist.toggleWishlistAction] failed');
    return { ok: false, code: 'updateFailed' };
  }
}
