// app/api/auth/resend-verification/route.ts — re-issue an email-verification link
import { NextResponse } from 'next/server';
import { issueVerificationEmail } from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Always respond with success — identical whether the account exists or is
  // already verified — to avoid revealing account existence (enumeration-safe,
  // mirrors forgot-password).
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });
    if (user && !user.emailVerified) {
      await issueVerificationEmail(email);
    }
  } catch (error) {
    logger.error({ route: '/api/auth/resend-verification', err: error }, 'resend verification failed');
  }

  return NextResponse.json({ ok: true });
}
