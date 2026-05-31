'use server';

import { prisma } from '@/lib/prisma';

export type ContactResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 120;
const MAX_MESSAGE = 4000;
const MAX_ORDER_CODE = 40;

export async function submitContactAction(formData: FormData): Promise<ContactResult> {
  const name = String(formData.get('name') ?? '').trim().slice(0, MAX_NAME);
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const orderCode = String(formData.get('orderCode') ?? '').trim().slice(0, MAX_ORDER_CODE);
  const message = String(formData.get('message') ?? '').trim().slice(0, MAX_MESSAGE);

  if (name.length === 0) return { ok: false, error: 'Vui lòng nhập họ tên.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Vui lòng nhập email hợp lệ.' };
  if (message.length < 10) {
    return { ok: false, error: 'Nội dung tin nhắn cần ít nhất 10 ký tự.' };
  }

  try {
    await prisma.contactMessage.create({
      data: { name, email, orderCode: orderCode || null, message },
    });
  } catch (error) {
    console.error('[contact.submitContactAction] failed:', error);
    return { ok: false, error: 'Không thể gửi tin nhắn. Vui lòng thử lại.' };
  }

  return { ok: true };
}
