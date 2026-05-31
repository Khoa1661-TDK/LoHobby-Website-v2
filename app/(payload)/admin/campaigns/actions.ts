// app/(payload)/admin/campaigns/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { CampaignStatus } from '@/generated/prisma/enums';
import { requireAdmin } from '@/lib/admin';
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
 * v1: marks campaign SENT and records subscriber count — no ESP integration yet.
 * Wire Resend/SendGrid in a follow-up when API keys are available.
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

  const count = await prisma.newsletterSubscriber.count();
  console.info('[campaign] send stub', {
    campaignId,
    subject: campaign.subject,
    recipients: count,
  });

  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: CampaignStatus.SENT,
      sentAt: new Date(),
      recipientCount: count,
    },
  });

  revalidatePath('/admin/campaigns');
  return { ok: true };
}
