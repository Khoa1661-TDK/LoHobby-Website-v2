// lib/email/client.ts — Gmail SMTP transport, shared by every outbound email.
//
// Required env to activate (inert until both are set):
//   GMAIL_USER          — full Gmail address; SMTP user and default sender
//   GMAIL_APP_PASSWORD  — 16-char App Password (myaccount.google.com/apppasswords),
//                         NOT the account password. Requires 2FA on the account.
//   EMAIL_FROM          — optional display sender; falls back to GMAIL_USER
//
// Gmail caps ~500 recipients/day (2,000 on Workspace) and will temporarily lock
// the account past that. Fine for verification/reset volume; a real ceiling for
// campaigns — that cap is what will eventually force a move to a domain-backed
// provider.
import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '@/lib/logger';

export interface EmailConfig {
  configured: boolean;
  user: string;
  appPassword: string;
  from: string;
}

export interface SendBulkResult {
  configured: boolean;
  sent: number;
  failed: number;
}

export function getEmailConfig(): EmailConfig {
  const user = process.env.GMAIL_USER ?? '';
  const appPassword = process.env.GMAIL_APP_PASSWORD ?? '';
  const from = process.env.EMAIL_FROM || user;
  return { configured: Boolean(user && appPassword), user, appPassword, from };
}

// Built once and reused: a transporter per email would reopen an SMTP
// connection each send, which is slow and burns Gmail's connection budget.
let transporter: Transporter | null = null;

export function getTransporter(): Transporter | null {
  const config = getEmailConfig();
  if (!config.configured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // STARTTLS upgrade on 587
      auth: { user: config.user, pass: config.appPassword },
    });
  }
  return transporter;
}

/** Test seam: drops the cached transporter so env changes take effect. */
export function resetTransporter(): void {
  transporter = null;
}

/**
 * Send one email per recipient (never a shared To/BCC, so addresses are never
 * exposed between customers). SMTP has no batch endpoint, so this is a
 * sequential loop over the pooled connection. Per-recipient failures are
 * tallied as `failed` and never thrown. Returns `{ configured: false, ... }`
 * and skips the network entirely when credentials are missing.
 */
export async function sendBulkEmail(args: {
  subject: string;
  text: string;
  html: string;
  recipients: string[];
}): Promise<SendBulkResult> {
  const { subject, text, html, recipients } = args;
  const config = getEmailConfig();
  const mailer = getTransporter();

  if (!mailer) {
    logger.info(
      { recipients: recipients.length, subject },
      '[email] not configured — skipping send',
    );
    return { configured: false, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    try {
      await mailer.sendMail({ from: config.from, to, subject, text, html });
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      logger.warn({ err }, '[email] recipient send failed');
    }
  }

  return { configured: true, sent, failed };
}
