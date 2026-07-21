// app/api/register/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAdminEmail } from '@/lib/admin';
import { issueVerificationEmail } from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RegisterBody = { email?: unknown; password?: unknown; name?: unknown };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request): Promise<NextResponse> {
  let raw: RegisterBody;
  try {
    raw = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: 'Nội dung JSON không hợp lệ' }, { status: 400 });
  }

  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const password = typeof raw.password === 'string' ? raw.password : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
  }
  if (isAdminEmail(email)) {
    // Same response as an already-registered email — do not reveal that
    // this address is an admin account.
    return NextResponse.json(
      { error: 'Email này đã được đăng ký' },
      { status: 409 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Mật khẩu phải có ít nhất 8 ký tự' },
      { status: 400 },
    );
  }
  if (name.length === 0 || name.length > 120) {
    return NextResponse.json({ error: 'Tên là bắt buộc' }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    // Best-effort — the account is created regardless of whether the
    // verification email goes out; verification can always be resent.
    try {
      await issueVerificationEmail(email);
    } catch (error) {
      logger.error({ route: '/api/register', err: error }, 'verification email failed');
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // Do not log the submitted email/password — only the error.
    logger.error({ route: '/api/register', err: error }, 'registration failed');
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
