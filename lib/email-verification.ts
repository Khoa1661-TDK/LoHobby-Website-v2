// lib/email-verification.ts — email-verification token issuance & consumption.
//
// Reuses the same VerificationToken table as password reset, namespaced by
// the `verify-email:` identifier prefix so the two token kinds never collide
// for the same email.
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';
import { absoluteUrl } from '@/lib/utils';
import { logger } from '@/lib/logger';

const VERIFY_PREFIX = 'verify-email:';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function verificationIdentifier(email: string): string {
  return `${VERIFY_PREFIX}${email}`;
}

export type ConsumeVerificationResult =
  | { status: 'success'; email: string }
  | { status: 'expired' }
  | { status: 'invalid' };

/**
 * Issues a fresh verification token for `email` and sends the verification
 * link. Any previous verification tokens for the same email are cleared
 * first (mirrors the forgot-password `deleteMany` pattern). Throws on
 * failure — callers (registration, resend) decide how to swallow it, since
 * "email is best-effort" varies by call site.
 */
export async function issueVerificationEmail(email: string): Promise<void> {
  const identifier = verificationIdentifier(email);
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  const verifyUrl = absoluteUrl(`/verify-email?token=${token}`);
  const result = await sendEmail({
    to: email,
    subject: 'Xác minh địa chỉ email',
    text: `Nhấp vào liên kết sau để xác minh email của bạn: ${verifyUrl}\n\nLiên kết có hiệu lực trong 24 giờ.`,
    html: `<p>Nhấp vào liên kết sau để xác minh email của bạn:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Liên kết có hiệu lực trong 24 giờ.</p>`,
  });

  if (!result.configured && process.env.NODE_ENV !== 'production') {
    logger.debug(
      { route: 'email-verification', verifyUrl },
      'verification link (dev only, email not configured)',
    );
  }
}

/**
 * Consumes a verification token: looks it up, checks expiry, marks the
 * matching user verified, and deletes the token (one-time use). Returns
 * `'invalid'` for a missing, foreign (non-`verify-email:`), or
 * already-consumed token, and `'expired'` for a stale one.
 */
export async function consumeVerificationToken(token: string): Promise<ConsumeVerificationResult> {
  if (!token) return { status: 'invalid' };

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith(VERIFY_PREFIX)) {
    return { status: 'invalid' };
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
    return { status: 'expired' };
  }

  const email = record.identifier.slice(VERIFY_PREFIX.length);
  try {
    await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  } catch (error) {
    logger.error({ route: 'email-verification', err: error }, 'failed to mark user verified');
    return { status: 'invalid' };
  }
  await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);

  return { status: 'success', email };
}
