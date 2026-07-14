// lib/auth-verify.ts — Google OAuth auto-verification, called from auth.ts's signIn callback.
import { prisma } from '@/lib/prisma';

/**
 * Marks a user's email verified on first Google sign-in — Google has already
 * confirmed the address, so no separate verification link is needed. No-ops
 * (and skips the write) when already verified, so normal sign-ins don't add
 * DB load.
 */
export async function autoVerifyGoogleUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (user && !user.emailVerified) {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });
  }
}
