// app/(payload)/admin/campaigns/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { CampaignStatus } from '@/generated/prisma/enums';
import { requireAdmin } from '@/lib/admin';
import { getEmailConfig, sendBulkEmail } from '@/lib/email/client';
import { renderCampaignBody } from '@/lib/email/render';
import { isEmailCampaignsEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';

export type CampaignActionResult = { ok: true } | { ok: false; message: string };

export async function createCampaignAction(input: {
  name: string;
  subject: string;
  body: string;
}): Promise<CampaignActionResult> {
  if (!isEmailCampaignsEnabled()) {
    return { ok: false, message: 'Email campaigns disabled.' };
  }
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Không có quyền.' };
  }

  const name = input.name.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!name || !subject || !body) {
    return { ok: false, message: 'Điền đầy đủ tên, tiêu đề và nội dung.' };
  }

  await prisma.emailCampaign.create({
    data: { name, subject, body, status: CampaignStatus.DRAFT },
  });
  revalidatePath('/admin/campaigns');
  return { ok: true };
}

/**
 * Send a campaign to every newsletter subscriber via Resend (lib/email/client).
 * Credential-agnostic: stays DRAFT with a clear message until RESEND_API_KEY and
 * EMAIL_FROM are configured. Marks SENT only when at least one email is delivered.
 */
export async function sendCampaignToNewsletterAction(
  campaignId: string,
): Promise<CampaignActionResult> {
  if (!isEmailCampaignsEnabled()) {
    return { ok: false, message: 'Email campaigns disabled.' };
  }
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Không có quyền.' };
  }

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, message: 'Không tìm thấy chiến dịch.' };
  if (campaign.status === CampaignStatus.SENT) {
    return { ok: false, message: 'Chiến dịch đã gửi.' };
  }

  if (!getEmailConfig().configured) {
    return { ok: false, message: 'Email chưa cấu hình (đặt RESEND_API_KEY) — chưa gửi.' };
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
  if (subscribers.length === 0) {
    return { ok: false, message: 'Chưa có người đăng ký.' };
  }

  const { text, html } = renderCampaignBody(campaign.body);
  const result = await sendBulkEmail({
    subject: campaign.subject,
    text,
    html,
    recipients: subscribers.map((s) => s.email),
  });

  if (result.sent === 0) {
    return { ok: false, message: 'Gửi thất bại — vui lòng thử lại.' };
  }

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: CampaignStatus.SENT,
      sentAt: new Date(),
      recipientCount: result.sent,
    },
  });

  revalidatePath('/admin/campaigns');
  return { ok: true };
}
