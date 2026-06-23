// app/api/auth/reset-password/route.ts — consume a reset token and set a new password
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  let token = '';
  let password = '';
  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown };
    token = typeof body.token === 'string' ? body.token.trim() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Nội dung không hợp lệ' }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Thiếu mã đặt lại.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 8 ký tự.' }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expires.getTime() < Date.now()) {
    if (record) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => undefined);
    }
    return NextResponse.json(
      { error: 'Liên kết đặt lại không hợp lệ hoặc đã hết hạn.' },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { email: record.identifier },
      data: { password: passwordHash },
    });
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
  } catch (error) {
    logger.error({ err: error }, '[api/auth/reset-password] failed');
    return NextResponse.json({ error: 'Không thể đặt lại mật khẩu.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
