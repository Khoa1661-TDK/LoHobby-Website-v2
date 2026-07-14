// app/api/auth/forgot-password/route.ts — issue a password-reset token
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/utils';
import { sendEmail } from '@/lib/email/send';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request): Promise<NextResponse> {
  let email = '';
  try {
    const body = (await req.json()) as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ error: 'Nội dung không hợp lệ' }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
  }

  // Always respond with success to avoid revealing whether an email is registered.
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + TOKEN_TTL_MS);

      // Clear any previous reset tokens for this email, then store the new one.
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

      const resetUrl = absoluteUrl(`/reset-password?token=${token}`);
      const result = await sendEmail({
        to: email,
        subject: 'Đặt lại mật khẩu',
        text: `Nhấp vào liên kết sau để đặt lại mật khẩu của bạn: ${resetUrl}\n\nLiên kết có hiệu lực trong 1 giờ.`,
        html: `<p>Nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Liên kết có hiệu lực trong 1 giờ.</p>`,
      });

      // No email provider configured: the reset URL contains a live token, so
      // it must NEVER hit production logs. In development we print it so the
      // flow stays testable without Resend credentials.
      if (!result.configured && process.env.NODE_ENV !== 'production') {
        logger.debug(
          { route: '/api/auth/forgot-password', resetUrl },
          'password reset link (dev only, email not configured)',
        );
      }
    }
  } catch (error) {
    logger.error({ route: '/api/auth/forgot-password', err: error }, 'password reset failed');
  }

  return NextResponse.json({ ok: true });
}
