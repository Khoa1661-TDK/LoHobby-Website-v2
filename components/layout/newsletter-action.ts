'use server';

import { prisma } from '@/lib/prisma';

export type NewsletterResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletterAction(email: string): Promise<NewsletterResult> {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, error: 'Vui lòng nhập địa chỉ email hợp lệ.' };
  }

  try {
    // Idempotent: a repeat sign-up is treated as success rather than an error.
    await prisma.newsletterSubscriber.upsert({
      where: { email: normalized },
      create: { email: normalized },
      update: {},
    });
  } catch (error) {
    console.error('[newsletter.subscribeNewsletterAction] failed:', error);
    return { ok: false, error: 'Không thể đăng ký. Vui lòng thử lại.' };
  }

  return { ok: true };
}
