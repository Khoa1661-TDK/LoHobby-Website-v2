// lib/email/client.ts — credential-agnostic bulk email send via Resend's HTTP API.
//
// Required env to activate (inert until both are set):
//   RESEND_API_KEY  — Resend API key (https://resend.com/api-keys)
//   EMAIL_FROM      — verified sender, e.g. "Shop <shop@yourdomain.com>"
//
// No SDK dependency — raw fetch against the batch endpoint, mirroring lib/zalo/oa-client.ts.

import { logger } from '@/lib/logger';

const BATCH_URL = 'https://api.resend.com/emails/batch';
const BATCH_LIMIT = 100; // Resend accepts up to 100 emails per batch request

export interface EmailConfig {
  configured: boolean;
  apiKey: string;
  from: string;
}

export interface SendBulkResult {
  configured: boolean;
  sent: number;
  failed: number;
}

export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY ?? '';
  const from = process.env.EMAIL_FROM ?? '';
  return { configured: Boolean(apiKey && from), apiKey, from };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Send one email per recipient (no shared To/BCC, so addresses are never exposed)
 * in batches of 100. Per-chunk HTTP/network failures are tallied as `failed` and
 * never thrown. Returns `{ configured: false, ... }` and skips the network entirely
 * when credentials are missing.
 */
export async function sendBulkEmail(args: {
  subject: string;
  text: string;
  html: string;
  recipients: string[];
}): Promise<SendBulkResult> {
  const { subject, text, html, recipients } = args;
  const config = getEmailConfig();

  if (!config.configured) {
    logger.info(
      { recipients: recipients.length, subject },
      '[email] not configured — skipping send',
    );
    return { configured: false, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const batch of chunk(recipients, BATCH_LIMIT)) {
    const payload = batch.map((to) => ({ from: config.from, to: [to], subject, text, html }));
    try {
      const res = await fetch(BATCH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        sent += batch.length;
      } else {
        failed += batch.length;
        const detail = await res.json().catch(() => ({}));
        logger.warn({ status: res.status, detail }, '[email] batch send failed');
      }
    } catch (err: unknown) {
      failed += batch.length;
      logger.warn({ err }, '[email] batch send threw');
    }
  }

  return { configured: true, sent, failed };
}
