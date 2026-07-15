// lib/email/send.ts — single-recipient transactional send (verification,
// password reset).
//
// Sibling to lib/email/client.ts's sendBulkEmail: shares that module's Gmail
// SMTP transporter and its credential gating, and keeps the same "log and
// no-op when unconfigured" contract.
import { getEmailConfig, getTransporter } from '@/lib/email/client';
import { logger } from '@/lib/logger';

export interface SendEmailResult {
  configured: boolean;
  sent: boolean;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult> {
  const { to, subject, text, html } = args;
  const config = getEmailConfig();
  const mailer = getTransporter();

  if (!mailer) {
    logger.info({ to, subject }, '[email] not configured — skipping send');
    return { configured: false, sent: false };
  }

  try {
    await mailer.sendMail({ from: config.from, to, subject, text, html });
    return { configured: true, sent: true };
  } catch (err: unknown) {
    logger.warn({ err }, '[email] send failed');
    return { configured: true, sent: false };
  }
}
