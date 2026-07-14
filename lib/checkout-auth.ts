// lib/checkout-auth.ts — checkout authorization gate: verified accounts only.
import { prisma } from '@/lib/prisma';

export type CheckoutAuthResult = { ok: true } | { ok: false; status: 401 | 403; error: string };

/**
 * Enforces the checkout authorization boundary: a session is required, and
 * the account's email must be verified. Reads `emailVerified` fresh from
 * Prisma (not the JWT) so a verification completed in another tab is picked
 * up immediately without a session refresh.
 */
export async function requireVerifiedCheckoutUser(userId: string | null): Promise<CheckoutAuthResult> {
  if (!userId) {
    return { ok: false, status: 401, error: 'Vui lòng đăng nhập để thanh toán.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) {
    return { ok: false, status: 403, error: 'Vui lòng xác minh email trước khi thanh toán.' };
  }

  return { ok: true };
}
