// lib/email/send.ts — single-recipient email send via Resend's HTTP API.
//
// Sibling to lib/email/client.ts's sendBulkEmail: same credential gating
// (RESEND_API_KEY + EMAIL_FROM), same "log and no-op when unconfigured"
// behavior. Used for transactional, one-recipient sends (password reset,
// email verification) where the batch endpoint's shared-request shape isn't
// needed.
import { getEmailConfig } from '@/lib/email/client';
import { logger } from '@/lib/logger';

const SEND_URL = 'https://api.resend.com/emails';

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

  if (!config.configured) {
    logger.info({ to, subject }, '[email] not configured — skipping send');
    return { configured: false, sent: false };
  }

  try {
    const res = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.from, to: [to], subject, text, html }),
    });
    if (res.ok) {
      return { configured: true, sent: true };
    }
    const detail = await res.json().catch(() => ({}));
    logger.warn({ status: res.status, detail }, '[email] send failed');
    return { configured: true, sent: false };
  } catch (err: unknown) {
    logger.warn({ err }, '[email] send threw');
    return { configured: true, sent: false };
  }
}
